import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { upsertBookmarksCollection } from "./collectionsQuery";

interface CollectionCall {
  rows: unknown;
  options: Record<string, unknown> | undefined;
}

function createMock(
  results: Array<{ data: { id: string } | null; error: unknown }>
) {
  const calls: CollectionCall[] = [];
  let attempt = 0;

  const supabase = {
    from() {
      return {
        upsert(rows: unknown, opts?: Record<string, unknown>) {
          calls.push({ rows, options: opts });
          return {
            select() {
              return {
                single() {
                  const result = results[attempt] ?? results[results.length - 1];
                  attempt += 1;
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

describe("upsertBookmarksCollection", () => {
  it("returns collection_id and used_legacy_owner_column=false on modern column success", async () => {
    const { supabase, calls } = createMock([{ data: { id: "col-1" }, error: null }]);

    const result = await upsertBookmarksCollection(supabase, "user-1");

    expect(result).toEqual({ collection_id: "col-1", used_legacy_owner_column: false });
    expect(calls).toHaveLength(1);
    expect(calls[0].rows).toMatchObject({ owner_user_id: "user-1" });
    expect(calls[0].options).toMatchObject({ onConflict: "owner_user_id,slug" });
  });

  it("falls back to owner_x_user_id and returns used_legacy_owner_column=true on column error", async () => {
    const { supabase, calls } = createMock([
      { data: null, error: { message: 'column "owner_user_id" does not exist' } },
      { data: { id: "col-legacy" }, error: null },
    ]);

    const result = await upsertBookmarksCollection(supabase, "user-1");

    expect(result).toEqual({ collection_id: "col-legacy", used_legacy_owner_column: true });
    expect(calls).toHaveLength(2);
    expect(calls[1].rows).toMatchObject({ owner_x_user_id: "user-1" });
    expect(calls[1].options).toMatchObject({ onConflict: "owner_x_user_id,slug" });
  });

  it("falls back to legacy column when modern upsert returns null data without error", async () => {
    const { supabase, calls } = createMock([
      { data: null, error: null },
      { data: { id: "col-2" }, error: null },
    ]);

    const result = await upsertBookmarksCollection(supabase, "user-1");

    expect(result.collection_id).toBe("col-2");
    expect(result.used_legacy_owner_column).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it("throws with migration hint when both attempts fail", async () => {
    const { supabase } = createMock([
      { data: null, error: {} },
      { data: null, error: {} },
    ]);

    await expect(upsertBookmarksCollection(supabase, "user-1")).rejects.toThrow(
      "Run supabase/sql/collections.sql"
    );
  });
});
