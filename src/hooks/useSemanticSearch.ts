"use client";

import { useMemo, useState } from "react";

export interface SemanticResultItem {
  id: string;
  content: string;
  similarity: number;
}

export interface UseSemanticSearchReturn {
  semanticResults: SemanticResultItem[];
  setSemanticResults: (results: SemanticResultItem[]) => void;
  semanticSelectedIds: string[];
  setSemanticSelectedIds: (ids: string[]) => void;
  semanticCorpusIds: string[];
  setSemanticCorpusIds: (ids: string[]) => void;
  semanticAutoSelectAll: boolean;
  setSemanticAutoSelectAll: (value: boolean) => void;
  semanticFilterIds: string[];
  semanticSimilarityById: Record<string, number>;
  effectiveSemanticSelectedIds: string[];
  toggleSemanticSelection: (tweetId: string) => void;
  selectAllSemantic: (ids?: string[]) => void;
  deselectAllSemantic: () => void;
  resetSemantic: () => void;
}

export function useSemanticSearch(): UseSemanticSearchReturn {
  const [semanticResults, setSemanticResults] = useState<SemanticResultItem[]>([]);
  const [semanticSelectedIds, setSemanticSelectedIds] = useState<string[]>([]);
  const [semanticCorpusIds, setSemanticCorpusIds] = useState<string[]>([]);
  const [semanticAutoSelectAll, setSemanticAutoSelectAll] = useState(true);

  const semanticFilterIds = useMemo(
    () => semanticResults.map((item) => item.id),
    [semanticResults]
  );

  const semanticSimilarityById = useMemo(() => {
    const byId: Record<string, number> = {};
    semanticResults.forEach((item) => {
      byId[item.id] = item.similarity;
    });
    return byId;
  }, [semanticResults]);

  const effectiveSemanticSelectedIds = useMemo(
    () => (semanticAutoSelectAll ? semanticCorpusIds : semanticSelectedIds),
    [semanticAutoSelectAll, semanticCorpusIds, semanticSelectedIds]
  );

  const toggleSemanticSelection = (tweetId: string) => {
    if (semanticAutoSelectAll) {
      setSemanticAutoSelectAll(false);
      setSemanticSelectedIds(semanticCorpusIds.filter((id) => id !== tweetId));
      return;
    }

    setSemanticAutoSelectAll(false);
    setSemanticSelectedIds((prev) =>
      prev.includes(tweetId) ? prev.filter((id) => id !== tweetId) : [...prev, tweetId]
    );
  };

  const selectAllSemantic = (ids?: string[]) => {
    setSemanticAutoSelectAll(true);
    setSemanticSelectedIds(ids ?? semanticCorpusIds);
  };

  const deselectAllSemantic = () => {
    setSemanticAutoSelectAll(false);
    setSemanticSelectedIds([]);
  };

  const resetSemantic = () => {
    setSemanticResults([]);
    setSemanticSelectedIds([]);
    setSemanticCorpusIds([]);
    setSemanticAutoSelectAll(true);
  };

  return {
    semanticResults,
    setSemanticResults,
    semanticSelectedIds,
    setSemanticSelectedIds,
    semanticCorpusIds,
    setSemanticCorpusIds,
    semanticAutoSelectAll,
    setSemanticAutoSelectAll,
    semanticFilterIds,
    semanticSimilarityById,
    effectiveSemanticSelectedIds,
    toggleSemanticSelection,
    selectAllSemantic,
    deselectAllSemantic,
    resetSemantic,
  };
}
