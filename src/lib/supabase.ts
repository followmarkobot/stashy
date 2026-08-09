import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { mapXBookmarksToTweets } from "./twitter";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables"
    );
  }
  _supabase = createClient(url, key);
  return _supabase;
}

export interface QuotedTweetData {
  tweet_id: string;
  tweet_text: string;
  author_handle: string;
  author_display_name: string;
  author_avatar_url: string;
  timestamp: string | null;
  source_url: string;
  media: MediaItem[];
  link_cards: LinkCardData[];
}

export interface Tweet {
  id: number;
  tweet_id: string;
  tweet_text: string | null;
  author_handle: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
  timestamp: string | null;
  source_url: string | null;
  media: MediaItem[];
  link_cards: LinkCardData[];
  quoted_tweet_id: string | null;
  quoted_tweet: QuotedTweetData | null;
  in_reply_to_tweet_id: string | null;
  conversation_id: string | null;
  raw_json: Record<string, unknown> | null;
  tags: string[];
  notes: string | null;
  saved_at: string | null;
  created_at: string | null;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    bookmark_count: number;
    impression_count?: number;
  };
  tweet_bookmark_folders?: { folder_id: string; folder_name: string | null }[];
}

export interface BookmarkFolderOption {
  folder_id: string;
  folder_name: string | null;
}

export interface Collection {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  visibility: "private" | "public" | "unlisted";
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CollectionTweet {
  collection_id: string;
  tweet_id: string;
  tags: string[];
  notes: string | null;
  added_at: string;
}

export interface MediaItem {
  type: "image" | "video" | "gif";
  url: string;
}

export interface LinkCardData {
  url: string;
  title: string;
  description: string;
  image: string;
  site_name: string;
}

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

export async function fetchTweets(
  page: number,
  search?: string,
  tags?: string[],
  onlyMissingMetrics?: boolean,
  bookmarkFolderId?: string
): Promise<{ tweets: Tweet[]; hasMore: boolean }> {
  // !inner when filtering by folder so the eq() below can constrain on it;
  // plain (left) embed otherwise so tweets with no folder tag still show.
  const folderSelect = bookmarkFolderId
    ? "*, tweet_bookmark_folders!inner(folder_id, folder_name)"
    : "*, tweet_bookmark_folders(folder_id, folder_name)";

  let query = getSupabase()
    .from("tweets")
    .select(folderSelect)
    .order("saved_at", { ascending: false, nullsFirst: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`tweet_text.ilike.${term},author_handle.ilike.${term}`);
  }

  if (tags && tags.length > 0) {
    query = query.overlaps("tags", tags);
  }

  if (onlyMissingMetrics) {
    query = query.is("public_metrics", null);
  }

  if (bookmarkFolderId) {
    query = query.eq("tweet_bookmark_folders.folder_id", bookmarkFolderId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching tweets:", error);
    return { tweets: [], hasMore: false };
  }

  const tweets = (data ?? []).map((row) => ({
    ...row,
    media: Array.isArray(row.media) ? row.media : [],
    link_cards: (() => {
      const persisted = Array.isArray(row.link_cards) ? row.link_cards : [];
      if (persisted.length > 0) return persisted;
      return deriveLinkCardsFromRawJson(row.raw_json);
    })(),
    tags: Array.isArray(row.tags) ? row.tags : [],
    tweet_bookmark_folders: Array.isArray(row.tweet_bookmark_folders)
      ? row.tweet_bookmark_folders
      : [],
  })) as Tweet[];

  return { tweets, hasMore: tweets.length === PAGE_SIZE };
}

export async function fetchAllBookmarkFolders(): Promise<BookmarkFolderOption[]> {
  const { data, error } = await getSupabase()
    .from("tweet_bookmark_folders")
    .select("folder_id, folder_name");

  if (error || !data) return [];

  const byId = new Map<string, BookmarkFolderOption>();
  data.forEach((row) => {
    if (!byId.has(row.folder_id)) {
      byId.set(row.folder_id, { folder_id: row.folder_id, folder_name: row.folder_name });
    }
  });

  return Array.from(byId.values()).sort((a, b) =>
    (a.folder_name ?? a.folder_id).localeCompare(b.folder_name ?? b.folder_id)
  );
}

export async function fetchTweetById(
  tweetId: string
): Promise<Tweet | null> {
  const { data, error } = await getSupabase()
    .from("tweets")
    .select("*")
    .eq("tweet_id", tweetId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    media: Array.isArray(data.media) ? data.media : [],
    link_cards: Array.isArray(data.link_cards) ? data.link_cards : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
  } as Tweet;
}

export async function fetchAllTags(): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from("tweets")
    .select("tags");

  if (error || !data) return [];

  const tagSet = new Set<string>();
  data.forEach((row) => {
    const tags = Array.isArray(row.tags) ? row.tags : [];
    tags.forEach((tag: string) => tagSet.add(tag));
  });

  return Array.from(tagSet).sort();
}
