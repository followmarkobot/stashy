# Corpus Audit Report

Generated: 2026-07-16T03:52:08.274Z

## Corpus Health

| Metric | Value |
|--------|-------|
| Total bookmarked tweets | 1317 |
| Unique authors | 842 |
| Average tweet text length | 218 chars |
| Missing text (unsearchable) | 51 (3.9%) |
| Short text < 40 chars | 106 (8.0%) |
| Missing embedding (invisible to semantic search) | 48 (3.6%) |
| Have media/images | 570 (43.3%) |
| Image-only (no text — blind spot) | 44 (3.3%) |
| Near-duplicate groups | 2 |
| Tweets in duplicate groups | 4 |

### Top 15 authors by tweet count

| Author | Count | % of corpus |
|--------|-------|-------------|
| @garrytan | 23 | 1.7% |
| @steipete | 18 | 1.4% |
| @signulll | 16 | 1.2% |
| @levelsio | 13 | 1.0% |
| @pmarca | 11 | 0.8% |
| @NickADobos | 9 | 0.7% |
| @AlexFinn | 9 | 0.7% |
| @EXM7777 | 9 | 0.7% |
| @coreyganim | 8 | 0.6% |
| @levie | 8 | 0.6% |
| @dabit3 | 8 | 0.6% |
| @FarzaTV | 8 | 0.6% |
| @aakashgupta | 8 | 0.6% |
| @vasuman | 8 | 0.6% |
| @beffjezos | 7 | 0.5% |

Top 5 authors account for **6.2%** of the corpus.

### Flags

- ⚠️  **48 tweets lack embeddings** — run `npm run embed-corpus` to fix.
- ⚠️  **44 image-only tweets** — their content is invisible to text search and the writing corpus. Consider adding manual notes/tags.
- ⚠️  **2 near-duplicate groups** (4 tweets) — consider pruning redundant bookmarks.
- ✅ Author concentration reasonable (top 5 = 6.2%).

---

## Topic Distribution

- **AI agent tooling & "OpenClaw"/Claude Code workflows** (harness setup, skills, MCP, prompt caching, CLAUDE.md tips, multi-agent orchestration) — ~35%
- **AI industry news, drama & policy** (Anthropic/OpenAI moves, model releases, safety/cybersecurity claims, Vatican/NSA conspiracies, RonanFarrow investigation) — ~15%
- **Startup/business advice & founder stories** (YC playbooks, fundraising war stories, growth tactics, SaaS pricing) — ~13%
- **Vibe coding / no-code app-building & AI video/image tools** — ~8%
- **Politics & culture-war commentary** (Trump, Milei, Rubio, RFK Jr., wealth tax, geopolitics) — ~8%
- **Motivational quotes / stoic-founder philosophy** (Tim Ferriss, Munger, Thiel, historical figures) — ~7%
- **Sales, cold outreach & lead-gen tactics** — ~5%
- **Humor/memes/shitposts (non-AI)** — ~5%
- **Personal musings, relationships, random observations** — ~4%

## Dominant Voices / Potential Bias

The corpus is dominated by a tight cluster of **AI-agent-builder influencers** (@steipete, @coreyganim, @garrytan, @EXM7777, @dabit3, @levelsio, @rohit4verse, @dunkhippo33) who post in near-identical "here's my setup / here's my product" cadence. There's heavy overlap with **VC/founder-adjacent accounts** (@pmarca, @levie, @balajis, @chamath) delivering aphoristic business wisdom, and a **populist-right political minority** (@realDonaldTrump, @MileiSays, @BitcoinSapiens, @shanaka86) that skews the political content one direction with no counterweight.

This is an almost entirely **male, tech-industry, US-centric, AI-maximalist** voice set. Absent: female technologists/founders (only a handful — @lydiahallie, @alliekmiller, @clairevo), international/non-US commentary, academic or scientific rigor, left-of-center political voices, and anyone writing from outside the "build an agent, sell an agent" frame. Skeptical AI voices exist (@DCinvestor, @martin_casado, @julianlehr) but are a small minority against the hype majority.

## Over-represented Topics

- **"How I set up my OpenClaw/Claude Code" posts** — dozens of near-duplicate tweets (folder structures, CLAUDE.md tips, skill files, memory hacks) that say the same thing in slightly different words.
- **Self-promotional "I built X agent/product" launches** — a large fraction of the corpus is essentially product marketing copy, not insight.
- **Recycled inspirational quotes** from the same rotation of business/historical figures (Thiel, Munger, Ferriss, Napoleon, Hormozi) — high redundancy in framing ("the real lesson is...").
- **AI-doom/conspiracy flavored takes** on Anthropic/model capability (zero-days, Vatican, NSA) — entertaining but repetitive and unverifiable.

## Under-represented or Missing Topics

- **Craft of writing itself** — surprisingly little about voice, prose style, storytelling structure, or editing, despite this corpus existing to power tweet-writing.
- **Critical/contrarian AI takes** — skepticism, failure post-mortems, "this didn't work" honesty is thin against the hype volume.
- **Non-AI creative and intellectual content** — science, history, health, sports, art, books — mostly appears only when filtered through an AI or business lens.
- **Personal narrative/vulnerability** — the tweets that read as distinctly human voice (not persona/hustle-mode) are rare; this is a gap given the corpus's stated purpose (writing in the owner's *own* voice).
- **International or non-US perspective** on AI, politics, or business.
- **Long-form/investigative depth** — only one real example (@RonanFarrow's OpenAI piece); almost everything else is single-tweet hot takes.

## Quality Concerns

- **Engagement bait framing** is pervasive: "do you understand what just happened," "I regret to inform you," "nobody is talking about this" — curiosity-gap hooks with thin payoff.
- **Unverifiable numeric flexing** ("$168k/mo," "$60k selling digital products," "23,000,000 sends") without sourcing — likely embellished growth-hacker claims.
- **Content-free link-only tweets** (`https://t.co/...` with zero text) — dozens of these carry no extractable voice or idea and are dead weight in a writing corpus.
- **Listicle/thread-bait structure** ("3 tips," "5 dimensions," "12 tips") that's more SEO-pattern than genuine insight.
- **Political rage-bait** with low information density (one-liners designed to provoke rather than inform).
- **Self-referential AI hype loop** — a large share of tweets are about AI tools written by people whose business is selling AI tools, which skews signal toward marketing, not disinterested observation.

## Recommended Additions

1. **Bookmark tweets that demonstrate strong personal voice/storytelling** unrelated to AI/business — memoir-style threads, sharp cultural observation, distinctive humor — to actually train the "own voice" the corpus is meant to serve.
2. **Add critical/contrarian AI and tech voices** (people who push back on hype, document failures, or offer measured skepticism) to balance the current maximalist tilt.
3. **Diversify political/cultural sources** — right now political content leans one direction; even for craft purposes, a wider range reduces stylistic monoculture.
4. **Cut low-value link-only and pure-product-pitch tweets** during future bookmarking — they add volume without adding voice or ideas.
5. **Seek out non-tech domains** (science, health, sports, books, art) for tonal variety — a writing corpus benefits from range even if the account's primary topic is AI/tech.