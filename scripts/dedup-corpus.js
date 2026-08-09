#!/usr/bin/env node

/**
 * Soft-flags near-duplicate reposts in the tweet corpus so they don't
 * inflate consensus counts downstream (tagging/embedding/synthesis all skip
 * is_duplicate=true rows). Nothing is deleted — every row keeps its data,
 * just marked is_duplicate + duplicate_of pointing at the kept copy.
 *
 * Two signals, deliberately not the audit report's first-80-chars bucketing
 * (too blunt: over-merges shared openers, misses reposts with an altered
 * first line or an RT@/QT prefix):
 *
 *   A) Exact match after normalizing (strip URLs, @handles, RT/QT prefixes,
 *      case, whitespace) — safe at any length.
 *   B) Near-dup via 5-word-shingle Jaccard similarity, only applied to
 *      tweets with >=12 normalized words — short tweets are excluded because
 *      shingle overlap on short text is a weak/noisy signal (two unrelated
 *      one-liners can share a common 5-word phrase).
 *
 * Within a cluster, the kept representative is the row with the highest
 * engagement score (likes + retweets + 2x bookmarks from public_metrics,
 * defaulting to 0 where metrics are missing), tie-broken by earliest
 * saved_at.
 *
 * Idempotent / safe to re-run as the corpus grows: recomputes clusters from
 * scratch every run (cheap at this scale) and only writes rows whose
 * is_duplicate/duplicate_of actually changed.
 *
 * Env flags:
 *   DEDUP_THRESHOLD=<0-1>   Jaccard threshold for near-dup (default 0.6)
 *   DEDUP_DRY_RUN=1         report only, write nothing
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const THRESHOLD = parseFloat(process.env.DEDUP_THRESHOLD || "0.6");
const DRY_RUN = /^(1|true|yes)$/i.test(process.env.DEDUP_DRY_RUN || "");
const MIN_WORDS_FOR_SHINGLE = 12;
const SHINGLE_SIZE = 5;
const OUTPUT_PATH = path.join(process.cwd(), "dedup-report.md");

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

function normalize(text) {
  return (text || "")
    .replace(/^\s*(RT|QT)\s*@\w+\s*:?/i, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/@\w+/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shingles(normalizedText) {
  const words = normalizedText.split(" ").filter(Boolean);
  if (words.length < MIN_WORDS_FOR_SHINGLE) return null;
  const set = new Set();
  for (let i = 0; i <= words.length - SHINGLE_SIZE; i++) {
    set.add(words.slice(i, i + SHINGLE_SIZE).join(" "));
  }
  return set;
}

function jaccard(a, b) {
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function engagementScore(row) {
  const m = row.public_metrics || {};
  return (m.like_count || 0) + (m.retweet_count || 0) + 2 * (m.bookmark_count || 0);
}

// Union-find for transitive clustering (A~B, B~C => A,B,C one cluster)
function makeUnionFind(n) {
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x) {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }
  return { find, union };
}

async function fetchAll() {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("tweets")
      .select("id, tweet_id, tweet_text, image_text, article_content, public_metrics, saved_at, created_at, is_duplicate, duplicate_of")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function main() {
  console.log("Fetching corpus...");
  const rows = await fetchAll();
  console.log(`Fetched ${rows.length} rows.`);

  const norm = rows.map((r) => normalize([r.tweet_text, r.image_text].filter(Boolean).join(" ")));
  const shingleSets = norm.map(shingles);

  const uf = makeUnionFind(rows.length);

  // A) exact match after normalization
  const exactBuckets = new Map();
  for (let i = 0; i < rows.length; i++) {
    if (!norm[i]) continue;
    if (!exactBuckets.has(norm[i])) exactBuckets.set(norm[i], []);
    exactBuckets.get(norm[i]).push(i);
  }
  for (const idxs of exactBuckets.values()) {
    for (let k = 1; k < idxs.length; k++) uf.union(idxs[0], idxs[k]);
  }

  // B) near-dup via shingle inverted index (only compare pairs sharing >=1 shingle)
  const shingleIndex = new Map();
  for (let i = 0; i < rows.length; i++) {
    const set = shingleSets[i];
    if (!set) continue;
    for (const sh of set) {
      if (!shingleIndex.has(sh)) shingleIndex.set(sh, []);
      shingleIndex.get(sh).push(i);
    }
  }
  const candidatePairs = new Set();
  for (const idxs of shingleIndex.values()) {
    if (idxs.length < 2 || idxs.length > 50) continue; // skip mega-buckets (boilerplate shingles)
    for (let a = 0; a < idxs.length; a++) {
      for (let b = a + 1; b < idxs.length; b++) {
        candidatePairs.add(`${idxs[a]}:${idxs[b]}`);
      }
    }
  }
  let nearDupPairs = 0;
  for (const key of candidatePairs) {
    const [a, b] = key.split(":").map(Number);
    const sim = jaccard(shingleSets[a], shingleSets[b]);
    if (sim >= THRESHOLD) {
      uf.union(a, b);
      nearDupPairs++;
    }
  }

  // Build clusters
  const clusters = new Map();
  for (let i = 0; i < rows.length; i++) {
    const root = uf.find(i);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(i);
  }

  const updates = [];
  let clusterCount = 0;
  let duplicateCount = 0;
  for (const idxs of clusters.values()) {
    if (idxs.length < 2) continue;
    clusterCount++;
    idxs.sort((a, b) => {
      const scoreDiff = engagementScore(rows[b]) - engagementScore(rows[a]);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(rows[a].saved_at || rows[a].created_at || 0) - new Date(rows[b].saved_at || rows[b].created_at || 0);
    });
    const rep = rows[idxs[0]];
    for (let k = 1; k < idxs.length; k++) {
      const row = rows[idxs[k]];
      duplicateCount++;
      if (row.is_duplicate === true && row.duplicate_of === rep.tweet_id) continue; // no change
      updates.push({ id: row.id, tweet_id: row.tweet_id, duplicate_of: rep.tweet_id });
    }
    // if a previously-flagged row is now the representative (cluster membership changed), clear its flag
    if (rep.is_duplicate === true) {
      updates.push({ id: rep.id, tweet_id: rep.tweet_id, duplicate_of: null, clear: true });
    }
  }

  console.log(`Exact-match buckets: ${exactBuckets.size}`);
  console.log(`Near-dup candidate pairs checked: ${candidatePairs.size}, matched >= ${THRESHOLD}: ${nearDupPairs}`);
  console.log(`Clusters with duplicates: ${clusterCount}, total duplicate rows: ${duplicateCount}`);
  console.log(`Rows to write: ${updates.length}`);

  const report = [
    "# Dedup Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `- Total rows scanned: ${rows.length}`,
    `- Exact-match (post-normalize) buckets: ${exactBuckets.size}`,
    `- Near-dup candidate pairs checked: ${candidatePairs.size}`,
    `- Near-dup pairs >= ${THRESHOLD} threshold: ${nearDupPairs}`,
    `- Clusters containing duplicates: ${clusterCount}`,
    `- Total rows flagged is_duplicate: ${duplicateCount}`,
    `- Rows written this run: ${DRY_RUN ? 0 : updates.length} (dry run: ${DRY_RUN})`,
  ].join("\n");
  fs.writeFileSync(OUTPUT_PATH, report + "\n");

  if (DRY_RUN) {
    console.log("Dry run — no writes.");
    return;
  }

  for (const u of updates) {
    const { error } = await supabase
      .from("tweets")
      .update(u.clear ? { is_duplicate: false, duplicate_of: null } : { is_duplicate: true, duplicate_of: u.duplicate_of })
      .eq("id", u.id);
    if (error) console.error(`update failed for ${u.tweet_id}:`, error.message);
  }
  console.log("Done. Report written to dedup-report.md");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
