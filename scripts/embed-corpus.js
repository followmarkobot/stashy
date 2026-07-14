#!/usr/bin/env node

/**
 * Embeds the tweet corpus for semantic search.
 *
 * Unlike a naive tweet_text-only backfill, this combines the enriched text we
 * now store per tweet — the OCR'd image_text and the archived article_content
 * (see scripts/enrich-corpus.js) — into a single embedding input, so image-only
 * alpha and linked articles actually become findable by vector search.
 *
 * Two disjoint passes:
 *   A) Rows missing an embedding and NOT enriched  -> embed tweet_text.
 *   B) Rows with image_text OR article_content      -> embed the combined text,
 *      FORCED regardless of any existing embedding (their old vector, if any,
 *      predates enrichment and would not reflect the new text).
 *
 * Env flags:
 *   EMBED_LIMIT=<n>        cap total rows processed (testing)
 *   EMBED_BATCH=<n>        embeddings per OpenAI request (default 32)
 *   EMBED_MODEL=<name>     default text-embedding-3-small (1536-dim)
 *   EMBED_SKIP_ENRICHED=1  skip pass B (do not re-embed enriched rows)
 *   EMBED_DRY_RUN=1        compute nothing-writes; report what would happen
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");

const MODEL = process.env.EMBED_MODEL || "text-embedding-3-small";
const BATCH = Math.max(1, parseInt(process.env.EMBED_BATCH || "32", 10));
const LIMIT = process.env.EMBED_LIMIT ? parseInt(process.env.EMBED_LIMIT, 10) : Infinity;
const SKIP_ENRICHED = /^(1|true|yes)$/i.test(process.env.EMBED_SKIP_ENRICHED || "");
const DRY_RUN = /^(1|true|yes)$/i.test(process.env.EMBED_DRY_RUN || "");
// text-embedding-3-small caps at 8191 tokens/input. ~24k chars stays safely
// under that even for dense text, while keeping tweet+image text intact.
const MAX_CHARS = 24000;
const PAGE = 200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function clean(s) {
  return typeof s === "string" ? s.trim() : "";
}

// Build the combined embedding input for a row, prioritizing tweet + image text
// and giving article_content whatever character budget remains.
function buildContent(row) {
  const tweet = clean(row.tweet_text);
  let image = clean(row.image_text);
  if (image.toUpperCase() === "NONE") image = "";
  const article = clean(row.article_content);

  const head = [];
  if (tweet) head.push(tweet);
  if (image) head.push(`[Image text]\n${image}`);
  let headStr = head.join("\n\n");

  if (article) {
    const remaining = MAX_CHARS - headStr.length - 2;
    if (remaining > 200) {
      let art = `[Article]\n${article}`;
      if (art.length > remaining) art = art.slice(0, remaining);
      headStr = headStr ? `${headStr}\n\n${art}` : art;
    }
  }

  if (headStr.length > MAX_CHARS) headStr = headStr.slice(0, MAX_CHARS);
  return headStr;
}

async function embedBatch(openai, inputs) {
  let attempts = 0;
  while (true) {
    attempts += 1;
    try {
      const res = await openai.embeddings.create({ model: MODEL, input: inputs });
      return res.data.map((d) => d.embedding);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = msg.includes("429") || msg.includes("500") || msg.includes("503");
      if (!retryable || attempts >= 5) throw err;
      const waitMs = attempts * 2000;
      console.warn(`  batch rate/again (attempt ${attempts}/5) - waiting ${waitMs}ms`);
      await sleep(waitMs);
    }
  }
}

/**
 * Cursor-paginate a filtered query by ascending `id`, embedding each page.
 * `applyFilter(query)` narrows the base tweets query; it must NOT touch order,
 * range, or the id cursor. Returns { processed, skipped, failed }.
 */
async function runPass(name, supabase, openai, applyFilter, stats) {
  let cursor = -1;
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  while (stats.processed < LIMIT) {
    let query = supabase
      .from("tweets")
      .select("id, tweet_id, tweet_text, image_text, article_content")
      .gt("id", cursor)
      .order("id", { ascending: true })
      .limit(PAGE);
    query = applyFilter(query);

    const { data: rows, error } = await query;
    if (error) {
      console.error(`[${name}] fetch failed:`, error.message);
      break;
    }
    if (!rows || rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    // Build inputs, dropping rows with no usable text.
    const work = [];
    for (const row of rows) {
      const content = buildContent(row);
      if (!content) {
        skipped += 1;
        continue;
      }
      work.push({ row, content });
    }

    for (let i = 0; i < work.length; i += BATCH) {
      if (stats.processed >= LIMIT) break;
      let slice = work.slice(i, i + BATCH);
      if (stats.processed + slice.length > LIMIT) {
        slice = slice.slice(0, LIMIT - stats.processed);
      }

      if (DRY_RUN) {
        processed += slice.length;
        stats.processed += slice.length;
        continue;
      }

      let vectors;
      try {
        vectors = await embedBatch(openai, slice.map((w) => w.content));
      } catch (err) {
        console.error(`[${name}] batch embed failed, falling back per-item:`, err.message);
        vectors = null;
      }

      // Per-item fallback so one bad input can't sink the whole batch.
      if (!vectors) {
        vectors = [];
        for (const w of slice) {
          try {
            const v = await embedBatch(openai, [w.content]);
            vectors.push(v[0]);
          } catch (e) {
            console.error(`  [${w.row.tweet_id}] embed failed:`, e.message);
            vectors.push(null);
          }
        }
      }

      const updates = slice.map((w, j) => {
        const embedding = vectors[j];
        if (!embedding) {
          failed += 1;
          return null;
        }
        return supabase.from("tweets").update({ embedding }).eq("id", w.row.id).then(
          ({ error: upErr }) => {
            if (upErr) {
              failed += 1;
              console.error(`  [${w.row.tweet_id}] update failed:`, upErr.message);
            } else {
              processed += 1;
              stats.processed += 1;
            }
          }
        );
      });
      await Promise.all(updates.filter(Boolean));
      console.log(`[${name}] ${processed} embedded (${stats.processed} overall)`);
    }
  }

  console.log(`[${name}] done: ${processed} embedded, ${skipped} no-text skipped, ${failed} failed.`);
  return { processed, skipped, failed };
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
    console.error(
      "Missing env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_KEY, OPENAI_API_KEY"
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const openai = new OpenAI({ apiKey: openaiApiKey });

  console.log(
    `Embedding corpus with ${MODEL} (batch ${BATCH})${DRY_RUN ? " [DRY RUN]" : ""}` +
      (Number.isFinite(LIMIT) ? ` limit=${LIMIT}` : "")
  );

  const stats = { processed: 0 };

  // Pass A: missing embeddings, not enriched -> plain tweet_text.
  const passA = await runPass("A:new", supabase, openai, (q) =>
    q.is("embedding", null).is("image_text", null).is("article_content", null), stats
  );

  // Pass B: enriched rows -> combined text, forced (rebuild stale/absent vectors).
  let passB = { processed: 0, skipped: 0, failed: 0 };
  if (!SKIP_ENRICHED && stats.processed < LIMIT) {
    passB = await runPass("B:enriched", supabase, openai, (q) =>
      q.or("image_text.not.is.null,article_content.not.is.null"), stats
    );
  }

  // Verify remaining gap.
  const { count: stillNull } = await supabase
    .from("tweets")
    .select("id", { count: "exact", head: true })
    .is("embedding", null);
  const { count: total } = await supabase
    .from("tweets")
    .select("id", { count: "exact", head: true });

  const report =
    `# Corpus Embedding Report\n\n` +
    `Model: \`${MODEL}\` (1536-dim)${DRY_RUN ? "  \n**DRY RUN — no writes**" : ""}\n\n` +
    `| Metric | Value |\n|--------|-------|\n` +
    `| Total tweets | ${total} |\n` +
    `| Pass A (new, tweet_text) embedded | ${passA.processed} |\n` +
    `| Pass B (enriched, combined) re-embedded | ${passB.processed} |\n` +
    `| Total embedded this run | ${stats.processed} |\n` +
    `| No-text rows skipped | ${passA.skipped + passB.skipped} |\n` +
    `| Failed | ${passA.failed + passB.failed} |\n` +
    `| Still missing embedding | ${stillNull} |\n\n` +
    `Pass B force-rebuilds embeddings for every row carrying OCR'd \`image_text\` ` +
    `or archived \`article_content\`, so the enriched corpus is now searchable by ` +
    `vector similarity, not just the raw tweet text.\n`;

  if (!DRY_RUN) fs.writeFileSync(path.join(process.cwd(), "corpus-embedding-report.md"), report);
  console.log("\n" + report);
}

main().catch((err) => {
  console.error("Fatal error in embed-corpus:", err);
  process.exit(1);
});
