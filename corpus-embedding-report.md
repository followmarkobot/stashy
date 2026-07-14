# Corpus Embedding Report

Model: `text-embedding-3-small` (1536-dim)

| Metric | Value |
|--------|-------|
| Total tweets | 2204 |
| Pass A (new, tweet_text) embedded | 1593 |
| Pass B (enriched, combined) re-embedded | 159 |
| Total embedded this run | 1752 |
| No-text rows skipped | 88 |
| Failed | 0 |
| Still missing embedding | 88 |

Pass B force-rebuilds embeddings for every row carrying OCR'd `image_text` or archived `article_content`, so the enriched corpus is now searchable by vector similarity, not just the raw tweet text.
