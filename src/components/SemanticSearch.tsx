"use client";

import React from "react";
import { useSemanticSearchPanel, type SemanticResultItem } from "../hooks/useSemanticSearchPanel";

interface SemanticSearchProps {
  results: SemanticResultItem[];
  selectedIds: string[];
  onResultsChange: (results: SemanticResultItem[]) => void;
  onSelectedIdsChange: (ids: string[]) => void;
  onClose?: () => void;
}

function extractCitedIndexes(text: string): number[] {
  if (typeof text !== "string") return [];
  const matches = Array.from(text.matchAll(/\[(\d+)\]/g));
  const numbers = matches
    .map((match) => Number(match[1]))
    .filter((n) => Number.isInteger(n) && n > 0);
  return Array.from(new Set(numbers));
}

export default function SemanticSearch({
  results,
  selectedIds,
  onResultsChange,
  onSelectedIdsChange,
  onClose,
}: SemanticSearchProps) {
  const panel = useSemanticSearchPanel({
    results,
    selectedIds,
    onResultsChange,
    onSelectedIdsChange,
  });

  const safeResults = results || [];
  const safeSelectedIds = selectedIds || [];
  const hasResults = safeResults.length > 0;

  return (
    <div className="min-h-screen border-l border-[rgb(47,51,54)] bg-black">
      <div className="sticky top-0 z-10 border-b border-[rgb(47,51,54)] bg-black/80 px-4 py-3 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-white">Semantic Search + AI Collaborator</h2>
          {onClose ? (
            <button
              onClick={onClose}
              className="rounded-full border border-[rgb(47,51,54)] px-3 py-1 text-xs font-semibold text-white hover:bg-[rgb(8,10,13)]"
            >
              Close
            </button>
          ) : null}
        </div>

        <form onSubmit={panel.runSearch} className="flex gap-2">
          <input
            value={panel.query}
            onChange={(event) => panel.setQuery(event.target.value)}
            placeholder="Describe a concept..."
            className="w-full rounded-full border border-[rgb(47,51,54)] bg-black px-4 py-2 text-sm text-white placeholder:text-[rgb(113,118,123)] focus:border-[rgb(29,155,240)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={panel.searchLoading}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            {panel.searchLoading ? "Searching..." : "Search"}
          </button>
        </form>

        {panel.error ? (
          <p className="mt-3 rounded-xl border border-[rgb(244,33,46)] bg-[rgba(244,33,46,0.08)] px-3 py-2 text-sm text-[rgb(255,120,132)]">
            {panel.error}
          </p>
        ) : null}

        {hasResults ? (
          <p className="mt-3 text-xs text-[rgb(113,118,123)]">
            Filtering {safeResults.length} tweets. {safeSelectedIds.length} selected for chat context.
            {panel.refiningLoading ? " Refining with semantic results..." : ""}
          </p>
        ) : (
          <p className="mt-3 text-xs text-[rgb(113,118,123)]">
            Search to filter the timeline. Select/deselect directly on tweet rows.
          </p>
        )}
      </div>

      <div className="border-b border-[rgb(47,51,54)] px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={panel.writeFromSelected}
            disabled={!panel.selectedItems.length || panel.chatLoading}
            className="rounded-full bg-[rgb(29,155,240)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {panel.chatLoading ? "Generating..." : "Write tweet from selected"}
          </button>
          <button
            onClick={panel.clearSemantic}
            disabled={!hasResults}
            className="rounded-full border border-[rgb(47,51,54)] px-4 py-2 text-sm font-semibold text-white hover:bg-[rgb(8,10,13)] disabled:opacity-60"
          >
            Clear filter
          </button>
        </div>
      </div>

      <form onSubmit={panel.sendRefinement} className="border-b border-[rgb(47,51,54)] px-4 py-3">
        <div className="flex gap-2">
          <input
            value={panel.chatInput}
            onChange={(event) => panel.setChatInput(event.target.value)}
            placeholder="ask a question or request a draft..."
            className="w-full rounded-full border border-[rgb(47,51,54)] bg-black px-4 py-2 text-sm text-white placeholder:text-[rgb(113,118,123)] focus:border-[rgb(29,155,240)] focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={panel.chatLoading || !panel.chatInput.trim()}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            {panel.chatLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </form>

      {panel.messages.map((msg, idx) => {
        const isAssistant = msg.role === "assistant";
        const cited = extractCitedIndexes(msg.content);
        return (
          <article
            key={`${idx}-${msg.content.slice(0, 20)}`}
            className="border-b border-[rgb(47,51,54)] px-4 py-3"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[rgb(113,118,123)]">
              {isAssistant ? "AI" : "You"}
            </p>
            <p className="mb-2 whitespace-pre-wrap text-[15px] leading-6 text-white">{msg.content}</p>
            {isAssistant ? (
              <p className="text-xs text-[rgb(113,118,123)]">
                Sources: {cited.length ? cited.map((n) => `[${n}]`).join(", ") : "No citations found"}
              </p>
            ) : null}
          </article>
        );
      })}

      <div className="px-4 py-3">
        <button
          onClick={panel.saveToCollection}
          disabled={!panel.latestAssistantMessage}
          className="rounded-full border border-[rgb(47,51,54)] px-4 py-2 text-sm font-semibold text-white hover:bg-[rgb(8,10,13)] disabled:opacity-60"
        >
          Save to collection
        </button>
      </div>
    </div>
  );
}
