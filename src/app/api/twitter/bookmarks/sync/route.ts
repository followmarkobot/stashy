import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mapXBookmarksToTweets } from "@/lib/twitter";
import { persistBookmarksForOwnerWithClient } from "@/lib/bookmarkPersistence";
import { embedNewTweetsByTweetId } from "@/lib/corpusEmbedding";
import type { Tweet } from "@/lib/supabase";

export const runtime = "nodejs";

interface BookmarkResponse {
  data?: unknown[];
  includes?: {
    users?: unknown[];
    media?: unknown[];
    tweets?: unknown[];
  };
  meta?: {
    next_token?: string;
  };
}

let _serviceSupabase: SupabaseClient | null = null;

function getServiceSupabase(): SupabaseClient | null {
  if (_serviceSupabase) return _serviceSupabase;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  _serviceSupabase = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _serviceSupabase;
}

async function fetchBookmarksFromX(accessToken: string, userId: string): Promise<BookmarkResponse> {
  const url = new URL(`https://api.x.com/2/users/${userId}/bookmarks`);
  url.searchParams.set(
    "tweet.fields",
    "created_at,public_metrics,entities,in_reply_to_user_id,conversation_id,referenced_tweets,attachments,article"
  );
  url.searchParams.set(
    "expansions",
    "author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id"
  );
  url.searchParams.set("user.fields", "name,username,profile_image_url");
  url.searchParams.set("media.fields", "url,preview_image_url,type,width,height");
  url.searchParams.set("max_results", "100");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Bookmarks fetch failed: ${details}`);
  }

  return (await response.json()) as BookmarkResponse;
}

async function persistBookmarks(ownerXUserId: string, tweets: Tweet[]) {
  if (!tweets.length) {
    return {
      canonical_upserted: 0,
      membership_upserted: 0,
      bookmarks_collection_id: "",
      retried_without_optional_fields: false,
      used_legacy_owner_column: false,
    };
  }
  const supabase = getServiceSupabase();
  if (!supabase) {
    throw new Error("Supabase service client is not configured");
  }
  return await persistBookmarksForOwnerWithClient(supabase, ownerXUserId, tweets);
}

export async function POST(request: NextRequest) {
  const accessTokenCookie = request.cookies.get("x_access_token")?.value;
  const userId = request.cookies.get("x_user_id")?.value;

  if (!accessTokenCookie || !userId) {
    return NextResponse.json({ error: "Not connected to X." }, { status: 401 });
  }

  try {
    const payload = await fetchBookmarksFromX(accessTokenCookie, userId);
    const tweets = mapXBookmarksToTweets(
      payload.data as Parameters<typeof mapXBookmarksToTweets>[0],
      payload.includes as Parameters<typeof mapXBookmarksToTweets>[1]
    );
    const persistence = await persistBookmarks(userId, tweets);

    // Embed the just-synced tweets so new bookmarks are immediately searchable.
    // Best-effort: embedding failures (or a missing OPENAI_API_KEY) must never
    // fail the sync itself. Only rows still missing an embedding are touched;
    // the slower OCR/article enrichment + re-embed runs out of band (cron).
    let embedded_count = 0;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey && tweets.length) {
      try {
        const supabase = getServiceSupabase();
        if (supabase) {
          const { embedded } = await embedNewTweetsByTweetId(
            supabase,
            openaiApiKey,
            tweets.map((tweet) => tweet.tweet_id)
          );
          embedded_count = embedded;
        }
      } catch (embedError) {
        console.error("Post-sync embedding failed (non-fatal):", embedError);
      }
    }

    return NextResponse.json({
      status: "ok",
      fetched_count: tweets.length,
      persisted_count: persistence.membership_upserted,
      canonical_upserted: persistence.canonical_upserted,
      embedded_count,
      bookmarks_collection_id: persistence.bookmarks_collection_id,
      retried_without_optional_fields: persistence.retried_without_optional_fields,
      used_legacy_owner_column: persistence.used_legacy_owner_column,
      next_token: payload.meta?.next_token ?? null,
    });
  } catch (error) {
    console.error("Bookmarks sync route error:", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to sync bookmarks from X.",
        details,
      },
      { status: 502 }
    );
  }
}
