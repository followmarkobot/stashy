import { NextRequest, NextResponse } from "next/server";
import {
  getPostByIdWithClient,
  saveDraftPostWithClient,
  type DraftPostInput,
} from "@/lib/posts";
import { getServiceSupabase } from "@/lib/serviceSupabase";

export const runtime = "nodejs";

function hasOwn(payload: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function parseDraftPayload(body: unknown): DraftPostInput {
  const payload: Record<string, unknown> =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const draft: DraftPostInput = {};

  if (hasOwn(payload, "title")) {
    draft.title = typeof payload.title === "string" ? payload.title : "";
  }

  if (hasOwn(payload, "subtitle")) {
    draft.subtitle = typeof payload.subtitle === "string" ? payload.subtitle : "";
  }

  if (hasOwn(payload, "content")) {
    draft.content = typeof payload.content === "string" ? payload.content : "";
  }

  if (hasOwn(payload, "authorId")) {
    draft.authorId = typeof payload.authorId === "string" ? payload.authorId : "";
  }

  if (hasOwn(payload, "authors")) {
    draft.authors = Array.isArray(payload.authors)
      ? (payload.authors as unknown[]).filter(
          (value): value is string => typeof value === "string"
        )
      : [];
  }

  return draft;
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
