# Corpus Audit Report

Generated: 2026-07-13T01:48:44.880Z

## Corpus Health

| Metric | Value |
|--------|-------|
| Total bookmarked tweets | 727 |
| Unique authors | 535 |
| Average tweet text length | 206 chars |
| Missing text (unsearchable) | 3 (0.4%) |
| Short text < 40 chars | 84 (11.6%) |
| Missing embedding (invisible to semantic search) | 727 (100.0%) |
| Have media/images | 283 (38.9%) |
| Image-only (no text — blind spot) | 3 (0.4%) |
| Near-duplicate groups | 9 |
| Tweets in duplicate groups | 18 |

### Top 15 authors by tweet count

| Author | Count | % of corpus |
|--------|-------|-------------|
| @garrytan | 11 | 1.5% |
| @FarzaTV | 7 | 1.0% |
| @steipete | 6 | 0.8% |
| @shannholmberg | 5 | 0.7% |
| @businessbarista | 5 | 0.7% |
| @om_patel5 | 5 | 0.7% |
| @coreyganim | 5 | 0.7% |
| @Kpaxs | 5 | 0.7% |
| @michael_chomsky | 5 | 0.7% |
| @danshipper | 5 | 0.7% |
| @readswithravi | 5 | 0.7% |
| @signulll | 5 | 0.7% |
| @karpathy | 4 | 0.6% |
| @AlexHormozi | 4 | 0.6% |
| @geoffreywoo | 4 | 0.6% |

Top 5 authors account for **4.7%** of the corpus.

### Flags

- ⚠️  **727 tweets lack embeddings** — run `npm run embed-corpus` to fix.
- ⚠️  **3 image-only tweets** — their content is invisible to text search and the writing corpus. Consider adding manual notes/tags.
- ⚠️  **9 near-duplicate groups** (18 tweets) — consider pruning redundant bookmarks.
- ✅ Author concentration reasonable (top 5 = 4.7%).

---

# Corpus Audit Report

## Topic Distribution

- **AI Agent Development & Tools**: ~35% (OpenClaw, Claude Code, Hermes, agent architecture, skills, MCP servers)
- **AI Engineering & Coding**: ~20% (code generation, debugging, testing, development practices)
- **Business/Startup Strategy**: ~12% (fundraising, hiring, company building, founder advice)
- **AI Safety & Security**: ~8% (exploits, vulnerabilities, Mythos, zero-days)
- **Personal Development/Mindset**: ~8% (ambition, agency, resilience, career advice)
- **Politics/News Commentary**: ~5% (Trump, policy, media coverage)
- **Design & UI/UX**: ~4% (design tools, vibe coding, UI critique)
- **Philosophy & Game Theory**: ~4% (decision-making, incentives, human behavior)
- **Miscellaneous/Memes**: ~4% (humor, random observations)

## Dominant Voices / Potential Bias

**Over-indexed on:**
- Bay Area AI builder/founder echo chamber (Karpathy, Andreessen, Garry Tan, etc.)
- Anthropic/Claude maximalists (heavy Claude Code & OpenClaw focus)
- Male-dominated tech voices
- Libertarian/anti-regulation perspectives
- Success-worship narratives and hustle culture

**Absent/Under-represented perspectives:**
- Critical/skeptical takes on AI hype and limitations
- Non-Silicon Valley voices (international, non-tech sectors)
- Diverse gender representation
- Workers/labor perspective on automation
- Regulatory/policy expertise (beyond dismissive takes)
- Academic rigor and peer-reviewed research
- Ethical concerns beyond security

## Over-represented Topics

1. **OpenClaw/Claude Code optimization** (~15% of corpus) — tips, configs, memory systems, skills—becoming redundant and niche
2. **Agent tool comparisons** — Endless "Hermes vs OpenClaw," "GPT 5.4 vs Opus" discourse with minimal depth
3. **Self-improvement/personal development** — Motivational quotes, hustle narratives, game theory platitudes
4. **Viral startup/product launches** — "I built X in 48 hours" posts with limited strategic insight
5. **Token efficiency & cost optimization** — Repetitive discussions of burn rates and model selection
6. **Quick-hit business/income ideas** — Low-substance "how to make $10k in 5 days" templates

## Under-represented or Missing Topics

1. **AI limitations & failure modes** — Where/why agents break; honest constraints discussion
2. **Non-coding AI applications** — Healthcare, education, manufacturing, supply chain, domain-specific use cases
3. **Long-form technical depth** — Research papers, architectural deep-dives, empirical comparisons
4. **Organizational & change management** — How teams actually adopt AI (beyond hype)
5. **Data quality & ML ops** — Training data, fine-tuning, model evaluation methodologies
6. **Global AI landscape** — Non-US players, different regulatory approaches, international perspectives
7. **Historical/comparative analysis** — How this compares to past tech shifts (web, mobile, cloud)
8. **Skeptical/critical analysis** — Honest downsides, overhype diagnosis, realistic timelines
9. **Accessibility & inclusive design** — Bias in models, equity concerns, disability considerations
10. **Practical deployment at scale** — Real production lessons, outages, incident reports
11. **Economics & market structure** — Pricing dynamics, competitive moats, margin compression

## Quality Concerns

1. **Hype & recency bias** — Heavy focus on latest tools/announcements over validated patterns
2. **Survivorship bias** — Only success stories; failures/pivots absent
3. **Engagement bait** — "Someone just built…" posts designed for virality over substance
4. **Vague, non-falsifiable claims** — "Agents will replace 90% of jobs" without specifics or timeline
5. **Technical jargon without depth** — Name-drops (Mythos, Composio, etc.) without explaining impact
6. **Repetitive advice** — Same "tips for OpenClaw" repackaged by multiple accounts
7. **Conspiracy/speculation** — Political takes, insider gossip ("Anthropic in China"), unverified claims
8. **Low signal-to-noise ratio** — Many off-topic tweets (memes, politics) mixed into a "writing corpus"
9. **Lack of contrasts** — No coherent opposing viewpoints on key debates (e.g., vibe coding vs. rigor)

## Recommended Additions

1. **Technical Research & Papers** — Bookmark substantive AI research (arXiv preprints, published findings) and technical deep-dives from researchers (not just builders). Counterbalance with skeptical/critical analysis of AI claims.

2. **Real Production & Operations** — Seek out posts from people running AI in production at scale: incident reports, scaling challenges, cost surprises, infrastructure lessons, and actual ROI data (not hype).

3. **Domain-Specific Applications** — Actively bookmark AI usage in non-SaaS sectors: biotech, manufacturing, healthcare, finance, education. Expand beyond "build products for builders."

4. **Organizational & Change** — Follow voices discussing enterprise adoption, team dynamics, training, resistance, and cultural change around AI (e.g., McKinsey, HBR takes, org design experts).

5. **Counterarguments & Skepticism** — Deliberately bookmark credible critiques: AI safety researchers, economists analyzing labor displacement, regulatory experts, and voices explaining what AI *can't* do yet. Balance the corpus with intellectual friction.

---

**Summary:** Your corpus is **highly optimized for near-term AI tooling trends** but **lacks depth, diversity, and critical perspective**. It's excellent for rapid iteration on AI products but weak for writing nuanced, defensible, long-term thinking.