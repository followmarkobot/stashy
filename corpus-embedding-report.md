# Corpus Embedding Report

Model: `text-embedding-3-small` (1536-dim)

| Metric | Value |
|--------|-------|
| Total tweets | 2594 |
| Pass A (new, tweet_text) embedded | 333 |
| Pass B (enriched, combined) re-embedded | 214 |
| Total embedded this run | 547 |
| No-text rows skipped | 106 |
| Failed | 2 |
| Still missing embedding | 109 |

Pass B embeds rows carrying OCR'd `image_text` or archived `article_content` using the combined text, so image-only alpha and linked articles are searchable by vector similarity — not just the raw tweet text.
