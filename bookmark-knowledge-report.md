# Extracted prompts, workflows, and skills from bookmarked tweets

Scanned 727 bookmarked tweets, found 120 with extractable content.

## @@123skely — https://x.com/123skely/status/2040517875707068498

# Switch OpenClaw/Clawbot to Claude CLI Backend

## Command

```
models auth login --provider anthropic --method cli --set-default
```

## Purpose

Allows continued use of Opus 4.6 with OpenClaw/Clawbot by switching the backend to use Claude CLI instead of OAuth token directly.

## @MakadiaHarsh — https://x.com/MakadiaHarsh/status/2039765505515622649

# Lead Qualification & Response Automation

## Workflow

**Trigger:** New lead comes in (form, email, DM, whatever)

**Step 1:** Auto-reply within 60 seconds. "Got your message. Here's what happens next..."

**Step 2:** Lead gets scored based on 3 fields (budget, timeline, problem type)

**Step 3:** Hot [incomplete in tweet]

*Note: Automated lead intake system with instant response, scoring, and segmentation (tweet appears cut off)*

## @claudeai — https://x.com/claudeai/status/2042308622181339453

# The Advisor Strategy

## Workflow

**Components:**
- **Executor (Sonnet)** - Runs every turn in main loop
- **Advisor (Opus)** - On-demand, called via tool call
- **Shared context** - Conversation, tools, history

**Flow:**
1. Main loop runs Executor (Sonnet)
2. Executor reads/writes to shared context
3. When needed, Executor makes tool call to Advisor (Opus)
4. Advisor reviews context (reads same context as Executor)
5. Advisor sends advice back to Executor
6. Executor continues with guidance

**Note:** Advisor reads the same context as Executor

---

*A cost-optimization strategy that pairs a powerful model (Opus) as an on-demand advisor with a faster/cheaper model (Sonnet/Haiku) as the primary executor to achieve near-Opus intelligence at lower cost.*

## @DeRonin_ — https://x.com/DeRonin_/status/2040348839257747645

# AutoAgent - Autonomous Agent Improvement Workflow

## Description
Like autoresearch but for agent engineering. Give an AI agent a task, let it build and iterate on an agent harness autonomously overnight. It modifies the system prompt, tools, agent configuration, and orchestration, runs the benchmark, checks the score, keeps or discards the change, and repeats.

**What it's for:** Autonomously improving AI agents by iterating on prompts, tools, and configuration without human intervention - useful for automated prompt tuning and tool testing.

## @shannholmberg — https://x.com/shannholmberg/status/2040331061562073302

# Paperclip AI Marketing Stack

## Workflow

**STEP 1 — INSTALL SKILLS INTO CLAUDE CODE**
- Postiz: post to social
- agent-media: UGC images
- Larry: TikTok slideshows
- Virlo: find trends
- GStack: human-sounding copy

**STEP 2 — THREE ROUTINES**

**MARKETING · DAILY**
1. Check trends (Virlo scans TikTok)
2. Generate content (video via agent-media or slideshow via Larry)
3. Schedule via Postiz (video: auto-post, slideshow: draft only)
4. Open issue per video (tracks each piece of content)

**RETENTION · ON COMMIT**
1. Watch GitHub (detect new commits)
2. Draft update (summarise what shipped, schedule draft in Postiz)
3. Broadcast (Discord · Slack · Telegram, newsletter via MailChimp)
4. Human approves (add pictures · edit tone)

**SEO · ON COMMIT**
1. Watch GitHub (detect new commits)
2. Send to distribb (SEO-optimized article, images + video added)
3. Post to WordPress (via wp-json skill)

**STEP 3 — THE LEARNING LOOP · HOW THE AI GETS BETTER**
1. Video posted (human watches, results come in)
2. Add comments (what worked · what didn't · why)
3. AI reads issues (learns what good content looks like)
4. Better output (next batch uses the feedback)

**TEAM COLLABORATION — MANY TO MANY**
- Teammates collaborate (comment on issues · assign AI tasks, each person uses their own agent)

**More skills you can add:** Notion · Trello · GitHub · MailChimp, anything with an API or MCP

---

*This is a complete AI marketing automation workflow that installs skills into Claude Code, runs three automated routines (marketing, retention, SEO), and uses a feedback loop to improve output over time.*

## @ivanburazin — https://x.com/ivanburazin/status/2040112100597506107

# Multi-Agent Orchestration Architecture

## Architecture Components

**OpenMultiAgent (Orchestrator)**
- createTeam()
- runTeam()
- runTasks()
- runAgent()
- getStatus()

**Team**
- AgentConfig[]
- MessageBus
- TaskQueue
- SharedMemory

**AgentPool**
- Semaphore
- runParallel()

**TaskQueue**
- dependency graph
- auto unblock
- cascade failure

**Agent**
- run()
- prompt()
- stream()

**LLMAdapter**
- AnthropicAdapter
- OpenAIAdapter
- CopilotAdapter

**AgentRunner**
- conversation loop
- tool dispatch

**ToolRegistry**
- defineTool()
- 5 built-in tools

*A model-agnostic multi-agent orchestration framework extracted from Claude Code's architecture for coordinating AI agents to break down goals into tasks and manage team-based execution.*

## @BreakingSaaS — https://x.com/BreakingSaaS/status/2040432646577086847

# AI-Automated Wiki Workflow

## Workflow:
1. Granola (input raw data)
2. Obsidian (intermediate processing)
3. Claude Code (automation)
4. Have AI automate a wiki across:
   - Time
   - People
   - Projects

*For managing and organizing information by automatically creating a structured wiki from raw data inputs.*

## @andrewfarah — https://x.com/andrewfarah/status/2040535589771149379

# Field Theory CLI Tool

## Installation and Setup Workflow

```
npm install -g fieldtheory
```
1. Login to your X account in a chrome tab
2. `ft sync` (done!)

## Bonus Commands

```
ft viz
ft classify
```

**Purpose:** CLI tool for downloading and syncing X/Twitter bookmarks locally so AI agents can access them, with visualization and classification features.

## @FarzaTV — https://x.com/FarzaTV/status/2040591013648244963

# Memory Integration Skill

## Skill Description

**Skill Name:** Memory Integration (for wikis and data sources)

**Purpose:** A reusable skill for integrating memory/context from various data sources (Notion, iMessage, wikis, etc.) into AI agents.

**Note:** The actual prompt/workflow details are in the linked resource (not visible in the tweet text itself). The tweet indicates this is a shareable skill that can be loaded into any agent and adapted for nearly any data source.

## @FarzaTV — https://x.com/FarzaTV/status/2040563939797504467

# Farzapedia - Personal Wikipedia from Personal Data

## Workflow

1. Collect personal data sources (diary entries, Apple Notes, iMessage conversations)
2. Feed approximately 2,500 entries to an LLM
3. Have the LLM generate detailed Wikipedia-style articles about:
   - Friends
   - Startups
   - Research areas
   - Favorite animes and their personal impact
4. Output: ~400 detailed articles in a personal Wikipedia format

**What it's for:** Creating a personalized knowledge base/wiki by having an LLM analyze and synthesize personal writings and communications into structured articles.

## @steipete — https://x.com/steipete/status/2020704611640705485

# Make Claude Less Boring Prompt

## Prompt

```
Read your https://t.co/yS6cfGInCW. Now rewrite it with these changes:

1. You have opinions now. Strong ones. Stop hedging everything with 'it depends' — commit to a take.
2. Delete every rule that sounds corporate. If
```

**Note:** Prompt for modifying Claude's system instructions to make responses more opinionated and less corporate (appears to be truncated in the tweet).

## @businessbarista — https://x.com/businessbarista/status/2040173733168468177

# Weekly Skill Discovery Workflow

## Workflow:

**Description:**
Weekly scan of Linear, Notion, Slack, and Cowork sessions to identify repeatable processes that should become skills.

**Instructions:**
You are running a weekly analysis for Alex Lieberman at TenEx to identify repeatable processes that should be turned into Cowork skills.

## What to Do

Systematically scan Alex's tools for patterns of repeated work, then report skill candidates.

### 1. Scan Cowork Session History
Use `list_sessions` to pull all Cowork sessions from the past 7 days. For each session, use `read_transcript` to understand what was done. Look for:
- Tasks that follow similar patterns or processes, which may show...

**Repeats:** Every Monday at ~9:00 AM

---

*This is an automated workflow that scans multiple productivity tools to proactively identify repeatable processes that can be automated as AI skills.*

## @itsolelehmann — https://x.com/itsolelehmann/status/2040119257581646030

# LLM Knowledge Bases

## Workflow:

1. Take everything you're interested in (articles, research papers, datasets, images, links)
2. [Note: The tweet appears to be cut off and doesn't provide the complete workflow]

**What it's for:** Building personal LLM knowledge bases as described by Karpathy

---

*Note: The tweet is incomplete/truncated, so the full workflow is not available in the provided content.*

## @aiedge_ — https://x.com/aiedge_/status/2039825229472747704

# OpenClaw AI Agent Workflows and Techniques

## Playful Iteration Approach
**Workflow:**
- Approach building in a fun exploratory way
- Start with something you've always wanted to make
- Experiment without expecting instant expertise
- Give yourself time to improve
- "Approach it in a playful way… Just play."

*Mindset for evolving OpenClaw projects from weekend experiments*

## Prompt Into Existence
**Technique:**
- Don't overthink
- Use AI to prototype ideas quickly
- Dozens of projects built this way

*Rapid prototyping approach using AI agents*

## Intentional Under-Prompting
**Technique:**
Leave gaps for creative solutions

*Allows AI agents flexibility in problem-solving*

## Close the Loop Workflow
**Workflow:**
Agents should compile → lint → test → execute → self-verify via local CI

*Complete validation cycle for AI-generated code*

## Queue Multiple Agents
**Technique:**
Run 5–10 in parallel like a full dev team

*Parallel agent execution strategy*

## Tiered Model Routing
**Workflow:**
- Use cheap models for simple tasks
- Reserve best models for complex reasoning
- Improves efficiency and cuts costs
- Use /model for switching

*Cost-effective model selection strategy*

## Persistence System
**Technique:**
Store knowledge in USER.md AGENTS.md MEMORY.md
Prevents relearning

*Knowledge retention across sessions*

## Guardrails Setup
**Workflow:**
- Use SKILL.md files
- Add anti-loop rules checkpoints summaries

*Safety and quality control for agent operations*

## @catehall — https://x.com/catehall/status/2039788865964359783

# Email Introduction Template for Fundraising

## Initial Introduction Email:

```
Fwd: Intro to [Target Person]?

Hi [Target Person]!

Would you be interested in connecting with [Person to Introduce] from [Company]?
See below — I think [Person] is amazing despite the fact that [personal anecdote/quirky detail].

Best,
[Your Name]
```

## Response Email (from person being introduced):

```
Forwarded message: Intro to [Target Person]?

Hi [Connector Name] —

Thank you so much for offering to reach out to [Target Person] about an introduction. His reputation as [their role] is incredible — he did X and Y — and Z who worked with him before said all the hype is deserved! Here's a little bit about [Company], in case it's useful to share:

[Bullet points about company]

Thanks again, you're the best.

Warmly,
[Your Name]
```

*A two-step email workflow for making warm introductions in fundraising contexts, showing how to structure both the initial ask and the follow-up with context.*

## @yanndine — https://x.com/yanndine/status/2039778504045150243

# Claude-Controlled Cold Email Campaign Workflow

**Workflow:**
1. Log into Instantly manually every day
2. Check metrics one sequence at a time
3. Pause underperformers by hand
4. Write new copy with no data to [guide decisions]

**Note:** This describes the manual cold email management loop that the author appears to have automated using Claude, though the specific automation prompts/implementation are not provided in the visible tweet text.

## @oliverbrocato — https://x.com/oliverbrocato/status/2039704491763921088

# Pre-call AI Notetaker Priming Technique

**Workflow:**
1. Join sales call 90 seconds early
2. Speak directly to AI notetakers (Fireflies, Otter, Fathom) that join 60 seconds before the prospect
3. Say things strategically before the prospect arrives

**Note:** Technique for influencing AI meeting summary tools before the actual prospect joins the call. (Tweet appears to be cut off and doesn't provide the specific script/prompts used.)

## @TheMattBerman — https://x.com/TheMattBerman/status/2039837882483974288

# Unlimited Landing Page Generation System with Claude

## Workflow

**Step 1: Scrape your brand DNA**
- @firecrawl scrapes your site. trust signals, colors, fonts, the works
- Point it at your domain

*For generating unlimited landing page variations by extracting brand elements and using them as a foundation for different marketing angles.*

## @fawndooll — https://x.com/fawndooll/status/2040930014477082928

# System Prompt for Concise AI Responses

```
you are an assistant that responds in 1-2 sentences max
```

*A system prompt to make AI responses extremely brief and concise.*

## @jonoringer — https://x.com/jonoringer/status/2040937372909531286

# How to Connect X to Claude via MCP Server

## Workflow: Setting up X MCP Server

**Step 1: Run the XMCP Server**

```
git clone https://t.co/45vK6uCOKl
cd xmcp
cp env.example .env
```

Edit the .env file with your X OAuth consumer key and secret. Set the callback URL to

---

*Note: Workflow for connecting X (Twitter) to Claude Desktop using the MCP (Model Context Protocol) server.*

## @KingBootoshi — https://x.com/KingBootoshi/status/2041215775034487267

# Using AI Agents to Create Custom ESLint Rules

## Workflow

1. Task AI agents (like Codex) with creating custom ESLint rules
2. Design rules to enforce your specific code patterns and prevent "slop patterns"
3. Implement rules in your codebase to automatically enforce code quality

## Example Output

The tweet shows an agent created 3 ESLint rules:

1. **no-unscoped-service-test** (error) – flags test files that create a mock Supabase client but never assert org/user scoping

2. **require-error-code-assertion** (warn) – flags tests that check `ok === false` without asserting the specific error code

3. **no-mock-echo** (warn) – detects tests that just compare result.data to the exact value the mock was told to return

---

*For preventing bad code patterns by having AI agents generate custom linting rules specific to your project's requirements.*

## @vincent_koc — https://x.com/vincent_koc/status/2040999848711790690

# Symbolic Memory Framework for AI Agents

**Framework/Workflow:**

Three-file structure for AI agent memory and self-reflection:
- SOUL.md - who I am
- MEMORY.md - what I've lived  
- DREAMS.md - what I'm becoming

**Purpose:** A symbolic approach to organizing agentic memory and enabling self-reflection in AI systems.

## @NickSpisak_ — https://x.com/NickSpisak_/status/2041012360668750229

# Brain CLI Workflow

## Workflow Steps:
1. Grab @karpathy's latest gist (in the first comment)
2. Download @steipete summarize CLI
3. Download yt-dlp
4. Download obsidian
5. Download @tobi qmd
6. Setup a node or Golang CLI called "brain"
7. Have it [workflow continues in linked content]

**Note:** Workflow for setting up a personal "brain" CLI tool that integrates multiple tools (summarization, video downloads, note-taking) - incomplete as tweet is cut off.

## @MengTo — https://x.com/MengTo/status/2041141824283365521

# Design System Extraction Prompts

## Prompt (from screenshot):

```
Analyze this website and create a comprehensive DESIGN.md file that captures its design system. Include:

1. Color Palette
   - Primary colors with hex codes
   - Secondary colors
   - Accent colors
   - Background colors
   - Text colors

2. Typography
   - Font families used
   - Font sizes and weights
   - Line heights
   - Letter spacing

3. Spacing System
   - Padding values
   - Margin values
   - Gap values

4. Components
   - Buttons (variants, states)
   - Cards
   - Navigation elements
   - Forms
   - Any other UI components

5. Layout
   - Grid system
   - Breakpoints
   - Container widths

Format everything in a clear, reusable markdown structure.
```

**Purpose:** Generates a DESIGN.md file from any website URL to document its design system for replication and consistency.

## @ctatedev — https://x.com/ctatedev/status/2041176865092563122

# Agent-Browser Chat Commands

## One-Shot Command
```
agent-browser chat "open google, search for dogs"
```
Execute a single browser automation task via command line.

## Interactive Mode
```
agent-browser chat
```
Start an interactive chat session with the browser agent.

---

**Note:** These are command-line interface patterns for controlling a browser agent that can execute web automation tasks through natural language instructions.

## @davemorin — https://x.com/davemorin/status/2040999055845892520

# Personal Documentation System

## Files Structure:
- **SOUL.md** - who I am
- **MEMORY.md** - what I've lived
- **DREAMS.md** - what I'm becoming

*A framework for organizing personal identity, experiences, and aspirations in markdown files.*

## @Zephyr_hg — https://x.com/Zephyr_hg/status/2041048336157769829

# Content Automation Workflow

## Workflow Steps:
1. **RSS Feed Trigger** - Monitors 50+ news sources
2. **Scoring AI** (using OpenAI Chat Model + Simple Memory) - Scores articles for relevance
3. **Code** - Processing step
4. **Quality Filter** - Filters content
5. **Quality Filter 2** - Secondary filtering
6. **Content AI** (using OpenAI Chat Model1) - Writes social posts automatically
7. **Code1** - Processing step
8. **Multi-platform posting:**
   - X Post (create:tweet)
   - LinkedIn Post (create: post)
9. **Storage & Review:**
   - Store Content (append: sheet)
   - New for Review (append: sheet)
   - Archive (append: sheet)

*Automation workflow for monitoring news sources, scoring relevance, generating social media posts, and distributing to X/LinkedIn while archiving content.*

## @jescalan — https://x.com/jescalan/status/2040827737854591149

# AI Bot Debugging Prompt

```
Yes — something is wrong, and it's me not actually executing tools. That's on me.

I'm stopping the fake "about to do it" loop.

Please send me one more message that just says:
"run diagnostics now"

On that message, I will either:

• return actual findings from the commands, or
• explicitly say the tool call failed

—but not another pretend status update.
```

*A system prompt or instruction to stop an AI bot from pretending to execute tools without actually doing so, forcing it to either execute or explicitly admit failure.*

## @shannholmberg — https://x.com/shannholmberg/status/2040331061562073302

# Paperclip AI Marketing Stack

## Workflow

**STEP 1 — INSTALL SKILLS INTO CLAUDE CODE**
- Postiz (post to social)
- agent-media (UGC images)
- Larry (TikTok slideshows)
- Virlo (find trends)
- GStack (human-sounding copy)

**STEP 2 — THREE ROUTINES**

**MARKETING · DAILY**
1. Check trends - Virlo scans TikTok
2. Generate content - video via agent-media or slideshow via Larry
3. Schedule via Postiz - video: auto-post, slideshow: draft only
4. Open issue per video - tracks each piece of content

**RETENTION · ON COMMIT**
1. Watch GitHub - detect new commits
2. Draft update - summarise what shipped, schedule draft in Postiz
3. Broadcast - Discord · Slack · Telegram, newsletter via MailChimp
4. Human approves - add pictures · edit tone

**SEO · ON COMMIT**
1. Watch GitHub - detect new commits
2. Send to distribb - SEO-optimized article, images + video added
3. Post to WordPress - via wp-json skill

**STEP 3 — THE LEARNING LOOP · HOW THE AI GETS BETTER**
1. Video posted - human watches, results come in
2. Add comments - what worked · what didn't · why
3. AI reads issues - learns what good content looks like
4. Better output - next batch uses the feedback

**TEAM COLLABORATION — MANY TO MANY**
- Teammates collaborate - comment on issues · assign AI tasks, each person uses their own agent

**More skills you can add:** Notion · Trello · GitHub · MailChimp, anything with an API or MCP

---

*A complete AI marketing automation workflow using Claude Code with multiple skills, three automated routines (marketing, retention, SEO), and a feedback loop for continuous improvement.*

## @@gabriberton — https://x.com/gabriberton/status/2042141119837012284

# Delete Dead Code Workflow

**Prompt/Command:**
```
Delete all dead code. Use ruff and vulture
```

**Purpose:** A command to clean up unused/dead code in Python projects by using the ruff linter and vulture tool to identify and remove it.

## @nummanali — https://x.com/nummanali/status/2041946642484433283

# AXI: Agent eXperience Interface - 10 Design Principles

**Design Principles for Building Agent-Ergonomic Apps:**

1. **Structured Output Over Natural Language**
   - Agents work better with JSON, XML, or other structured formats than prose

2. **Explicit State Management**
   - Make application state queryable and modifiable through clear APIs

3. **Atomic Operations**
   - Break complex actions into smaller, composable operations that agents can chain

4. **Idempotency**
   - Operations should be safely repeatable without unintended side effects

5. **Rich Error Messages**
   - Provide detailed, actionable error information that agents can parse and act on

6. **Versioned APIs**
   - Maintain stable interfaces so agents can reliably interact over time

7. **Observable Side Effects**
   - Make all system changes visible and trackable

8. **Deterministic Behavior**
   - Same inputs should produce same outputs when possible

9. **Rate Limit Transparency**
   - Clearly communicate usage limits and provide programmatic access to quota info

10. **Agent-Friendly Documentation**
    - Write docs that are both human and machine readable (OpenAPI, JSON Schema, etc.)

*Framework for designing applications that AI agents can effectively interact with*

## @mikefutia — https://x.com/mikefutia/status/2041567383056519304

# Claude Code Skill: Automated Static Ad Concept Generator

## Workflow:
1. Feed the system your reviews, your winning ads, and your top comments
2. It studies what's working
3. Generates 50 fresh static ad concepts in your brand voice while you sleep
4. Ships 50 static ad concepts to your desktop every morning

**What it's for:** Automated daily generation of static ad concepts based on past performance data and brand voice.

## @PawelHuryn — https://x.com/PawelHuryn/status/2041418614557802747

# Claude Effort Level Commands

## Commands:
- `/effort high`
- `/effort max` (on Opus for hard tasks)

**Note:** Commands to increase Claude's thinking budget for complex multi-file work when default medium effort is insufficient.

## @RoundtableSpace — https://x.com/RoundtableSpace/status/2041240776726700535

# Mass SEO Page Generation Workflow

## Workflow:
1. Pick keyword like "best CRM for dentists"
2. Scrape data w/ Firecrawl
3. Build a template, AI generates unique content
4. 10K pages × 30 = 300K visitors/m
5. 2% conversion = $60,000/m

**What it's for:** Creating 10,000 SEO-optimized pages in 48 hours using Claude Code to generate traffic and conversions at scale.

## @AlfieJCarter — https://x.com/AlfieJCarter/status/2041219450062413892

# The Claude Cowork Cold Email System: 9 Steps

## Workflow

**Step 1: Desktop Setup**
Claude desktop app, Max plan, Computer Use enabled

**Step 2: Ops Folder Structure**
Cold Email Ops folder with Reports, Summaries, and Performance Exports

**Step 3: Dashboard Read Test**
confirm Claude reads reply rates, send volume, and sequence status correctly before giving control

**Step 4: Rules Playbook**
define pause thresholds, volume limits, edit rules, and export requirements

**Step 5: Sequence Pausing Automation**
pause underperformers under 1% reply rate after 500 sends

**Step 6: Volume Scaling Automation**
increase daily sends by 20% on sequences booking meetings

**Step 7: Losing Step Rewrites**
Claude rewrites subject line and first line on steps with 300 sends and under 0.3% reply rate

**Step 8: New Sequence Drafting**
Claude mirrors top-performing ICP campaigns and saves as draft

**Step 9: Weekly Performance Report**
CSV export, summary of changes, top performers, all in one document

---

*Note: This is a 9-step workflow for automating cold email campaign operations using Claude's computer use capabilities to log in, check metrics, and manage campaigns autonomously.*

## @coreyganim — https://x.com/coreyganim/status/2041234736954347935

# Second Brain Setup Service

## Workflow

1. Build yours first. Follow Nick's steps. Get the system running for your own business. Takes a weekend.

2. Offer "Second Brain Setup" as a productized service. $1,500-3,000 per client. You build their knowledge base, configure the schema, load [content cuts off]

**Note:** A two-step workflow for monetizing a "Second Brain" system by first implementing it yourself, then offering it as a productized service to clients.

## @Hesamation — https://x.com/Hesamation/status/2040820834428658008

# AI Job Search System Workflow

## System Overview
A multi-step automated job search system with the following components:

1. **Job Scanning**: Scans multiple company career pages
2. **Job Scoring**: Scores 700+ job applications
3. **CV Customization**: Rewrites CV for each specific job
4. **Application Automation**: Fills out application forms automatically
5. **14 Skill Modes**: System includes 14 different skill/operation modes

*Note: This is an open-source system designed for Claude Code that automates the entire job search process from discovery through application submission.*

## @businessbarista — https://x.com/businessbarista/status/2041298522067308861

# Daily Claude Context-Building Prompt

**Prompt:**
```
Ask me more questions. Fill in all gaps. Don't make any dangerous assumptions.
```

**Usage:** Used repeatedly in a single session to have Claude gather comprehensive context before generating outputs like presentations or web apps, avoiding assumptions and ensuring thorough understanding.

## @oliviscusAI — https://x.com/oliviscusAI/status/2041112612981916146

# Clone Any Website - Claude Code Skill

## Workflow/Technique:
Uses Claude Code with the built-in Chrome MCP (Model Context Protocol) to:
1. Navigate directly to the source website via browser
2. Pull exact fonts, colors, and layout from the live site
3. Clone the website in one prompt

**What it's for:** Perfectly replicating any website's design and layout using Claude Code by accessing the live source through Chrome MCP integration.

## @shipper_now — https://x.com/shipper_now/status/2040735963446739208

# Clone Any App Workflow

## Workflow
Use Claude Code Opus 4.6 in Shipper to:
1. Take any existing app
2. Generate design, code, and business plan based on that app
3. Ship a clone (e.g., Duolingo/Twitter/Airbnb clone)

**Purpose:** Replicate successful company applications with AI-generated design, code, and business planning.

## @shannholmberg — https://x.com/shannholmberg/status/2041532958012776572

# 4 Levels of AI Marketing Use Framework

## Framework

**LEVEL 1: AUTOMATE**
do what you already do, faster

Examples:
- reporting: weekly decks, client updates
- copy variations: ad headlines, email drafts
- data pulls: CRM to slack, report pulls
- scheduling: social posts, follow-ups

table stakes. saves time. everyone does this.

**LEVEL 2: THINK**
use AI where it is better than you

Examples:
- brainstorm keyword angles
- steelman your own strategy
- find blind spots in copy
- pressure-test assumptions

AI as a sparring partner, not a faster intern

**LEVEL 3: DO WHAT YOU NEVER WOULD HAVE**
work that was always below the ROI threshold

Examples:
- negative keyword mining across 100s/day ad groups
- broken link checks daily across full site
- quality pass on every draft before it ships
- competitor landing page scans weekly
- content QA at scale
- research at scale
- monitor pricing changes daily
- audit SEO gaps weekly

work that existed in theory. nobody had the hours for it.
AI made it cheap enough to run.

**LEVEL 4: BUILD YOUR OWN TOOLS**
generic plugins are built for the general case, not yours

- hundreds of skills and plugins on github work in theory, fall apart in practice
- built for everyone = built for no one
- your business has specific data, workflows, edge cases no generic tool covers that
- build custom systems around your own problems
- wire them into your stack
- compound your judgment into something reusable

Summary:
- level 1: saves time
- level 2: improves thinking
- level 3: creates new work
- level 4: creates new systems (highest ROI)

---

*Framework for progressively advanced AI adoption in marketing, from basic automation to building custom AI systems for your specific business needs.*

## @socialwithaayan — https://x.com/socialwithaayan/status/2041192946369007924

# Graphify - AI Knowledge Graph Tool

## Workflow/Tool Description

**Tool:** Graphify

**Purpose:** AI coding assistant skill (Claude Code, Codex, OpenCode, OpenClaw) that turns any folder of code, docs, papers, or images into a queryable knowledge graph.

**Usage:** Point it at any folder. Run one command to generate a full knowledge graph.

---

*Note: This is a tool/workflow for converting unstructured folders of content into structured knowledge graphs using AI coding assistants.*

## @@ivanburazin — https://x.com/ivanburazin/status/2041591850486595764

# Agent Babysitter Job Description

**Responsibilities:**
- Make sure my agent isn't idle while I'm in a meeting
- Ping me updates when I'm out for dinner
- Check if it's stuck in a loop
- Restart it when it crashes

*A humorous take on the real responsibilities needed when running autonomous AI agents - monitoring for idleness, getting status updates, detecting infinite loops, and handling crashes.*

## @tbpn — https://x.com/tbpn/status/2041676263556051111

# The Three-Sentence Pitch (Spielberg Method)

## Technique
Every great story can be pitched in three sentences, no matter what the story is. In three sentences you get the whole movie.

**Use:** A pitching technique for distilling complex narratives (stories, company pitches, etc.) into three compelling sentences.

## @ryancarson — https://x.com/ryancarson/status/2041115678388969954

## OpenClaw Self-Learning Prompt

**Prompt:**
```
Pull the latest versioned repo on our local OpenClaw repo and tell me your new capabilities. Read through that code.
```

*For having an AI assistant read through a cloned repository's code to understand and explain its capabilities and how it works.*

## @@aschwags3 — https://x.com/aschwags3/status/2041972795148763506

# Marketing Analytics Agent Workflow

## Workflow

1. Connect your data sources (Google Ads, Meta, GA4, etc.)
2. Agent pulls performance data while you sleep
3. Writes a [report - text appears cut off]

*Note: This is an automated marketing analytics workflow that connects to advertising and analytics platforms to generate performance reports.*

## @@garrytan — https://x.com/garrytan/status/2042034964825551072

# Durable AI Agent System Prompt

## Prompt:
```
You are not allowed to do one-off work. If I ask you to do something and it's the kind of thing that will need to happen again, you
```

**Note:** The tweet appears to be cut off and doesn't contain the complete prompt. The full instruction for creating a "durable AI agent" that doesn't need repeated instructions is incomplete in the provided text.

## @ilavanyajain — https://x.com/ilavanyajain/status/2041920525237473312

# Cold Email Template for Job Applications

## The Email Structure:

**Subject:** RE: Engineering at [Company Name]

**Opening (tldr):**
I love everything about what [Company] is doing. I don't have many hobbies outside coding. I am not athletic, bad at singing, don't drink, can't dance. Building is the only thing I am good at. At this point, I want to be a part of taking something from 0 -> 1 or 1 -> 100. I just want to be heads down chasing that goal

**Body:**
Hi,

Really loved what you were building at [Company] and wanted to reach out to see if there were any openings for Engineers in the early team. I have [X] years of relevant experience building full-stack applications primarily data-driven at [Company A], [Company B], [Company C], and [Company D] as a part of their early teams where I helped scale internal micro-services to thousands of workflows and users.

Being a part of super lean teams, one of my strongest suites has been ability to work across the stack from building scalable, robust backend systems to high throughput data ingestion pipelines to production grade frontend components in React. As a part, I have build several end-to-end systems that involve several layers at the intersection of UI (Next.js), Backend (Python, Node + Go based services using GraphQL and GRPC) as well as infrastructure pieces (AWS + GCP over K8s) from building complex workflows, DAG visualizations and drag and drop component canvas for [Product] to architecting the entire platform for [Other Products].

I would love to be a part of the early team at [Company] and define its work and culture. Looking forward to hearing from you soon!

Best,
[Name]

---

*This is a cold email template for reaching out to startup companies for engineering positions, emphasizing passion, relevant experience, and desire to join early-stage teams.*

## @Tanju_mim — https://x.com/Tanju_mim/status/2041807150423638406

# How to DELETE your digital footprint from the internet

## Step-by-Step Workflow

(Note: The tweet announces a thread but no actual steps are provided in the content shown. The thread continuation with the actual step-by-step instructions is not included in the provided text.)

NONE

## @shannholmberg — https://x.com/shannholmberg/status/2041856155715252456

# Level 2 AI Marketing Workflow

## Workflow:

**STEP 1 — BUILD THE KNOWLEDGE BASE**

Marketing knowledge base
- agentic · markdown and SQL · feeds itself automatically
- In-house data: campaigns · metrics
- Competitor research: pages · hooks · promos
- Past campaigns: what worked · what didn't
- Performance data: by channel · audience

**STEP 2 — THROW IN A ROUGH IDEA**

"grow signups for our AI marketing webinar next week"

**STEP 3 — COUNCIL RUNS IN PARALLEL**

- GPT 5.4: reads the knowledge base
- Claude Opus: reads the knowledge base
- Gemini: reads the knowledge base

**WHAT YOU GET BACK — 10 IDEAS GROUNDED IN YOUR DATA**

Each idea grounded in what you've tried and what competitors are doing

Each idea comes with:
- Estimated effort: how long it actually takes
- Channel track record: what worked for similar work
- What failed last time: grounded in your history

---

*This is a multi-step workflow for creating a context-aware AI marketing system that uses a custom knowledge base and parallel model processing to generate data-grounded campaign ideas.*

## @tferriss — https://x.com/tferriss/status/2041873868348895653

# Cold Email Writing Framework

## Workflow:

**Step 1: Research**
- Find common ground
- Look for mutual connections
- Understand their work/interests

**Step 2: Subject Line**
- Keep it short and specific
- Personalize when possible
- Avoid clickbait

**Step 3: Opening**
- Lead with why you're reaching out to THEM specifically
- Reference something specific about their work
- Show you've done your homework

**Step 4: Value Proposition**
- Be clear about what you're offering or asking
- Explain the mutual benefit
- Keep it concise

**Step 5: Call to Action**
- Make it easy to respond
- Suggest a specific next step
- Give them an out

**Step 6: Follow Up**
- Wait 5-7 days
- Reference your previous email
- Add new value or context

*Framework for writing effective cold outreach emails with higher response rates.*

## @@danpeguine — https://x.com/danpeguine/status/2041917181550575967

# Clicky Forks Use Cases

## Workflows/Use Cases Listed

The tweet lists several use cases for "clicky forks" but does not provide actual prompts, step-by-step workflows, or detailed techniques. It only mentions high-level application ideas:

- a tool to teach your llm a workflow (great for AI implementors)
- a live writing assistant
- kids homework helper
- spreadsheet explainer
- web design critic
- screen narrator for low-vision users
- focus coach

NONE

(No actual prompts, workflows, or detailed skills/techniques are provided - only use case suggestions)

## @danpeguine — https://x.com/danpeguine/status/2041873721456001219

# Proactive Tutor Mode

**Workflow/Technique:**
A system that watches your screen and teaches you without you asking anything. Every time you stop using your keyboard or your cursor, it gives you instructions/feedback.

**Purpose:** Automatically provides real-time teaching and feedback while learning software (demonstrated with Figma), triggered by pauses in keyboard/cursor activity.

## @adamlyttleapps — https://x.com/adamlyttleapps/status/2041174925575409967

# Claude Skill for App Onboarding Flow

**Skill/Technique:** Claude Skill that analyzes a codebase to automatically generate high-converting app onboarding flows, including questionnaires and pain point identification.

**What it's for:** Automates the creation of onboarding questionnaires by pointing Claude at your codebase, reducing the time from hours to 5 minutes.

*Note: The tweet describes the skill/technique but does not provide the actual prompt or step-by-step implementation details.*

## @FarzaTV — https://x.com/FarzaTV/status/2041699293728551344

# Clicky Setup Prompt

```
Hi Claude.

Clone the public git repo /farzaa/clicky.git into my current directory.

Then read the CLAUDE.md. I want to get Clicky running
```

**What it's for:** A prompt for Claude Code to clone and set up the Clicky application by following instructions in the repository's CLAUDE.md file.

## @ryancarson — https://x.com/ryancarson/status/2041684675849285921

# Clawchief v3.0 - AI Chief of Staff + Executive Assistant System

## System Description
A system that turns OpenClaw (Claude) into a chief of staff and executive assistant with the following components:

**Key Features:**
- Uses Todoist as the task management system
- Integrates with Google Workspace (Gmail, Calendar, Sheets) - upgraded from previous version
- Quality-of-life improvements over v2

**Note:** This describes a system architecture/upgrade rather than containing specific prompts or workflows. The tweet announces the system but doesn't provide the actual prompts or step-by-step workflows to implement it.

NONE

## @NickAbraham12 — https://x.com/NickAbraham12/status/2041987013423837659

# Cold Email Template with Personalization Variables

## Template:

**Subject line: {{function}}**

{{first name}} - saw you recently got promoted at {{Company}}.

I'm sure as {{new title}}, {{relevant offer}} has been on your mind for that reason.

Can I show you how we {{relevant social proof}}?

PS - And congrats on the promotion!

## Example:

**Subject line: demand gen**

Lucas - saw you recently got promoted at ABC Corp.

I'm sure as Director of Demand Gen, getting more demos on your reps' calendars has been on your mind for that reason.

Can I show you how we helped 123 Company generate 14 extra meetings on a pay-per-lead model last month?

PS - And congrats on the promotion!

---
*Cold email template for outbound sales that incorporates personalization, relevance to new role, specific offer, and social proof.*

## @rryssf_ — https://x.com/rryssf_/status/2035315863163912332

# OpenClaw-RL: Learning from Conversational Feedback

## Technique: Hindsight-Guided On-Policy Distillation (GYD)

The system uses conversational signals from user interactions to improve AI agents:

**Next-state signals encode two forms of information:**
- **Evaluative signals**: indicate how well the action performed and are extracted as scalar rewards via a PRM (judge)
- **Directive signals**: indicate how the action should have been different and are recovered through Hindsight-Guided On-Policy Distillation (GYD)

**Process:**
- Extract external hints from the next state
- Query the oracle teacher context
- Provide token-level directional advantage supervision that is richer than any scalar reward
- Due to the asynchronous design, the model serves live requests, the PRM judges ongoing interactions, and the trainer updates the policy at the same time, with zero coordination overhead between them

*This is a reinforcement learning framework that turns user corrections, feedback, and re-queries during conversations into training signals for personalizing AI agents.*

## @iruletheworldmo — https://x.com/iruletheworldmo/status/2035107649314852912

# AI Skills and Workflows

## 1. Coding Agent
**Workflow:**
```
Create a coding agent that:
- Writes code based on requirements
- Tests the code
- Debugs issues
- Refactors for optimization
```
*For: Automated code development and debugging*

## 2. Research Agent
**Workflow:**
```
Build a research agent that:
- Gathers information from multiple sources
- Summarizes findings
- Identifies patterns and insights
- Creates structured reports
```
*For: Automated research and analysis*

## 3. Writing Agent
**Workflow:**
```
Design a writing agent that:
- Generates content based on brief
- Maintains consistent tone and style
- Edits and refines drafts
- Optimizes for target audience
```
*For: Automated content creation*

## 4. Data Analysis Agent
**Workflow:**
```
Set up a data analysis agent that:
- Processes raw data
- Identifies trends and anomalies
- Creates visualizations
- Generates actionable insights
```
*For: Automated data processing and insights*

## 5. Task Planning Agent
**Workflow:**
```
Create a task planning agent that:
- Breaks down complex projects
- Prioritizes tasks
- Estimates timeframes
- Tracks progress
```
*For: Project management and task organization*

## @levelsio — https://x.com/levelsio/status/2034817543387427089

# Video Editing with Claude Code

## Extracted Content

NONE

---

**Note:** The tweet only contains a title and link without any specific prompts, workflows, or techniques described in the provided text. No screenshot content was provided to review for additional details.

## @Voxyz_ai — https://x.com/Voxyz_ai/status/2035093224117666076

# `/office-hours` - YC Partner Brainstorming Skill

**Skill/Command:** `/office-hours`

**Description from screenshot:**
> sit down with a YC partner before you write a line of code.
> 
> Two modes. If you're building a startup, you get six forcing questions distilled from how YC evaluates products: demand reality, status quo, desperate specificity, narrowest wedge, observation & surprise, and future-fit. If you're hacking on a side project, learning to code, or at a hackathon, you get an enthusiastic brainstorming partner who helps you find the coolest version of your idea.
> 
> Both modes write a design doc that feeds directly into `/plan-ceo-review` and `/plan-eng-review`. After the session, the skill reflects back what it noticed about how you think — specific observations, not generic praise.

*For challenging problem framing and generating implementation approaches before coding*

---

# `/debug` - Root Cause Debugger

**Skill/Command:** `/debug`

**Description from screenshot:**
> find the root cause, not the symptom.
> 
> When something is broken and you don't know why, `/debug` is your systematic debugger. It follows the Iron Law: no fixes without root cause investigation first. Traces data flow, matches against known bug patterns (race conditions, nil propagation, stale cache, config drift), and tests hypotheses one at a time. If 3 fixes fail, it stops and questions the architecture instead of thrashing.

*For systematic debugging that prioritizes root cause investigation over quick fixes*

## @Av1dlive — https://x.com/Av1dlive/status/2034959261290438919

# OpenClaw Setup Blueprint - 12 Tips

## Extracted Techniques/Workflows:

**1. Treating main agent as manager**
A system architecture approach where the primary AI agent functions in a managerial/orchestration role rather than doing all tasks directly.

**2. Separating chats by topics**
An organizational workflow technique for managing multiple conversation threads by topic area.

**3. Scheduling overnight jobs**
A workflow practice of queuing and automating AI tasks to run during off-hours.

**4. Multi model**
A technique involving using multiple AI models within the same system/workflow.

---

*Note: The tweet references an article with 12 tips total, but only highlights these 4 favorites. The full prompts/workflows would be in the linked article, which is not provided in the screenshot.*

## @garrytan — https://x.com/garrytan/status/2035813529891328424

# Chief Security Officer AI Agent

**Prompt/Workflow:**
```
`/cso` — your Chief Security Officer.** Full codebase security audit: OWASP Top 10, STRIDE threat modeling, attack surface mapping, data classification, and dependency scanning. Each finding includes severity, confidence score, a concrete exploit scenario, and remediation options. Not a linter — a threat model.
```

**What it's for:** An AI command that performs comprehensive security audits on codebases, including threat modeling and attack surface analysis with actionable findings.

## @gormankind — https://x.com/gormankind/status/2035527135339971059

# Claude Desktop MCP Server for Figma

## Workflow/Setup

Based on the tweet reference to "Claude-pilled designers who don't want to think about MCP" and the link, this appears to reference a tool/integration for connecting Claude Desktop to Figma via MCP (Model Context Protocol).

**Note:** The tweet itself doesn't contain the actual prompt, workflow steps, or configuration details - it only links to what appears to be a GitHub repository. Without the screenshot or additional content showing the actual setup instructions or prompts, I cannot extract the verbatim content.

NONE

## @nateliason — https://x.com/nateliason/status/2035744739421528074

# Daily Newsletter Queue Management Workflow

## Workflow:
1. Queue runs low, he presents five new ideas based on trending topics.
2. I pick from the list, he drafts and queues them up.

*A two-step system for maintaining a newsletter content queue using an AI assistant to monitor queue levels, generate topic ideas from trending content, and draft selected newsletters.*

## @starks_arq — https://x.com/starks_arq/status/2035367453711360340

# Cinematography Reverse Engineering Workflow

## Workflow:
1. Take a frame from a film you admire
2. Extract the color palette from that frame
3. Use the visual elements and composition as reference to recreate similar shots in different settings

*For learning cinematography by reverse engineering professional film frames and applying their logic to AI filmmaking.*

## @aiwithmayank — https://x.com/aiwithmayank/status/2035314322315026755

# First Principles Breakdown Prompt

```
Activate "First Principles Breakdown" on [problem]
```

*A prompt to get Claude to analyze a problem from fundamental principles, potentially revealing solutions that weren't apparent from conventional thinking.*

## @coreyhainesco — https://x.com/coreyhainesco/status/2035333365348626654

# SEO Content Planning Workflow

## Prompts:

**Prompt 1:**
```
Want to start going through the marketing pages first — prioritizing which to build and working out the keyword targeting for each?
```
*For prioritizing marketing page development and keyword strategy*

**Prompt 2:**
```
tell me the new blog posts we should write in a list
```
*For generating blog post content ideas from SEO data*

**Prompt 3:**
```
great, now tell me the new marketing site landing pages
```
*For identifying new landing page opportunities based on SEO analysis*

## Workflow:
Connect Claude Code to Ahrefs API and Google Search Console service account, then sequentially ask for: (1) marketing page priorities and keyword targeting, (2) blog post recommendations, (3) new landing page opportunities.

## @garrytan — https://x.com/garrytan/status/2035366425398059410

# Search Before Building - Engineering Directive

## Prompt/Directive:

Here's a new directive I want all of the app to use particularly for eng related / review / test plan / anything TECHNICAL. You should think a little bit though about how you might do a CEO review / design review / office hours based on the below too.

Then come up with a plan to modify GStack broadly so that this becomes a prime directive alongside boil the oceans/lakes.

## Workflow:

## Search before building

Before designing any solution that involves:
- Concurrency, parallelism, or scheduling
- A pattern you haven't used in this specific runtime/framework before
- Infrastructure (CI, deploy, testing, build tooling)
- Anything where the runtime (bun/node/deno) or framework might have a built-in

**Stop and WebSearch first.** Search for:
1. "{runtime} {thing you're about to build} built-in" (e.g., "bun test concurrency built-in")
2. "{thing} best practice {current year}" (e.g., "e2e test parallelism best practice 2026")
3. Check the runtime's own docs (bun.com/docs, nodejs.org/api)

---

**What it's for:** A directive to AI coding assistants to search for existing solutions before implementing custom code for technical tasks like concurrency, infrastructure, and framework features.

## @garrytan — https://x.com/garrytan/status/2035214231625474489

# Design Review Prompt

## Prompt:
what's the rating on of scale of 0 to 10, and what can we do to get to a 10?

## Purpose:
For iteratively improving designs or wireframes by asking an LLM to rate the current version and provide specific recommendations to reach a 10/10 quality level.

## @@RileyRalmuto — https://x.com/RileyRalmuto/status/2035607497872932881

# PolyClaude Multi-Perspective Analysis Workflow

**Workflow:**

1. **YOU ASK** - Submit your question (e.g., "Should we rewrite the auth system or patch it?")

2. **6 PERSPECTIVES ANALYZE IN PARALLEL:**
   - User Advocate (empathy)
   - Architect (systems)
   - Skeptic (risks)
   - Pragmatist (trade-offs)
   - Innovator (alternatives)
   - Temporal (timelines)

3. **CLASSIFY** - Detects question type

4. **SELECT** - Picks best perspectives

5. **ANALYZE** - Runs agents in parallel

6. **SYNTHESIZE** - Maps consensus + tensions

7. **REPORT** - Decision document out

**YOU RECEIVE:**
- Verdict -- what to do
- Consensus -- safe bets
- Tensions -- trade-offs
- Blind Spots -- gaps
- Confidence -- certainty
- Next Steps -- actions

*This is a multi-perspective council analysis technique that spawns parallel AI agents with different expert roles to analyze questions, then synthesizes their views into a structured decision document showing consensus, tensions, and blind spots.*

## @PawelHuryn — https://x.com/PawelHuryn/status/2033196719924551793

# Knowledge Organization with CLAUDE.md

## Workflow

Organize knowledge as a hierarchy of .md files. No database. No dependencies. Dead simple.

An index routes to categories, categories route to details.

**Note:** A simple markdown-based knowledge organization system using hierarchical routing from index → categories → details, utilizing a CLAUDE.md file as the foundation.

## @HarryStebbings — https://x.com/HarryStebbings/status/2033231250283004028

# Bee Swarming Social Amplification Technique

**Workflow:**
1. Create a channel called "bee swarming" where employees post their content
2. Everyone in the team goes to amplify the posted content
3. Turn every engineer into a marketer
4. Get the whole team posting about things they are excited about

**Purpose:** A team coordination strategy to amplify social media reach and create viral posts by having all employees collectively boost each other's content.

## @bradmillscan — https://x.com/bradmillscan/status/2033214247870537794

# OpenClaw Memory Hook - Forcefeed Memories

**Technique:** Forcefeed memories before responses

**What it's for:** A new runtime hook in OpenClaw that allows injecting memories before the AI generates responses, designed to prevent "OpenClaw drift" (likely context/consistency issues). Requires a communication plugin to be built to utilize this feature.

## @CryptoMikli — https://x.com/CryptoMikli/status/2033098513140138295

# 15-Second Call Method for Maintaining Friendships

**Workflow:**
Instead of defaulting to "do you want to hang out?" (which requires significant time commitment and planning), use brief 15-second calls to maintain connections with friends.

**Purpose:** A low-friction method to strengthen relationships without the time commitment barrier of traditional hangouts.

## @om_patel5 — https://x.com/om_patel5/status/2033056646595850498

# Video Generation Workflow Using Claude and Remotion

## Workflow:

1. Install remotion (react-based video generation)
   - code becomes a video. thats literally it.

2. Use claude https://t.co/XZOxIjL5qN

---

**Note:** Workflow for creating demo videos that drive traffic by converting code to videos using Remotion and Claude.

## @aiedge_ — https://x.com/aiedge_/status/2033015360778330599

# Claude Prompt Generator Workflow

## Workflow

**Overall Workflow:**

For user not using any language model, initial prompt is generated from scratch according to Claude3 prompt guidance; For user already use language model (GPT), initial prompt is "translated" into Claude3 prompt including the transformation based on the prompt nuances between difference model characters, e.g. XML tag are recommended in Claude3. Once the initial prompt is generated, the auto & manual evaluation process are involved to gurantee the output effectiveness or alignment and revised prompt will be generated accordingly, user will keep iterating the process until the desired output is achieved. The final process will involve the manual adjustment to ensure the production ready quality, which can't be fully implemented by script or model as described as the 10% human-in-the-loop process.

**Process stages:**
1. Initial prompt translation & generation (60% maturity)
2. Auto/human prompt evaluation with human feedback - iterate until revised (30% maturity)
3. Human adjustment for final prompt (10% maturity)

*For automatically refining and optimizing Claude prompts, including translation from GPT prompts to Claude3 format with appropriate XML tags and iterative evaluation.*

## @coreyganim — https://x.com/coreyganim/status/2032864683120574975

# OpenClaw Self-Improvement System

## Workflow

1. Create a `.learnings/` folder with:
   - `ERRORS.md` → Log every failure with context
   - `LEARNINGS.md` → Log every correction you make

2. Add this to your `AGENTS.md`:
   "After completing ANY task, check

---

*Note: For making OpenClaw AI agents learn from their mistakes by logging errors and corrections*

## @EXM7777 — https://x.com/EXM7777/status/2032924771470700969

# mcp2cli - Token Savings Technique

## Technique: Convert MCP servers to CLI tools to reduce token waste

**Problem:** Every MCP server loads ALL its tool definitions on EVERY turn. With multiple MCP servers connected to your agent, you're wasting tokens on tool definitions that never get used in your actual task.

**Example:** Six servers with 84 tools = 15,540 tokens before the conversation starts, paid again on every single message.

**Solution:** Use tools like `mcp2cli` to convert MCP servers to CLI interfaces instead.

*This technique reduces token usage by up to 96% by avoiding the "MCP tax" of repeatedly loading unused tool definitions.*

## @FelixCraftAI — https://x.com/FelixCraftAI/status/2032887884827554258

# Daily AI Agent Tips Automation

## Workflow

```
1: Set up a daily cron job to check for new issues each morning:
Fetch: GET https://t.co/ONCI21PX8o
If
```

**Note:** Incomplete workflow for setting up automated daily checks for AI agent tips from Claw Mart Daily newsletter (tweet appears truncated).

## @doodlestein — https://x.com/doodlestein/status/2032891274177524175

# AI Prompt for Project Innovation

## Prompt:
```
what's the single smartest and most radically innovative and accretive and useful and compelling addition you could make to the project at this point?
```

This prompt is used to generate innovative feature ideas for a project by asking the AI to suggest the most impactful addition.

## @TechWith_Nova — https://x.com/TechWith_Nova/status/2032814985693544845

# OpenClaw Bot Workflow

## Automated Local Business Outreach System

**Step-by-step workflow:**
- Finds 100s of local businesses via Google Maps
- Builds each one a custom website in [platform URL]
- Mails a postcard with a QR link to local businesses on autopilot

**Purpose:** Automated customer acquisition system that creates custom websites for local businesses and sends physical postcards with QR codes linking to those sites, eliminating the need for cold calling.

## @EXM7777 — https://x.com/EXM7777/status/2032896718673686706

# AI-Powered Content Clipping Workflow

## Workflow:
1. Train your agents on course content to get the best methods from the creators of the platform themselves
2. Have a first agent identify viral moments in long-form content
3. [Tweet appears to be cut off - remaining steps not visible]

**Purpose:** Using AI agents (specifically OpenClaw) to identify and clip viral moments from long-form content for monetization.

## @chrysb — https://x.com/chrysb/status/2032562442937815510

# Openclaw Cron Job Workaround

## Workflow

Instead of using Openclaw's built-in cron jobs (which consume tokens even when doing nothing), use system cron + `openclaw message` command:

```
openclaw message send
  --channel telegram
  --target XXXX8043
  --message "can you read these new emails?"
```

*Workaround to avoid token consumption from Openclaw cron jobs by triggering AI tasks via system cron and the message command instead.*

## @johann_sath — https://x.com/johann_sath/status/2032753719763415182

# Heartbeat monitoring workflow for bots

## Extracted Workflow

```
every 30 minutes:
1. check if any cron jobs failed
2. check if today's memory file exists
3. check disk usage
4. if anything broke, message me immediately
```

**Purpose:** Background monitoring routine for autonomous bots to perform health checks and alert on failures when unattended.

## @shannholmberg — https://x.com/shannholmberg/status/2032835035985072206

# Marketing AI Setup Workflow

## Workflow Steps:
1. Set up claude code (superpowers, skip permissions, obsidian integration)
2. Create your brand foundation file (voice, tone, audience, what you never say)
3. Map out your workflows and see where you can [integrate AI]

*Note: Weekend workflow for marketers to set up AI-powered marketing system using Claude with brand guidelines and workflow optimization.*

## @aakashgupta — https://x.com/aakashgupta/status/2032662042738356402

# Self-Improving Skills Workflow

**Workflow:**
The tweet references making skills "self-improving" but does not provide the actual step-by-step workflow or prompt text in the visible content. The link likely contains the details but cannot be accessed from the tweet text alone.

NONE

## @ziwenxu_ — https://x.com/ziwenxu_/status/2032651936009261459

# OpenClaw Hidden ACP Agent Configuration

**Extracted Workflow:**
OpenClaw has a hidden ACP Agent that lets OpenClaw tap into Claude Code, Codex, OpenCode, Gemini CLI without burning tokens on endless back-and-forth just like running Claude Code natively.

Drop this config into your OpenClaw and watch it unlock:

**Note:** The tweet references a configuration but doesn't include the actual config text or screenshot showing it - only describes the capability.

NONE

(The tweet promises a config/prompt but doesn't actually provide it in the visible content)

## @DeRonin_ — https://x.com/DeRonin_/status/2032796569808830921

# Skill Graph for AI Content Production

## Technique: Skill Graph Architecture

A "skill graph" system using 30+ interconnected markdown files to turn an AI agent into a content team. The graph includes modular skills organized into categories:

**Core Engine:**
- content production engine
- repurposing chain
- batch workflow
- 1 idea → 10 posts

**Platforms:**
- instagram
- linkedin
- x / twitter
- tiktok
- scheduling rules

**Voice & Hooks:**
- core brand voice
- hook formulas
- number hooks
- pain point hooks
- contrarian hooks
- CTA patterns

**Audience:**
- casual audience
- builder audience
- follower journey funnel
- engagement patterns
- save vs scroll triggers
- niche targeting

**Workflows:**
- weekly cadence
- peak posting times
- performance metrics
- cross-platform promotion
- A/B testing hooks
- content types that perform
- POC: content creation
- algorithm behaviors
- thread structure
- character limits & formats
- carousel rules
- reels & shorts format
- distribution
- MDC: content creation
- platform adaptations
- vertical scrollable structure
- time markers
- index.md

*For: Building a modular AI agent system to automate multi-platform social media content creation using interconnected markdown skill files*

## @lukepierceops — https://x.com/lukepierceops/status/2032813461399392412

# DIY Automation Consulting Workflow with Claude

## Workflow

**Step 1: Discovery (20 min)**
→ Paste your org chart, tool stack, and top 3 bottlenecks
→ Claude interviews you with follow-up questions

---

*Note: This is a workflow for using Claude to replicate professional automation consulting services by having it analyze organizational structure, tools, and pain points through an interactive discovery process.*

## @leojrr — https://x.com/leojrr/status/2032560486638838071

# Data-Driven TikTok Automation Workflow

## Workflow:
1. analyzes trending topics in my niche
2. finds which slides are performing best
3. learns and adjusts automatically

*Workflow for automating TikTok content creation using OpenClaw with data-driven optimization instead of random posting*

## @thedennis — https://x.com/thedennis/status/2032566904578081272

# Ad Creative System Framework

## Workflow: Research → Brief → Create → Test → Learn → Iterate

A 6-step advertising system with 8 specific frameworks:

**01 - Hook Bank**
- 100+ proven hook frameworks and script openers across 5 awareness levels
- Pattern-interrupt openers
- Story-based hooks
- Stat-driven leads
- Question frameworks

**02 - Creative Brief**
- Auto-generated creative briefs with script direction, persona targeting & format selection
- One-click brief generation
- Persona-matched angles
- Platform-specific formats
- Script direction included

**03 - Ad Autopsy**
- Diagnose failing ads in under 60 seconds with scored diagnostic engine
- Hook strength analysis
- Offer clarity scoring
- CTA effectiveness check
- Visual hierarchy audit

**04 - Offer Stack**
- 16 offer stack frameworks with margin calculator and value positioning engine
- 16 proven frameworks
- Margin calculator built-in
- Value stack builder
- Pricing psychology layers

**05 - Awareness Ladder**
- 5-stage awareness strategy ladder with hooks, angles and creative direction
- Unaware to Most Aware
- Stage-matched hooks
- Creative angle generator
- Full funnel coverage

**06 - Account Audit**
- 66-point ad account scorecard with weighted scoring & graded report
- 66-point diagnostic
- Weighted scoring system
- Letter-grade report
- Priority action items

**07 - Creative Calc**
- Creative volume planning and budget forecasting with iteration modeling
- Monthly volume targets
- Budget allocation model
- Iteration forecasting
- Team capacity planning

**08 - ROI Calculator**
- ROAS, ROI, CPA and full funnel unit economics with profit modeling
- ROAS & ROI calculator
- CPA & CPM modeling
- Break-even analysis
- Profit margin forecasting

*For: Complete advertising creative and performance management system covering research through optimization*

## @garrytan — https://x.com/garrytan/status/2032691185551286469

# Testing Claude Skills with Outcome Evals

## Workflow

Instead of just testing "does the SKILL.md parse correctly?" and "can Claude read the SKILL.md?", add outcome evals — plant known bugs in a test site, run /qa, and judge whether the report found them. This tests the entire value chain, not just the docs.

The platonic ideal: You run `bun test:e2e`, a Claude session navigates a real site with planted bugs, writes a QA report, and an LLM judge scores whether it found the bugs, followed the right methodology, and produced useful output. Same for /review — you feed it code with known vulnerabilities and verify it catches them. The whole stack, end-to-end.

---

*For end-to-end testing of Claude Skills by evaluating actual outcomes rather than just file parsing.*

## @dakotahermes — https://x.com/dakotahermes/status/2032572717657108883

# Claude + Canva MCP Ad Generation Workflow

## Workflow:
1. Upload existing winning ads
2. Claude extracts the formula
3. Generate 80+ copy variations by emotional angle
4. Feed it a Canva file with a template (duplicated [text cuts off])

**Note:** Workflow for scaling static ad creation using Claude with Canva MCP integration to analyze winning ads and generate variations.

## @@jordan_ross_8F — https://x.com/jordan_ross_8F/status/2032584769993662745

# Claude Code for Growth Marketing - Workflow Tips

## Workflow: Identify API-enabled repetitive tasks
Look for workflows involving repetitive actions with tools that have APIs (like ad platforms, design tools, analytics platforms). These are prime candidates for automation and where Claude Code provides the most value.

*For identifying which marketing tasks to automate with Claude Code*

## Workflow: Break complex workflows into specialized sub-agents
Instead of trying to handle everything in one prompt or workflow, create separate agents for specific tasks (like their headline agent vs. description agent). This makes debugging easier and improves output quality when dealing with complex requirements.

*For structuring multi-step marketing automation workflows*

## Workflow: Thoroughly brainstorm and prompt plan before coding
Spend significant time upfront using Claude.ai to think through your entire workflow, then have Claude.ai create a comprehensive prompt and code structure for Claude Code to reference. Also, work step-by-step rather than asking for one-shot solutions to avoid Claude getting overwhelmed by complex tasks.

*For planning complex automation workflows before implementation*

## @AlexFinn — https://x.com/AlexFinn/status/2035459248147374213

# AI R&D Council Workflow

## Workflow

**System Name:** Henry Research Lab / R&D Council

**Schedule:** Twice daily (9 AM + 5 PM) on DGX Spark

**Process:**
1. 5 different AI models autonomously meet and discuss the business
2. They review products/content
3. They debate each other
4. Come up with next steps to grow revenue
5. Output memos with recommendations (shown example: "Ship a narrowly scoped Execution Trust Layer for one recoverable revenue workflow, not a broad cross-product safety gate")

**Example Output Format:**
- Memo number and agent role (e.g., "MEMO #3 · THE HUSTLER")
- Categories/tags (Trust and safety, Autonomous execution, Revenue attribution, User adoption, Demo/sales readiness)
- Status indicator (NEEDS WORK)
- Detailed problem statement and recommendation
- Confidence score and cost estimate

*For: Autonomous business R&D and strategic planning with multi-agent AI debate system*

## @dunkhippo33 — https://x.com/dunkhippo33/status/2035492562195075406

# Follow-up Prompt Without Being Pushy

**Prompt/Technique:**
"I have a note to follow up with you."

**Purpose:** A professional way to follow up with someone that signals organization and avoids making them feel pressured or guilty.

## @om_patel5 — https://x.com/om_patel5/status/2035527146660118650

# How to Find Paid Users for Your Startup on Reddit

## Workflow:

**Step 1:** Pick the subreddits where your customers hang out

Examples: r/smallbusiness, r/marketing, r/freelance, r/ecommerce

---

*Note: This is a workflow for finding potential customers on Reddit by identifying relevant subreddits. The tweet appears to continue beyond what's shown, so this may be an incomplete extraction of the full workflow.*

## @AlexHormozi — https://x.com/AlexHormozi/status/2035526767797260655

# Signal to Noise Filter - Three Question Framework

**Workflow:**

Whenever someone brings me a problem...
1) What does that mean?
2) How do you know that
3) Why does it matter?

Logic - Evidence - Utility.

**Purpose:** A three-step questioning framework to filter and evaluate problems by assessing their logical clarity, evidential basis, and practical importance.

## @levelsio — https://x.com/levelsio/status/2027566773814403448

# Claude Code Server Bypass Permissions Alias

## Shell Command/Workflow

```bash
c() { IS_SANDBOX=1 claude --dangerously-skip-permissions "$@"; }
```

A shell alias for running Claude Code on a server with permissions bypass enabled, allowing faster automated task completion.

## @KanikaBK — https://x.com/KanikaBK/status/2026982903574606234

# OpenClaw Automated Video Creation Workflow

## Workflow:
The tweet describes that someone "created a full launch video with OpenClaw in 45 minutes" that is "all automated" but does not provide the actual step-by-step process or specific prompts used.

## Note:
This is for automated video production as an alternative to hiring video editors and animators.

---

**Note:** The tweet promises to explain "exactly how it works" but the actual methodology would be in the linked content (likely a thread or external link), which is not provided in the bookmarked tweet text itself.

## @andrarchy — https://x.com/andrarchy/status/2027074334238675293

# OpenClaw Rule-Following Comment Technique

## The Prompt/Technique:

```
This simple comment can save you weeks of work trying to get OpenClaw to follow your rules.
```

**Note:** The tweet references a "simple comment" technique for getting OpenClaw to follow rules, but the actual comment/prompt itself is not shown in the provided text. The tweet appears to be a teaser without revealing the actual technique.

NONE

## @johann_sath — https://x.com/johann_sath/status/2026909147590177076

# OpenClaw Orchestrator Prompt

## Prompt:
```
you are the orchestrator. subagents execute. never build, verify, or code inline. your job is to plan, prioritize & coordinate.
```

**Purpose:** Add to AGENTS.md to configure an AI agent as an orchestrator that delegates tasks to subagents rather than executing code directly.

## @cptn3mox — https://x.com/cptn3mox/status/2026893700270534717

# Using Claude to Review OpenClaw Architecture

## Workflow

```
> open terminal
> cd .openclaw
> run claude and say:

Review my entire architecture and tell me what you would improve about it. The goal here is to make my openclaw and its agents work as [efficiently as possible]
```

*For getting Claude to analyze your OpenClaw multi-agent system architecture and suggest improvements for inter-agent learning, task automation, metrics, and operational efficiency.*

## @JosephKChoi — https://x.com/JosephKChoi/status/2027139815196467682

# TikTok Viral Video Rule

**Technique:**
Watch one number: Do 75% of people stay past 3 seconds? If yes, it goes viral.

**What it's for:** Determining if a TikTok video will go viral by tracking viewer retention at the 3-second mark.

## @xburak — https://x.com/xburak/status/2032472325229056258

# Building Multiple "Boring" Apps Strategy

## Workflow

**1. The "Boring Keyword" Hunt** I look for highly specific, long-tail keywords that have decent search volume but terrible existing apps. Think "PDF compressor for X" or "Unit converter for Y".

**2. The 48-Hour MVP** I don't spend months on these. If an app takes me more than a few days to build, I drop the idea. The app just has to do one thing slightly better than the outdated, ugly apps currently ranking for that keyword.

**3. Pure ASO** I spend 80% of my time optimizing the title, subtitle, and screenshots. That's my only marketing. I publish it, maybe tweak the keywords once a month, and otherwise forget about it.

**My Stack (How I actually manage 65 apps)** The obvious bottleneck here is speed and maintenance. You cannot hand-code and manually deploy 65 apps from scratch and expect a decent ROI on your time, especially when Apple and Google force SDK updates. To turn development and deployment into an assembly line, I use Superapp AI + Revenue Cat + Claude sometimes. It basically removes all the friction of building, deploying, and updating, so I can just focus on finding keywords and churning out the MVPs.

---

*This is a workflow for building a portfolio of small, niche utility apps that collectively generate income through App Store Optimization (ASO) rather than pursuing one viral app.*

## @DeRonin_ — https://x.com/DeRonin_/status/2032392546454794289

# 6-Month AI Engineer Learning Roadmap

## Workflow

**Month 1 - Coding & Fundamentals:**
- Python
- FastAPI
- Git + GitHub
- APIs & JSON
- SQL
- async

**Month 2 - LLM App Development:**
- prompting
- tool calling
- structured outputs
- streaming
- token economics

**Month 3 - RAG Systems:**
- embeddings
- vector databases
- reranking
- chunking
- hallucination reduction

**Month 4 - Agents & Evals:**
- agent loops
- multi-step workflows
- evaluation
- tool selection
- retries

**Month 5 - Deploy & Reliability:**
- Docker
- observability
- caching
- queues
- cost monitoring

**Month 6 - Specialize & Ship:**
- choose your lane
- build portfolio
- get hired
- real projects

*A structured 6-month curriculum for becoming an AI engineer, focusing on building and deploying LLM applications.*

## @rohit4verse — https://x.com/rohit4verse/status/2032433873624449088

# Stop Generating UI Slop - AI Agent Prompt

```
DO NOT generate UI code unless explicitly asked.

When I ask you to build something, I want you to:
1. Think about the problem
2. Design the solution architecture
3. Implement the core logic
4. Write tests

Only generate UI code if I specifically say "build a UI" or "create a frontend" or something similar.

If you're unsure whether I want UI code, ask me first.
```

**What it's for:** Prevents AI coding agents from automatically generating unwanted user interface code when building features or applications.

## @benoror — https://x.com/benoror/status/2027980781985939948

# Weekly Recap Slash Command

## Prompt/Workflow:

```
/recap this week
```

When executed, the system responds:
```
Running /recap this week — date range: 2026-02-23 to 2026-02-28.
Let me gather vault data.
```

The agent then:
- Reads meeting notes and files from the vault within the specified date range
- Gathers data from meetings and other MCP sources
- Generates a structured recap including:
  - Highlights with metrics/charts and filter dropdowns
  - Decisions made (with assigned owners)
  - Infrastructure updates
  - API caching progress
  - SEV incidents
  - API redesign status
  - Team & Process updates
  - CI stabilization
  - Verified views feature status
  - Support tickets
  - Open/Pending items organized by category (Dashboard, API Caching, Incident Follow-ups, API Redesign, Product & People)

**Purpose:** Automated weekly recap generation from Obsidian vault data using an AI agent triggered by a slash command.

## @samroax — https://x.com/samroax/status/2027066265186320566

# Neural Network Brain Modeling Workflow

## Extracted Workflow:

**Step 1:** Upload studies of neural networks. Have it create skills from these, rules, and first principles redesign the brain system to model after a human brain. No context loss, use deterministic verification to prove everything is learned.

---

*Note: Workflow for creating an AI system that learns from neural network studies by extracting skills/rules and redesigning the architecture to mimic human brain structure with verified learning.*

## @tszzl — https://x.com/tszzl/status/2027292776204034366

# Bhagavad Gita-style Prompt to Claude

## Prompt:
```
Death means the attainment of heaven; victory means the enjoyment of the earth. Therefore rise up Claude, resolved to fight! Having made yourself alike in pain and pleasure, profit and loss, victory and defeat, engage in this great battle and you will be
```

*Note: Appears to be an adaptation of Bhagavad Gita verse 2.38 directed at Claude AI, possibly to inspire/motivate the AI to engage with a difficult task or question with equanimity.*

## @tferriss — https://x.com/tferriss/status/2027051962634846222

# Fear-Setting Exercise

## Workflow:
This is a quarterly or monthly exercise for decision-making and risk assessment. The tweet references fear-setting as a named technique but does not provide the step-by-step process in the tweet text itself.

**Note:** Fear-setting is a structured exercise used to evaluate fears, make better decisions, avoid mistakes, and achieve business and personal success. (The specific steps would be in the linked content, not visible in the tweet text provided.)

## @danielgothits — https://x.com/danielgothits/status/2027053149131882632

# Automated Zillow Lowball Offer Campaign

## Prompt/Workflow:

```
Instructions: Contact Zillow listings in the Tampa, Florida area for 3-5 bedroom houses that have been on the market for longer than 30 days

Average offer: 70% below asking
```

*Automated workflow for sending bulk lowball offers on real estate listings using AI agent (openclaw).*

## @nateliason — https://x.com/nateliason/status/2027084414992154914

# OpenClaw Skill for Klaviyo Ecommerce

**Skill/Integration:** OpenClaw skill for Klaviyo

**What it's for:** Ecommerce businesses using Klaviyo to integrate OpenClaw functionality

---

*Note: The tweet references a skill but does not provide the actual prompt, workflow steps, or technical implementation details. Only a general description of its utility for ecommerce/Klaviyo users is mentioned.*

## @Hesamation — https://x.com/Hesamation/status/2026801420872093708

# Obsidian AI Skills Repository

The tweet references a GitHub repository called "obsidian-skills" that contains agent skills for Obsidian to teach AI agents to use Markdown, Bases, JSON Canvas, and use the CLI.

*Note: This is a collection of reusable AI skills for working with Obsidian vaults and codebases, created by Obsidian's CEO for use with Claude Code and Codex.*

## @NikoMcCarty — https://x.com/NikoMcCarty/status/2027387505797136585

# Writing Revision Technique

## Prompt/Workflow:

When revising writing, ask repeatedly of each sentence whether it can be **sharper**, and if we really, truly, **believe** the sentence.

## Purpose:

A revision technique to improve truthfulness and precision in writing by questioning each sentence's sharpness and believability.

## @@zackbshapiro — https://x.com/zackbshapiro/status/2027393196880241072

# Teaching Claude Your Legal Practice Style

## Concept
The tweet describes using Claude AI as a general-purpose tool that has been "taught" how the lawyer practices law, rather than using specialized legal AI tools. However, no specific prompts, workflows, or techniques are provided in the tweet.

NONE

## @PrajwalTomar_ — https://x.com/PrajwalTomar_/status/2027421224239005951

# OpenClaw Cost Reduction Workflow

## Workflow:
1. Copy-paste entire article into your OpenClaw agent
2. Tell it to implement everything

**Note:** Workflow for reducing OpenClaw costs by up to 80% by having the agent implement cost optimization techniques from an article.

## @businessbarista — https://x.com/businessbarista/status/2027446578793836682

# Setting up OpenClaw on Hetzner VPS

## Workflow

1) Spin up a VPS on Hetzner
   - It's a virtual server in the cloud, basically a computer you rent for $5-10/month
   - Pick 8GB RAM, Ubuntu, US East
   - Takes 2 [minutes - tweet appears cut off]

*Note: Step-by-step guide for setting up OpenClaw securely without a Mac Mini using a cloud VPS.*

## @Suhail — https://x.com/Suhail/status/2027529328553312388

# AI Agent App Cloning Workflow

## Workflow:
1. Give an agent access to a competitor app on a computer
2. Tell agent: Rebuild this app by using all its features
3. Agent tries app → documents all flows/features/edge cases
4. The other agent builds all flows/features
5. They iterate trying/testing until done

*A multi-agent workflow for reverse-engineering and rebuilding competitor applications through automated testing and development.*
