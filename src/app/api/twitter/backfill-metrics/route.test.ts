import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const createClientMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

function makeRequest(cookieValues: Record<string, string>, search = ""): NextRequest {
  return {
    nextUrl: new URL(`http://localhost:3000/api/twitter/backfill-metrics${search}`),
    cookies: {
      get(name: string) {
        const value = cookieValues[name];
        return value ? { value } : undefined;
      },
    },
  } as unknown as NextRequest;
}

function makeSupabaseStub(tweetIds: string[]) {
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: updateEq }));
  const selectChain = {
    is: vi.fn(function (this: unknown) {
      return this;
    }),
    order: vi.fn(function (this: unknown) {
      return this;
    }),
    limit: vi.fn().mockResolvedValue({ data: tweetIds.map((id) => ({ tweet_id: id })), error: null }),
  };
  const select = vi.fn(() => selectChain);
  const from = vi.fn(() => ({ select, update }));
  return { from, update, updateEq };
}

describe("/api/twitter/backfill-metrics", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    createClientMock.mockReset();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "service-role-key";
  });

  it("returns 401 when user is not connected to X", async () => {
    const { POST } = await import("./route");
    const response = await POST(makeRequest({}));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toContain("Not connected");
  });

  it("batches missing tweet_ids through the X lookup endpoint and writes public_metrics back", async () => {
    const supabaseStub = makeSupabaseStub(["1", "2"]);
    createClientMock.mockReturnValue(supabaseStub);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { id: "1", public_metrics: { like_count: 5, retweet_count: 1, reply_count: 0, bookmark_count: 2 } },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    const response = await POST(makeRequest({ x_access_token: "token" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0] ?? "");
    expect(calledUrl).toContain("ids=1%2C2");
    expect(calledUrl).toContain("tweet.fields=public_metrics");
    expect(supabaseStub.update).toHaveBeenCalledWith({
      public_metrics: { like_count: 5, retweet_count: 1, reply_count: 0, bookmark_count: 2 },
    });
    expect(payload.status).toBe("ok");
    expect(payload.candidates).toBe(2);
    expect(payload.updated).toBe(1);
    expect(payload.not_found).toBe(1);
    expect(payload.batch_errors).toEqual([]);
  });
});
