import { NextRequest, NextResponse } from "next/server";
import { TWITTER_OAUTH_CALLBACK_COOKIE } from "@/lib/twitterAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clearTwitterCookies(response: NextResponse) {
  const names = [
    "x_access_token",
    "x_refresh_token",
    "x_user_id",
    "x_user_handle",
    "x_expires_at",
    "x_oauth_verifier",
    "x_oauth_state",
    TWITTER_OAUTH_CALLBACK_COOKIE,
  ];

  names.forEach((name) => {
    response.cookies.set(name, "", { maxAge: 0, path: "/" });
  });
}

function redirectHome(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL("/", request.url));
  clearTwitterCookies(response);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function POST(request: NextRequest) {
  return redirectHome(request);
}

export async function GET(request: NextRequest) {
  return redirectHome(request);
}
