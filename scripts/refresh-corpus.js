#!/usr/bin/env node

/**
 * Keeps the corpus current in one command: enrich any new bookmarks (OCR image
 * text + archive linked articles) and then embed anything unembedded, including
 * the rows just enriched. Both underlying scripts are incremental, so this is
 * safe to run on a schedule (see .github/workflows/refresh-corpus.yml) — it only
 * touches tweets that still need work.
 *
 * Env: same as the two child scripts —
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY,
 *   OWNER_USER_ID (for the enrichment pass' bookmarks-collection lookup).
 */

const { spawnSync } = require("child_process");
const path = require("path");

function run(scriptFile) {
  const scriptPath = path.join(__dirname, scriptFile);
  console.log(`\n=== running ${scriptFile} ===`);
  const res = spawnSync(process.execPath, [scriptPath], {
    stdio: "inherit",
    env: process.env,
  });
  if (res.status !== 0) {
    throw new Error(`${scriptFile} exited with code ${res.status}`);
  }
}

try {
  run("enrich-corpus.js"); // OCR images + archive articles into the new rows
  run("embed-corpus.js"); // embed unembedded rows + re-embed the freshly enriched ones
  console.log("\nCorpus refresh complete.");
} catch (err) {
  console.error("\nCorpus refresh failed:", err.message);
  process.exit(1);
}
