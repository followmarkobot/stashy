-- Replaces the raw_json-shape heuristic in scripts/backfill-curated-collection.js
-- with explicit, live provenance flags set by each writer at upsert time:
--   is_extension_saved -- set by clerk-chrome-extension's tweet-saver.ts
--   is_api_saved       -- set by bookmarkPersistence.ts (X bookmarks sync)
-- Both can be true for the same tweet_id (curated AND still bookmarked) --
-- each writer only ever sets its own flag, never clears the other's.
ALTER TABLE tweets
ADD COLUMN IF NOT EXISTS is_extension_saved BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_api_saved BOOLEAN NOT NULL DEFAULT false;

-- Backfill from the collection_tweets membership already computed by the old
-- heuristic script (curated) and by the live sync writer (bookmarks).
UPDATE tweets t
SET is_extension_saved = true
FROM collection_tweets ct
JOIN collections c ON c.id = ct.collection_id
WHERE ct.tweet_id = t.tweet_id AND c.slug = 'curated';

UPDATE tweets t
SET is_api_saved = true
FROM collection_tweets ct
JOIN collections c ON c.id = ct.collection_id
WHERE ct.tweet_id = t.tweet_id AND c.slug = 'bookmarks';
