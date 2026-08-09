#!/usr/bin/env node

/**
 * Second tagger, identical rubric to tag-corpus.js (see tag-corpus-shared.js)
 * but running through the local Codex CLI instead of Claude CLI — a separate
 * account/auth, so it can run concurrently with tag-corpus.js without either
 * one's interactive login knocking out the other's background batch job.
 *
 * Meant to be run with the complementary partition to tag-corpus.js, e.g.:
 *   TAG_PARTITION=even node scripts/tag-corpus.js
 *   TAG_PARTITION=odd  node scripts/tag-corpus-codex.js
 *
 * Env flags: same as tag-corpus.js, plus
 *   TAG_MODEL=<name>   Codex model (default gpt-5.4)
 *   TAG_EFFORT=<level> Codex reasoning effort (default low)
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { askCodex } = require("./codex-cli");
const { tweetText, buildBatchPrompt, parseBatchResponse, matchesPartition, appendCsvRow } = require("./tag-corpus-shared");

const TAGGER_NAME = "codex";
const BATCH = Math.max(1, parseInt(process.env.TAG_BATCH || "15", 10));
const LIMIT = process.env.TAG_LIMIT ? parseInt(process.env.TAG_LIMIT, 10) : Infinity;
const MODEL = process.env.TAG_MODEL || "gpt-5.4";
const EFFORT = process.env.TAG_EFFORT || "low";
const PARTITION = process.env.TAG_PARTITION || "all";
const DRY_RUN = /^(1|true|yes)$/i.test(process.env.TAG_DRY_RUN || "");
const OUTPUT_PATH = path.join(process.cwd(), "tag-corpus-report.md");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fetchUntagged() {
  const rows = [];
  let cursor = -1;
  while (rows.length < LIMIT) {
    const { data, error } = await supabase
      .from("tweets")
      .select("id, tweet_id, tweet_text, image_text, article_content")
      .eq("is_duplicate", false)
      .is("tagged_at", null)
      .gt("id", cursor)
      .order("id", { ascending: true })
      .limit(500);
    if (error) throw error;
    if (!data.length) break;
    cursor = data[data.length - 1].id;
    for (const r of data) {
      if (matchesPartition(r, PARTITION) && tweetText(r).length >= 15) rows.push(r);
    }
    if (data.length < 500) break;
  }
  return rows.slice(0, LIMIT);
}

async function main() {
  console.log(
    `Fetching untagged, non-duplicate rows (partition=${PARTITION})${Number.isFinite(LIMIT) ? ` (limit ${LIMIT})` : ""}...`
  );
  const rows = await fetchUntagged();
  console.log(`${rows.length} rows to tag, batch size ${BATCH}, model ${MODEL} (effort ${EFFORT})${DRY_RUN ? " [DRY RUN]" : ""}`);

  let tagged = 0;
  let failed = 0;
  const monetizationCounts = {};
  const topicCounts = {};

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    console.log(`Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(rows.length / BATCH)}...`);
    let results;
    try {
      const prompt = buildBatchPrompt(batch);
      const response = await askCodex(prompt, { model: MODEL, effort: EFFORT, timeoutMs: 120_000 });
      results = parseBatchResponse(response, batch);
    } catch (err) {
      console.error(`  batch failed: ${err.message}`);
      failed += batch.length;
      for (const row of batch) {
        appendCsvRow({ tagger: TAGGER_NAME, tweet_id: row.tweet_id, status: "batch_failed", error: err.message });
      }
      continue;
    }

    for (const r of results) {
      if (!r) {
        failed++;
        continue;
      }
      for (const t of r.topics) topicCounts[t] = (topicCounts[t] || 0) + 1;
      if (r.monetization_model) monetizationCounts[r.monetization_model] = (monetizationCounts[r.monetization_model] || 0) + 1;

      if (DRY_RUN) {
        tagged++;
        appendCsvRow({ tagger: TAGGER_NAME, tweet_id: r.tweet_id, status: "dry_run", ...r });
        continue;
      }
      const { error } = await supabase
        .from("tweets")
        .update({
          topics: r.topics,
          content_type: r.content_type,
          tools_mentioned: r.tools_mentioned,
          is_substantive: r.is_substantive,
          monetization_model: r.monetization_model,
          tagged_at: new Date().toISOString(),
          tagged_by: TAGGER_NAME,
        })
        .eq("id", r.id);
      if (error) {
        console.error(`  update failed for ${r.tweet_id}:`, error.message);
        failed++;
        appendCsvRow({ tagger: TAGGER_NAME, tweet_id: r.tweet_id, status: "db_write_failed", error: error.message });
      } else {
        tagged++;
        appendCsvRow({ tagger: TAGGER_NAME, tweet_id: r.tweet_id, status: "tagged", ...r });
      }
    }
  }

  const report = [
    "# Tag Corpus Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Tagger: ${TAGGER_NAME} (partition=${PARTITION})`,
    "",
    `- Rows processed: ${rows.length}`,
    `- Tagged: ${tagged}`,
    `- Failed: ${failed}`,
    `- Dry run: ${DRY_RUN}`,
    "",
    "## Topic distribution",
    ...Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## Monetization model distribution (only rows where it's non-null)",
    ...Object.entries(monetizationCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- ${k}: ${v}`),
  ].join("\n");
  fs.writeFileSync(OUTPUT_PATH.replace(/\.md$/, `-${TAGGER_NAME}.md`), report + "\n");
  console.log(`Done. Tagged ${tagged}, failed ${failed}. Report written to tag-corpus-report-${TAGGER_NAME}.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
