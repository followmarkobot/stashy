import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

function makeRequest(origin = "http://localhost:3001"): NextRequest {
  const url = new URL("/api/auth/twitter", origin);

  return {
    url: url.toString(),
    nextUrl: url,
  } as unknown as NextRequest;
}

describe("GET /api/auth/twitter", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.TWITTER_CLIENT_ID = "client-id";
    process.env.TWITTER_CALLBACK_URL = "http://localhost:3000/api/auth/twitter/callback";
  });

  it("uses the current request origin for the OAuth callback during local development", async () => {
    const { GET } = await import("./route");

    const response = await (
      GET as unknown as (request: NextRequest) => Promise<Response>
    )(makeRequest());

    expect(response.status).toBe(307);

    const redirect = new URL(response.headers.get("location") ?? "");
    expect(redirect.origin).toBe("https://x.com");
    expect(redirect.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3001/api/auth/twitter/callback"
    );
  });

  it("runs dynamically in the node runtime so OAuth state is never cached", async () => {
    const routeModule = await import("./route");

    expect(routeModule.dynamic).toBe("force-dynamic");
    expect(routeModule.runtime).toBe("nodejs");
  });
});
