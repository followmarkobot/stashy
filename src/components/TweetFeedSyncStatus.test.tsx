// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import TweetFeed from "./TweetFeed";
import type { Tweet } from "../lib/supabase";

vi.mock("../hooks/useTweetFeed", () => ({
  useTweetFeed: () => ({
    source: "bookmarks",
    tweets: [
      {
        id: 1,
        tweet_id: "tweet-1",
        tweet_text: "Hello world",
        author_handle: "marko",
        author_display_name: "Marko",
        author_avatar_url: null,
        timestamp: "2026-02-27T10:00:00.000Z",
        source_url: "https://x.com/marko/status/1",
        media: [],
        link_cards: [],
        quoted_tweet_id: null,
        quoted_tweet: null,
        in_reply_to_tweet_id: null,
        conversation_id: null,
        raw_json: null,
        tags: [],
        notes: null,
        saved_at: null,
        created_at: null,
      } satisfies Tweet,
    ],
    loading: false,
    initialLoading: false,
    hasMore: false,
    search: "",
    setSearch: vi.fn(),
    selectedTags: [],
    setSelectedTags: vi.fn(),
    availableTags: [],
    loadMore: vi.fn(),
    refreshBookmarks: vi.fn(),
    bookmarkSyncStatus: {
      state: "success",
      summary: "Synced 5 from X. Persisted 5 collection entries.",
      fetchedCount: 5,
      persistedCount: 5,
      canonicalUpserted: 5,
      bookmarksCollectionId: "col-123",
      retriedWithoutOptionalFields: true,
      updatedAt: "2026-02-27T10:00:00.000Z",
    },
    isChecking: false,
    isConnected: true,
  }),
}));

describe("TweetFeed bookmark sync status", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as { React?: typeof React }).React = React;
    class IntersectionObserverMock {
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it("renders sync persistence diagnostics in bookmarks mode", async () => {
    await act(async () => {
      root.render(<TweetFeed dataSource="bookmarks" />);
    });

    expect(container.textContent).toContain("Synced 5 from X. Persisted 5 collection entries.");
    expect(container.textContent).toContain("fetched=5");
    expect(container.textContent).toContain("persisted=5");
    expect(container.textContent).toContain("canonical=5");
    expect(container.textContent).toContain("retry_without_optional_fields=true");
    expect(container.textContent).toContain("collection_id=col-123");
  });
});
