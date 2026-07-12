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
 *   ANTHROPIC_API_KEY
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const MODEL = "claude-haiku-4-5-20251001"; // fast/cheap for analysis
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

async function fetchBookmarksCollectionId(supabase, ownerUserId) {
  const modern = await supabase
    .from("collections")
    .select("id")
    .eq("owner_user_id", ownerUserId)
    .eq("slug", "bookmarks")
    .maybeSingle();
  if (!modern.error && modern.data?.id) return modern.data.id;

  const legacy = await supabase
    .from("collections")
    .select("id")
    .eq("owner_x_user_id", ownerUserId)
    .eq("slug", "bookmarks")
    .maybeSingle();
  if (!legacy.error && legacy.data?.id) return legacy.data.id;
  return null;
}

async function fetchAllBookmarks(supabase, collectionId) {
  const pageSize = 100;
  let offset = 0;
  const allIds = [];

  while (true) {
    const { data: rows, error } = await supabase
      .from("collection_tweets")
      .select("tweet_id")
      .eq("collection_id", collectionId)
      .order("added_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`collection_tweets fetch failed: ${error.message}`);
    if (!rows?.length) break;
    allIds.push(...rows.map((r) => r.tweet_id).filter(Boolean));
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

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

async function analyzeTopics(anthropicApiKey, tweets) {
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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return Array.isArray(data?.content)
    ? data.content
        .filter((b) => b?.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim()
    : "";
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
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const ownerUserId = process.env.OWNER_USER_ID;

  if (!supabaseUrl || !supabaseServiceKey || !anthropicApiKey) {
    console.error(
      "Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY"
    );
    process.exit(1);
  }
  if (!ownerUserId) {
    console.error("Missing required env var: OWNER_USER_ID");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Fetching bookmarks collection...");
  const collectionId = await fetchBookmarksCollectionId(supabase, ownerUserId);
  if (!collectionId) {
    console.error("No bookmarks collection found for that owner.");
    process.exit(1);
  }

  console.log("Fetching all bookmarked tweets...");
  const tweets = await fetchAllBookmarks(supabase, collectionId);
  console.log(`Fetched ${tweets.length} tweets.`);

  console.log("Computing health stats...");
  const stats = computeHealthStats(tweets);

  console.log("Running topic analysis (single LLM call)...");
  const topicAnalysis = await analyzeTopics(anthropicApiKey, tweets);

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
