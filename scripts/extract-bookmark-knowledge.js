#!/usr/bin/env node

/**
 * Walks every bookmarked tweet for a given owner, including attached images,
 * and asks Claude to extract any prompts/workflows/skills mentioned.
 * Writes a consolidated markdown report.
 *
 * Usage:
 *   OWNER_USER_ID=<x_user_id or owner_user_id> node scripts/extract-bookmark-knowledge.js
 *
 * Required env (.env.local or shell):
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_KEY
 *
 * Extraction runs through the local Claude Code CLI (see claude-cli.js), so it
 * bills to the Claude subscription rather than Developer Platform credits.
 * No ANTHROPIC_API_KEY needed.
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { askClaude, askClaudeAboutImages } = require("./claude-cli");

const MODEL = "sonnet"; // CLI alias; the CLI resolves it to the current Sonnet
const OUTPUT_PATH = path.join(process.cwd(), "bookmark-knowledge-report.md");
// Images must be staged inside the project dir — the CLI is sandboxed to its
// working directory and can't read os.tmpdir().
const STAGE_ROOT = path.join(process.cwd(), "corpus-enrichment", ".extract-tmp");

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
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
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

async function fetchAllBookmarkedTweets(supabase, collectionId) {
  const pageSize = 100;
  let offset = 0;
  const allTweetIds = [];

  while (true) {
    const { data: rows, error } = await supabase
      .from("collection_tweets")
      .select("tweet_id")
      .eq("collection_id", collectionId)
      .order("added_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Failed to list collection_tweets: ${error.message}`);
    if (!rows?.length) break;

    allTweetIds.push(...rows.map((r) => r.tweet_id).filter(Boolean));
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  const tweets = [];
  for (let i = 0; i < allTweetIds.length; i += pageSize) {
    const batchIds = allTweetIds.slice(i, i + pageSize);
    const { data: rows, error } = await supabase
      .from("tweets")
      .select("tweet_id, tweet_text, author_handle, source_url, media")
      .in("tweet_id", batchIds);
    if (error) throw new Error(`Failed to fetch tweets: ${error.message}`);
    tweets.push(...(rows || []));
  }

  return tweets;
}

function buildExtractionPrompt(tweet) {
  return [
    "You are reviewing one bookmarked tweet (text and any attached screenshots).",
    "Extract any reusable AI prompts, workflows, or skills described or shown in it.",
    "",
    "Rules:",
    "- Only report content that is actually a prompt, a step-by-step workflow, or a named skill/technique.",
    "- If the tweet contains none of that, respond with exactly: NONE",
    "- Otherwise respond in markdown with a short title, then the extracted prompt/workflow verbatim (transcribe text from images exactly as written), then a one-line note on what it's for.",
    "- Do not add commentary beyond what's asked.",
    "",
    `Tweet text:\n${tweet.tweet_text || "(no text)"}`,
  ].join("\n");
}

const IMAGE_EXT = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

async function extractFromTweet(tweet) {
  const images = (Array.isArray(tweet.media) ? tweet.media : []).filter(
    (m) =>
      m?.type === "image" &&
      typeof m.url === "string" &&
      // `blob:` URLs are browser-session-only and dead outside the tab.
      /^https?:\/\//i.test(m.url)
  );

  const prompt = buildExtractionPrompt(tweet);
  fs.mkdirSync(STAGE_ROOT, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(STAGE_ROOT, "img-"));

  try {
    const localPaths = [];
    for (const [i, img] of images.slice(0, 4).entries()) {
      try {
        const resp = await fetch(img.url);
        if (!resp.ok) continue;
        const mediaType = (resp.headers.get("content-type") || "image/jpeg")
          .split(";")[0]
          .trim()
          .toLowerCase();
        const ext = IMAGE_EXT[mediaType];
        if (!ext) continue;
        const file = path.join(tmpDir, `${tweet.tweet_id}-${i}${ext}`);
        fs.writeFileSync(file, Buffer.from(await resp.arrayBuffer()));
        localPaths.push(file);
      } catch (err) {
        console.warn(`  [${tweet.tweet_id}] Failed to fetch image ${img.url}: ${err.message}`);
      }
    }

    let attempts = 0;
    while (true) {
      attempts += 1;
      try {
        return localPaths.length
          ? await askClaudeAboutImages(prompt, localPaths, { model: MODEL })
          : await askClaude(prompt, { model: MODEL });
      } catch (err) {
        if (attempts >= 4) throw new Error(`Exceeded retries for tweet ${tweet.tweet_id}: ${err.message}`);
        const waitMs = attempts * 2000;
        console.warn(`  [${tweet.tweet_id}] ${err.message}. Retrying in ${waitMs}ms.`);
        await sleep(waitMs);
      }
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const ownerUserId = process.env.OWNER_USER_ID;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      "Missing required env vars: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_KEY"
    );
    process.exit(1);
  }

  if (!ownerUserId) {
    console.error("Missing required env var: OWNER_USER_ID (your x_user_id / owner_user_id)");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const collectionId = await fetchBookmarksCollectionId(supabase, ownerUserId);
  if (!collectionId) {
    console.error("Could not find a 'bookmarks' collection for that owner.");
    process.exit(1);
  }

  const tweets = await fetchAllBookmarkedTweets(supabase, collectionId);
  console.log(`Found ${tweets.length} bookmarked tweets.`);

  const findings = [];

  for (const [index, tweet] of tweets.entries()) {
    console.log(`[${index + 1}/${tweets.length}] Processing tweet ${tweet.tweet_id}...`);
    try {
      const result = await extractFromTweet(tweet);
      if (result && result.trim() !== "NONE") {
        findings.push({ tweet, result });
        console.log(`  -> found something.`);
      }
    } catch (err) {
      console.error(`  [${tweet.tweet_id}] Error: ${err.message}`);
    }
  }

  const sections = findings.map(({ tweet, result }) => {
    const header = `## @${tweet.author_handle || "unknown"} — ${tweet.source_url || tweet.tweet_id}`;
    return `${header}\n\n${result}\n`;
  });

  const report = [
    "# Extracted prompts, workflows, and skills from bookmarked tweets",
    "",
    `Scanned ${tweets.length} bookmarked tweets, found ${findings.length} with extractable content.`,
    "",
    ...sections,
  ].join("\n");

  fs.writeFileSync(OUTPUT_PATH, report, "utf8");
  console.log(`\nDone. Wrote ${findings.length} findings to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error in extract-bookmark-knowledge script:", err);
  process.exit(1);
});
