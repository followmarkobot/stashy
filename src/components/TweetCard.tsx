"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Tweet } from "../lib/supabase";
import Avatar from "./Avatar";
import MediaGrid from "./MediaGrid";
import LinkCard from "./LinkCard";
import QuoteTweet from "./QuoteTweet";
import { formatRelativeTime, parseTextWithUrls } from "../lib/utils";

interface TweetCardProps {
  tweet: Tweet;
  onArticleClick?: (url: string, tweet: Tweet) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (tweetId: string) => void;
  similarityLabel?: string;
}

function formatMetric(value: number | undefined): string {
  if (value === undefined) return "0";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function TweetCard({
  tweet,
  onArticleClick,
  selectable = false,
  selected = false,
  onToggleSelect,
  similarityLabel,
}: TweetCardProps) {
  const segments = tweet.tweet_text ? parseTextWithUrls(tweet.tweet_text) : [];
  const rawJsonPreview = JSON.stringify(tweet.raw_json ?? {}, null, 2);
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const [jsonPopoverStyle, setJsonPopoverStyle] = useState<React.CSSProperties>({});
  const jsonButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a, button, input, label, [role="button"]')) return;

    if (selectable) {
      onToggleSelect?.(tweet.tweet_id);
    }
  };

  useEffect(() => {
    if (!isJsonOpen) return;

    const updateJsonPopoverPosition = () => {
      const anchor = jsonButtonRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const horizontalPadding = 8;
      const verticalGap = 8;
      const requestedWidth = 560;
      const maxAllowedWidth = Math.max(280, viewportWidth - horizontalPadding * 2);
      const width = Math.min(requestedWidth, maxAllowedWidth);
      const requestedHeight = 420;

      let left = rect.right - width;
      left = clamp(left, horizontalPadding, viewportWidth - width - horizontalPadding);

      let top = rect.bottom + verticalGap;
      const wouldOverflowBottom = top + requestedHeight > viewportHeight - horizontalPadding;
      if (wouldOverflowBottom) {
        top = Math.max(horizontalPadding, rect.top - requestedHeight - verticalGap);
      }

      const maxHeight = Math.max(220, viewportHeight - top - horizontalPadding);

      setJsonPopoverStyle({
        position: "fixed",
        top,
        left,
        width,
        maxHeight,
      });
    };

    updateJsonPopoverPosition();
    window.addEventListener("resize", updateJsonPopoverPosition);
    window.addEventListener("scroll", updateJsonPopoverPosition, true);

    return () => {
      window.removeEventListener("resize", updateJsonPopoverPosition);
      window.removeEventListener("scroll", updateJsonPopoverPosition, true);
    };
  }, [isJsonOpen]);

  return (
    <article
      className={`cursor-pointer border-b border-[rgb(47,51,54)] px-4 py-3 transition-colors hover:bg-[rgb(8,10,13)] ${selectable ? (selected ? "opacity-100" : "opacity-50") : ""
        }`}
      onClick={handleCardClick}
    >
      {tweet.in_reply_to_tweet_id && (
        <div className="mb-1 ml-[56px] flex items-center gap-2">
          <svg
            className="h-4 w-4 text-[rgb(113,118,123)]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.25-.893 4.306-2.394 5.786l-3.525 3.55c-.19.19-.44.29-.69.29-.25 0-.5-.1-.69-.29-.38-.39-.38-1.01 0-1.39l3.525-3.55c1.12-1.11 1.775-2.65 1.775-4.4 0-3.38-2.735-6.13-6.13-6.13H9.756c-3.317 0-6.005 2.69-6.005 6v.58c0 .55-.45 1-1 1s-1-.45-1-1V10z" />
          </svg>
          <span className="text-sm text-[rgb(113,118,123)]">Replying to a tweet</span>
        </div>
      )}

      <div className="flex gap-3">
        <div className="shrink-0 pt-0.5">
          <Avatar url={tweet.author_avatar_url} name={tweet.author_display_name} />
        </div>

        <div className="min-w-0 flex-1">
          {(selectable || similarityLabel) && (
            <div className="mb-2 flex items-center justify-between">
              {selectable ? (
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[rgb(113,118,123)]">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelect?.(tweet.tweet_id)}
                    className="h-4 w-4"
                  />
                  <span className="text-xs font-semibold">Use in draft</span>
                </label>
              ) : (
                <span />
              )}
              {similarityLabel ? (
                <span className="rounded-full bg-[rgb(29,155,240)] bg-opacity-15 px-2 py-0.5 text-xs font-semibold text-[rgb(29,155,240)]">
                  {similarityLabel}
                </span>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1">
            <span className="max-w-[200px] truncate font-bold text-white">
              {tweet.author_display_name || "Unknown"}
            </span>
            <span className="max-w-[180px] truncate text-[rgb(113,118,123)]">
              @{tweet.author_handle || "unknown"}
            </span>
            <span className="text-[rgb(113,118,123)]">·</span>
            <span className="text-[rgb(113,118,123)]">{formatRelativeTime(tweet.timestamp)}</span>
            {tweet.source_url ? (
              <a
                href={tweet.source_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open tweet source"
                className="ml-1 inline-flex items-center text-[rgb(113,118,123)] transition-colors hover:text-[rgb(29,155,240)]"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14 21 3" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 14v7h-7" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10V3h7" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m3 21 11-11" />
                </svg>
              </a>
            ) : null}
            <div className="relative ml-1">
              <button
                ref={jsonButtonRef}
                type="button"
                aria-label="Show tweet JSON"
                aria-expanded={isJsonOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsJsonOpen((prev) => !prev);
                }}
                className="inline-flex items-center text-[rgb(113,118,123)] transition-colors hover:text-[rgb(29,155,240)]"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5 3 12l6 7" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15 5 6 7-6 7" />
                </svg>
              </button>
              {isJsonOpen
                ? createPortal(
                  <div
                    data-testid="tweet-json-popover"
                    className="fixed z-[70] rounded-md border border-[rgb(47,51,54)] bg-[rgb(8,10,13)] p-3 shadow-lg"
                    style={jsonPopoverStyle}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <pre className="h-full overflow-auto whitespace-pre-wrap break-words text-[13px] leading-5 text-[rgb(113,118,123)]">
                      {rawJsonPreview}
                    </pre>
                  </div>,
                  document.body
                )
                : null}
            </div>
          </div>

          {tweet.tweet_bookmark_folders && tweet.tweet_bookmark_folders.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {tweet.tweet_bookmark_folders.map((folder) => (
                <span
                  key={folder.folder_id}
                  className="rounded-full bg-[rgb(32,35,39)] px-2 py-0.5 text-xs text-[rgb(113,118,123)]"
                >
                  {folder.folder_name ?? folder.folder_id}
                </span>
              ))}
            </div>
          )}

          {tweet.tweet_text && (
            <div className="mt-1 break-words whitespace-pre-wrap text-[15px] leading-5 text-white">
              {segments.map((seg, i) =>
                seg.type === "url" ? (
                  <a
                    key={i}
                    href={seg.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[rgb(29,155,240)] hover:underline"
                  >
                    {seg.content}
                  </a>
                ) : (
                  <span key={i}>{seg.content}</span>
                )
              )}
            </div>
          )}

          <MediaGrid media={tweet.media} />

          {tweet.link_cards.length > 0 && (
            <div>
              {tweet.link_cards.map((card, i) => (
                <LinkCard
                  key={i}
                  card={card}
                  onClick={
                    onArticleClick
                      ? (url) => {
                        onArticleClick(url, tweet);
                      }
                      : undefined
                  }
                />
              ))}
            </div>
          )}

          {(tweet.quoted_tweet || tweet.quoted_tweet_id) && (
            <QuoteTweet
              quotedTweet={tweet.quoted_tweet}
              quotedTweetId={tweet.quoted_tweet_id || undefined}
              onArticleClick={onArticleClick ? (url: string) => onArticleClick(url, tweet) : undefined}
            />
          )}

          {tweet.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tweet.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full bg-[rgb(29,155,240)] bg-opacity-15 px-2 py-0.5 text-xs font-medium text-[rgb(29,155,240)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {tweet.notes && (
            <div className="mt-2 border-l-2 border-[rgb(47,51,54)] pl-3 text-sm italic text-[rgb(113,118,123)]">
              📝 {tweet.notes}
            </div>
          )}

          {tweet.public_metrics && (
            <div className="mt-3 flex items-center gap-6 text-[rgb(113,118,123)]">
              <div className="flex items-center gap-1.5 transition-colors hover:text-[rgb(29,155,240)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 4.5h6m5.25-8.25H5.25a2.25 2.25 0 0 0-2.25 2.25v9A2.25 2.25 0 0 0 5.25 18h4.742a2.25 2.25 0 0 1 1.591.659l1.517 1.516a.75.75 0 0 0 1.28-.53V18h4.37A2.25 2.25 0 0 0 21 15.75v-9A2.25 2.25 0 0 0 18.75 4.5Z" />
                </svg>
                <span className="text-sm">{formatMetric(tweet.public_metrics.reply_count)}</span>
              </div>
              <div className="flex items-center gap-1.5 transition-colors hover:text-[rgb(0,186,124)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75h11.25M4.5 6.75 8.25 3m-3.75 3.75L8.25 10.5m11.25 6.75H8.25m11.25 0L15.75 21m3.75-3.75L15.75 13.5" />
                </svg>
                <span className="text-sm">{formatMetric(tweet.public_metrics.retweet_count)}</span>
              </div>
              <div className="flex items-center gap-1.5 transition-colors hover:text-[rgb(249,24,128)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m11.645 20.91-.006-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 3 12.58 3 9.138c0-2.876 2.299-5.138 5.197-5.138 1.743 0 3.2.824 4.053 2.03A4.932 4.932 0 0 1 16.303 4C19.201 4 21.5 6.262 21.5 9.138c0 3.442-1.688 6.222-3.99 8.37a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.218l-.022.012-.006.003a.75.75 0 0 1-.71 0Z" />
                </svg>
                <span className="text-sm">{formatMetric(tweet.public_metrics.like_count)}</span>
              </div>
              <div className="flex items-center gap-1.5 transition-colors hover:text-[rgb(29,155,240)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5h13.5A1.125 1.125 0 0 1 19.875 5.625v15.188a.188.188 0 0 1-.32.133L12 13.5l-7.555 7.446a.188.188 0 0 1-.32-.133V5.625A1.125 1.125 0 0 1 5.25 4.5Z" />
                </svg>
                <span className="text-sm">{formatMetric(tweet.public_metrics.bookmark_count)}</span>
              </div>
              <div className="flex items-center gap-1.5 transition-colors hover:text-[rgb(29,155,240)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.574 3.007 9.963 7.178a1.01 1.01 0 0 1 0 .644C20.575 16.49 16.639 19.5 12 19.5c-4.638 0-8.575-3.007-9.964-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                <span className="text-sm">{formatMetric(tweet.public_metrics.impression_count)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
