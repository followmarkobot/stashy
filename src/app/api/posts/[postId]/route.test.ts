import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const getServiceSupabaseMock = vi.fn();
const getPostByIdWithClientMock = vi.fn();
const saveDraftPostWithClientMock = vi.fn();

vi.mock("@/lib/serviceSupabase", () => ({
  getServiceSupabase: getServiceSupabaseMock,
}));

vi.mock("@/lib/posts", () => ({
  getPostByIdWithClient: getPostByIdWithClientMock,
  saveDraftPostWithClient: saveDraftPostWithClientMock,
}));

function makeRequest(
  cookies: Record<string, string> = {},
  jsonValue: unknown = {}
): NextRequest {
  return {
    cookies: {
      get(name: string) {
        const value = cookies[name];
        return value !== undefined ? { value } : undefined;
      },
    },
    json: vi.fn().mockResolvedValue(jsonValue),
  } as unknown as NextRequest;
}

describe("/api/posts/[postId]", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getServiceSupabaseMock.mockReset();
    getPostByIdWithClientMock.mockReset();
    saveDraftPostWithClientMock.mockReset();
  });

  it("returns 401 for GET when the user id cookie is missing", async () => {
    getServiceSupabaseMock.mockReturnValue({});

    const { GET } = await import("./route");
    const response = await GET(makeRequest(), { params: { postId: "post-1" } });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Not authenticated." });
    expect(getServiceSupabaseMock).not.toHaveBeenCalled();
    expect(getPostByIdWithClientMock).not.toHaveBeenCalled();
  });

  it("returns 404 for GET when the owned post does not exist", async () => {
    const supabase = {};
    getServiceSupabaseMock.mockReturnValue(supabase);
    getPostByIdWithClientMock.mockResolvedValue(null);

    const { GET } = await import("./route");
    const response = await GET(
      makeRequest({ x_user_id: "user-1" }),
      { params: { postId: "post-1" } }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Post not found." });
    expect(getPostByIdWithClientMock).toHaveBeenCalledWith(supabase, "post-1", "user-1");
  });

  it("returns 401 for PATCH when the user id cookie is missing", async () => {
    getServiceSupabaseMock.mockReturnValue({});

    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({}, { title: "Updated" }),
      { params: { postId: "post-1" } }
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Not authenticated." });
    expect(getServiceSupabaseMock).not.toHaveBeenCalled();
    expect(saveDraftPostWithClientMock).not.toHaveBeenCalled();
  });

  it("returns 404 for PATCH when the post is not owned by the authenticated user", async () => {
    const supabase = {};
    getServiceSupabaseMock.mockReturnValue(supabase);
    saveDraftPostWithClientMock.mockResolvedValue(null);

    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest(
        { x_user_id: "user-1" },
        {
          title: "Updated",
          subtitle: "Sub",
          content: "<p>Body</p>",
          authorId: "alice",
          authors: ["alice"],
        }
      ),
      { params: { postId: "post-1" } }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Post not found." });
    expect(saveDraftPostWithClientMock).toHaveBeenCalledWith(
      supabase,
      "post-1",
      {
        title: "Updated",
        subtitle: "Sub",
        content: "<p>Body</p>",
        authorId: "alice",
        authors: ["alice"],
      },
      "user-1"
    );
  });
});
