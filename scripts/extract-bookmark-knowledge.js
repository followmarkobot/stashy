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
 *   ANTHROPIC_API_KEY
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const MODEL = "claude-sonnet-4-5";
const OUTPUT_PATH = path.join(process.cwd(), "bookmark-knowledge-report.md");

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

async function extractFromTweet(anthropicApiKey, tweet) {
  const images = (Array.isArray(tweet.media) ? tweet.media : []).filter(
    (m) => m?.type === "image" && typeof m.url === "string"
  );

  const content = [{ type: "text", text: buildExtractionPrompt(tweet) }];

  for (const img of images.slice(0, 4)) {
    try {
      const resp = await fetch(img.url);
      if (!resp.ok) continue;
      const contentType = resp.headers.get("content-type") || "image/jpeg";
      const buf = Buffer.from(await resp.arrayBuffer());
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: contentType,
          data: buf.toString("base64"),
        },
      });
    } catch (err) {
      console.warn(`  [${tweet.tweet_id}] Failed to fetch image ${img.url}: ${err.message}`);
    }
  }

  let attempts = 0;
  while (attempts < 4) {
    attempts += 1;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content }],
      }),
    });

    if (response.status === 429 && attempts < 4) {
      const waitMs = attempts * 2000;
      console.warn(`  [${tweet.tweet_id}] Rate limited. Retrying in ${waitMs}ms.`);
      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = Array.isArray(data?.content)
      ? data.content
          .filter((b) => b?.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim()
      : "";
    return text;
  }

  throw new Error(`Exceeded retries for tweet ${tweet.tweet_id}`);
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const ownerUserId = process.env.OWNER_USER_ID;

  if (!supabaseUrl || !supabaseServiceKey || !anthropicApiKey) {
    console.error(
      "Missing required env vars: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY"
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
      const result = await extractFromTweet(anthropicApiKey, tweet);
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
