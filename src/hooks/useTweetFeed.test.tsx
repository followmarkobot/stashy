// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useTweetFeed } from "./useTweetFeed";

const {
  checkStatusMock,
  fetchTweetsMock,
  fetchAllTagsMock,
} = vi.hoisted(() => ({
  checkStatusMock: vi.fn(),
  fetchTweetsMock: vi.fn(),
  fetchAllTagsMock: vi.fn(),
}));

vi.mock("../contexts/XAuthContext", () => ({
  useXAuth: () => ({
    isConnected: true,
    isChecking: false,
    checkStatus: checkStatusMock,
  }),
}));

vi.mock("../lib/supabase", () => ({
  fetchTweets: fetchTweetsMock,
  fetchAllTags: fetchAllTagsMock,
}));

// ---------------------------------------------------------------------------
// Harness: bookmarks — exposes refresh + sync status
// ---------------------------------------------------------------------------
function BookmarksHarness() {
  const feed = useTweetFeed("bookmarks");
  const refreshBookmarks =
    "refreshBookmarks" in feed
      ? (feed as { refreshBookmarks: () => Promise<void> }).refreshBookmarks
      : async () => {};
  const bookmarkSyncStatus =
    "bookmarkSyncStatus" in feed
      ? (feed as { bookmarkSyncStatus: { summary: string } | null }).bookmarkSyncStatus
      : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void refreshBookmarks();
        }}
      >
        Sync
      </button>
      <p data-testid="status-summary">{bookmarkSyncStatus?.summary || ""}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Harness: stash — exposes setSearch + setSelectedTags
// ---------------------------------------------------------------------------
function StashHarness() {
  const feed = useTweetFeed("stash");
  const setSearch =
    "setSearch" in feed
      ? (feed as { setSearch: (s: string) => void }).setSearch
      : () => {};
  const setSelectedTags =
    "setSelectedTags" in feed
      ? (feed as { setSelectedTags: (t: string[]) => void }).setSelectedTags
      : () => {};

  return (
    <div>
      <button data-testid="set-search" onClick={() => setSearch("cats")}>
        Set search
      </button>
      <button data-testid="set-tags" onClick={() => setSelectedTags(["tag1"])}>
        Set tags
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared setup helpers
// ---------------------------------------------------------------------------
function makeBeforeEach() {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  return {
    setup() {
      vi.restoreAllMocks();
      checkStatusMock.mockReset();
      fetchTweetsMock.mockReset();
      fetchAllTagsMock.mockReset();
      fetchAllTagsMock.mockResolvedValue([]);
      fetchTweetsMock.mockResolvedValue({ tweets: [], hasMore: false });

      class IntersectionObserverMock {
        observe() {}
        disconnect() {}
      }
      vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
      (globalThis as { React?: typeof React }).React = React;
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;

      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);

      return { get container() { return container; }, get root() { return root; } };
    },
    teardown() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

// ---------------------------------------------------------------------------
// Bookmarks sync (existing test, preserved)
// ---------------------------------------------------------------------------
describe("useTweetFeed bookmarks sync", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const helpers = makeBeforeEach();

  beforeEach(() => {
    const refs = helpers.setup();
    container = refs.container;
    root = refs.root;
  });

  it("calls sync endpoint before reloading bookmarks feed", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/twitter/bookmarks/sync") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            status: "ok",
            fetched_count: 1,
            persisted_count: 1,
            canonical_upserted: 1,
            bookmarks_collection_id: "col-1",
            retried_without_optional_fields: false,
            used_legacy_owner_column: false,
            next_token: null,
          }),
        });
      }

      if (url.startsWith("/api/twitter/bookmarks")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ tweets: [], next_token: null }),
        });
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      root.render(<BookmarksHarness />);
    });

    // Ignore initial automatic bookmarks load on mount.
    fetchMock.mockClear();

    const button = container.querySelector("button");
    expect(button?.textContent).toBe("Sync");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/twitter/bookmarks/sync");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
    expect(String(fetchMock.mock.calls[1][0])).toBe("/api/twitter/bookmarks");
    expect(container.textContent).toContain("Synced 1 from X. Persisted 1 collection entries.");

    helpers.teardown();
  });
});

// ---------------------------------------------------------------------------
// Stash feed characterization tests
// ---------------------------------------------------------------------------
describe("useTweetFeed stash", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const helpers = makeBeforeEach();

  beforeEach(() => {
    const refs = helpers.setup();
    container = refs.container;
    root = refs.root;
  });

  it("calls fetchTweets on mount with page 0 and empty search", async () => {
    await act(async () => {
      root.render(<StashHarness />);
    });

    expect(fetchTweetsMock).toHaveBeenCalledWith(0, "", []);

    helpers.teardown();
  });

  it("re-fetches with page 0 when search changes", async () => {
    await act(async () => {
      root.render(<StashHarness />);
    });

    fetchTweetsMock.mockClear();

    const btn = container.querySelector('[data-testid="set-search"]') as HTMLElement;
    await act(async () => {
      btn.click();
    });

    expect(fetchTweetsMock).toHaveBeenCalledWith(0, "cats", []);

    helpers.teardown();
  });

  it("re-fetches with page 0 when tag filter changes", async () => {
    await act(async () => {
      root.render(<StashHarness />);
    });

    fetchTweetsMock.mockClear();

    const btn = container.querySelector('[data-testid="set-tags"]') as HTMLElement;
    await act(async () => {
      btn.click();
    });

    expect(fetchTweetsMock).toHaveBeenCalledWith(0, "", ["tag1"]);

    helpers.teardown();
  });
});
