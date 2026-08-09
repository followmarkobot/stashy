#!/usr/bin/env node

/**
 * Audits the bookmarked tweet corpus and writes a weakness/gap report.
 *
 * Usage:
 *   OWNER_USER_ID=<x_user_id> node scripts/audit-corpus.js
 *
 * Required env (.env.local or shell):
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_KEY
 *
 * Topic analysis runs through the local Claude Code CLI (see claude-cli.js), so
 * it bills to the Claude subscription rather than Developer Platform credits.
 * No ANTHROPIC_API_KEY needed.
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { askClaude } = require("./claude-cli");

const MODEL = "haiku"; // CLI alias; fast/cheap for a single analysis call
const OUTPUT_PATH = path.join(process.cwd(), "corpus-audit-report.md");

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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

/**
 * Resolve the collections that make up the corpus. Defaults to both ingest
 * paths: `bookmarks` (uncurated X sync) and `curated` (chrome-extension saves).
 * Override with COLLECTIONS=bookmarks to audit a single collection.
 */
async function fetchCollectionIds(supabase, ownerUserId) {
  const slugs = (process.env.COLLECTIONS || "bookmarks,curated")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const found = [];
  for (const slug of slugs) {
    let id = null;
    for (const col of ["owner_user_id", "owner_x_user_id"]) {
      const { data, error } = await supabase
        .from("collections")
        .select("id")
        .eq(col, ownerUserId)
        .eq("slug", slug)
        .maybeSingle();
      if (!error && data?.id) {
        id = data.id;
        break;
      }
    }
    if (id) found.push({ slug, id });
  }
  return found;
}

async function fetchAllBookmarks(supabase, collectionIds) {
  const pageSize = 100;
  const idSet = new Set();

  for (const { id } of collectionIds) {
    let offset = 0;
    while (true) {
      const { data: rows, error } = await supabase
        .from("collection_tweets")
        .select("tweet_id")
        .eq("collection_id", id)
        // Bulk-linked rows share one added_at, so that sort is all ties and
        // range pagination silently skips/repeats rows. tweet_id breaks the tie.
        .order("added_at", { ascending: false })
        .order("tweet_id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error(`collection_tweets fetch failed: ${error.message}`);
      if (!rows?.length) break;
      rows.forEach((r) => r.tweet_id && idSet.add(r.tweet_id));
      if (rows.length < pageSize) break;
      offset += pageSize;
    }
  }
  // A tweet can be curated and bookmarked; count it once.
  const allIds = [...idSet];

  const tweets = [];
  for (let i = 0; i < allIds.length; i += pageSize) {
    const batch = allIds.slice(i, i + pageSize);
    const { data: rows, error } = await supabase
      .from("tweets")
      .select(
        "tweet_id, tweet_text, author_handle, media, embedding, tags, saved_at"
      )
      .in("tweet_id", batch);
    if (error) throw new Error(`tweets fetch failed: ${error.message}`);
    tweets.push(...(rows || []));
  }

  return tweets;
}

function computeHealthStats(tweets) {
  const total = tweets.length;

  const noText = tweets.filter(
    (t) => !t.tweet_text || t.tweet_text.trim().length === 0
  );
  const shortText = tweets.filter(
    (t) => t.tweet_text && t.tweet_text.trim().length < 40 &&
           t.tweet_text.trim().length > 0
  );
  const noEmbedding = tweets.filter((t) => !t.embedding);
  const hasMedia = tweets.filter(
    (t) => Array.isArray(t.media) && t.media.length > 0
  );
  const imageOnly = tweets.filter(
    (t) =>
      (!t.tweet_text || t.tweet_text.trim().length === 0) &&
      Array.isArray(t.media) &&
      t.media.length > 0
  );

  // Author concentration
  const authorCounts = {};
  for (const t of tweets) {
    const h = t.author_handle || "unknown";
    authorCounts[h] = (authorCounts[h] || 0) + 1;
  }
  const topAuthors = Object.entries(authorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  const top5Share = topAuthors
    .slice(0, 5)
    .reduce((sum, [, n]) => sum + n, 0);

  // Text length distribution
  const textLengths = tweets
    .filter((t) => t.tweet_text)
    .map((t) => t.tweet_text.trim().length);
  const avgLen =
    textLengths.length
      ? Math.round(textLengths.reduce((a, b) => a + b, 0) / textLengths.length)
      : 0;

  // Near-duplicate detection: bucket tweets by first 80 chars
  const prefixBuckets = {};
  for (const t of tweets) {
    if (!t.tweet_text) continue;
    const key = t.tweet_text.trim().slice(0, 80).toLowerCase();
    if (!prefixBuckets[key]) prefixBuckets[key] = [];
    prefixBuckets[key].push(t.tweet_id);
  }
  const duplicates = Object.values(prefixBuckets).filter((ids) => ids.length > 1);

  return {
    total,
    noText: noText.length,
    shortText: shortText.length,
    noEmbedding: noEmbedding.length,
    hasMedia: hasMedia.length,
    imageOnly: imageOnly.length,
    topAuthors,
    top5Share,
    avgTextLen: avgLen,
    duplicateGroups: duplicates.length,
    duplicateTweets: duplicates.reduce((s, g) => s + g.length, 0),
    uniqueAuthors: Object.keys(authorCounts).length,
  };
}

async function analyzeTopics(tweets) {
  // Build a condensed corpus: at most 150 chars per tweet, author + text
  const lines = tweets
    .filter((t) => t.tweet_text && t.tweet_text.trim().length > 0)
    .map((t) => {
      const text = t.tweet_text.trim().slice(0, 150).replace(/\n+/g, " ");
      return `@${t.author_handle || "?"}: ${text}`;
    });

  // If huge corpus, sample evenly: max 500 tweets to keep prompt manageable
  const sample =
    lines.length > 500
      ? lines.filter((_, i) => i % Math.ceil(lines.length / 500) === 0)
      : lines;

  const prompt = [
    "You are auditing a personal collection of bookmarked tweets used as a writing corpus.",
    "The owner uses these tweets as source material to help write new tweets in their own voice.",
    "",
    "Below is a condensed list of the bookmarked tweets (author + first 150 chars each).",
    "Your job: identify the corpus's strengths, weaknesses, and gaps.",
    "",
    "Return a markdown report with these exact sections:",
    "## Topic Distribution",
    "List the main topics/themes with an estimated % of corpus coverage each.",
    "",
    "## Dominant Voices / Potential Bias",
    "Which authors or perspectives dominate? What viewpoints are absent?",
    "",
    "## Over-represented Topics",
    "What is there too much of? Redundant angles?",
    "",
    "## Under-represented or Missing Topics",
    "What key areas are thin or absent that a well-rounded writing corpus should cover?",
    "",
    "## Quality Concerns",
    "Patterns of low-value content (vague takes, hype, engagement bait, etc.)?",
    "",
    "## Recommended Additions",
    "3-5 specific topic areas or types of content to actively bookmark more of.",
    "",
    "---",
    "Corpus sample:",
    ...sample,
  ].join("\n");

  return await askClaude(prompt, { model: MODEL });
}

function formatHealthSection(stats) {
  const pct = (n) => `${n} (${((n / stats.total) * 100).toFixed(1)}%)`;
  const top5Pct = ((stats.top5Share / stats.total) * 100).toFixed(1);

  return [
    "## Corpus Health",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total bookmarked tweets | ${stats.total} |`,
    `| Unique authors | ${stats.uniqueAuthors} |`,
    `| Average tweet text length | ${stats.avgTextLen} chars |`,
    `| Missing text (unsearchable) | ${pct(stats.noText)} |`,
    `| Short text < 40 chars | ${pct(stats.shortText)} |`,
    `| Missing embedding (invisible to semantic search) | ${pct(stats.noEmbedding)} |`,
    `| Have media/images | ${pct(stats.hasMedia)} |`,
    `| Image-only (no text — blind spot) | ${pct(stats.imageOnly)} |`,
    `| Near-duplicate groups | ${stats.duplicateGroups} |`,
    `| Tweets in duplicate groups | ${stats.duplicateTweets} |`,
    "",
    "### Top 15 authors by tweet count",
    "",
    `| Author | Count | % of corpus |`,
    `|--------|-------|-------------|`,
    ...stats.topAuthors.map(
      ([h, n]) =>
        `| @${h} | ${n} | ${((n / stats.total) * 100).toFixed(1)}% |`
    ),
    "",
    `Top 5 authors account for **${top5Pct}%** of the corpus.`,
    "",
    "### Flags",
    "",
    stats.noEmbedding > 0
      ? `- ⚠️  **${stats.noEmbedding} tweets lack embeddings** — run \`npm run embed-corpus\` to fix.`
      : "- ✅ All tweets are embedded.",
    stats.imageOnly > 0
      ? `- ⚠️  **${stats.imageOnly} image-only tweets** — their content is invisible to text search and the writing corpus. Consider adding manual notes/tags.`
      : "- ✅ No image-only tweets.",
    stats.duplicateGroups > 0
      ? `- ⚠️  **${stats.duplicateGroups} near-duplicate groups** (${stats.duplicateTweets} tweets) — consider pruning redundant bookmarks.`
      : "- ✅ No near-duplicates detected.",
    Number(top5Pct) > 40
      ? `- ⚠️  **Author concentration high** — top 5 voices own ${top5Pct}% of corpus. Risk of skewed style/perspective.`
      : `- ✅ Author concentration reasonable (top 5 = ${top5Pct}%).`,
  ].join("\n");
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const ownerUserId = process.env.OWNER_USER_ID;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY");
    process.exit(1);
  }
  if (!ownerUserId) {
    console.error("Missing required env var: OWNER_USER_ID");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Resolving corpus collections...");
  const collectionIds = await fetchCollectionIds(supabase, ownerUserId);
  if (!collectionIds.length) {
    console.error("No matching collections found for that owner.");
    process.exit(1);
  }
  console.log(`  using: ${collectionIds.map((c) => c.slug).join(", ")}`);

  console.log("Fetching all corpus tweets...");
  const tweets = await fetchAllBookmarks(supabase, collectionIds);
  console.log(`Fetched ${tweets.length} tweets.`);

  console.log("Computing health stats...");
  const stats = computeHealthStats(tweets);

  // Topic analysis is the only part that needs an LLM. It must never cost us
  // the health stats, which are already computed and are the report's core.
  console.log("Running topic analysis (single LLM call)...");
  let topicAnalysis;
  try {
    topicAnalysis = await analyzeTopics(tweets);
  } catch (err) {
    console.warn(`  topic analysis failed, writing report without it: ${err.message}`);
    topicAnalysis = [
      "# Corpus Audit Report",
      "",
      "## Topic Distribution",
      "",
      `_Topic analysis unavailable: ${err.message}_`,
    ].join("\n");
  }

  const report = [
    "# Corpus Audit Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    formatHealthSection(stats),
    "",
    "---",
    "",
    topicAnalysis,
  ].join("\n");

  fs.writeFileSync(OUTPUT_PATH, report, "utf8");
  console.log(`\nDone. Report written to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
