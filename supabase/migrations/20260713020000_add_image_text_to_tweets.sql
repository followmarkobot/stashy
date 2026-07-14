-- OCR'd + described text extracted from images attached to a saved tweet, so
-- image-only alpha (charts, screenshots, infographics, memes) becomes real,
-- searchable text in the writing corpus and can be embedded like tweet_text.
-- Written by the corpus enrichment script (scripts/enrich-corpus.js).
alter table public.tweets
  add column if not exists image_text text;
