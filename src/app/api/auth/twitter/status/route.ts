import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("x_access_token")?.value;
  const userId = request.cookies.get("x_user_id")?.value;
  const handle = request.cookies.get("x_user_handle")?.value || null;
  const expiresAtRaw = request.cookies.get("x_expires_at")?.value;

  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : 0;
  const connected = Boolean(accessToken && userId && expiresAt > Date.now());

  return NextResponse.json(
    {
      connected,
      handle: connected ? handle : null,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
