import { randomBytes, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  buildTwitterCallbackUrl,
  TWITTER_OAUTH_CALLBACK_COOKIE,
} from "@/lib/twitterAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toBase64Url(value: Buffer): string {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function GET(request: NextRequest) {
  const clientId = process.env.TWITTER_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "Missing TWITTER_CLIENT_ID" },
      { status: 500 }
    );
  }

  const callbackUrl = buildTwitterCallbackUrl(request);

  const verifier = toBase64Url(randomBytes(48));
  const challenge = toBase64Url(createHash("sha256").update(verifier).digest());
  const state = toBase64Url(randomBytes(24));

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: "bookmark.read tweet.read users.read offline.access",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  const authUrl = `https://x.com/i/oauth2/authorize?${params.toString()}`;
  const response = NextResponse.redirect(authUrl);

  const secure = process.env.NODE_ENV === "production";
  response.cookies.set("x_oauth_verifier", verifier, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  response.cookies.set("x_oauth_state", state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  response.cookies.set(TWITTER_OAUTH_CALLBACK_COOKIE, callbackUrl, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}
