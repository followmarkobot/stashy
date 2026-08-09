# Fix Stashy: perf, bugs, and design cleanup (orchestrated)

You are running as **Opus 4.8** and acting as the **orchestrator only** — you do not
edit files yourself. All implementation work is delegated to subagents via the Task
tool with **`model: sonnet` (Sonnet 5)**. You plan, dispatch, review their diffs,
verify, and commit.

## Project context (already investigated — do not re-derive)

- Repo: `~/Code/stashy` — Next.js 14 + Tailwind, data in Supabase (`tweets` table,
  2,204 rows). Env in `.env.local`. Dev server: `npm run dev` → http://localhost:3000.
- Tests: `vitest` unit tests colocated in `src/`, Playwright e2e in `e2e/`.
- The app has 4 views (left sidebar): Digest, Twitter, Facebook, plus an onboarding
  modal. **Twitter view is the real product** (saved-tweets reader + AI draft panel).
  Digest is a hardcoded fake newsletter (`src/components/SubstackLayout.tsx`);
  Facebook is a cosplay layout with dead chrome and hardcoded contacts
  (`src/components/FacebookLayout.tsx`, `FacebookLayoutData.tsx`).

## Verified findings to fix

### F1 — Search blanks the feed while fetching (perceived "search is broken")
`src/hooks/useStashFeed.ts`: the effect on `[search, selectedTags]` calls
`setTweets([])` before awaiting `fetchTweets`, so the UI shows "Showing 0 tweets"
for the full 1–2s round trip. No loading skeleton, no stale-response guard.
**Fix:** keep previous results rendered (dimmed or with a loading indicator) until
the new response lands; add an out-of-order guard (request id or AbortController)
so a slow older response can never overwrite a newer one.

### F2 — 386KB payload per feed page
`src/lib/supabase.ts:113-117` (`fetchTweets`) does `select("*")`, dragging heavy
columns (`raw_json`, `image_text`, `quoted_tweet`, embeddings) for 20 tweet cards.
Measured: 386KB / 1.5–1.9s per page.
**Fix:** select only the columns the card actually renders (inspect
`src/components/TweetCard.tsx` for the exact field list, including `quoted_tweet`
and `media` if rendered). Target: <60KB per page. Check other `select("*")` call
sites in `src/lib/supabase.ts` while there.

### F3 — Duplicate network requests
On load, the tags query and feed query each fire 2x and `/api/auth/twitter/status`
fires 4x. Some of this is dev StrictMode double-mount, but 4x auth suggests the
status hook is mounted in multiple components.
**Fix:** dedupe (module-level cache, or lift the auth status to a single provider).
Verify in a production build (`npm run build && npm start`) that each endpoint is
hit exactly once per view.

### F4 — 73 saved GIFs permanently broken (blob: URLs)
The `media` JSON column contains entries like
`{"url": "blob:https://x.com/<uuid>", "type": "gif"}` — blob URLs from the
extension's page session that can never load here. 73 rows affected (all type
"gif"). Console throws "Not allowed to load local resource" on every feed load.
**Fix, two parts:**
1. **Backfill:** write `scripts/backfill-blob-media.mjs`. For each affected row,
   first check its own `raw_json` column for a real media URL
   (`video.twimg.com` / `pbs.twimg.com`); if absent, fetch via the public
   syndication endpoint (`https://cdn.syndication.twimg.com/tweet-result?id=<tweet_id>&token=x`)
   and extract the mp4/poster URL. Update the row. Log unrecoverable IDs to a file
   instead of failing. Needs the service-role key if RLS blocks writes — if no
   write-capable key exists in `.env.local`, stop and report instead of hacking around it.
2. **Render guard:** TweetCard should never emit a `blob:` src — skip it and show
   a "media unavailable" placeholder so the console stays clean regardless.
   (The capture bug itself lives in the separate Chrome-extension repo — out of
   scope here; note it in the final report.)

### F5 — Unvirtualized feed
20 tweets already produce a ~29,000px DOM; infinite scroll toward 2,204 tweets will
crawl. **Fix:** virtualize the feed list (e.g. `@tanstack/react-virtual`) or
window it. Must not break infinite scroll, search, or selection state.

### F6 — Design: the real product is buried
- App opens on the fake Digest newsletter + onboarding modal; your tweets are two
  clicks away. **Make the Twitter view the default.**
- Digest and Facebook are demo skins. **Demote them:** move behind a "Demo layouts"
  section in the sidebar (do not delete the code).
- Reading is polluted by drafting: every tweet renders a checked "Use in draft"
  checkbox (20/20 pre-selected) and a "Showing N tweets · N selected" bar.
  **Default to nothing selected**, and hide checkboxes + select/deselect controls
  behind a single "Compose mode" toggle near the AI panel.
- Right rail (`SemanticSearch.tsx` / `useSemanticSearchPanel`): three stacked
  input+button pairs with no labels. Group into two labeled sections —
  "Filter your stash" (concept search + clear) and "Draft with AI" (question box,
  write-from-selected, save to collection). Disable "Write tweet from selected"
  when 0 selected, with a tooltip.
- Fix the floating "Not connected" text: attach it visually to the X Bookmarks
  toggle it describes.

## Orchestration plan

1. **Baseline (you, the orchestrator):** confirm `npm run dev` works, run existing
   unit tests once, `git status` — stashy has uncommitted corpus-file changes;
   leave them untouched and don't commit them. Create branch `fix/stashy-qa-pass`.
2. **Wave 1 (parallel Sonnet 5 subagents, one per workstream):**
   - Agent A: F1 + F3 (both live in the hooks/data-fetch layer)
   - Agent B: F2 (query narrowing) — coordinate with A only through you
   - Agent C: F4 (backfill script + render guard)
   - Agent D: F6 (design changes — components only, no data-layer edits)
   Give each agent: the finding text above, the exact files, and the instruction to
   run related unit tests and add/update tests for what they change.
3. **Wave 2 (single Sonnet 5 agent):** F5 virtualization, after A/B/D land (it
   touches the same feed components).
4. **Review gates (you):** after each wave, read the diffs yourself, run
   `npx vitest run`, then verify in the browser with the gstack `/browse` binary
   (`~/.claude/skills/gstack/browse/dist/browse`): app defaults to Twitter view,
   search for "claude" never blanks the feed and returns results, feed page network
   payload <60KB, zero console errors, 0 selected by default.
5. **Commits:** one atomic commit per finding (F1..F6), message format
   `fix(F1): keep results rendered during search fetch`. Run the F4 backfill script
   once, report recovered/unrecoverable counts. Do not push.
6. **Final report:** table of finding → status → evidence (numbers, screenshot
   paths), plus anything discovered but not fixed.

Constraints: don't touch `corpus-enrichment/`, `.github/workflows/`, or the
uncommitted report .md files; don't upgrade dependencies beyond adding the
virtualization lib; if a subagent gets stuck twice on the same error, pull the
task back and reassign with a narrower brief.
