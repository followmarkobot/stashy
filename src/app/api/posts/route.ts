import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/serviceSupabase";
import { createDraftPostWithClient, slugifyAuthor } from "@/lib/posts";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("x_user_id")?.value;
  const userHandle = request.cookies.get("x_user_handle")?.value;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service client is not configured." },
      { status: 500 }
    );
  }

  try {
    const author = userHandle ?? userId;
    const post = await createDraftPostWithClient(supabase, {
      authorId: slugifyAuthor(author),
      authors: [author],
      userId,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Create draft route error:", error);

    return NextResponse.json(
      { error: "Failed to create draft post." },
      { status: 500 }
    );
  }
}
