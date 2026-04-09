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

  it("returns the owned post for GET success", async () => {
    const supabase = {};
    const post = {
      id: "post-1",
      title: "Loaded draft",
      subtitle: "A subtitle",
      content: "<p>Body</p>",
      author_id: "marko",
      user_id: "user-1",
      authors: ["Marko"],
      status: "draft",
      created_at: "2026-03-22T18:00:00.000Z",
      updated_at: "2026-03-22T18:05:00.000Z",
    };

    getServiceSupabaseMock.mockReturnValue(supabase);
    getPostByIdWithClientMock.mockResolvedValue(post);

    const { GET } = await import("./route");
    const response = await GET(
      makeRequest({ x_user_id: "user-1" }),
      { params: { postId: "post-1" } }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ post });
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

  it("passes through only the provided fields for partial PATCH updates", async () => {
    const supabase = {};
    getServiceSupabaseMock.mockReturnValue(supabase);
    saveDraftPostWithClientMock.mockResolvedValue(null);

    const { PATCH } = await import("./route");
    await PATCH(
      makeRequest({ x_user_id: "user-1" }, { title: "Updated" }),
      { params: { postId: "post-1" } }
    );

    expect(saveDraftPostWithClientMock).toHaveBeenCalledWith(
      supabase,
      "post-1",
      { title: "Updated" },
      "user-1"
    );
  });

  it("preserves omitted fields on PATCH success so partial updates do not blank the draft", async () => {
    const supabase = {};
    const post = {
      id: "post-1",
      title: "Updated",
      subtitle: "Existing subtitle",
      content: "<p>Existing body</p>",
      author_id: "marko",
      user_id: "user-1",
      authors: ["Marko", "Ana"],
      status: "draft",
      created_at: "2026-03-22T18:00:00.000Z",
      updated_at: "2026-03-22T18:06:00.000Z",
    };

    getServiceSupabaseMock.mockReturnValue(supabase);
    saveDraftPostWithClientMock.mockResolvedValue(post);

    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest(
        { x_user_id: "user-1" },
        {
          title: "Updated",
        }
      ),
      { params: { postId: "post-1" } }
    );
    const body = await response.json();
    const patchPayload = saveDraftPostWithClientMock.mock.calls[0]?.[2];

    expect(response.status).toBe(200);
    expect(body).toEqual({ post });
    expect(saveDraftPostWithClientMock.mock.calls[0]?.[0]).toBe(supabase);
    expect(saveDraftPostWithClientMock.mock.calls[0]?.[1]).toBe("post-1");
    expect(patchPayload).toStrictEqual({
      title: "Updated",
    });
    expect(saveDraftPostWithClientMock.mock.calls[0]?.[3]).toBe("user-1");
  });
});
