import type { SupabaseClient } from "@supabase/supabase-js";

export type PostStatus = "draft" | "published";

export interface Post {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  author_id: string;
  user_id: string;
  authors: string[];
  status: PostStatus;
  created_at: string;
  updated_at: string;
}

export interface DraftPostInput {
  title?: string;
  subtitle?: string;
  content?: string;
  authorId?: string;
  authors?: string[];
  userId?: string;
}

interface PostRow {
  id: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  author_id: string | null;
  user_id: string | null;
  authors: string[] | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const DEFAULT_AUTHOR_NAME = "Marko";

function dedupeAuthors(authors: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  authors.forEach((author) => {
    const trimmed = author.trim();
    const key = trimmed.toLowerCase();

    if (!trimmed || seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(trimmed);
  });

  return result;
}

export function slugifyAuthor(author: string): string {
  const value = author.trim().toLowerCase();

  if (!value) {
    return DEFAULT_AUTHOR_NAME.toLowerCase();
  }

  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeAuthors(inputAuthors?: string[], authorId?: string): string[] {
  const authorCandidates = Array.isArray(inputAuthors) ? inputAuthors : [];
  const deduped = dedupeAuthors(authorCandidates);

  if (deduped.length > 0) {
    return deduped;
  }

  if (authorId?.trim()) {
    return [authorId.trim()];
  }

  return [DEFAULT_AUTHOR_NAME];
}

function hasOwn(input: DraftPostInput, key: keyof DraftPostInput): boolean {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function normalizeCreateInput(input: DraftPostInput) {
  const authors = normalizeAuthors(input.authors, input.authorId);
  const primaryAuthor = authors[0] ?? DEFAULT_AUTHOR_NAME;
  const authorId = input.authorId?.trim() || slugifyAuthor(primaryAuthor);

  return {
    title: input.title ?? "",
    subtitle: input.subtitle ?? "",
    content: input.content ?? "",
    author_id: authorId,
    authors,
    status: "draft" as const,
  };
}

function normalizePatchInput(input: DraftPostInput) {
  const payload: {
    title?: string;
    subtitle?: string;
    content?: string;
    author_id?: string;
    authors?: string[];
  } = {};

  if (hasOwn(input, "title")) {
    payload.title = input.title ?? "";
  }

  if (hasOwn(input, "subtitle")) {
    payload.subtitle = input.subtitle ?? "";
  }

  if (hasOwn(input, "content")) {
    payload.content = input.content ?? "";
  }

  if (hasOwn(input, "authorId") || hasOwn(input, "authors")) {
    const authors = normalizeAuthors(
      hasOwn(input, "authors") ? input.authors : undefined,
      hasOwn(input, "authorId") ? input.authorId : undefined
    );
    const primaryAuthor = authors[0] ?? DEFAULT_AUTHOR_NAME;

    payload.author_id =
      hasOwn(input, "authorId") && input.authorId?.trim()
        ? input.authorId.trim()
        : slugifyAuthor(primaryAuthor);
    payload.authors = authors;
  }

  return payload;
}

export function normalizePostRow(row: PostRow): Post {
  const authors = normalizeAuthors(row.authors ?? undefined, row.author_id ?? undefined);

  return {
    id: row.id,
    title: row.title ?? "",
    subtitle: row.subtitle ?? "",
    content: row.content ?? "",
    author_id: row.author_id?.trim() || slugifyAuthor(authors[0] ?? DEFAULT_AUTHOR_NAME),
    user_id: row.user_id ?? "",
    authors,
    status: row.status === "published" ? "published" : "draft",
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export async function createDraftPostWithClient(
  supabase: SupabaseClient,
  input: DraftPostInput = {}
): Promise<Post> {
  if (!input.userId) {
    throw new Error("Failed to create draft post.");
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      ...normalizeCreateInput(input),
      user_id: input.userId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Failed to create draft post.");
  }

  return normalizePostRow(data as PostRow);
}

export async function getPostByIdWithClient(
  supabase: SupabaseClient,
  postId: string,
  userId: string
): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load post.");
  }

  if (!data) {
    return null;
  }

  return normalizePostRow(data as PostRow);
}

export async function saveDraftPostWithClient(
  supabase: SupabaseClient,
  postId: string,
  input: DraftPostInput,
  userId: string
): Promise<Post | null> {
  const payload = {
    ...normalizePatchInput(input),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("posts")
    .update(payload)
    .eq("id", postId)
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error("Failed to save draft post.");
  }

  if (!data) {
    return null;
  }

  return normalizePostRow(data as PostRow);
}
