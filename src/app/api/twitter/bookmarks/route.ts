import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mapXBookmarksToTweets } from "@/lib/twitter";
import type { LinkCardData } from "@/lib/supabase";
import { sortTweetsReverseChronological } from "@/lib/tweetOrder";
import { dedupeTweetsById } from "@/lib/dedupeTweets";

export const runtime = "nodejs";

const PAGE_SIZE = 20;

function deriveLinkCardsFromRawJson(rawJson: unknown): LinkCardData[] {
  if (!rawJson || typeof rawJson !== "object") return [];

  try {
    const mapped = mapXBookmarksToTweets(
      [rawJson] as Parameters<typeof mapXBookmarksToTweets>[0],
      {}
    );
    return Array.isArray(mapped[0]?.link_cards) ? mapped[0].link_cards : [];
  } catch {
    return [];
  }
}

let _serviceSupabase: SupabaseClient | null = null;

function getServiceSupabase(): SupabaseClient | null {
  if (_serviceSupabase) return _serviceSupabase;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  _serviceSupabase = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _serviceSupabase;
}

function parseCursor(cursor: string | null): number {
  if (!cursor) return 0;
  const parsed = Number(cursor);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

async function fetchBookmarksCollectionId(
  supabase: SupabaseClient,
  ownerUserId: string
): Promise<string | null> {
  const modern = await supabase
    .from("collections")
    .select("id")
    .eq("owner_user_id", ownerUserId)
    .eq("slug", "bookmarks")
    .maybeSingle();

  if (!modern.error && modern.data?.id) {
    return modern.data.id as string;
  }

  const legacy = await supabase
    .from("collections")
    .select("id")
    .eq("owner_x_user_id", ownerUserId)
    .eq("slug", "bookmarks")
    .maybeSingle();

  if (legacy.error || !legacy.data?.id) {
    return null;
  }

  return legacy.data.id as string;
}

async function fetchPersistedBookmarksPage(ownerXUserId: string, cursor: string | null) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return { tweets: [], next_token: null };
  }

  const collectionId = await fetchBookmarksCollectionId(supabase, ownerXUserId);
  if (!collectionId) {
    return { tweets: [], next_token: null };
  }

  const offset = parseCursor(cursor);
  const end = offset + PAGE_SIZE - 1;
  const { data: membershipRows, error: membershipError } = await supabase
    .from("collection_tweets")
    .select("tweet_id")
    .eq("collection_id", collectionId)
    .order("added_at", { ascending: false })
    .range(offset, end);

  if (membershipError || !membershipRows?.length) {
    return { tweets: [], next_token: null };
  }

  const orderedIds = membershipRows
    .map((row) => row.tweet_id)
    .filter((tweetId): tweetId is string => Boolean(tweetId));
  if (!orderedIds.length) {
    return { tweets: [], next_token: null };
  }

  const { data: tweetRows, error: tweetsError } = await supabase
    .from("tweets")
    .select("*")
    .in("tweet_id", orderedIds);

  if (tweetsError || !tweetRows?.length) {
    return { tweets: [], next_token: null };
  }

  const byId = new Map(
    tweetRows.map((row) => [
      row.tweet_id as string,
      {
        ...row,
        media: Array.isArray(row.media) ? row.media : [],
        link_cards: (() => {
          const persisted = Array.isArray(row.link_cards) ? row.link_cards : [];
          if (persisted.length > 0) return persisted;
          return deriveLinkCardsFromRawJson(row.raw_json);
        })(),
        tags: Array.isArray(row.tags) ? row.tags : [],
      },
    ])
  );

  const tweets = dedupeTweetsById(
    sortTweetsReverseChronological(
      orderedIds
        .map((tweetId) => byId.get(tweetId))
        .filter((tweet): tweet is Record<string, unknown> => Boolean(tweet))
    )
  );

  return {
    tweets,
    next_token: membershipRows.length === PAGE_SIZE ? String(offset + PAGE_SIZE) : null,
  };
}

export async function GET(request: NextRequest) {
  const cursor = request.nextUrl.searchParams.get("cursor");
  const accessTokenCookie = request.cookies.get("x_access_token")?.value;
  const userId = request.cookies.get("x_user_id")?.value;

  if (!accessTokenCookie || !userId) {
    return NextResponse.json({ error: "Not connected to X." }, { status: 401 });
  }

  try {
    const result = await fetchPersistedBookmarksPage(userId, cursor);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Bookmarks cache route error:", error);
    return NextResponse.json(
      { error: "Failed to load cached bookmarks." },
      { status: 500 }
    );
  }
}
