import { NextRequest, NextResponse } from "next/server";
import {
  getPostByIdWithClient,
  saveDraftPostWithClient,
  type DraftPostInput,
} from "@/lib/posts";
import { getServiceSupabase } from "@/lib/serviceSupabase";

export const runtime = "nodejs";

function parseDraftPayload(body: unknown): DraftPostInput {
  const payload: Record<string, unknown> =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const authorsValue = Array.isArray(payload.authors)
    ? (payload.authors as unknown[])
        .filter((value): value is string => typeof value === "string")
    : [];

  return {
    title: typeof payload.title === "string" ? payload.title : "",
    subtitle: typeof payload.subtitle === "string" ? payload.subtitle : "",
    content: typeof payload.content === "string" ? payload.content : "",
    authorId: typeof payload.authorId === "string" ? payload.authorId : "",
    authors: authorsValue,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const userId = request.cookies.get("x_user_id")?.value;

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
    const post = await getPostByIdWithClient(supabase, params.postId, userId);

    if (!post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    console.error("Get post route error:", error);

    return NextResponse.json(
      { error: "Failed to load post." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const userId = request.cookies.get("x_user_id")?.value;

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
    const post = await saveDraftPostWithClient(
      supabase,
      params.postId,
      parseDraftPayload(await request.json()),
      userId
    );

    if (!post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    console.error("Save draft route error:", error);

    return NextResponse.json(
      { error: "Failed to save draft post." },
      { status: 500 }
    );
  }
}
