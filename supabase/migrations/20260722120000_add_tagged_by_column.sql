-- Records which tagger (model) classified each row, so per-tagger tag
-- quality/agreement can be queried directly instead of only visible in the
-- local tag-corpus-log.csv audit trail. Written by scripts/tag-corpus.js
-- ("claude") and scripts/tag-corpus-codex.js ("codex").
ALTER TABLE tweets
ADD COLUMN IF NOT EXISTS tagged_by TEXT;

CREATE INDEX IF NOT EXISTS idx_tweets_tagged_by ON tweets(tagged_by);
