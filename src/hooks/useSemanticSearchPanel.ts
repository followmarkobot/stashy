import { useCallback, useMemo, useRef, useState } from "react";
import { mergeSearchResults } from "../lib/searchResults";

/** Shape of a semantic search result. Matches SemanticResultItem in useSemanticSearch.ts (PR4). */
export interface SemanticResultItem {
  id: string;
  content: string;
  similarity: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseSemanticSearchPanelOptions {
  results: SemanticResultItem[];
  selectedIds: string[];
  onResultsChange: (results: SemanticResultItem[]) => void;
  onSelectedIdsChange: (ids: string[]) => void;
}

export interface UseSemanticSearchPanelReturn {
  query: string;
  setQuery: (q: string) => void;
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (s: string) => void;
  searchLoading: boolean;
  refiningLoading: boolean;
  chatLoading: boolean;
  error: string;
  hasResults: boolean;
  selectedItems: SemanticResultItem[];
  indexById: Map<string, number>;
  latestAssistantMessage: string;
  runSearch: (event: React.FormEvent) => Promise<void>;
  writeFromSelected: () => Promise<void>;
  sendRefinement: (event: React.FormEvent) => Promise<void>;
  clearSemantic: () => void;
  saveToCollection: () => void;
}

function extractCitedIndexes(text: string): number[] {
  if (typeof text !== "string") return [];
  const matches = Array.from(text.matchAll(/\[(\d+)\]/g));
  const numbers = matches
    .map((match) => Number(match[1]))
    .filter((n) => Number.isInteger(n) && n > 0);
  return Array.from(new Set(numbers));
}

export function useSemanticSearchPanel({
  results,
  selectedIds,
  onResultsChange,
  onSelectedIdsChange,
}: UseSemanticSearchPanelOptions): UseSemanticSearchPanelReturn {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [refiningLoading, setRefiningLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState("");
  const activeSearchIdRef = useRef(0);

  const safeResults = results || [];
  const safeSelectedIds = selectedIds || [];

  const selectedItems = useMemo(
    () => safeResults.filter((item) => safeSelectedIds.includes(item.id)),
    [safeResults, safeSelectedIds]
  );

  const latestAssistantMessage =
    [...messages].reverse().find((msg) => msg.role === "assistant")?.content || "";

  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    safeResults.forEach((item, idx) => map.set(item.id, idx + 1));
    return map;
  }, [safeResults]);

  const hasResults = safeResults.length > 0;

  const fetchSearchResults = useCallback(
    async (trimmedQuery: string, mode: string): Promise<SemanticResultItem[]> => {
      const response = await fetch(`/api/search?mode=${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuery }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Search failed");
      }
      return Array.isArray(data?.results) ? data.results : [];
    },
    []
  );

  const requestChat = useCallback(
    async (nextMessages: ChatMessage[]) => {
      setChatLoading(true);
      setError("");
      try {
        const contextItems = selectedItems.length ? selectedItems : safeResults;

        if (!contextItems || contextItems.length === 0) {
          throw new Error("retrievedItems is required and cannot be empty");
        }

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages,
            retrievedItems: contextItems,
            userVoiceExamples: [],
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Chat request failed");
        }
        if (!data?.reply?.content) {
          throw new Error("Empty response from AI");
        }

        setMessages([...nextMessages, data.reply as ChatMessage]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chat failed");
        setMessages(nextMessages);
      } finally {
        setChatLoading(false);
      }
    },
    [selectedItems, safeResults]
  );

  const runSearch = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      setSearchLoading(true);
      setRefiningLoading(false);
      setError("");
      const currentSearchId = activeSearchIdRef.current + 1;
      activeSearchIdRef.current = currentSearchId;

      try {
        const keywordResults = await fetchSearchResults(trimmed, "keyword");
        if (activeSearchIdRef.current !== currentSearchId) return;

        onResultsChange(keywordResults);
        onSelectedIdsChange(keywordResults.map((item) => item.id));
        setMessages([]);
        setChatInput("");
        setSearchLoading(false);

        setRefiningLoading(true);
        const semanticResults = await fetchSearchResults(trimmed, "semantic");
        if (activeSearchIdRef.current !== currentSearchId) return;

        const mergedResults = mergeSearchResults(keywordResults, semanticResults);
        onResultsChange(mergedResults);
        onSelectedIdsChange(mergedResults.map((item) => item.id));
      } catch (err) {
        if (activeSearchIdRef.current !== currentSearchId) return;
        setError(err instanceof Error ? err.message : "Search failed");
        onResultsChange([]);
        onSelectedIdsChange([]);
        setMessages([]);
      } finally {
        if (activeSearchIdRef.current === currentSearchId) {
          setSearchLoading(false);
          setRefiningLoading(false);
        }
      }
    },
    [query, fetchSearchResults, onResultsChange, onSelectedIdsChange]
  );

  const writeFromSelected = useCallback(async () => {
    if (!selectedItems.length || chatLoading) return;

    const selectedNumbers = selectedItems
      .map((item) => indexById.get(item.id))
      .filter(Boolean)
      .map((n) => `[${n}]`)
      .join(", ");

    const prompt = `Draft one tweet using only these selected corpus items: ${selectedNumbers}. Cite sources inline.`;
    const nextMessages: ChatMessage[] = [{ role: "user", content: prompt }];
    setMessages(nextMessages);
    await requestChat(nextMessages);
  }, [selectedItems, chatLoading, indexById, requestChat]);

  const sendRefinement = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = chatInput.trim();
      if (!trimmed || chatLoading) return;

      const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextMessages);
      setChatInput("");
      await requestChat(nextMessages);
    },
    [chatInput, chatLoading, messages, requestChat]
  );

  const clearSemantic = useCallback(() => {
    activeSearchIdRef.current += 1;
    onResultsChange([]);
    onSelectedIdsChange([]);
    setMessages([]);
    setChatInput("");
    setError("");
    setSearchLoading(false);
    setRefiningLoading(false);
  }, [onResultsChange, onSelectedIdsChange]);

  const saveToCollection = useCallback(() => {
    const sourceIndexes = extractCitedIndexes(latestAssistantMessage);
    const sourceItemIds = sourceIndexes
      .map((idx) => safeResults[idx - 1]?.id)
      .filter(Boolean);

    console.log({
      tweetContent: latestAssistantMessage,
      sourceItemIds,
    });
  }, [latestAssistantMessage, safeResults]);

  return {
    query,
    setQuery,
    messages,
    chatInput,
    setChatInput,
    searchLoading,
    refiningLoading,
    chatLoading,
    error,
    hasResults,
    selectedItems,
    indexById,
    latestAssistantMessage,
    runSearch,
    writeFromSelected,
    sendRefinement,
    clearSemantic,
    saveToCollection,
  };
}
