#!/usr/bin/env node

/**
 * One-shot backfill for the two ingest paths that share the `tweets` table.
 *
 * Two writers populate `tweets` with different conventions:
 *   - the clerk-chrome-extension (tweet-saver.ts) writes curated saves straight
 *     to `tweets`, never creating a `collection_tweets` row, and stores handles
 *     as "@handle";
 *   - stashy's bookmark sync writes uncurated X bookmarks plus membership rows,
 *     and stores handles as "handle".
 *
 * This does three things:
 *   1. links every extension-saved tweet into a `curated` collection so the
 *      audit/enrichment scripts can see them;
 *   2. normalizes author_handle to the bare form so authors stop being counted
 *      twice (the extension side is fixed at source in tweet-extractor.ts);
 *   3. reports the text-less stub rows the extension used to mint for quoted
 *      tweets that weren't in the DOM (no FK ever required them).
 *
 * Dry run by default. Pass --apply to write.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const APPLY = process.argv.includes("--apply");
const CURATED_SLUG = "curated";
const CURATED_NAME = "Curated";

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      if (!line.includes("=") || line.trim().startsWith("#")) continue;
      const i = line.indexOf("=");
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

async function fetchAll(supabase, table, columns) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(offset, offset + 999);
    if (error) throw new Error(`${table} fetch failed: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

/**
 * The extension stores its own mapped Tweet object in raw_json (so raw_json has
 * a tweet_id key); sync stores X's API payload (which uses `id`). That shape
 * difference is the only reliable provenance marker on the row.
 */
function isExtensionWritten(row) {
  if (!row.raw_json) return false;
  let parsed = row.raw_json;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return false;
    }
  }
  return !!parsed && parsed.tweet_id !== undefined;
}

const isStub = (row) => !row.tweet_text && !row.author_handle;

async function main() {
  loadEnv();
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required");
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(APPLY ? "MODE: APPLY (writing)\n" : "MODE: DRY RUN (no writes; pass --apply)\n");

  const tweets = await fetchAll(
    supabase,
    "tweets",
    "tweet_id, tweet_text, author_handle, raw_json"
  );
  const memberships = await fetchAll(supabase, "collection_tweets", "collection_id, tweet_id");

  const collections = await fetchAll(
    supabase,
    "collections",
    "id, owner_user_id, slug, name"
  );
  const bookmarks = collections.find((c) => c.slug === "bookmarks");
  if (!bookmarks) throw new Error("No `bookmarks` collection found to inherit owner_user_id from");
  const ownerUserId = bookmarks.owner_user_id;

  // --- 1. curated collection membership -------------------------------------
  // Membership is not exclusive: a tweet the extension curated can also be a
  // real X bookmark. Only existing `curated` membership disqualifies a row.
  const existingCurated = collections.find((c) => c.slug === CURATED_SLUG);
  const alreadyCurated = new Set(
    existingCurated
      ? memberships.filter((m) => m.collection_id === existingCurated.id).map((m) => m.tweet_id)
      : []
  );
  const inBookmarks = new Set(
    memberships.filter((m) => m.collection_id === bookmarks.id).map((m) => m.tweet_id)
  );
  const extensionSaved = tweets.filter((t) => !isStub(t) && isExtensionWritten(t));
  const toLink = extensionSaved.filter((t) => !alreadyCurated.has(t.tweet_id));

  console.log("=== curated collection ===");
  console.log(`  owner_user_id:            ${ownerUserId} (inherited from bookmarks)`);
  console.log(`  extension-saved tweets:   ${extensionSaved.length}`);
  console.log(`  already in '${CURATED_SLUG}':        ${extensionSaved.length - toLink.length}`);
  console.log(`  to link into '${CURATED_SLUG}':      ${toLink.length}`);
  console.log(
    `    of which also in bookmarks: ${toLink.filter((t) => inBookmarks.has(t.tweet_id)).length} (curated AND bookmarked; both memberships are correct)`
  );

  // --- 2. author_handle normalization ---------------------------------------
  const needNormalize = tweets.filter(
    (t) => typeof t.author_handle === "string" && t.author_handle.startsWith("@")
  );
  const bare = (h) => h.replace(/^@+/, "");
  const distinctAfter = new Set(
    tweets.filter((t) => t.author_handle).map((t) => bare(t.author_handle).toLowerCase())
  );
  const distinctBefore = new Set(
    tweets.filter((t) => t.author_handle).map((t) => t.author_handle.toLowerCase())
  );

  console.log("\n=== author_handle normalization ===");
  console.log(`  rows with a leading '@':  ${needNormalize.length}`);
  console.log(`  distinct handles before:  ${distinctBefore.size}`);
  console.log(`  distinct handles after:   ${distinctAfter.size}`);
  console.log(`  duplicate identities merged: ${distinctBefore.size - distinctAfter.size}`);

  // --- 3. stub rows (report only) -------------------------------------------
  const stubs = tweets.filter(isStub);
  console.log("\n=== text-less stub rows (report only, not deleted) ===");
  console.log(`  stubs present: ${stubs.length}`);
  console.log("  (extension no longer mints these; delete separately once reviewed)");

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with --apply to write.");
    return;
  }

  // --- writes ---------------------------------------------------------------
  let curatedId = collections.find((c) => c.slug === CURATED_SLUG)?.id;
  if (!curatedId) {
    const { data, error } = await supabase
      .from("collections")
      .insert({
        owner_user_id: ownerUserId,
        name: CURATED_NAME,
        slug: CURATED_SLUG,
        visibility: "private",
        is_system: false,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Failed to create curated collection: ${error.message}`);
    curatedId = data.id;
    console.log(`\ncreated collection '${CURATED_SLUG}' -> ${curatedId}`);
  } else {
    console.log(`\nreusing existing collection '${CURATED_SLUG}' -> ${curatedId}`);
  }

  for (let i = 0; i < toLink.length; i += 500) {
    const batch = toLink.slice(i, i + 500).map((t) => ({
      collection_id: curatedId,
      tweet_id: t.tweet_id,
    }));
    const { error } = await supabase
      .from("collection_tweets")
      .upsert(batch, { onConflict: "collection_id,tweet_id", ignoreDuplicates: true });
    if (error) throw new Error(`membership upsert failed: ${error.message}`);
  }
  console.log(`linked ${toLink.length} tweets into '${CURATED_SLUG}'`);

  let normalized = 0;
  for (const row of needNormalize) {
    const { error } = await supabase
      .from("tweets")
      .update({ author_handle: bare(row.author_handle) })
      .eq("tweet_id", row.tweet_id);
    if (error) throw new Error(`handle update failed for ${row.tweet_id}: ${error.message}`);
    normalized++;
    if (normalized % 100 === 0) console.log(`  normalized ${normalized}/${needNormalize.length}`);
  }
  console.log(`normalized ${normalized} author_handle values`);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
