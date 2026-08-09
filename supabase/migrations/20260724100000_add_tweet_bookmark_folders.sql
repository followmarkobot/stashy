-- Tracks which X bookmark folder(s) each tweet was saved from. A tweet can
-- live in more than one X folder, so this is a join table (not a column on
-- tweets) — mirrors the collections/collection_tweets shape, but deliberately
-- has NO RLS enabled, matching tweets' own (open) access model, since the
-- clerk-chrome-extension writes here with the anon key. Enabling RLS here
-- the way collections/collection_tweets do would silently block the
-- extension from writing, the same bug that left curated-collection
-- membership stuck on a one-off backfill script.
CREATE TABLE IF NOT EXISTS tweet_bookmark_folders (
  tweet_id TEXT NOT NULL REFERENCES tweets(tweet_id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL,
  folder_name TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (tweet_id, folder_id)
);

CREATE INDEX IF NOT EXISTS idx_tweet_bookmark_folders_tweet_id ON tweet_bookmark_folders(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_bookmark_folders_folder_id ON tweet_bookmark_folders(folder_id);
