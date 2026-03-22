import { NextRequest, NextResponse } from "next/server";

type CallbackFailureReason =
  | "missing_oauth_params"
  | "missing_oauth_cookies"
  | "state_mismatch"
  | "oauth_env_missing"
  | "token_exchange_failed"
  | "current_user_fetch_failed"
  | "missing_user_id"
  | "unexpected_callback_error";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

interface MeResponse {
  data?: {
    id: string;
    username?: string;
  };
}

class TwitterCallbackError extends Error {
  constructor(
    readonly reason: CallbackFailureReason,
    message: string
  ) {
    super(message);
    this.name = "TwitterCallbackError";
  }
}

function buildCallbackRedirectUrl(
  request: NextRequest,
  connected: boolean,
  errorReason?: CallbackFailureReason
): URL {
  const url = new URL("/", request.url);
  url.searchParams.set("xConnected", connected ? "1" : "0");
  if (errorReason) {
    url.searchParams.set("xError", errorReason);
  }
  return url;
}

async function exchangeCodeForToken(code: string, verifier: string): Promise<TokenResponse> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const callbackUrl = process.env.TWITTER_CALLBACK_URL;

  if (!clientId || !callbackUrl) {
    throw new TwitterCallbackError(
      "oauth_env_missing",
      "Missing Twitter OAuth environment variables."
    );
  }

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: callbackUrl,
    code_verifier: verifier,
    client_id: clientId,
  });

  const headers: HeadersInit = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (clientSecret) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers.Authorization = `Basic ${credentials}`;
  }

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new TwitterCallbackError(
      "token_exchange_failed",
      `Token exchange failed: ${details}`
    );
  }

  return (await response.json()) as TokenResponse;
}

async function fetchCurrentUser(accessToken: string): Promise<MeResponse["data"]> {
  const response = await fetch("https://api.x.com/2/users/me?user.fields=username", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new TwitterCallbackError(
      "current_user_fetch_failed",
      `Failed to fetch current user: ${details}`
    );
  }

  const payload = (await response.json()) as MeResponse;
  return payload.data;
}

function clearPkceCookies(response: NextResponse) {
  response.cookies.set("x_oauth_verifier", "", { maxAge: 0, path: "/" });
  response.cookies.set("x_oauth_state", "", { maxAge: 0, path: "/" });
}

function clearPkceAndRedirect(
  request: NextRequest,
  reason: CallbackFailureReason
): NextResponse {
  const response = NextResponse.redirect(buildCallbackRedirectUrl(request, false, reason));
  clearPkceCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedVerifier = request.cookies.get("x_oauth_verifier")?.value;
  const storedState = request.cookies.get("x_oauth_state")?.value;

  if (!code || !state || !storedVerifier || !storedState || state !== storedState) {
    const reason: CallbackFailureReason =
      !code || !state
        ? "missing_oauth_params"
        : !storedVerifier || !storedState
          ? "missing_oauth_cookies"
          : "state_mismatch";

    console.warn("Twitter callback validation failed:", {
      reason,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasStoredVerifier: Boolean(storedVerifier),
      hasStoredState: Boolean(storedState),
      callbackHost: request.nextUrl.host,
    });

    return clearPkceAndRedirect(request, reason);
  }

  try {
    const token = await exchangeCodeForToken(code, storedVerifier);
    const user = await fetchCurrentUser(token.access_token);

    if (!user?.id) {
      throw new TwitterCallbackError(
        "missing_user_id",
        "Twitter user id missing in /users/me response"
      );
    }

    const secure = process.env.NODE_ENV === "production";
    const expiresAt = Date.now() + (token.expires_in ?? 7200) * 1000;

    const response = NextResponse.redirect(buildCallbackRedirectUrl(request, true));
    clearPkceCookies(response);

    response.cookies.set("x_access_token", token.access_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: token.expires_in ?? 7200,
      path: "/",
    });

    if (token.refresh_token) {
      response.cookies.set("x_refresh_token", token.refresh_token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 90,
        path: "/",
      });
    }

    response.cookies.set("x_user_id", user.id, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
    });

    response.cookies.set("x_user_handle", user.username ?? "", {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
    });

    response.cookies.set("x_expires_at", String(expiresAt), {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
    });

    return response;
  } catch (error) {
    const reason =
      error instanceof TwitterCallbackError ? error.reason : "unexpected_callback_error";

    console.error("Twitter callback error:", {
      reason,
      message: error instanceof Error ? error.message : String(error),
      callbackHost: request.nextUrl.host,
    });

    return clearPkceAndRedirect(request, reason);
  }
}
