import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const createClientMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

function makeRequest(cookieValues: Record<string, string>, cursor?: string): NextRequest {
  const url = new URL("http://localhost:3000/api/twitter/bookmarks");
  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  return {
    nextUrl: url,
    cookies: {
      get(name: string) {
        const value = cookieValues[name];
        return value ? { value } : undefined;
      },
    },
  } as unknown as NextRequest;
}

describe("/api/twitter/bookmarks", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    createClientMock.mockReset();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
  });

  it("returns 401 when user is not connected to X", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest({}));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toContain("Not connected");
  });

  it("returns cached bookmarks without calling X API", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "service-role-key";

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const fromMock = vi.fn((table: string) => {
      if (table === "collections") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: "bookmarks-col" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "collection_tweets") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                range: async () => ({
                  data: [{ tweet_id: "tweet-1" }],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "tweets") {
        return {
          select: () => ({
            in: async () => ({
              data: [
                {
                  id: 1,
                  tweet_id: "tweet-1",
                  tweet_text: "Recovered bookmark",
                  author_handle: "marko",
                  author_display_name: "Marko",
                  author_avatar_url: null,
                  timestamp: "2026-01-01T00:00:00.000Z",
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
                },
              ],
              error: null,
            }),
          }),
        };
      }

      return {
        select: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      };
    });

    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { GET } = await import("./route");
    const response = await GET(
      makeRequest({
        x_access_token: "access-token",
        x_user_id: "123",
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.tweets).toHaveLength(1);
    expect(payload.tweets[0].tweet_id).toBe("tweet-1");
    expect(payload.next_token).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns cached bookmarks in reverse chronological order by tweet timestamp", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "service-role-key";

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const fromMock = vi.fn((table: string) => {
      if (table === "collections") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: "bookmarks-col" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "collection_tweets") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                range: async () => ({
                  data: [{ tweet_id: "tweet-older" }, { tweet_id: "tweet-newer" }],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "tweets") {
        return {
          select: () => ({
            in: async () => ({
              data: [
                {
                  id: 1,
                  tweet_id: "tweet-older",
                  tweet_text: "older",
                  author_handle: "marko",
                  author_display_name: "Marko",
                  author_avatar_url: null,
                  timestamp: "2026-01-01T00:00:00.000Z",
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
                  saved_at: "2026-03-01T00:00:00.000Z",
                  created_at: null,
                },
                {
                  id: 2,
                  tweet_id: "tweet-newer",
                  tweet_text: "newer",
                  author_handle: "marko",
                  author_display_name: "Marko",
                  author_avatar_url: null,
                  timestamp: "2026-02-01T00:00:00.000Z",
                  source_url: "https://x.com/marko/status/2",
                  media: [],
                  link_cards: [],
                  quoted_tweet_id: null,
                  quoted_tweet: null,
                  in_reply_to_tweet_id: null,
                  conversation_id: null,
                  raw_json: null,
                  tags: [],
                  notes: null,
                  saved_at: "2026-01-01T00:00:00.000Z",
                  created_at: null,
                },
              ],
              error: null,
            }),
          }),
        };
      }

      return {
        select: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      };
    });

    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { GET } = await import("./route");
    const response = await GET(
      makeRequest({
        x_access_token: "access-token",
        x_user_id: "123",
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.tweets.map((tweet: { tweet_id: string }) => tweet.tweet_id)).toEqual([
      "tweet-newer",
      "tweet-older",
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dedupes duplicate tweet ids in the first cached bookmarks page", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "service-role-key";

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const fromMock = vi.fn((table: string) => {
      if (table === "collections") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: "bookmarks-col" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "collection_tweets") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                range: async () => ({
                  data: [
                    { tweet_id: "tweet-dup" },
                    { tweet_id: "tweet-dup" },
                    { tweet_id: "tweet-unique" },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "tweets") {
        return {
          select: () => ({
            in: async () => ({
              data: [
                {
                  id: 1,
                  tweet_id: "tweet-dup",
                  tweet_text: "duplicate row",
                  author_handle: "marko",
                  author_display_name: "Marko",
                  author_avatar_url: null,
                  timestamp: "2026-02-01T00:00:00.000Z",
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
                },
                {
                  id: 2,
                  tweet_id: "tweet-unique",
                  tweet_text: "unique row",
                  author_handle: "marko",
                  author_display_name: "Marko",
                  author_avatar_url: null,
                  timestamp: "2026-01-01T00:00:00.000Z",
                  source_url: "https://x.com/marko/status/2",
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
                },
              ],
              error: null,
            }),
          }),
        };
      }

      return {
        select: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      };
    });

    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { GET } = await import("./route");
    const response = await GET(
      makeRequest({
        x_access_token: "access-token",
        x_user_id: "123",
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.tweets.map((tweet: { tweet_id: string }) => tweet.tweet_id)).toEqual([
      "tweet-dup",
      "tweet-unique",
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("derives article link card from raw_json when persisted link_cards are empty", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "service-role-key";

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const fromMock = vi.fn((table: string) => {
      if (table === "collections") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: "bookmarks-col" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "collection_tweets") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                range: async () => ({
                  data: [{ tweet_id: "tweet-article-1" }],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "tweets") {
        return {
          select: () => ({
            in: async () => ({
              data: [
                {
                  id: 10,
                  tweet_id: "tweet-article-1",
                  tweet_text: "https://t.co/7B7PDa1RqB",
                  author_handle: "nateliason",
                  author_display_name: "Nat Eliason",
                  author_avatar_url: null,
                  timestamp: "2026-02-02T15:53:37.000Z",
                  source_url: "https://x.com/nateliason/status/tweet-article-1",
                  media: [],
                  link_cards: [],
                  quoted_tweet_id: null,
                  quoted_tweet: null,
                  in_reply_to_tweet_id: null,
                  conversation_id: "tweet-article-1",
                  raw_json: {
                    id: "2018352113860927648",
                    text: "https://t.co/7B7PDa1RqB",
                    article: {
                      title: "Bring Your Own Agent: The Future of AI-Powered Apps",
                    },
                    entities: {
                      urls: [
                        {
                          url: "https://t.co/7B7PDa1RqB",
                          expanded_url: "http://x.com/i/article/2018347415263117312",
                          unwound_url: "https://x.com/i/article/2018347415263117312",
                          display_url: "x.com/i/article/2018...",
                        },
                      ],
                    },
                  },
                  tags: [],
                  notes: null,
                  saved_at: null,
                  created_at: null,
                },
              ],
              error: null,
            }),
          }),
        };
      }

      return {
        select: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      };
    });

    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { GET } = await import("./route");
    const response = await GET(
      makeRequest({
        x_access_token: "access-token",
        x_user_id: "123",
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.tweets).toHaveLength(1);
    expect(payload.tweets[0].link_cards).toHaveLength(1);
    expect(payload.tweets[0].link_cards[0]).toEqual({
      url: "https://x.com/i/article/2018347415263117312",
      title: "Bring Your Own Agent: The Future of AI-Powered Apps",
      description: "",
      image: "",
      site_name: "x.com",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to legacy owner_x_user_id column when owner_user_id is unavailable", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "service-role-key";

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    let collectionsSelectAttempt = 0;
    const fromMock = vi.fn((table: string) => {
      if (table === "collections") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  collectionsSelectAttempt += 1;
                  if (collectionsSelectAttempt === 1) {
                    return {
                      data: null,
                      error: { message: 'column "owner_user_id" of relation "collections" does not exist' },
                    };
                  }
                  return {
                    data: { id: "bookmarks-col" },
                    error: null,
                  };
                },
              }),
            }),
          }),
        };
      }

      if (table === "collection_tweets") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                range: async () => ({
                  data: [{ tweet_id: "tweet-legacy-1" }],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "tweets") {
        return {
          select: () => ({
            in: async () => ({
              data: [
                {
                  id: 2,
                  tweet_id: "tweet-legacy-1",
                  tweet_text: "Legacy owner column worked",
                  author_handle: "marko",
                  author_display_name: "Marko",
                  author_avatar_url: null,
                  timestamp: "2026-01-01T00:00:00.000Z",
                  source_url: "https://x.com/marko/status/2",
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
                },
              ],
              error: null,
            }),
          }),
        };
      }

      return {
        select: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      };
    });

    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { GET } = await import("./route");
    const response = await GET(
      makeRequest({
        x_access_token: "access-token",
        x_user_id: "123",
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.tweets).toHaveLength(1);
    expect(payload.tweets[0].tweet_id).toBe("tweet-legacy-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to legacy owner_x_user_id column when modern lookup returns empty error object", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "service-role-key";

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    let collectionsSelectAttempt = 0;
    const fromMock = vi.fn((table: string) => {
      if (table === "collections") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  collectionsSelectAttempt += 1;
                  if (collectionsSelectAttempt === 1) {
                    return { data: null, error: {} };
                  }
                  return {
                    data: { id: "bookmarks-col-legacy-empty-error" },
                    error: null,
                  };
                },
              }),
            }),
          }),
        };
      }

      if (table === "collection_tweets") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                range: async () => ({
                  data: [{ tweet_id: "tweet-legacy-2" }],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "tweets") {
        return {
          select: () => ({
            in: async () => ({
              data: [
                {
                  id: 3,
                  tweet_id: "tweet-legacy-2",
                  tweet_text: "Legacy fallback after empty error object",
                  author_handle: "marko",
                  author_display_name: "Marko",
                  author_avatar_url: null,
                  timestamp: "2026-01-01T00:00:00.000Z",
                  source_url: "https://x.com/marko/status/3",
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
                },
              ],
              error: null,
            }),
          }),
        };
      }

      return {
        select: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      };
    });

    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { GET } = await import("./route");
    const response = await GET(
      makeRequest({
        x_access_token: "access-token",
        x_user_id: "123",
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.tweets).toHaveLength(1);
    expect(payload.tweets[0].tweet_id).toBe("tweet-legacy-2");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
