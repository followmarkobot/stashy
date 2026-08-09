#!/usr/bin/env node

/**
 * Groups tweets by embedding similarity — paraphrase-level redundancy, not
 * literal text match (that's dedup-corpus.js). Different authors independently
 * repeating the same idea in their own words is common in this niche ("cold
 * email works because everyone ignores it now" said 30 different ways); string
 * dedup can't catch that, but embeddings put paraphrases close together in
 * vector space.
 *
 * Every embedded row gets a semantic_cluster_id + cluster_size — a singleton
 * (no close match) is its own one-row cluster, so downstream synthesis/RAG
 * queries can do COUNT(DISTINCT semantic_cluster_id) to get the true count of
 * distinct ideas instead of raw tweet count, and can show "12 tweets, 3
 * distinct observations" instead of overcounting repetition as consensus.
 *
 * Brute-force pairwise cosine similarity — fine at this corpus size (~2.5k
 * embedded rows, one-time/periodic batch job, not a live query path). Vectors
 * are normalized once so similarity is a plain dot product in the inner loop.
 *
 * Idempotent: recomputes clusters from scratch every run (cheap enough here)
 * and only writes rows whose assignment actually changed, so re-running as
 * the corpus grows is safe.
 *
 * Run order: dedup-corpus.js -> enrich-corpus.js -> tag-corpus.js ->
 * embed-corpus.js -> cluster-corpus.js.
 *
 * Env flags:
 *   CLUSTER_THRESHOLD=<0-1>   cosine similarity floor for "same idea"
 *                             (default 0.80 — calibrated by hand against this
 *                             corpus on 2026-07-22: below ~0.80 it starts
 *                             merging tweets that just share topic/format
 *                             rather than making the same claim; 0.75-0.86 is
 *                             where genuine cross-author paraphrases of the
 *                             same specific claim actually land)
 *   CLUSTER_DRY_RUN=1         report only, write nothing
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const THRESHOLD = parseFloat(process.env.CLUSTER_THRESHOLD || "0.80");
const DRY_RUN = /^(1|true|yes)$/i.test(process.env.CLUSTER_DRY_RUN || "");
const OUTPUT_PATH = path.join(process.cwd(), "cluster-corpus-report.md");

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

function normalize(vec) {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

async function fetchEmbedded() {
  const rows = [];
  let from = 0;
  const pageSize = 500;
  while (true) {
    const { data, error } = await supabase
      .from("tweets")
      .select("id, tweet_id, embedding, semantic_cluster_id, cluster_size, created_at")
      .not("embedding", "is", null)
      .eq("is_duplicate", false)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  console.log("Fetching embedded rows...");
  const rows = await fetchEmbedded();
  console.log(`${rows.length} rows with embeddings.`);

  console.log("Parsing + normalizing vectors...");
  const vectors = rows.map((r) => normalize(Float32Array.from(JSON.parse(r.embedding))));

  console.log(`Computing pairwise similarity (threshold ${THRESHOLD})...`);
  const uf = makeUnionFind(rows.length);
  const n = rows.length;
  let comparisons = 0;
  let matched = 0;
  const startTime = Date.now();

  for (let i = 0; i < n; i++) {
    const vi = vectors[i];
    for (let j = i + 1; j < n; j++) {
      const vj = vectors[j];
      let dot = 0;
      for (let k = 0; k < vi.length; k++) dot += vi[k] * vj[k];
      comparisons++;
      if (dot >= THRESHOLD) {
        uf.union(i, j);
        matched++;
      }
    }
    if (i > 0 && i % 500 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ...${i}/${n} rows compared (${elapsed}s elapsed, ${matched} matches so far)`);
    }
  }
  console.log(`Done: ${comparisons} pairs compared, ${matched} matched >= ${THRESHOLD}.`);

  // Build clusters; canonical cluster id = lowest tweet_id in the cluster
  // (stable across re-runs regardless of fetch order).
  const clusterMembers = new Map();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    if (!clusterMembers.has(root)) clusterMembers.set(root, []);
    clusterMembers.get(root).push(i);
  }

  const updates = [];
  let multiClusterCount = 0;
  let singletonCount = 0;
  const sizeHistogram = {};

  for (const members of clusterMembers.values()) {
    const canonicalId = members.map((idx) => rows[idx].tweet_id).sort()[0];
    const size = members.length;
    if (size > 1) multiClusterCount++;
    else singletonCount++;
    sizeHistogram[size] = (sizeHistogram[size] || 0) + 1;

    for (const idx of members) {
      const row = rows[idx];
      if (row.semantic_cluster_id === canonicalId && row.cluster_size === size) continue; // unchanged
      updates.push({ id: row.id, tweet_id: row.tweet_id, semantic_cluster_id: canonicalId, cluster_size: size });
    }
  }

  console.log(`Clusters: ${clusterMembers.size} total (${multiClusterCount} multi-tweet, ${singletonCount} singleton).`);
  console.log(`Rows to write: ${updates.length}`);

  const topClusters = [...clusterMembers.values()]
    .filter((m) => m.length > 1)
    .sort((a, b) => b.length - a.length)
    .slice(0, 15)
    .map((members) => ({ size: members.length, tweet_ids: members.map((i) => rows[i].tweet_id) }));

  const report = [
    "# Cluster Corpus Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Similarity threshold: ${THRESHOLD}`,
    "",
    `- Rows with embeddings: ${rows.length}`,
    `- Pairs compared: ${comparisons}`,
    `- Pairs matched: ${matched}`,
    `- Total clusters: ${clusterMembers.size}`,
    `- Multi-tweet clusters (paraphrase groups): ${multiClusterCount}`,
    `- Singleton clusters (no close match): ${singletonCount}`,
    `- Rows written this run: ${DRY_RUN ? 0 : updates.length} (dry run: ${DRY_RUN})`,
    "",
    "## Cluster size distribution",
    ...Object.entries(sizeHistogram)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([size, count]) => `- size ${size}: ${count} clusters`),
    "",
    "## Top 15 largest paraphrase clusters (tweet_ids)",
    ...topClusters.map((c) => `- size ${c.size}: ${c.tweet_ids.join(", ")}`),
  ].join("\n");
  fs.writeFileSync(OUTPUT_PATH, report + "\n");

  if (DRY_RUN) {
    console.log("Dry run — no writes.");
    return;
  }

  console.log("Writing cluster assignments...");
  for (const u of updates) {
    const { error } = await supabase
      .from("tweets")
      .update({ semantic_cluster_id: u.semantic_cluster_id, cluster_size: u.cluster_size })
      .eq("id", u.id);
    if (error) console.error(`update failed for ${u.tweet_id}:`, error.message);
  }
  console.log("Done. Report written to cluster-corpus-report.md");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
