import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

describe("fetchTweetById", () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("uses maybeSingle to avoid 406 when tweet row is missing", async () => {
    const maybeSingleMock = vi.fn(async () => ({ data: null, error: null }));
    const singleMock = vi.fn(async () => ({
      data: null,
      error: { message: "JSON object requested, multiple (or no) rows returned" },
    }));

    const eqMock = vi.fn(() => ({
      maybeSingle: maybeSingleMock,
      single: singleMock,
    }));

    const selectMock = vi.fn(() => ({
      eq: eqMock,
    }));

    const fromMock = vi.fn(() => ({
      select: selectMock,
    }));

    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { fetchTweetById } = await import("./supabase");
    await fetchTweetById("missing-tweet-id");

    expect(maybeSingleMock).toHaveBeenCalledTimes(1);
    expect(singleMock).not.toHaveBeenCalled();
  });
});

describe("fetchTweets", () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("derives article link cards from raw_json when persisted link_cards are empty", async () => {
    const rangeMock = vi.fn(async () => ({
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
    }));

    const queryMock = {
      order: vi.fn(() => ({
        range: rangeMock,
      })),
      or: vi.fn(() => queryMock),
      overlaps: vi.fn(() => queryMock),
      range: rangeMock,
    };

    const fromMock = vi.fn(() => ({
      select: vi.fn(() => queryMock),
    }));

    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { fetchTweets } = await import("./supabase");
    const result = await fetchTweets(0);

    expect(result.tweets).toHaveLength(1);
    expect(result.tweets[0].link_cards).toHaveLength(1);
    expect(result.tweets[0].link_cards[0]).toEqual({
      url: "https://x.com/i/article/2018347415263117312",
      title: "Bring Your Own Agent: The Future of AI-Powered Apps",
      description: "",
      image: "",
      site_name: "x.com",
    });
  });

  it("returns tweets in reverse chronological order by tweet timestamp", async () => {
    const rangeMock = vi.fn(async () => ({
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
    }));

    const queryMock = {
      order: vi.fn(() => queryMock),
      or: vi.fn(() => queryMock),
      overlaps: vi.fn(() => queryMock),
      range: rangeMock,
    };

    const fromMock = vi.fn(() => ({
      select: vi.fn(() => queryMock),
    }));

    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { fetchTweets } = await import("./supabase");
    const result = await fetchTweets(0);

    expect(result.tweets.map((tweet) => tweet.tweet_id)).toEqual([
      "tweet-newer",
      "tweet-older",
    ]);
  });

  it("dedupes duplicate tweet ids from the first page", async () => {
    const rangeMock = vi.fn(async () => ({
      data: [
        {
          id: 1,
          tweet_id: "tweet-dup",
          tweet_text: "first copy",
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
          tweet_id: "tweet-dup",
          tweet_text: "second copy",
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
          saved_at: null,
          created_at: null,
        },
        {
          id: 3,
          tweet_id: "tweet-unique",
          tweet_text: "unique",
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
    }));

    const queryMock = {
      order: vi.fn(() => queryMock),
      or: vi.fn(() => queryMock),
      overlaps: vi.fn(() => queryMock),
      range: rangeMock,
    };

    const fromMock = vi.fn(() => ({
      select: vi.fn(() => queryMock),
    }));

    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { fetchTweets } = await import("./supabase");
    const result = await fetchTweets(0);

    expect(result.tweets.map((tweet) => tweet.tweet_id)).toEqual([
      "tweet-dup",
      "tweet-unique",
    ]);
  });

  it("preserves hasMore when a full page includes duplicate tweet ids", async () => {
    const rows = Array.from({ length: 20 }, (_, index) => {
      const tweetNumber = index === 1 ? 1 : index + 1;
      return {
        id: index + 1,
        tweet_id: `tweet-${tweetNumber}`,
        tweet_text: `tweet ${tweetNumber}`,
        author_handle: "marko",
        author_display_name: "Marko",
        author_avatar_url: null,
        timestamp: `2026-02-${String(20 - index).padStart(2, "0")}T00:00:00.000Z`,
        source_url: `https://x.com/marko/status/${index + 1}`,
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
      };
    });

    const rangeMock = vi.fn(async () => ({
      data: rows,
      error: null,
    }));

    const queryMock = {
      order: vi.fn(() => queryMock),
      or: vi.fn(() => queryMock),
      overlaps: vi.fn(() => queryMock),
      range: rangeMock,
    };

    const fromMock = vi.fn(() => ({
      select: vi.fn(() => queryMock),
    }));

    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { fetchTweets } = await import("./supabase");
    const result = await fetchTweets(0);

    expect(result.tweets).toHaveLength(19);
    expect(result.hasMore).toBe(true);
  });
});
