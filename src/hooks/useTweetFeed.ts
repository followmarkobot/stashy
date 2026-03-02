import { useStashFeed, type UseStashFeedReturn } from "./useStashFeed";
import { useBookmarkFeed, type UseBookmarkFeedReturn } from "./useBookmarkFeed";

export type TweetFeedResult =
  | ({ source: "stash" } & UseStashFeedReturn)
  | ({ source: "bookmarks" } & UseBookmarkFeedReturn);

export function useTweetFeed(dataSource: "stash" | "bookmarks"): TweetFeedResult {
  const stash = useStashFeed();
  const bookmarks = useBookmarkFeed();

  return dataSource === "stash"
    ? { source: "stash", ...stash }
    : { source: "bookmarks", ...bookmarks };
}
