# IJFW — Master Project Instructions
## For Claude Code: Read This First, Then Execute

---

## What We're Building

IJFW ("It Just Fucking Works") is a unified AI efficiency framework by Sean Donahoe. One install that makes any AI coding agent smarter, more efficient, gives it persistent memory across sessions and platforms, and auto-configures for optimal performance.

It ships as platform-native plugins for Claude Code, Codex, Gemini CLI, Cursor, Windsurf, Copilot, and a universal rules file for any agent. A cross-platform MCP memory server is the backbone connecting all platforms.

**This is not a cost-cutting tool. It is an intelligence allocation system.**

---

## Three Design Principles (Non-Negotiable — Apply to Every Decision)

### 1. Rory Sutherland — Perceived Value Through Reframing
- Position as "smarter" never "cheaper." Savings are a side effect of intelligence.
- Everything user-facing shows ONLY positives. No negatives, no "not found," no "missing," no diagnostics.
- Every line the user sees should make them feel like they got an upgrade. Wow factor.
- The experience should feel like upgrading from economy to first class.

### 2. Steve Krug — Don't Make Me Think
- Zero cognitive load. One concept: mode. Everything else is automatic.
- No settings pages, no config files to edit, no env vars to set.
- Smart defaults that work for 80%+ of cases. Override via natural language.
- If something's missing, quietly create it. Don't ask permission for safe, reversible actions.
- Modes named for intent ("fast", "deep"), not mechanism ("haiku", "low-effort").

### 3. Sean Donahoe — It Just Fucking Works
- One install. Works on session one. No dependencies to configure.
- Self-contained. Auto-detects environment and adapts silently.
- If a feature can't be fully automated, it ships as a one-word command.
- If a feature requires external dependencies (API keys, local models), it's optional — core works without it.

---

## Project Setup

### Step 1: Initialise the Repository

```bash
mkdir ijfw && cd ijfw
git init
```

### Step 2: Unzip the Phase 1 Build

The uploaded zip file `ijfw-project.zip` contains the complete Phase 1 scaffold — 39 files across the entire project structure. Unzip it into the repo root.

```bash
# The zip contains an ijfw/ directory — move contents to repo root
unzip ijfw-project.zip
mv ijfw/* .
mv ijfw/.* . 2>/dev/null
rmdir ijfw
```

### Step 3: Verify the Structure

The project should have this structure:

```
.
├── CLAUDE.md                           # Project context for THIS repo
├── README.md                           # Main documentation
├── package.json                        # Root package for npx install
│
├── claude/                             # Claude Code plugin (FULL FEATURED)
│   ├── .claude-plugin/
│   │   └── plugin.json                 # Plugin manifest
│   ├── skills/
│   │   ├── ijfw-core/SKILL.md          # ALWAYS-ON (~52 lines) — the heart
│   │   ├── ijfw-commit/SKILL.md        # On-demand: terse conventional commits
│   │   ├── ijfw-review/SKILL.md        # On-demand: one-line code reviews
│   │   ├── ijfw-compress/SKILL.md      # On-demand: file compression
│   │   ├── ijfw-handoff/SKILL.md       # On-demand: session handoff
│   │   └── ijfw-summarize/SKILL.md     # On-demand: project context generation
│   ├── hooks/
│   │   ├── hooks.json                  # Hook event → script mapping
│   │   └── scripts/
│   │       ├── session-start.sh        # Detection, migration, memory, startup report
│   │       ├── pre-compact.sh          # Decision preservation before compaction
│   │       ├── pre-tool-use.sh         # Deterministic input stripping
│   │       └── session-end.sh          # Session compression, handoff, journal
│   ├── commands/
│   │   ├── mode.md                     # /mode smart|fast|deep|manual
│   │   ├── compress.md                 # /compress <filepath>
│   │   ├── status.md                   # /ijfw-status
│   │   ├── handoff.md                  # /handoff [create|resume]
│   │   └── consolidate.md              # /consolidate (dream cycle)
│   ├── agents/
│   │   ├── scout.md                    # Haiku — fast exploration
│   │   ├── builder.md                  # Sonnet — implementation
│   │   └── architect.md                # Opus — deep reasoning + security
│   └── rules/
│       └── ijfw-activate.md            # Auto-activation rule
│
├── codex/                              # Codex CLI
│   ├── .codex/config.toml              # MCP server config
│   └── instructions.md                 # Core rules
│
├── gemini/                             # Gemini CLI
│   ├── .gemini/settings.json           # MCP server config
│   └── GEMINI.md                       # Core rules + MCP tool hints
│
├── cursor/                             # Cursor
│   ├── .cursor/mcp.json                # MCP server config
│   └── .cursorrules                    # Core rules
│
├── windsurf/                           # Windsurf
│   ├── mcp_config.json                 # MCP server config
│   └── .windsurfrules                  # Core rules
│
├── copilot/                            # GitHub Copilot
│   ├── .vscode/mcp.json               # MCP server config
│   └── copilot-instructions.md         # Core rules
│
├── universal/                          # Any agent
│   └── ijfw-rules.md                   # 16-line paste-anywhere rules
│
├── mcp-server/                         # Cross-platform MCP memory server
│   ├── package.json
│   └── src/
│       └── server.js                   # 4 tools, MCP JSON-RPC over stdio
│
├── core/                               # Shared logic (Phase 2+)
│   ├── memory/                         # Memory consolidation algorithms
│   ├── index/                          # Codebase indexer
│   └── compress/                       # Compression scripts
│
└── docs/
    ├── README.md                       # Full documentation
    └── DESIGN.md                       # All architectural decisions
```

---

## What to Audit (Phase 1 Quality Check)

Before building Phase 2, audit the Phase 1 scaffold for correctness and quality:

### 1. Core Skill Audit
**File:** `claude/skills/ijfw-core/SKILL.md`
- [ ] Verify it's under 55 lines (currently ~52). Every line must earn its place.
- [ ] Test: does it actually suppress filler when loaded as a skill?
- [ ] Test: does the routing section correctly trigger agent delegation?
- [ ] Test: does the clarity override engage for destructive actions?
- [ ] Verify the Karpathy additions ("state assumptions", "touch only what asked") actually change agent behaviour.

### 2. Hook Scripts Audit
**Files:** `claude/hooks/scripts/*.sh`
- [ ] Run `shellcheck` on all four scripts for bash correctness.
- [ ] Test session-start.sh on macOS and Linux (stat command differs between platforms).
- [ ] Test the environment detection: does it correctly find OpenRouter, Ollama, LM Studio?
- [ ] Test the migration detection: install claude-mem, verify IJFW imports its data.
- [ ] Test the positive-framing startup report: no negatives leak through.
- [ ] Verify pre-tool-use.sh actually strips ANSI codes and collapses test output.
- [ ] Verify pre-tool-use.sh defers when RTK or context-mode is detected.
- [ ] Test session-end.sh: does it write journal entries and manage the consolidation flag?
- [ ] Check: are the curl timeout values (--max-time 1) fast enough to not delay startup?

### 3. MCP Memory Server Audit
**File:** `mcp-server/src/server.js`
- [ ] Test with Claude Code: `claude mcp add ijfw-memory -- node mcp-server/src/server.js`
- [ ] Test with Gemini CLI: add to settings.json, verify tools appear.
- [ ] Test with Codex: add to config.toml, verify tools work.
- [ ] Test each tool: recall (session_start, handoff, decisions, natural language), store (decision, observation, pattern, handoff, preference), search (keyword matching), status.
- [ ] Verify progressive disclosure in recall: summary returns ~200 tokens, standard returns more.
- [ ] Verify store correctly writes to journal, knowledge base, and global as appropriate.
- [ ] Verify search ranks results by relevance.
- [ ] Test: what happens with empty memory (first session)? Should degrade gracefully.
- [ ] Test: what happens with large memory (1000+ entries)? Performance check.
- [ ] Verify the MCP JSON-RPC protocol implementation handles edge cases: malformed input, unknown methods, missing params.

### 4. Agent Definitions Audit
**Files:** `claude/agents/*.md`
- [ ] Verify scout correctly uses haiku model with low effort.
- [ ] Verify builder correctly uses sonnet with medium effort.
- [ ] Verify architect correctly uses opus with high effort.
- [ ] Test: does the builder actually follow the Karpathy simplicity rules?
- [ ] Test: does the architect security checklist actually catch common vulnerabilities?
- [ ] Test: does the architect present tradeoffs when multiple approaches exist?

### 5. Platform Config Audit
- [ ] Verify each platform's MCP config points to the correct server.js path.
- [ ] Test: can each platform (Codex, Gemini, Cursor, Windsurf, Copilot) actually connect to the MCP server?
- [ ] Verify all platform rules files contain identical core rules (Karpathy additions included).
- [ ] Test the universal rules file: paste into a raw agent prompt, verify it changes behaviour.

### 6. Cross-Platform Memory Test
- [ ] Store a decision in Claude Code.
- [ ] Start a Gemini CLI session pointing at the same project.
- [ ] Verify the decision is retrievable via ijfw_memory_search.
- [ ] Repeat for Cursor, Codex, Copilot.

---

## Architecture Decisions (Must Understand Before Building)

### No Proxy — Ever
IJFW NEVER proxies, intercepts, or redirects network traffic. No middleware in the billing/auth path. We configure agent BEHAVIOUR, not agent INFRASTRUCTURE.

### Auto-Detection at SessionStart
The startup hook silently detects:
- **OpenRouter**: env var `OPENROUTER_API_KEY` or `ANTHROPIC_BASE_URL` → openrouter
- **Claude Code Router**: `~/.claude-code-router/config.json` or running process
- **Ollama**: ping `localhost:11434/api/tags` (1s timeout)
- **LM Studio**: ping `localhost:1234/v1/models` (1s timeout)
- **DeepSeek**: env var `DEEPSEEK_API_KEY`
- **Existing plugins**: claude-mem, memsearch, MemPalace, Memorix, RTK, context-mode, caveman

If detected → silently use/defer/import. If nothing → graceful fallback to native provider.

### Plugin Migration
On first run only (`.ijfw/.migrated` flag), IJFW checks for:
- **claude-mem** → imports observations and session summaries into IJFW journal/knowledge
- **memsearch** → imports daily markdown memory files into journal
- **MemPalace** → flags for agent-assisted import (ChromaDB needs Python)
- **Memorix** → imports JSON memories into journal
- **Claude Auto Memory** → imports native MEMORY.md content
- **RTK** → defers PreToolUse stripping to RTK (sets IJFW_RTK_ACTIVE flag)
- **context-mode** → defers PreToolUse to context-mode (sets IJFW_CONTEXT_MODE_ACTIVE flag)
- **caveman** → coexists silently, IJFW core skill supersedes

All presented as positive framing: "Imported 47 observations from existing memory"

### Startup Report UX
Positive framing ONLY. Examples in docs/DESIGN.md. Key rules:
- NO "not found", "missing", "error", "warning" language
- If something was created: "Optimised project context created (Next.js / TypeScript)"
- If memory was imported: "Imported 47 observations from existing memory"
- If effort was upgraded: "Upgraded thinking depth"
- If nothing to report: just "Ready."

### Three-Tier Memory
1. **Session** (`.ijfw/sessions/`): current session, captured at boundaries
2. **Project** (`.ijfw/memory/`): cross-session journal, handoff, knowledge base
3. **Global** (`~/.ijfw/memory/`): cross-project preferences, universal knowledge

### MCP Memory Server — 4 Tools Only
- `ijfw_memory_recall`: retrieval with progressive disclosure
- `ijfw_memory_store`: store decisions/observations
- `ijfw_memory_search`: keyword search across all memory
- `ijfw_memory_status`: compressed ~200 token wake-up injection

### Processing Tiers
```
Tier 1 — Deterministic (free, always on):
  ANSI stripping, test collapsing, whitespace normalization,
  JSON minification, tool output truncation

Tier 2 — Cheap LLM (optional, auto-detected):
  Memory compression, dream cycle, session summarization
  Routes to: Ollama/LM Studio (if detected) → Haiku (fallback)

Tier 3 — Full LLM (user's configured model):
  Actual coding tasks, architecture, complex reasoning
```

### Hot-Loadable Skills
Skills load only when triggered, unload when done. Core skill dispatches.
Users create custom skills in `.ijfw/skills/` and agents in `.ijfw/agents/`.

---

## Build Phases

### Phase 1 — MVP ✅ (Current Build)
Everything in the zip. Needs auditing and testing per the checklist above.

### Phase 2 — Intelligence Layer (Build Next)

**2a. Effort Auto-Scaling Classifier**
- Research: map task keywords/patterns to effort levels
- Build: keyword classifier in core skill or as a hook
- Keywords like "architecture", "security", "debug", "race condition" → high effort
- Keywords like "scaffold", "boilerplate", "rename", "format" → low effort
- Test: does it correctly escalate/de-escalate across varied prompts?

**2b. Dream Cycle Algorithm**
- Research: how to effectively promote, prune, reconcile, deduplicate memories
- Build: consolidation script that reads journal + knowledge base, outputs updated knowledge base
- Implement: promotion (patterns appearing 3+ times → knowledge), pruning (>14 days → archive), reconciliation (contradictions resolved by temporal weight + source confidence), deduplication
- Test: run on synthetic journal data, verify output quality
- Integration: trigger from `/consolidate` command and auto-trigger after every 5 sessions

**2c. Codebase Index**
- Research: tree-sitter for AST parsing, SQLite for storage
- Build: indexer that scans codebase, extracts file structure, function/class signatures, import relationships
- Store in `.ijfw/index/codebase.db`
- Implement incremental updates (file modification timestamps)
- Expose via scout agent: query the index instead of grep
- Test: index a real codebase, verify ~50 tokens per query vs ~2000 for grep
- Dependencies: tree-sitter (needs evaluation — can we use a lightweight alternative for Phase 2?)

**2d. SQLite FTS5 for Memory Server**
- Research: FTS5 full-text search in SQLite (built into Node.js better-sqlite3 or native)
- Build: add FTS5 index alongside markdown storage in memory server
- Improves search quality over current simple keyword matching
- Test: compare search results quality before/after

**2e. Self-Verification Enforcement**
- Build: rules for when self-verification is mandatory vs optional
- Destructive actions: always verify (already in core skill)
- Multi-file changes: verify consistency across files
- Security-sensitive code: run the architect's security checklist
- Integration: can be a PreToolUse hook that checks the tool being called

**2f. Auto-Generate CLAUDE.md**
- Build: the ijfw-summarize skill already has instructions, but needs the actual scanning logic
- Implement: read package.json/Cargo.toml/pyproject.toml, scan directory structure, detect patterns
- Output: max 50-line CLAUDE.md with stack, architecture, structure, patterns, key files
- Test: run on 5+ different project types, verify quality

### Phase 3 — Platform Polish

**3a. Marketplace Listings**
- Claude Code plugin marketplace submission
- NPM package publication (@ijfw/memory-server)
- Each platform's marketplace/registry where applicable

**3b. npx Installers**
- `npx ijfw init` — detect platform, copy appropriate config files, set up MCP server
- `npx ijfw init --claude` — Claude Code specific
- `npx ijfw init --codex` — Codex specific
- etc.

**3c. Three-Arm Benchmark Harness**
- Research: caveman's eval harness methodology (evals/ directory)
- Build: 10+ test tasks, measure tokens and quality across:
  - Arm 1: Baseline (normal agent, default settings)
  - Arm 2: Terse baseline ("answer concisely" — one line, no plugin)
  - Arm 3: IJFW (full system)
- This proves IJFW adds value beyond generic terseness
- Include: multi-file refactoring, long-session debugging, architecture planning, boilerplate generation

**3d. Platform-Specific Adaptations**
- Codex: adapt hooks to Codex hook system, test $ command syntax
- Gemini CLI: test MCP integration thoroughly, verify context file loading
- Cursor/Windsurf: verify MCP + rules coexistence
- Copilot: verify tools-only MCP limitation doesn't break memory server

### Phase 4 — Advanced

**4a. Vector Embedding Layer (Cold Storage)**
- Optional semantic search for memory
- Auto-detect embedding provider (OpenAI API key, Ollama embeddings, etc.)
- Falls back gracefully to keyword search if no provider configured

**4b. Token Usage Dashboard**
- `/ijfw-status` extended with cost tracking
- Tokens saved this session, this week, this month
- Model usage breakdown (how much went to Haiku vs Sonnet vs Opus)

**4c. Team Memory Sharing**
- Shared knowledge base across team members
- Git-based sync (knowledge.md committed to repo)
- Conflict resolution for concurrent edits

**4d. Custom Agent Creator**
- `/ijfw-create-agent` command
- Interview the user: name, purpose, model preference, tools needed
- Generate the agent markdown file automatically

---

## Research To Do

Before building Phase 2, research these topics:

1. **Tree-sitter integration options for Node.js** — can we use node-tree-sitter? Or is there a lighter alternative for structural indexing?

2. **SQLite FTS5 in Node.js** — better-sqlite3 vs node-sqlite3 for FTS5 support. Zero-dependency options?

3. **Claude Code hook system edge cases** — what happens when multiple plugins register hooks for the same event? Priority? Ordering? Conflicts?

4. **Compaction token budget** — verify the 5,000 tokens per skill / 25,000 combined re-attachment budget. Test with our actual skill set.

5. **MCP tool search behaviour** — on platforms with tool search (Claude Code), are our 4 tool schemas deferred or loaded upfront? Measure actual token cost.

6. **Cross-platform MCP protocol differences** — does Copilot's "tools only" limitation affect our memory server? Does Gemini's MCP implementation handle all our JSON-RPC messages?

7. **Effort level API access** — can a skill or hook actually SET the effort level programmatically? Or can it only recommend?

8. **The convergence cliff** — research complexity metrics that could detect when a codebase is approaching the point where AI changes cause cascading failures. Cyclomatic complexity? Coupling metrics? File change frequency?

---

## Key Files to Understand

If you're picking this up fresh, read these files in this order:

1. `CLAUDE.md` — project context (30 seconds)
2. `docs/DESIGN.md` — all architectural decisions (10 minutes)
3. `claude/skills/ijfw-core/SKILL.md` — the heart of the system (2 minutes)
4. `claude/hooks/scripts/session-start.sh` — the startup engine (5 minutes)
5. `mcp-server/src/server.js` — the cross-platform backbone (5 minutes)
6. `claude/agents/architect.md` — the quality/security guardrails (2 minutes)
7. `docs/README.md` — user-facing documentation (5 minutes)

---

## Non-Negotiable Constraints

1. **Core skill ≤ 55 lines.** If it needs more, it's a sub-skill that hot-loads.
2. **MCP server: 4 tools max.** Not 19. Not 22. Four.
3. **No proxy. No network interception. Ever.**
4. **Zero required external dependencies.** Core works with markdown + built-in SQLite.
5. **Positive framing only** in all user-facing output.
6. **Hot-load skills, don't pre-load.** Only ijfw-core is always-on.
7. **Defer to existing tools** (RTK, context-mode) when detected. Don't conflict.
8. **Every platform config must include MCP memory server setup.**

---

## Success Metrics

### Product Success
- Install count across all platforms
- GitHub stars
- Marketplace rating
- User retention (still active after 30 days)

### Efficiency Success
- Measurable token reduction vs baseline (target: 30%+ total session)
- Measurable cost reduction vs baseline (target: 40%+ when routing included)
- No measurable quality loss on task completion benchmarks
- User-reported "feels faster" / "feels smarter"

### Brand Success
- "IJFW" search volume growth
- Referral traffic to book / Sean Donahoe properties
- Cross-platform recognition ("I use IJFW for everything")

---

## Credits & Prior Art

IJFW builds on and credits:
- **caveman** (JuliusBrussee) — proved terse output works
- **claude-mem** (thedotmack) — pioneered persistent memory hooks
- **claude-router** (0xrdan) — proved model routing saves costs
- **Memorix** (AVIDS2) — cross-agent MCP memory concept
- **MemPalace** (Milla Jovovich & Ben Sigman) — structured memory metaphor
- **context-mode** (scottconverse) — PreToolUse interception, 98% context reduction
- **RTK** — deterministic tool output stripping
- **DCP** — dynamic context pruning
- **handoff** (thepushkarp) — structured session handoff
- **clauditor** — waste factor measurement, session rotation
- **AiDex** (CSCSoftware) — lightweight local code index
- **Claude Context MCP** (Zilliz) — semantic code search
- **Karpathy guidelines** (forrestchang) — think before coding, simplicity, surgical changes, goal-driven execution
- **Anthropic best practices** — session hygiene, verification loops, common mistake patterns
- **Superpowers** (Jesse Vincent) — Socratic brainstorming, subagent-driven development, composable skills
- **Get Shit Done / GSD** (TÂCHES) — spec-driven development, subagent isolation, quality gates, scope reduction detection

---

## The Workflow Layer (ijfw-workflow)

IJFW includes a universal project workflow skill that absorbs the best of Superpowers and GSD
while going further: domain-agnostic (works for code, content, business, design) and audited
at every stage against the Donahoe Principles.

### Six Stages: Discover → Research → Plan → Execute → Verify → Ship

Every stage transition has an audit gate. Audit gates check against specific Donahoe Principles.
Micro-audits fire after every task during execution. Phase-level audits at milestones.

### Key Differences from Superpowers/GSD:
- **Domain-agnostic**: same workflow for code, books, marketing, business strategy
- **Principle-based auditing**: checks against Donahoe's 22 principles, not just "do tests pass"
- **Integrated with IJFW memory**: decisions persist, learnings compound, dream cycle consolidates
- **Hot-loadable**: only loads when doing project-level work, zero cost otherwise
- **Cross-audit (Donahoe Quality Trident)**: generates audit docs for independent review in other AIs via shared MCP memory

### The Donahoe Principles as Audit Gates
The 22 principles from Sean Donahoe's "It Just Fucking Works" book are encoded as audit
criteria at every stage. The principles reference file lives at:
`claude/skills/ijfw-workflow/references/donahoe-principles.md`

### Cross-Platform Audit (Multi-AI Quality Trident)
The `/cross-audit` command generates a structured audit document with specific verification
questions. Stored in IJFW memory (shared via MCP). The user opens any other AI agent and says
"review the latest IJFW audit" — it pulls from shared memory. Disagreements between AIs are
flagged as the most valuable findings.

### The Book Connection
IJFW is the practical implementation of Sean Donahoe's "It Just Fucking Works" philosophy.
The book describes the principles. IJFW implements them. Using IJFW means automatically
following the book's framework because the audit gates enforce every principle. The book
validates the tool. The tool validates the book. Both demonstrate the philosophy.

---

*IJFW — "It Just Fucking Works" — By Sean Donahoe*
*One install. Zero config. Your AI just got smarter.*
