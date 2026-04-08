import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createDraftPostWithClient,
  getPostByIdWithClient,
  saveDraftPostWithClient,
} from "./posts";

type InsertCall = {
  rows: unknown;
};

type UpdateCall = {
  values: Record<string, unknown>;
  filters: Array<{ column: string; value: string }>;
};

type SelectCall = {
  filters: Array<{ column: string; value: string }>;
};

function createInsertMock(result: { data: unknown; error: unknown }) {
  const calls: InsertCall[] = [];

  const supabase = {
    from(table: string) {
      expect(table).toBe("posts");

      return {
        insert(rows: unknown) {
          calls.push({ rows });

          return {
            select() {
              return {
                single() {
                  return Promise.resolve(result);
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;

  return { supabase, calls };
}

function createUpdateMock(result: { data: unknown; error: unknown }) {
  const calls: UpdateCall[] = [];

  const supabase = {
    from(table: string) {
      expect(table).toBe("posts");

      return {
        update(values: Record<string, unknown>) {
          const call: UpdateCall = { values, filters: [] };
          calls.push(call);

          const builder = {
            eq(column: string, value: string) {
              call.filters.push({ column, value });
              return builder;
            },
            select() {
              return {
                maybeSingle() {
                  return Promise.resolve(result);
                },
                single() {
                  return Promise.resolve(result);
                },
              };
            },
          };

          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;

  return { supabase, calls };
}

function createSelectMock(result: { data: unknown; error: unknown }) {
  const calls: SelectCall[] = [];

  const supabase = {
    from(table: string) {
      expect(table).toBe("posts");

      return {
        select(columns: string) {
          expect(columns).toBe("*");

          const call: SelectCall = { filters: [] };
          calls.push(call);

          const builder = {
            eq(column: string, value: string) {
              call.filters.push({ column, value });
              return builder;
            },
            maybeSingle() {
              return Promise.resolve(result);
            },
          };

          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;

  return { supabase, calls };
}

describe("createDraftPostWithClient", () => {
  it("creates a draft post with the requested defaults", async () => {
    const { supabase, calls } = createInsertMock({
      data: {
        id: "post-1",
        title: "",
        subtitle: "",
        content: "",
        author_id: "marko",
        user_id: "user-1",
        authors: ["Marko"],
        status: "draft",
        created_at: "2026-03-22T18:00:00.000Z",
        updated_at: "2026-03-22T18:00:00.000Z",
      },
      error: null,
    });

    const result = await createDraftPostWithClient(supabase, {
      authorId: "marko",
      authors: ["Marko"],
      userId: "user-1",
    });

    expect(result.id).toBe("post-1");
    expect(calls).toHaveLength(1);
    expect(calls[0].rows).toMatchObject({
      title: "",
      subtitle: "",
      content: "",
      author_id: "marko",
      user_id: "user-1",
      authors: ["Marko"],
      status: "draft",
    });
  });
});

describe("getPostByIdWithClient", () => {
  it("returns null when the post is not owned by the requested user", async () => {
    const { supabase, calls } = createSelectMock({
      data: null,
      error: null,
    });

    const result = await getPostByIdWithClient(supabase, "post-1", "user-1");

    expect(result).toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0].filters).toEqual([
      { column: "id", value: "post-1" },
      { column: "user_id", value: "user-1" },
    ]);
  });
});

describe("saveDraftPostWithClient", () => {
  it("persists the latest editor fields and keeps the record as a draft", async () => {
    const { supabase, calls } = createUpdateMock({
      data: {
        id: "post-1",
        title: "Title",
        subtitle: "Subtitle",
        content: "<p>Body</p>",
        author_id: "marko",
        user_id: "user-1",
        authors: ["Marko", "Ana"],
        status: "draft",
        created_at: "2026-03-22T18:00:00.000Z",
        updated_at: "2026-03-22T18:02:00.000Z",
      },
      error: null,
    });

    const result = await saveDraftPostWithClient(supabase, "post-1", {
      title: "Title",
      subtitle: "Subtitle",
      content: "<p>Body</p>",
      authorId: "marko",
      authors: ["Marko", "Ana"],
    }, "user-1");

    if (!result) {
      throw new Error("Expected saved draft to be returned.");
    }

    expect(result.updated_at).toBe("2026-03-22T18:02:00.000Z");
    expect(calls).toHaveLength(1);
    expect(calls[0].filters).toEqual([
      { column: "id", value: "post-1" },
      { column: "user_id", value: "user-1" },
    ]);
    expect(calls[0].values).toMatchObject({
      title: "Title",
      subtitle: "Subtitle",
      content: "<p>Body</p>",
      author_id: "marko",
      authors: ["Marko", "Ana"],
      status: "draft",
    });
    expect(calls[0].values.updated_at).toEqual(expect.any(String));
  });

  it("returns null when no owned draft matches the update filters", async () => {
    const { supabase, calls } = createUpdateMock({
      data: null,
      error: null,
    });

    await expect(
      saveDraftPostWithClient(
        supabase,
        "post-1",
        {
          title: "Title",
        },
        "user-1"
      )
    ).resolves.toBeNull();

    expect(calls).toHaveLength(1);
    expect(calls[0].filters).toEqual([
      { column: "id", value: "post-1" },
      { column: "user_id", value: "user-1" },
    ]);
  });
});
