-- Dedup: soft-flag near-duplicate reposts instead of deleting, so merges are
-- inspectable/reversible. Written by scripts/dedup-corpus.js.
ALTER TABLE tweets
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS duplicate_of TEXT REFERENCES tweets(tweet_id);

-- General-purpose classification, not shaped around any single question.
-- topics/tools_mentioned are multi-label (a tweet can be about several
-- things); monetization_model is a secondary, nullable facet populated only
-- when the tweet is actually about monetization. Written by
-- scripts/tag-corpus.js.
ALTER TABLE tweets
ADD COLUMN IF NOT EXISTS topics JSONB,
ADD COLUMN IF NOT EXISTS content_type TEXT,
ADD COLUMN IF NOT EXISTS tools_mentioned JSONB,
ADD COLUMN IF NOT EXISTS is_substantive BOOLEAN,
ADD COLUMN IF NOT EXISTS monetization_model TEXT,
ADD COLUMN IF NOT EXISTS tagged_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tweets_is_duplicate ON tweets(is_duplicate);
CREATE INDEX IF NOT EXISTS idx_tweets_tagged_at ON tweets(tagged_at);
