"use client";

import React from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Tweet } from "../lib/supabase";
import TweetCard from "./TweetCard";
import SearchBar from "./SearchBar";
import XConnectBanner from "./XConnectBanner";
import { useTweetFeed } from "../hooks/useTweetFeed";

interface TweetFeedProps {
  cardComponent?: React.ComponentType<{
    tweet: Tweet;
    onArticleClick?: (url: string, tweet: Tweet) => void;
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: (tweetId: string) => void;
    similarityLabel?: string;
  }>;
  dataSource?: "stash" | "bookmarks";
  onArticleClick?: (url: string, tweet: Tweet) => void;
  semanticFilterIds?: string[];
  semanticSelectedIds?: string[];
  onToggleSemanticSelect?: (tweetId: string) => void;
  semanticSimilarityById?: Record<string, number>;
  onSelectAllSemantic?: (ids?: string[]) => void;
  onDeselectAllSemantic?: () => void;
  onSemanticCorpusIdsChange?: (ids: string[]) => void;
  semanticAutoSelectAll?: boolean;
}

export default function TweetFeed({
  cardComponent,
  dataSource = "stash",
  onArticleClick,
  semanticFilterIds = [],
  semanticSelectedIds = [],
  onToggleSemanticSelect,
  semanticSimilarityById = {},
  onSelectAllSemantic,
  onDeselectAllSemantic,
  onSemanticCorpusIdsChange,
  semanticAutoSelectAll = false,
}: TweetFeedProps) {
  const CardComponent = cardComponent || TweetCard;
  const observerRef = useRef<HTMLDivElement>(null);
  const semanticMode = typeof onToggleSemanticSelect === "function";
  const hasSemanticFilter = semanticFilterIds.length > 0;

  const feed = useTweetFeed(dataSource);
  const { tweets, loading, initialLoading, hasMore, loadMore } = feed;

  // Narrow source-specific props
  const search = feed.source === "stash" ? feed.search : "";
  const setSearch = feed.source === "stash" ? feed.setSearch : undefined;
  const selectedTags = feed.source === "stash" ? feed.selectedTags : [];
  const setSelectedTags = feed.source === "stash" ? feed.setSelectedTags : undefined;
  const availableTags = feed.source === "stash" ? feed.availableTags : [];
  const refreshBookmarks = feed.source === "bookmarks" ? feed.refreshBookmarks : undefined;
  const bookmarkSyncStatus = feed.source === "bookmarks" ? feed.bookmarkSyncStatus : null;
  const isConnected = feed.source === "bookmarks" ? feed.isConnected : false;
  const isChecking = feed.source === "bookmarks" ? feed.isChecking : false;

  const handleExportJSON = useCallback(() => {
    const json = JSON.stringify(tweets, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tweets-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tweets]);

  useEffect(() => {
    const node = observerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const showConnectBanner = feed.source === "bookmarks" && !isChecking && !isConnected;
  const semanticOrder = useMemo(() => {
    const map = new Map<string, number>();
    semanticFilterIds.forEach((id, index) => map.set(id, index));
    return map;
  }, [semanticFilterIds]);

  const semanticIdSet = useMemo(() => new Set(semanticFilterIds), [semanticFilterIds]);

  const visibleTweets = useMemo(() => {
    if (!hasSemanticFilter) return tweets;
    return tweets
      .filter((tweet) => semanticIdSet.has(tweet.tweet_id))
      .sort(
        (a, b) =>
          (semanticOrder.get(a.tweet_id) ?? Number.MAX_SAFE_INTEGER) -
          (semanticOrder.get(b.tweet_id) ?? Number.MAX_SAFE_INTEGER)
      );
  }, [tweets, hasSemanticFilter, semanticIdSet, semanticOrder]);

  const semanticCorpusIds = useMemo(
    () => visibleTweets.map((tweet) => tweet.tweet_id),
    [visibleTweets]
  );

  useEffect(() => {
    if (!semanticMode) return;
    onSemanticCorpusIdsChange?.(semanticCorpusIds);
  }, [semanticMode, semanticCorpusIds, onSemanticCorpusIdsChange]);

  useEffect(() => {
    if (!hasSemanticFilter) return;
    if (loading || !hasMore) return;
    if (visibleTweets.length >= semanticFilterIds.length) return;
    loadMore();
  }, [hasSemanticFilter, loading, hasMore, visibleTweets.length, semanticFilterIds.length, loadMore]);

  useEffect(() => {
    if (!semanticMode || !semanticAutoSelectAll) return;
    if (!semanticCorpusIds.length || semanticSelectedIds.length > 0) return;
    onSelectAllSemantic?.(semanticCorpusIds);
  }, [
    semanticMode,
    semanticAutoSelectAll,
    semanticCorpusIds,
    semanticSelectedIds.length,
    onSelectAllSemantic,
  ]);

  return (
    <div>
      {feed.source === "stash" && setSearch && setSelectedTags && (
        <div className="relative">
          <SearchBar
            onSearch={setSearch}
            onTagFilter={setSelectedTags}
            availableTags={availableTags}
            selectedTags={selectedTags}
          />
          {tweets.length > 0 && (
            <button
              onClick={handleExportJSON}
              title="Export feed as JSON"
              className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-full border border-[rgb(47,51,54)] bg-[rgb(22,24,28)] px-3 py-1.5 text-xs font-medium text-[rgb(113,118,123)] transition-colors hover:border-[rgb(29,155,240)] hover:text-[rgb(29,155,240)]"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export JSON
            </button>
          )}
        </div>
      )}

      {showConnectBanner && <XConnectBanner />}

      {feed.source === "bookmarks" && isConnected && refreshBookmarks && (
        <div className="border-b border-[rgb(47,51,54)] px-4 py-2">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                void refreshBookmarks();
              }}
              disabled={loading || initialLoading}
              className="inline-flex items-center gap-2 rounded-full border border-[rgb(47,51,54)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[rgb(8,10,13)] disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Bookmarks
            </button>
          </div>
          {bookmarkSyncStatus && (
            <div
              className={`mt-2 rounded-xl border px-3 py-2 text-xs ${bookmarkSyncStatus.state === "error"
                ? "border-red-800 bg-red-950/40 text-red-300"
                : bookmarkSyncStatus.state === "success"
                  ? "border-emerald-800 bg-emerald-950/30 text-emerald-300"
                  : "border-[rgb(47,51,54)] bg-[rgb(10,12,15)] text-[rgb(113,118,123)]"
                }`}
            >
              <p className="font-medium">{bookmarkSyncStatus.summary}</p>
              {(bookmarkSyncStatus.fetchedCount !== undefined ||
                bookmarkSyncStatus.persistedCount !== undefined ||
                bookmarkSyncStatus.canonicalUpserted !== undefined) && (
                  <p className="mt-1">
                    fetched={bookmarkSyncStatus.fetchedCount ?? 0} · persisted=
                    {bookmarkSyncStatus.persistedCount ?? 0} · canonical=
                    {bookmarkSyncStatus.canonicalUpserted ?? 0}
                  </p>
                )}
              {bookmarkSyncStatus.retriedWithoutOptionalFields && (
                <p className="mt-1">retry_without_optional_fields=true</p>
              )}
              {bookmarkSyncStatus.usedLegacyOwnerColumn && (
                <p className="mt-1">used_legacy_owner_column=true</p>
              )}
              {bookmarkSyncStatus.bookmarksCollectionId && (
                <p className="mt-1">collection_id={bookmarkSyncStatus.bookmarksCollectionId}</p>
              )}
              {bookmarkSyncStatus.errorDetails && (
                <p className="mt-1 break-words">details={bookmarkSyncStatus.errorDetails}</p>
              )}
            </div>
          )}
        </div>
      )}

      {semanticMode && (
        <div className="border-b border-[rgb(47,51,54)] px-4 py-2 text-xs text-[rgb(113,118,123)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Showing {visibleTweets.length} {hasSemanticFilter ? `/ ${semanticFilterIds.length} semantic matches` : "tweets"} ·{" "}
              {semanticSelectedIds.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDeselectAllSemantic}
                disabled={!semanticSelectedIds.length}
                className="rounded-full border border-[rgb(47,51,54)] px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-[rgb(8,10,13)] disabled:opacity-50"
              >
                Deselect all
              </button>
              <button
                type="button"
                onClick={() => onSelectAllSemantic?.(semanticCorpusIds)}
                disabled={semanticSelectedIds.length === semanticCorpusIds.length}
                className="rounded-full border border-[rgb(47,51,54)] px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-[rgb(8,10,13)] disabled:opacity-50"
              >
                Select all
              </button>
            </div>
          </div>
        </div>
      )}

      {initialLoading && (
        <div className="divide-y divide-[rgb(47,51,54)]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse px-4 py-3">
              <div className="flex gap-3">
                <div className="h-12 w-12 shrink-0 rounded-full bg-[rgb(47,51,54)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-[rgb(47,51,54)]" />
                  <div className="h-3 w-full rounded bg-[rgb(47,51,54)]" />
                  <div className="h-3 w-2/3 rounded bg-[rgb(47,51,54)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!initialLoading && tweets.length === 0 && !showConnectBanner && (
        <div className="py-16 text-center text-[rgb(113,118,123)]">
          <svg
            className="mx-auto mb-3 h-10 w-10 opacity-50"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <p className="text-lg font-medium">No tweets found</p>
          <p className="mt-1 text-sm">
            {feed.source === "bookmarks"
              ? "No bookmarks returned from X"
              : search || selectedTags.length > 0
                ? "Try adjusting your search or filters"
                : "Saved tweets will appear here"}
          </p>
        </div>
      )}

      {!initialLoading &&
        visibleTweets.map((tweet) => (
          <CardComponent
            key={tweet.tweet_id || tweet.id}
            tweet={tweet}
            onArticleClick={onArticleClick}
            selectable={semanticMode}
            selected={semanticSelectedIds.includes(tweet.tweet_id)}
            onToggleSelect={onToggleSemanticSelect}
            similarityLabel={
              semanticMode && semanticSimilarityById[tweet.tweet_id] !== undefined
                ? `${Math.round(
                    Math.max(0, Math.min(1, semanticSimilarityById[tweet.tweet_id])) * 100
                  )}% match`
                : undefined
            }
          />
        ))}

      {!initialLoading && semanticMode && visibleTweets.length === 0 && (
        <div className="py-12 text-center text-sm text-[rgb(113,118,123)]">
          No semantic matches are loaded in the current feed.
        </div>
      )}

      <div ref={observerRef} className="h-1" />

      {loading && !initialLoading && (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[rgb(29,155,240)] border-t-transparent" />
        </div>
      )}

      {!hasMore && tweets.length > 0 && (
        <div className="py-8 text-center text-sm text-[rgb(113,118,123)]">
          You&apos;ve reached the end
        </div>
      )}
    </div>
  );
}
