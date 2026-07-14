#!/usr/bin/env node

/**
 * Enriches bookmarked tweets by capturing the alpha that lives OUTSIDE the tweet
 * text — inside attached images and linked articles/pages — and writing it back
 * so it becomes real, searchable, embeddable text in the corpus.
 *
 *   1. Image OCR + description  -> tweets.image_text
 *      Every word visible in attached images (charts, screenshots, slides,
 *      infographics, memes) is transcribed verbatim, plus a short description.
 *   2. Article / linked-page archival -> tweets.article_content
 *      The page behind each external link (link_cards / urls) is fetched and a
 *      clean full-text copy is stored, so a saved tweet is a re-readable backup.
 *   3. Video: skipped by design (only thumbnails are stored in the DB; real
 *      audio would require re-fetching each mp4 from X). Counts are reported.
 *
 * Everything is ALSO written to local files under corpus-enrichment/ and a
 * summary report (corpus-enrichment-report.md) for review.
 *
 * Usage:
 *   OWNER_USER_ID=<x_user_id> node scripts/enrich-corpus.js
 *
 * Optional env:
 *   ENRICH_LIMIT=<n>     only process the first n tweets (smoke test)
 *   ENRICH_FORCE=1       re-process tweets that already have image_text/article_content
 *   ENRICH_IMAGES=0      skip the image OCR pass
 *   ENRICH_ARTICLES=0    skip the article/link pass
 *   DRY_RUN=1            do everything except write back to Supabase
 *
 * Required env (.env.local or shell):
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");

const MODEL = "claude-sonnet-4-5"; // vision-capable; used for image OCR
const OUT_DIR = path.join(process.cwd(), "corpus-enrichment");
const REPORT_PATH = path.join(process.cwd(), "corpus-enrichment-report.md");
const DATA_PATH = path.join(OUT_DIR, "enrichment-data.json");

const FORCE = process.env.ENRICH_FORCE === "1";
const DO_IMAGES = process.env.ENRICH_IMAGES !== "0";
const DO_ARTICLES = process.env.ENRICH_ARTICLES !== "0";
const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = process.env.ENRICH_LIMIT ? parseInt(process.env.ENRICH_LIMIT, 10) : 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}

async function fetchBookmarksCollectionId(supabase, ownerUserId) {
  for (const col of ["owner_user_id", "owner_x_user_id"]) {
    const { data, error } = await supabase
      .from("collections")
      .select("id")
      .eq(col, ownerUserId)
      .eq("slug", "bookmarks")
      .maybeSingle();
    if (!error && data?.id) return data.id;
  }
  return null;
}

async function fetchBookmarkedTweets(supabase, collectionId) {
  const pageSize = 100;
  let offset = 0;
  const ids = [];
  while (true) {
    const { data, error } = await supabase
      .from("collection_tweets")
      .select("tweet_id")
      .eq("collection_id", collectionId)
      .order("added_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`collection_tweets: ${error.message}`);
    if (!data?.length) break;
    ids.push(...data.map((r) => r.tweet_id).filter(Boolean));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  const tweets = [];
  for (let i = 0; i < ids.length; i += pageSize) {
    const batch = ids.slice(i, i + pageSize);
    const { data, error } = await supabase
      .from("tweets")
      .select(
        "tweet_id, tweet_text, author_handle, source_url, media, link_cards, urls, article_url, has_article, has_link, image_text, article_content, saved_at"
      )
      .in("tweet_id", batch);
    if (error) throw new Error(`tweets: ${error.message}`);
    tweets.push(...(data || []));
  }
  // preserve bookmark order (most recent first)
  const order = new Map(ids.map((id, i) => [id, i]));
  tweets.sort((a, b) => (order.get(a.tweet_id) ?? 0) - (order.get(b.tweet_id) ?? 0));
  return tweets;
}

// ---------- Image OCR ----------

function imageUrls(tweet) {
  const media = Array.isArray(tweet.media) ? tweet.media : [];
  return media.filter((m) => m?.type === "image" && typeof m.url === "string").map((m) => m.url);
}

function buildImagePrompt(tweet) {
  return [
    "You are extracting the full information content from image(s) attached to a saved tweet,",
    "so it becomes searchable text in a writing corpus. Respond in markdown with exactly:",
    "",
    "**Transcription:** every piece of text visible in the image(s), verbatim, in reading order,",
    "preserving structure (lists, code, tables, labels). Include text in screenshots, charts,",
    "slides, diagrams, memes, and handwriting.",
    "",
    "**Description:** 1-3 sentences on what the image shows (chart of what, UI screenshot of what,",
    "diagram of what, photo of what).",
    "",
    "If the image is purely decorative with no meaningful text or informational content,",
    "respond with exactly: NONE",
    "",
    `Tweet text for context:\n${tweet.tweet_text || "(no text)"}`,
  ].join("\n");
}

async function ocrImages(anthropicApiKey, tweet) {
  const urls = imageUrls(tweet).slice(0, 6);
  if (!urls.length) return null;

  const content = [{ type: "text", text: buildImagePrompt(tweet) }];
  for (const url of urls) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const mediaType = resp.headers.get("content-type") || "image/jpeg";
      const buf = Buffer.from(await resp.arrayBuffer());
      content.push({
        type: "image",
        source: { type: "base64", media_type: mediaType.split(";")[0], data: buf.toString("base64") },
      });
    } catch (err) {
      console.warn(`    image fetch failed (${url}): ${err.message}`);
    }
  }
  if (content.length === 1) return null; // no images actually loaded

  let attempts = 0;
  while (attempts < 4) {
    attempts += 1;
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: "user", content }] }),
    });
    if (resp.status === 429 && attempts < 4) {
      await sleep(attempts * 2500);
      continue;
    }
    if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`);
    const data = await resp.json();
    const text = Array.isArray(data?.content)
      ? data.content.filter((b) => b?.type === "text").map((b) => b.text).join("\n").trim()
      : "";
    return text;
  }
  throw new Error("exceeded Anthropic retries");
}

// ---------- Article / linked-page archival ----------

const SKIP_HOSTS = /(^|\.)(twitter\.com|x\.com|t\.co|pbs\.twimg\.com|twimg\.com)$/i;

function candidateUrls(tweet) {
  const out = [];
  const push = (u) => {
    if (typeof u === "string" && /^https?:\/\//i.test(u)) out.push(u.trim());
  };
  for (const c of Array.isArray(tweet.link_cards) ? tweet.link_cards : []) push(c?.url);
  for (const u of Array.isArray(tweet.urls) ? tweet.urls : []) push(u);
  push(tweet.article_url);
  // de-dupe, drop obvious twitter/media hosts (keep t.co for now — resolved on fetch)
  const seen = new Set();
  const result = [];
  for (const u of out) {
    let host = "";
    try {
      host = new URL(u).hostname;
    } catch {
      continue;
    }
    if (SKIP_HOSTS.test(host) && host !== "t.co") continue;
    if (seen.has(u)) continue;
    seen.add(u);
    result.push(u);
  }
  return result;
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(parseInt(n, 10));
      } catch {
        return "";
      }
    });
}

function htmlToText(html) {
  let title = "";
  const tMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (tMatch) title = decodeEntities(tMatch[1].replace(/\s+/g, " ").trim());
  let desc = "";
  const dMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
  if (dMatch) desc = decodeEntities(dMatch[1].trim());

  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ");
  body = decodeEntities(body)
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, desc, body };
}

async function fetchUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    // GitHub repo -> fetch raw README for clean content
    const gh = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/?#]+)\/?$/i);
    let fetchUrlFinal = url;
    if (gh) {
      for (const branch of ["HEAD", "main", "master"]) {
        const raw = `https://raw.githubusercontent.com/${gh[1]}/${gh[2]}/${branch}/README.md`;
        const r = await fetch(raw, { signal: controller.signal, redirect: "follow" });
        if (r.ok) {
          const md = await r.text();
          return { ok: true, finalUrl: raw, title: `${gh[1]}/${gh[2]} (README)`, desc: "", body: md.slice(0, 40000) };
        }
      }
    }
    const resp = await fetch(fetchUrlFinal, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
    });
    const finalUrl = resp.url || fetchUrlFinal;
    if (!resp.ok) return { ok: false, finalUrl, status: resp.status };
    // if a t.co resolved to twitter, skip
    try {
      if (SKIP_HOSTS.test(new URL(finalUrl).hostname)) return { ok: false, finalUrl, status: "twitter-self" };
    } catch {}
    const ctype = resp.headers.get("content-type") || "";
    if (!/text\/html|text\/plain/i.test(ctype)) return { ok: false, finalUrl, status: `ctype:${ctype}` };
    const html = await resp.text();

    // Prefer Mozilla Readability (already a repo dep) for a clean article body;
    // fall back to a plain tag-strip if it can't parse the page.
    try {
      const dom = new JSDOM(html, { url: finalUrl });
      const article = new Readability(dom.window.document).parse();
      if (article && article.textContent && article.textContent.trim().length > 200) {
        return {
          ok: true,
          finalUrl,
          title: (article.title || "").trim(),
          desc: (article.excerpt || "").trim(),
          body: article.textContent.replace(/\n{3,}/g, "\n\n").trim().slice(0, 40000),
        };
      }
    } catch {
      /* fall through to htmlToText */
    }
    const { title, desc, body } = htmlToText(html);
    return { ok: true, finalUrl, title, desc, body: body.slice(0, 40000) };
  } catch (err) {
    return { ok: false, finalUrl: url, status: err.name === "AbortError" ? "timeout" : err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function archiveArticles(tweet) {
  const urls = candidateUrls(tweet).slice(0, 2);
  if (!urls.length) return null;
  const parts = [];
  const meta = [];
  for (const url of urls) {
    const r = await fetchUrl(url);
    if (r.ok && r.body && r.body.trim().length > 0) {
      parts.push(
        `# ${r.title || r.finalUrl}\nSource: ${r.finalUrl}\n${r.desc ? `\n> ${r.desc}\n` : ""}\n${r.body}`
      );
      meta.push({ url, finalUrl: r.finalUrl, ok: true, chars: r.body.length });
    } else {
      meta.push({ url, finalUrl: r.finalUrl, ok: false, status: r.status });
    }
  }
  if (!parts.length) return { content: null, meta };
  return { content: parts.join("\n\n---\n\n"), meta };
}

// ---------- persistence ----------

function slugHost(url) {
  try {
    return new URL(url).hostname.replace(/[^a-z0-9.]/gi, "_");
  } catch {
    return "link";
  }
}

async function main() {
  loadEnvLocal();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const ownerUserId = process.env.OWNER_USER_ID;
  if (!supabaseUrl || !supabaseKey || !anthropicKey) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY / ANTHROPIC_API_KEY");
    process.exit(1);
  }
  if (!ownerUserId) {
    console.error("Missing OWNER_USER_ID");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const collectionId = await fetchBookmarksCollectionId(supabase, ownerUserId);
  if (!collectionId) {
    console.error("No bookmarks collection for that owner.");
    process.exit(1);
  }

  let tweets = await fetchBookmarkedTweets(supabase, collectionId);
  if (LIMIT) tweets = tweets.slice(0, LIMIT);
  console.log(
    `Loaded ${tweets.length} bookmarked tweets. images=${DO_IMAGES} articles=${DO_ARTICLES} force=${FORCE} dryRun=${DRY_RUN}`
  );

  fs.mkdirSync(path.join(OUT_DIR, "images"), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, "articles"), { recursive: true });

  const stats = {
    total: tweets.length,
    imageTweets: 0,
    imageOcrWritten: 0,
    imageNone: 0,
    imageSkipped: 0,
    articleTweets: 0,
    articleWritten: 0,
    articleFailed: 0,
    articleSkipped: 0,
    videoTweets: 0,
    errors: 0,
  };
  const data = [];

  for (const [i, t] of tweets.entries()) {
    const media = Array.isArray(t.media) ? t.media : [];
    const hasImages = media.some((m) => m?.type === "image");
    const hasVideo = media.some((m) => m?.type === "video" || m?.type === "gif");
    if (hasVideo) stats.videoTweets += 1;

    const rec = { tweet_id: t.tweet_id, author: t.author_handle, source_url: t.source_url };
    console.log(`[${i + 1}/${tweets.length}] ${t.tweet_id} @${t.author_handle || "?"}`);

    // ---- images ----
    if (DO_IMAGES && hasImages) {
      stats.imageTweets += 1;
      if (!FORCE && t.image_text && t.image_text.trim()) {
        stats.imageSkipped += 1;
        console.log("    image_text already present — skip");
      } else {
        try {
          const ocr = await ocrImages(anthropicKey, t);
          if (ocr && ocr.trim() && ocr.trim() !== "NONE") {
            rec.image_text = ocr.trim();
            fs.writeFileSync(
              path.join(OUT_DIR, "images", `${t.tweet_id}.md`),
              `# @${t.author_handle} — ${t.source_url || t.tweet_id}\n\n${ocr.trim()}\n`,
              "utf8"
            );
            if (!DRY_RUN) {
              const { error } = await supabase.from("tweets").update({ image_text: ocr.trim() }).eq("tweet_id", t.tweet_id);
              if (error) throw new Error(`db image_text: ${error.message}`);
            }
            stats.imageOcrWritten += 1;
            console.log(`    image_text written (${ocr.trim().length} chars)`);
          } else {
            stats.imageNone += 1;
            console.log("    image had no meaningful text (NONE)");
          }
        } catch (err) {
          stats.errors += 1;
          console.error(`    image OCR error: ${err.message}`);
        }
      }
    }

    // ---- articles / links ----
    if (DO_ARTICLES) {
      const cands = candidateUrls(t);
      if (cands.length) {
        stats.articleTweets += 1;
        if (!FORCE && t.article_content && t.article_content.trim()) {
          stats.articleSkipped += 1;
          console.log("    article_content already present — skip");
        } else {
          try {
            const res = await archiveArticles(t);
            rec.links = res?.meta || [];
            if (res && res.content) {
              rec.article_content_chars = res.content.length;
              const fname = `${t.tweet_id}__${slugHost(res.meta.find((m) => m.ok)?.finalUrl || cands[0])}.md`;
              fs.writeFileSync(path.join(OUT_DIR, "articles", fname), res.content, "utf8");
              if (!DRY_RUN) {
                const { error } = await supabase.from("tweets").update({ article_content: res.content }).eq("tweet_id", t.tweet_id);
                if (error) throw new Error(`db article_content: ${error.message}`);
              }
              stats.articleWritten += 1;
              console.log(`    article_content written (${res.content.length} chars)`);
            } else {
              stats.articleFailed += 1;
              console.log(`    no fetchable article content (${JSON.stringify(rec.links)})`);
            }
          } catch (err) {
            stats.errors += 1;
            console.error(`    article error: ${err.message}`);
          }
        }
      }
    }

    if (rec.image_text || rec.article_content_chars || rec.links) data.push(rec);
    await sleep(200);
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify({ generated: new Date().toISOString(), stats, data }, null, 2), "utf8");

  const report = [
    "# Corpus Enrichment Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    DRY_RUN ? "\n> DRY RUN — nothing written to Supabase.\n" : "",
    "## Summary",
    "",
    "| Metric | Value |",
    "|--------|-------|",
    `| Bookmarked tweets scanned | ${stats.total} |`,
    `| Tweets with images | ${stats.imageTweets} |`,
    `| → image_text written | ${stats.imageOcrWritten} |`,
    `| → no meaningful text (NONE) | ${stats.imageNone} |`,
    `| → skipped (already had image_text) | ${stats.imageSkipped} |`,
    `| Tweets with external links | ${stats.articleTweets} |`,
    `| → article_content written | ${stats.articleWritten} |`,
    `| → link unreachable/blocked | ${stats.articleFailed} |`,
    `| → skipped (already had article_content) | ${stats.articleSkipped} |`,
    `| Tweets with video (skipped by design) | ${stats.videoTweets} |`,
    `| Errors | ${stats.errors} |`,
    "",
    "Local copies: `corpus-enrichment/images/`, `corpus-enrichment/articles/`, `corpus-enrichment/enrichment-data.json`.",
    "",
  ].join("\n");
  fs.writeFileSync(REPORT_PATH, report, "utf8");
  console.log(`\nDone.\n${report}`);
}

main().catch((err) => {
  console.error("Fatal error in enrich-corpus:", err);
  process.exit(1);
});
