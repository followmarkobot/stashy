import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tweet } from "./supabase";
import { upsertBookmarksCollection } from "./collectionsQuery";

export interface BookmarkPersistenceResult {
  canonical_upserted: number;
  membership_upserted: number;
  bookmarks_collection_id: string;
  retried_without_optional_fields: boolean;
  used_legacy_owner_column: boolean;
}

export function buildCanonicalTweetRow(tweet: Tweet): Record<string, unknown> {
  return {
    tweet_id: tweet.tweet_id,
    tweet_text: tweet.tweet_text,
    author_handle: tweet.author_handle,
    author_display_name: tweet.author_display_name,
    author_avatar_url: tweet.author_avatar_url,
    timestamp: tweet.timestamp,
    source_url: tweet.source_url,
    media: tweet.media,
    link_cards: tweet.link_cards,
    quoted_tweet_id: tweet.quoted_tweet_id,
    in_reply_to_tweet_id: tweet.in_reply_to_tweet_id,
    conversation_id: tweet.conversation_id,
    raw_json: tweet.raw_json,
  };
}

export function shouldRetryWithoutOptionalTweetFields(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as Record<string, unknown>;
  const haystack = [err.code, err.message, err.details, err.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes("quoted_tweet") ||
    haystack.includes("public_metrics") ||
    (haystack.includes("column") && haystack.includes("schema cache"))
  );
}

function errorToString(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const err = error as Record<string, unknown>;
    const pieces = [err.code, err.message, err.details, err.hint].filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0
    );
    if (pieces.length > 0) return pieces.join(" | ");
    return JSON.stringify(error);
  }
  return String(error);
}

export async function persistBookmarksForOwnerWithClient(
  supabase: SupabaseClient,
  ownerUserId: string,
  tweets: Tweet[]
): Promise<BookmarkPersistenceResult> {
  if (!tweets.length) {
    return {
      canonical_upserted: 0,
      membership_upserted: 0,
      bookmarks_collection_id: "",
      retried_without_optional_fields: false,
      used_legacy_owner_column: false,
    };
  }

  const uniqueTweets = Array.from(
    new Map(tweets.map((tweet) => [tweet.tweet_id, tweet])).values()
  );

  let tweetRows: Record<string, unknown>[] = uniqueTweets.map((tweet) => ({
    ...buildCanonicalTweetRow(tweet),
    quoted_tweet: tweet.quoted_tweet,
    public_metrics: tweet.public_metrics ?? null,
  }));
  let retriedWithoutOptionalFields = false;

  let { error: canonicalTweetError } = await supabase
    .from("tweets")
    .upsert(tweetRows, { onConflict: "tweet_id" });

  if (canonicalTweetError && shouldRetryWithoutOptionalTweetFields(canonicalTweetError)) {
    retriedWithoutOptionalFields = true;
    tweetRows = uniqueTweets.map((tweet) => buildCanonicalTweetRow(tweet));
    const retry = await supabase.from("tweets").upsert(tweetRows, { onConflict: "tweet_id" });
    canonicalTweetError = retry.error;
  }

  if (canonicalTweetError) {
    const details = errorToString(canonicalTweetError);
    throw new Error(`Failed to upsert canonical tweets: ${details}`);
  }

  const { collection_id, used_legacy_owner_column: usedLegacyOwnerColumn } =
    await upsertBookmarksCollection(supabase, ownerUserId);

  const memberRows = uniqueTweets.map((tweet) => ({
    collection_id,
    tweet_id: tweet.tweet_id,
  }));

  const { error: membershipError } = await supabase
    .from("collection_tweets")
    .upsert(memberRows, {
      onConflict: "collection_id,tweet_id",
      ignoreDuplicates: true,
    });

  if (membershipError) {
    const details = errorToString(membershipError);
    throw new Error(`Failed to upsert collection membership: ${details}`);
  }

  return {
    canonical_upserted: uniqueTweets.length,
    membership_upserted: memberRows.length,
    bookmarks_collection_id: collection_id,
    retried_without_optional_fields: retriedWithoutOptionalFields,
    used_legacy_owner_column: usedLegacyOwnerColumn,
  };
}
