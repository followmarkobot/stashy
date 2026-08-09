/**
 * Shared classification schema, prompt, and CSV logging for the corpus
 * taggers. Single source of truth so tag-corpus.js (Claude CLI) and
 * tag-corpus-codex.js (Codex CLI) classify identically — two different
 * models grading the same rubric, not two different rubrics.
 *
 * Why two taggers: running one long CLI batch job unattended collides with
 * an interactive `claude` session on the same machine (the background
 * `claude -p` calls share auth state with your terminal's login, so a
 * mid-run `/login` invalidates them — this bit us three times in a row on
 * 2026-07-22). Claude CLI and Codex CLI use separate accounts/auth, so they
 * don't step on each other, and running both concurrently on disjoint
 * partitions roughly doubles throughput.
 *
 * "Nothing in memory": every batch result is written immediately to (a)
 * Supabase (source of truth the app reads) and (b) tag-corpus-log.csv (a
 * flat, spreadsheet-openable audit trail per tagger) as it's produced — nothing
 * accumulates in the running process waiting for the whole job to finish, so
 * killing either tagger mid-run loses at most its in-flight batch.
 */

const fs = require("fs");
const path = require("path");

const TOPIC_VOCAB = [
  "ai-tooling",
  "ugc-production",
  "app-growth-aso",
  "paid-acquisition",
  "monetization",
  "audience-building",
  "founder-story",
  "industry-news",
  "other",
];
const CONTENT_TYPE_VOCAB = [
  "case-study",
  "tactic-howto",
  "opinion-take",
  "tool-recommendation",
  "framework",
  "hype",
  "other",
];
const MONETIZATION_MODEL_VOCAB = [
  "course-info-product",
  "dfy-agency",
  "saas-tool",
  "ghostwriting",
  "affiliate",
  "paid-community",
  "synthetic-ugc-tooling",
  "ad-revenue",
  "other",
];

// **Transcription:**/**Description:** are OCR section headers enrich-corpus.js
// writes into image_text — real tokens, zero classification value.
function stripOcrBoilerplate(text) {
  return text.replace(/\*\*(Transcription|Description)\*\*:?/gi, "");
}

function tweetText(row) {
  return [row.tweet_text, row.image_text, row.article_content]
    .filter(Boolean)
    .map(stripOcrBoilerplate)
    .join(" ")
    .trim();
}

function buildBatchPrompt(batch) {
  const items = batch
    .map((r, i) => `[${i}] (tweet_id=${r.tweet_id}) ${tweetText(r).replace(/\s+/g, " ").slice(0, 600)}`)
    .join("\n\n");

  return `Classify each tweet below. Return ONLY a JSON array (no markdown fences, no prose), one object per tweet, in the same order, with this exact shape:

{"i": <index number>, "topics": [<1-3 from: ${TOPIC_VOCAB.join(", ")}>], "content_type": <exactly one from: ${CONTENT_TYPE_VOCAB.join(", ")}>, "tools_mentioned": [<lowercase names of specific tools/products/platforms named, e.g. "claude code", "tiktok", "revenuecat" — empty array if none>], "is_substantive": <true if it has real, specific, actionable information; false if it's pure hype/engagement-bait/vague inspiration with no real content>, "monetization_model": <null UNLESS the tweet is substantively, specifically about how someone makes or made money — in that case exactly one from: ${MONETIZATION_MODEL_VOCAB.join(", ")}>}

Most tweets are NOT about monetization — leave monetization_model null for anything that isn't specifically and substantively about a revenue/monetization approach. Don't force it.

Tweets:
${items}`;
}

function parseBatchResponse(text, batch) {
  let jsonStr = text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();
  const arr = JSON.parse(jsonStr);
  if (!Array.isArray(arr)) throw new Error("response is not a JSON array");

  const byIndex = new Map(arr.map((o) => [o.i, o]));
  return batch.map((row, i) => {
    const o = byIndex.get(i);
    if (!o) return null;
    const topics = Array.isArray(o.topics) ? o.topics.filter((t) => TOPIC_VOCAB.includes(t)) : [];
    const content_type = CONTENT_TYPE_VOCAB.includes(o.content_type) ? o.content_type : "other";
    const tools_mentioned = Array.isArray(o.tools_mentioned)
      ? o.tools_mentioned.filter((t) => typeof t === "string").map((t) => t.toLowerCase().trim())
      : [];
    const is_substantive = typeof o.is_substantive === "boolean" ? o.is_substantive : null;
    const monetization_model =
      o.monetization_model && MONETIZATION_MODEL_VOCAB.includes(o.monetization_model)
        ? o.monetization_model
        : null;
    return {
      id: row.id,
      tweet_id: row.tweet_id,
      topics: topics.length ? topics : ["other"],
      content_type,
      tools_mentioned,
      is_substantive,
      monetization_model,
    };
  });
}

// Deterministic 2-way split so two taggers running concurrently never touch
// the same row: "even"/"odd" filter on row.id % 2, "all" is a no-op (single-
// tagger mode, unchanged behavior).
function matchesPartition(row, partition) {
  if (partition === "all") return true;
  if (partition === "even") return row.id % 2 === 0;
  if (partition === "odd") return row.id % 2 === 1;
  throw new Error(`invalid partition: ${partition} (expected all|even|odd)`);
}

const CSV_PATH = path.join(__dirname, "..", "tag-corpus-log.csv");
const CSV_HEADER = "timestamp,tagger,tweet_id,status,topics,content_type,tools_mentioned,is_substantive,monetization_model,error\n";

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function ensureCsvHeader() {
  if (!fs.existsSync(CSV_PATH)) fs.writeFileSync(CSV_PATH, CSV_HEADER);
}

function appendCsvRow({ tagger, tweet_id, status, topics, content_type, tools_mentioned, is_substantive, monetization_model, error }) {
  ensureCsvHeader();
  const row = [
    new Date().toISOString(),
    tagger,
    tweet_id,
    status,
    csvEscape((topics || []).join("|")),
    csvEscape(content_type || ""),
    csvEscape((tools_mentioned || []).join("|")),
    is_substantive === null || is_substantive === undefined ? "" : is_substantive,
    monetization_model || "",
    csvEscape(error || ""),
  ].join(",");
  fs.appendFileSync(CSV_PATH, row + "\n");
}

module.exports = {
  TOPIC_VOCAB,
  CONTENT_TYPE_VOCAB,
  MONETIZATION_MODEL_VOCAB,
  tweetText,
  buildBatchPrompt,
  parseBatchResponse,
  matchesPartition,
  appendCsvRow,
  CSV_PATH,
};
