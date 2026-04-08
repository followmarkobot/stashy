import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const getServiceSupabaseMock = vi.fn();
const createDraftPostWithClientMock = vi.fn();

vi.mock("@/lib/serviceSupabase", () => ({
  getServiceSupabase: getServiceSupabaseMock,
}));

vi.mock("@/lib/posts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/posts")>("@/lib/posts");

  return {
    ...actual,
    createDraftPostWithClient: createDraftPostWithClientMock,
  };
});

function makeRequest(cookies: Record<string, string> = {}): NextRequest {
  return {
    cookies: {
      get(name: string) {
        const value = cookies[name];
        return value !== undefined ? { value } : undefined;
      },
    },
  } as unknown as NextRequest;
}

describe("POST /api/posts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getServiceSupabaseMock.mockReset();
    createDraftPostWithClientMock.mockReset();
  });

  it("returns 401 when the user id cookie is missing", async () => {
    getServiceSupabaseMock.mockReturnValue({});

    const { POST } = await import("./route");
    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Not authenticated." });
    expect(getServiceSupabaseMock).not.toHaveBeenCalled();
    expect(createDraftPostWithClientMock).not.toHaveBeenCalled();
  });

  it("creates a draft for the authenticated user", async () => {
    const supabase = {};
    getServiceSupabaseMock.mockReturnValue(supabase);
    createDraftPostWithClientMock.mockResolvedValue({
      id: "post-1",
      title: "",
      subtitle: "",
      content: "",
      author_id: "alice",
      user_id: "user-1",
      authors: ["alice"],
      status: "draft",
      created_at: "2026-03-22T18:00:00.000Z",
      updated_at: "2026-03-22T18:00:00.000Z",
    });

    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        x_user_id: "user-1",
        x_user_handle: "alice",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(createDraftPostWithClientMock).toHaveBeenCalledWith(supabase, {
      authorId: "alice",
      authors: ["alice"],
      userId: "user-1",
    });
    expect(body.post.id).toBe("post-1");
  });
});
