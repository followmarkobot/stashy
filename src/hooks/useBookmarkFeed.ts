import { useState, useEffect, useCallback } from "react";
import type { Tweet } from "../lib/supabase";
import { useXAuth } from "../contexts/XAuthContext";

interface BookmarksPayload {
  tweets: Tweet[];
  next_token: string | null;
}

interface BookmarkSyncSuccessPayload {
  status: "ok";
  fetched_count: number;
  persisted_count: number;
  canonical_upserted: number;
  bookmarks_collection_id: string;
  retried_without_optional_fields: boolean;
  used_legacy_owner_column: boolean;
  next_token: string | null;
}

interface BookmarkSyncErrorPayload {
  error: string;
  details?: string;
}

export interface BookmarkSyncStatus {
  state: "syncing" | "success" | "error";
  summary: string;
  fetchedCount?: number;
  persistedCount?: number;
  canonicalUpserted?: number;
  bookmarksCollectionId?: string;
  retriedWithoutOptionalFields?: boolean;
  usedLegacyOwnerColumn?: boolean;
  errorDetails?: string;
  updatedAt: string;
}

export interface UseBookmarkFeedReturn {
  tweets: Tweet[];
  loading: boolean;
  initialLoading: boolean;
  hasMore: boolean;
  bookmarkSyncStatus: BookmarkSyncStatus | null;
  isConnected: boolean;
  isChecking: boolean;
  loadMore: () => void;
  refreshBookmarks: () => Promise<void>;
}

export function useBookmarkFeed(): UseBookmarkFeedReturn {
  const { isConnected, isChecking, checkStatus } = useXAuth();

  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [bookmarkSyncStatus, setBookmarkSyncStatus] = useState<BookmarkSyncStatus | null>(null);

  const loadBookmarkTweets = useCallback(
    async (cursorToken: string | null, append: boolean) => {
      setLoading(true);
      try {
        const url = cursorToken
          ? `/api/twitter/bookmarks?cursor=${encodeURIComponent(cursorToken)}`
          : "/api/twitter/bookmarks";

        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
          if (response.status === 401) {
            setTweets((prev) => (append ? prev : []));
            setHasMore(false);
            await checkStatus();
          }
          setLoading(false);
          setInitialLoading(false);
          return;
        }

        const payload = (await response.json()) as BookmarksPayload;
        setTweets((prev) => (append ? [...prev, ...payload.tweets] : payload.tweets));
        setCursor(payload.next_token || null);
        setHasMore(Boolean(payload.next_token));
      } catch (error) {
        console.error("Failed to load X bookmarks:", error);
        if (!append) setTweets([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [checkStatus]
  );

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    setCursor(null);
    setTweets([]);

    if (isChecking) {
      setInitialLoading(true);
      return;
    }

    if (!isConnected) {
      setHasMore(false);
      setInitialLoading(false);
      return;
    }

    setHasMore(true);
    setInitialLoading(true);
    loadBookmarkTweets(null, false);
  }, [isConnected, isChecking, loadBookmarkTweets]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore || !isConnected || !cursor) return;
    loadBookmarkTweets(cursor, true);
  }, [loading, hasMore, isConnected, cursor, loadBookmarkTweets]);

  const refreshBookmarks = useCallback(async () => {
    if (!isConnected) return;
    setCursor(null);
    setHasMore(true);
    setInitialLoading(true);
    setBookmarkSyncStatus({
      state: "syncing",
      summary: "Syncing bookmarks from X and persisting to database...",
      updatedAt: new Date().toISOString(),
    });
    try {
      const syncResponse = await fetch("/api/twitter/bookmarks/sync", {
        method: "POST",
        cache: "no-store",
      });
      const payload = (await syncResponse.json()) as
        | BookmarkSyncSuccessPayload
        | BookmarkSyncErrorPayload;

      if (!syncResponse.ok) {
        setBookmarkSyncStatus({
          state: "error",
          summary: "error" in payload ? payload.error : "Bookmark sync failed.",
          errorDetails:
            "details" in payload && payload.details ? payload.details : undefined,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const success = payload as BookmarkSyncSuccessPayload;
        setBookmarkSyncStatus({
          state: "success",
          summary: `Synced ${success.fetched_count} from X. Persisted ${success.persisted_count} collection entries.`,
          fetchedCount: success.fetched_count,
          persistedCount: success.persisted_count,
          canonicalUpserted: success.canonical_upserted,
          bookmarksCollectionId: success.bookmarks_collection_id,
          retriedWithoutOptionalFields: success.retried_without_optional_fields,
          usedLegacyOwnerColumn: success.used_legacy_owner_column,
          updatedAt: new Date().toISOString(),
        });
      }

      if (!syncResponse.ok && syncResponse.status === 401) {
        await checkStatus();
      }
    } catch (error) {
      console.error("Failed to sync bookmarks from X:", error);
      setBookmarkSyncStatus({
        state: "error",
        summary: "Bookmark sync request failed.",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
        updatedAt: new Date().toISOString(),
      });
    }
    await loadBookmarkTweets(null, false);
  }, [isConnected, loadBookmarkTweets, checkStatus]);

  return {
    tweets,
    loading,
    initialLoading,
    hasMore,
    bookmarkSyncStatus,
    isConnected,
    isChecking,
    loadMore,
    refreshBookmarks,
  };
}
