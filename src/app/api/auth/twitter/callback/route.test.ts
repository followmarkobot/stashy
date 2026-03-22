import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

function makeRequest({
  code = "oauth-code",
  state = "oauth-state",
  cookies = {},
  origin = "http://localhost:3000",
}: {
  code?: string | null;
  state?: string | null;
  cookies?: Record<string, string>;
  origin?: string;
} = {}): NextRequest {
  const url = new URL("/api/auth/twitter/callback", origin);
  if (code !== null) {
    url.searchParams.set("code", code);
  }
  if (state !== null) {
    url.searchParams.set("state", state);
  }

  return {
    url: url.toString(),
    nextUrl: url,
    cookies: {
      get(name: string) {
        const value = cookies[name];
        return value !== undefined ? { value } : undefined;
      },
    },
  } as unknown as NextRequest;
}

describe("/api/auth/twitter/callback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.TWITTER_CLIENT_ID = "client-id";
    process.env.TWITTER_CLIENT_SECRET = "client-secret";
    process.env.TWITTER_CALLBACK_URL = "http://localhost:3000/api/auth/twitter/callback";
  });

  it("redirects with a reproducible error code when PKCE cookies are missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { GET } = await import("./route");

    const response = await GET(
      makeRequest({
        cookies: {},
      })
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/?xConnected=0&xError=missing_oauth_cookies"
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "Twitter callback validation failed:",
      expect.objectContaining({
        reason: "missing_oauth_cookies",
        hasCode: true,
        hasState: true,
        hasStoredVerifier: false,
        hasStoredState: false,
      })
    );
  });

  it("runs dynamically in the node runtime so callback responses are not cached", async () => {
    const routeModule = await import("./route");

    expect(routeModule.dynamic).toBe("force-dynamic");
    expect(routeModule.runtime).toBe("nodejs");
  });

  it("redirects with a reproducible error code when token exchange fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () => '{"error":"invalid_request"}',
      })
    );

    const { GET } = await import("./route");

    const response = await GET(
      makeRequest({
        cookies: {
          x_oauth_verifier: "stored-verifier",
          x_oauth_state: "oauth-state",
        },
      })
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/?xConnected=0&xError=token_exchange_failed"
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "Twitter callback error:",
      expect.objectContaining({
        reason: "token_exchange_failed",
        message: expect.stringContaining("Token exchange failed:"),
      })
    );
  });

  it("uses the current callback request origin for the token exchange redirect_uri", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 7200,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: "user-1",
            username: "marko",
          },
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("./route");

    const response = await GET(
      makeRequest({
        origin: "http://localhost:3001",
        cookies: {
          x_oauth_verifier: "stored-verifier",
          x_oauth_state: "oauth-state",
        },
      })
    );

    expect(response.status).toBe(307);

    const firstCallBody = fetchMock.mock.calls[0]?.[1]?.body;
    expect(String(firstCallBody)).toContain(
      "redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fauth%2Ftwitter%2Fcallback"
    );
  });
});
