#!/usr/bin/env node

/**
 * Telegram bot that answers questions from the bookmarked-tweet corpus
 * (AI / UGC marketing / app growth, ~2.6k tweets from ~1.5k authors).
 *
 * Retrieval: real vector search via the match_tweets pgvector RPC (see
 * supabase/sql/semantic-search-setup.sql), now that the corpus is embedded
 * (embed-corpus.js) and cluster-deduped (cluster-corpus.js). Originally this
 * was plain keyword/term-overlap scoring — fine at this corpus size, but
 * lossy on synonyms/paraphrases ("how do I get users" vs "distribution" vs
 * "growth loop"). Vector search catches those; match_tweets' own `content`
 * field only returns raw tweet_text though (not the OCR/article-enriched
 * combined text embed-corpus.js actually embedded), so retrieval is used only
 * to get candidate tweet_ids — full enriched rows are re-fetched separately.
 *
 * The corpus spans hundreds of authors with genuinely conflicting views and
 * incentives (many are selling an agent, a skill, a course, or a cold-email
 * tool, which biases toward hype and tactics-as-content), so the answering
 * prompt is told to surface disagreement and cite authors rather than
 * flatten to one voice — and now also gets each tweet's semantic_cluster_id/
 * cluster_size, so it can tell "12 tweets independently agree" apart from
 * "12 tweets are the same idea paraphrased" (see cluster-corpus.js).
 *
 * Billing: answering uses the local Claude Code CLI subscription (see
 * claude-cli.js), not ANTHROPIC_API_KEY. Query embedding uses the OpenAI API
 * key (metered, but a single small embedding per question is negligible cost)
 * — same split as embed-corpus.js.
 *
 * Required env (.env.local):
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_ALLOWED_CHATS   comma-separated chat IDs
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_KEY
 *   OPENAI_API_KEY
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");
const { askClaude } = require("./claude-cli");

const MODEL = process.env.GROWTH_BOT_MODEL || "opus";
const EMBED_MODEL = process.env.GROWTH_BOT_EMBED_MODEL || "text-embedding-3-small";
const MATCH_COUNT = parseInt(process.env.GROWTH_BOT_MATCH_COUNT || "80", 10);
const MATCH_THRESHOLD = parseFloat(process.env.GROWTH_BOT_MATCH_THRESHOLD || "0.25");
const OFFSET_FILE = path.join(__dirname, "..", ".growth-bot-offset");
const LOG_PREFIX = () => new Date().toISOString();

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
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
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHATS = new Set(
  (process.env.TELEGRAM_ALLOWED_CHATS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");
if (!ALLOWED_CHATS.size) throw new Error("TELEGRAM_ALLOWED_CHATS not set");
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase env not set");
if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set (needed to embed incoming questions)");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

function log(...args) {
  console.log(LOG_PREFIX(), ...args);
}

// ---------------------------------------------------------------------------
// Retrieval (vector search)
// ---------------------------------------------------------------------------

function tweetText(row) {
  const parts = [row.tweet_text, row.image_text, row.article_content].filter(Boolean);
  return parts.join(" ").trim();
}

async function embedQuery(text) {
  const res = await openai.embeddings.create({ model: EMBED_MODEL, input: text });
  return res.data[0].embedding;
}

async function corpusSize() {
  const { count } = await supabase.from("tweets").select("*", { count: "exact", head: true }).eq("is_duplicate", false);
  return count || 0;
}

// match_tweets only returns {id, content, similarity} and content is raw
// tweet_text (not the OCR/article-enriched text actually embedded), so it's
// used purely to get candidate tweet_ids — full rows are re-fetched below.
async function retrieveTweets(question) {
  const embedding = await embedQuery(question);
  const { data: matches, error } = await supabase.rpc("match_tweets", {
    query_embedding: embedding,
    match_threshold: MATCH_THRESHOLD,
    match_count: MATCH_COUNT,
  });
  if (error) throw new Error(`match_tweets RPC failed: ${error.message}`);
  if (!matches || !matches.length) return { tweets: [], matchedCount: 0 };

  const ids = matches.map((m) => m.id);
  const { data: rows, error: rowsError } = await supabase
    .from("tweets")
    .select(
      "tweet_id, author_handle, tweet_text, image_text, article_content, created_at, public_metrics, topics, content_type, tools_mentioned, is_substantive, monetization_model, semantic_cluster_id, cluster_size"
    )
    .in("tweet_id", ids)
    .eq("is_duplicate", false);
  if (rowsError) throw rowsError;

  const simByTweetId = new Map(matches.map((m) => [m.id, m.similarity]));
  const byTweetId = new Map(rows.map((r) => [r.tweet_id, r]));

  // One representative per semantic cluster (highest-similarity member),
  // annotated with cluster_size so the model knows how many tweets that
  // cluster actually represents instead of treating each as independent.
  const bestPerCluster = new Map();
  for (const id of ids) {
    const row = byTweetId.get(id);
    if (!row) continue;
    const clusterKey = row.semantic_cluster_id || row.tweet_id;
    const sim = simByTweetId.get(id) || 0;
    const existing = bestPerCluster.get(clusterKey);
    if (!existing || sim > existing.similarity) bestPerCluster.set(clusterKey, { row, similarity: sim });
  }

  const selected = [...bestPerCluster.values()].sort((a, b) => b.similarity - a.similarity);
  return { tweets: selected.map((s) => s.row), matchedCount: matches.length };
}

// ---------------------------------------------------------------------------
// Answering
// ---------------------------------------------------------------------------

function buildPrompt(question, tweets, matchedCount, totalCorpusSize) {
  const authorCount = new Set(tweets.map((t) => t.author_handle)).size;
  const body = tweets
    .map((t) => {
      const date = (t.created_at || "").slice(0, 10);
      const m = t.public_metrics || {};
      const engagement = [m.like_count, m.retweet_count, m.bookmark_count].some((v) => v != null)
        ? ` [likes:${m.like_count ?? 0} rt:${m.retweet_count ?? 0} bookmarks:${m.bookmark_count ?? 0}]`
        : "";
      const tags = [
        t.topics && t.topics.length ? `topics:${t.topics.join("/")}` : null,
        t.content_type ? `type:${t.content_type}` : null,
        t.is_substantive === false ? "HYPE/LOW-SUBSTANCE" : t.is_substantive === true ? "substantive" : null,
        t.monetization_model ? `monetization:${t.monetization_model}` : null,
        t.cluster_size > 1 ? `repeated by ${t.cluster_size} tweets in corpus (paraphrase cluster)` : null,
      ]
        .filter(Boolean)
        .join(", ");
      return `@${t.author_handle || "unknown"} (${date})${engagement} {${tags}}: ${tweetText(t).replace(/\s+/g, " ").slice(0, 500)}`;
    })
    .join("\n\n");

  return `You are a research assistant answering questions from a personal Twitter/X bookmark corpus about AI, UGC marketing, and app growth. The corpus has ${totalCorpusSize} tweets from ~1,500 different authors — it is NOT a single source of truth, it's hundreds of people with different (often conflicting) opinions and incentives (many are selling an agent, a skill, a course, or a cold-email tool, which biases toward hype and tactics-as-content).

For this question, ${matchedCount} tweets matched semantically (vector search) out of the full corpus (showing ${tweets.length} below, one per distinct idea, from ${authorCount} distinct authors). Each excerpt is tagged with its topic/content-type/substance classification and engagement counts where available. "repeated by N tweets" means N different tweets in the corpus make essentially this same point — that's collapsed into this one excerpt so you don't double-count it as N independent opinions.

Rules:
- Answer ONLY from the excerpts below. Cite the author handle for every claim (e.g. "@handle argues...").
- Where authors disagree, say so explicitly — name both sides, don't average them into one flattened take. Disagreement is signal, not noise.
- A tweet marked "repeated by N tweets" is stronger signal of real consensus than a single opinion — but still just one pattern among possibly-conflicting others, and many repeaters are incentivized to parrot popular takes, not independently verify them. Weigh accordingly, and say so.
- Tweets marked HYPE/LOW-SUBSTANCE are weak evidence — lean on "substantive"-tagged ones and don't launder engagement-bait into a confident claim.
- If ${matchedCount} is small (under ~10), say plainly that this corpus has thin coverage on this topic before answering from what little is there.
- Don't use outside knowledge beyond what's in the excerpts — if the excerpts don't answer the question, say so.
- Keep the answer tight enough for a Telegram message — prioritize the sharpest 3-6 points over exhaustiveness.

Question: ${question}

Excerpts:
${body}`;
}

async function answerQuestion(question) {
  const [{ tweets, matchedCount }, totalCorpusSize] = await Promise.all([retrieveTweets(question), corpusSize()]);
  if (!tweets.length) {
    return "No semantically relevant tweets found in the corpus for this question — it's likely just not covered.";
  }
  const prompt = buildPrompt(question, tweets, matchedCount, totalCorpusSize);
  const answer = await askClaude(prompt, { model: MODEL, timeoutMs: 180_000 });
  return answer;
}

// ---------------------------------------------------------------------------
// Telegram plumbing
// ---------------------------------------------------------------------------

function loadOffset() {
  try {
    return JSON.parse(fs.readFileSync(OFFSET_FILE, "utf8")).offset || 0;
  } catch {
    return 0;
  }
}

function saveOffset(offset) {
  fs.writeFileSync(OFFSET_FILE, JSON.stringify({ offset }));
}

async function sendMessage(chatId, text) {
  const chunks = [];
  for (let i = 0; i < text.length; i += 3800) chunks.push(text.slice(i, i + 3800));
  for (const chunk of chunks) {
    const res = await fetch(`${TG_API}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk }),
    });
    if (!res.ok) log("sendMessage failed:", await res.text());
  }
}

async function getUpdates(offset) {
  const res = await fetch(
    `${TG_API}/getUpdates?timeout=30&offset=${offset}`,
    { signal: AbortSignal.timeout(40_000) }
  );
  if (!res.ok) throw new Error(`getUpdates failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.result || [];
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;
  const chatId = String(msg.chat.id);
  if (!ALLOWED_CHATS.has(chatId)) {
    log("ignored message from disallowed chat:", chatId);
    return;
  }
  log("question from", chatId, ":", msg.text.slice(0, 120));
  try {
    await sendMessage(chatId, "Digging through the corpus...");
    const answer = await answerQuestion(msg.text);
    await sendMessage(chatId, answer);
  } catch (err) {
    log("error handling update:", err);
    await sendMessage(chatId, `Error: ${err.message}`);
  }
}

async function main() {
  log("growth-advisor-bot starting, model:", MODEL);
  let offset = loadOffset();
  while (true) {
    try {
      const updates = await getUpdates(offset);
      for (const update of updates) {
        offset = update.update_id + 1;
        saveOffset(offset);
        await handleUpdate(update);
      }
    } catch (err) {
      log("poll error:", err.message || err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

if (require.main === module) main();

module.exports = { retrieveTweets, buildPrompt, answerQuestion, corpusSize };
