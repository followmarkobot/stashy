export interface ReverseChronologicalFields {
  timestamp?: unknown;
  saved_at?: unknown;
  created_at?: unknown;
}

function toSortableTime(value: unknown): number {
  if (typeof value !== "string" || value.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

export function compareReverseChronological(
  a: ReverseChronologicalFields,
  b: ReverseChronologicalFields
): number {
  const fields: Array<keyof ReverseChronologicalFields> = [
    "timestamp",
    "saved_at",
    "created_at",
  ];

  for (const field of fields) {
    const diff = toSortableTime(b[field]) - toSortableTime(a[field]);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

export function sortTweetsReverseChronological<T extends ReverseChronologicalFields>(
  tweets: T[]
): T[] {
  return [...tweets].sort(compareReverseChronological);
}
