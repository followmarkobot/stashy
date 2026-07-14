import type { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536-dim, matches the tweets.embedding column
const MAX_CHARS = 24000; // stays under the model's 8191-token input limit even for dense text
const BATCH = 32;

interface EmbeddableRow {
  id: number | string;
  tweet_id: string;
  tweet_text?: string | null;
  image_text?: string | null;
  article_content?: string | null;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Combine a tweet's raw text with the enrichment we store alongside it — OCR'd
 * image_text and archived article_content — into a single embedding input, so
 * image-only alpha and linked articles become findable by vector search.
 * Article text gets whatever character budget remains after tweet + image text.
 */
export function buildEmbeddingInput(row: EmbeddableRow): string {
  const tweet = clean(row.tweet_text);
  let image = clean(row.image_text);
  if (image.toUpperCase() === "NONE") image = "";
  const article = clean(row.article_content);

  const head: string[] = [];
  if (tweet) head.push(tweet);
  if (image) head.push(`[Image text]\n${image}`);
  let out = head.join("\n\n");

  if (article) {
    const remaining = MAX_CHARS - out.length - 2;
    if (remaining > 200) {
      let art = `[Article]\n${article}`;
      if (art.length > remaining) art = art.slice(0, remaining);
      out = out ? `${out}\n\n${art}` : art;
    }
  }

  return out.length > MAX_CHARS ? out.slice(0, MAX_CHARS) : out;
}

export interface EmbedResult {
  embedded: number;
  skipped: number;
  failed: number;
}

/**
 * Embed the given tweets (by tweet_id) that are currently missing an embedding,
 * writing the vector back to tweets.embedding. Best-effort and incremental:
 * already-embedded rows are left untouched. Intended to run inline after a
 * bookmark sync so new bookmarks are immediately searchable.
 */
export async function embedNewTweetsByTweetId(
  supabase: SupabaseClient,
  openaiApiKey: string,
  tweetIds: string[]
): Promise<EmbedResult> {
  const result: EmbedResult = { embedded: 0, skipped: 0, failed: 0 };
  const ids = Array.from(new Set(tweetIds.filter(Boolean)));
  if (!ids.length || !openaiApiKey) return result;

  const openai = new OpenAI({ apiKey: openaiApiKey });

  // Supabase caps `.in()` list sizes; chunk the lookup.
  const rows: EmbeddableRow[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data, error } = await supabase
      .from("tweets")
      .select("id, tweet_id, tweet_text, image_text, article_content")
      .in("tweet_id", chunk)
      .is("embedding", null);
    if (error) throw new Error(`Failed to load tweets for embedding: ${error.message}`);
    if (data) rows.push(...(data as EmbeddableRow[]));
  }

  const work = rows
    .map((row) => ({ row, content: buildEmbeddingInput(row) }))
    .filter((w) => {
      if (!w.content) result.skipped += 1;
      return Boolean(w.content);
    });

  for (let i = 0; i < work.length; i += BATCH) {
    const slice = work.slice(i, i + BATCH);
    let vectors: (number[] | null)[];
    try {
      const res = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: slice.map((w) => w.content),
      });
      vectors = res.data.map((d) => d.embedding);
    } catch {
      // Fall back to per-item so one bad input can't sink the batch.
      vectors = [];
      for (const w of slice) {
        try {
          const res = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: w.content,
          });
          vectors.push(res.data[0]?.embedding ?? null);
        } catch {
          vectors.push(null);
        }
      }
    }

    await Promise.all(
      slice.map(async (w, j) => {
        const embedding = vectors[j];
        if (!embedding) {
          result.failed += 1;
          return;
        }
        const { error } = await supabase
          .from("tweets")
          .update({ embedding })
          .eq("id", w.row.id);
        if (error) {
          result.failed += 1;
        } else {
          result.embedded += 1;
        }
      })
    );
  }

  return result;
}
