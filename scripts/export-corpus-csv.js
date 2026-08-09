#!/usr/bin/env node

/**
 * Exports the full tweet corpus to a flat, spreadsheet-openable CSV —
 * everything except the embedding vector itself (1536 floats per row, not
 * useful to look at, and would balloon the file size for no reason).
 *
 * Env flags:
 *   EXPORT_INCLUDE_DUPLICATES=1   include is_duplicate=true rows (default:
 *                                 excluded, since they're reposts of a kept
 *                                 representative elsewhere in the export)
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const INCLUDE_DUPLICATES = /^(1|true|yes)$/i.test(process.env.EXPORT_INCLUDE_DUPLICATES || "");
const OUTPUT_PATH = path.join(process.cwd(), "corpus-export.csv");

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

const COLUMNS = [
  "tweet_id",
  "author_handle",
  "tweet_text",
  "image_text",
  "article_content",
  "has_media",
  "has_article",
  "has_link",
  "source_url",
  "created_at",
  "saved_at",
  "like_count",
  "retweet_count",
  "reply_count",
  "bookmark_count",
  "impression_count",
  "topics",
  "content_type",
  "tools_mentioned",
  "is_substantive",
  "monetization_model",
  "tagged_by",
  "tagged_at",
  "semantic_cluster_id",
  "cluster_size",
  "is_duplicate",
  "duplicate_of",
];

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowToCsv(r) {
  const m = r.public_metrics || {};
  const flat = {
    ...r,
    tweet_text: (r.tweet_text || "").replace(/\s+/g, " ").trim(),
    image_text: (r.image_text || "").replace(/\s+/g, " ").trim(),
    article_content: (r.article_content || "").replace(/\s+/g, " ").trim().slice(0, 2000),
    like_count: m.like_count ?? "",
    retweet_count: m.retweet_count ?? "",
    reply_count: m.reply_count ?? "",
    bookmark_count: m.bookmark_count ?? "",
    impression_count: m.impression_count ?? "",
    topics: Array.isArray(r.topics) ? r.topics.join("|") : "",
    tools_mentioned: Array.isArray(r.tools_mentioned) ? r.tools_mentioned.join("|") : "",
  };
  return COLUMNS.map((c) => csvEscape(flat[c])).join(",");
}

async function main() {
  console.log(`Fetching corpus${INCLUDE_DUPLICATES ? "" : " (excluding is_duplicate=true)"}...`);
  let rows = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let query = supabase
      .from("tweets")
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (!INCLUDE_DUPLICATES) query = query.eq("is_duplicate", false);
    const { data, error } = await query;
    if (error) throw error;
    rows = rows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`${rows.length} rows fetched. Writing CSV...`);

  const lines = [COLUMNS.join(","), ...rows.map(rowToCsv)];
  fs.writeFileSync(OUTPUT_PATH, lines.join("\n") + "\n");
  console.log(`Done. Wrote ${rows.length} rows to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
