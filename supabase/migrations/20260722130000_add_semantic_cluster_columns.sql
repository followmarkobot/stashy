-- Groups tweets by embedding similarity (paraphrase-level, not literal text
-- match like is_duplicate/duplicate_of) so downstream synthesis can tell
-- "12 tweets said this" apart from "12 tweets collapse into 3 actually-
-- distinct observations, independently repeated." Written by
-- scripts/cluster-corpus.js. Every embedded row gets a cluster_id -- a
-- singleton (no close paraphrase found) is its own one-row cluster, so
-- COUNT(DISTINCT semantic_cluster_id) always gives the true count of
-- distinct ideas, no NULL-handling needed.
ALTER TABLE tweets
ADD COLUMN IF NOT EXISTS semantic_cluster_id TEXT,
ADD COLUMN IF NOT EXISTS cluster_size INTEGER;

CREATE INDEX IF NOT EXISTS idx_tweets_semantic_cluster_id ON tweets(semantic_cluster_id);
