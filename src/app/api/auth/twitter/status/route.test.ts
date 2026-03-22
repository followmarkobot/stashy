import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { GET } from "./route";

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

const FUTURE = String(Date.now() + 60_000);
const PAST = String(Date.now() - 1_000);

describe("GET /api/auth/twitter/status", () => {
  it("runs dynamically in the node runtime so cookie-based auth status is not cached", async () => {
    const routeModule = await import("./route");

    expect(routeModule.dynamic).toBe("force-dynamic");
    expect(routeModule.runtime).toBe("nodejs");
  });

  it("returns connected=true with handle when all valid cookies are present", async () => {
    const response = await GET(
      makeRequest({
        x_access_token: "tok",
        x_user_id: "u1",
        x_user_handle: "alice",
        x_expires_at: FUTURE,
      })
    );
    const body = await response.json();
    expect(body).toEqual({ connected: true, handle: "alice" });
  });

  it("returns connected=false with handle=null when no cookies are set", async () => {
    const response = await GET(makeRequest());
    const body = await response.json();
    expect(body).toEqual({ connected: false, handle: null });
  });

  it("returns connected=false when access token cookie is missing", async () => {
    const response = await GET(
      makeRequest({ x_user_id: "u1", x_user_handle: "alice", x_expires_at: FUTURE })
    );
    const body = await response.json();
    expect(body).toEqual({ connected: false, handle: null });
  });

  it("returns connected=false when token is expired", async () => {
    const response = await GET(
      makeRequest({
        x_access_token: "tok",
        x_user_id: "u1",
        x_user_handle: "alice",
        x_expires_at: PAST,
      })
    );
    const body = await response.json();
    expect(body).toEqual({ connected: false, handle: null });
  });

  it("returns handle=null when not connected even if handle cookie exists", async () => {
    const response = await GET(makeRequest({ x_user_handle: "alice", x_expires_at: PAST }));
    const body = await response.json();
    expect(body.handle).toBeNull();
  });
});
