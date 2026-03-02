import { useState, useEffect, useCallback, useRef } from "react";
import type { Tweet } from "../lib/supabase";
import { fetchTweets, fetchAllTags } from "../lib/supabase";

export interface UseStashFeedReturn {
  tweets: Tweet[];
  loading: boolean;
  initialLoading: boolean;
  hasMore: boolean;
  search: string;
  setSearch: (s: string) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  availableTags: string[];
  loadMore: () => void;
}

export function useStashFeed(): UseStashFeedReturn {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const searchRef = useRef(search);
  const tagsRef = useRef(selectedTags);
  searchRef.current = search;
  tagsRef.current = selectedTags;

  useEffect(() => {
    fetchAllTags().then(setAvailableTags);
  }, []);

  const loadStashTweets = useCallback(
    async (pageNum: number, searchQuery: string, tags: string[], append: boolean) => {
      setLoading(true);
      const result = await fetchTweets(pageNum, searchQuery, tags);
      setTweets((prev) => (append ? [...prev, ...result.tweets] : result.tweets));
      setHasMore(result.hasMore);
      setLoading(false);
      setInitialLoading(false);
    },
    []
  );

  useEffect(() => {
    setPage(0);
    setTweets([]);
    setHasMore(true);
    setInitialLoading(true);
    loadStashTweets(0, search, selectedTags, false);
  }, [search, selectedTags, loadStashTweets]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadStashTweets(nextPage, searchRef.current, tagsRef.current, true);
  }, [loading, hasMore, page, loadStashTweets]);

  return {
    tweets,
    loading,
    initialLoading,
    hasMore,
    search,
    setSearch,
    selectedTags,
    setSelectedTags,
    availableTags,
    loadMore,
  };
}
