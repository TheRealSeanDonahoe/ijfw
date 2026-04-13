# IJFW — Claude Code Project Handoff
## "It Just Fucking Works" — By Sean Donahoe
## Status: Phase 1 Complete. Ready for Integration Testing.

---

## What This Is

IJFW is a unified AI efficiency framework. One install that makes any AI coding agent smarter, more efficient, gives it persistent memory across sessions and platforms, and includes a full project workflow system with quality auditing at every stage.

It ships as a Claude Code plugin (full featured) plus platform configs for Codex, Gemini CLI, Cursor, Windsurf, Copilot, and a universal rules file for any agent. A cross-platform MCP memory server connects all platforms.

**This isn't a cost-cutting tool. It's an intelligence allocation system.**

---

## How to Set Up This Project

### Step 1: Create the repo

```bash
mkdir ijfw && cd ijfw
git init
```

### Step 2: Unzip the build

The zip file `ijfw-project.zip` contains everything. The contents are inside an `ijfw/` directory:

```bash
unzip ijfw-project.zip
mv ijfw/* .
mv ijfw/.* . 2>/dev/null || true
rmdir ijfw
```

### Step 3: Verify

```bash
# Check structure
ls claude/ codex/ gemini/ cursor/ windsurf/ copilot/ universal/ mcp-server/ docs/

# Run the test suite
node mcp-server/test.js
# Should see: Results: 23/23 passed, 0 failed

# Check the project context
cat CLAUDE.md
```

### Step 4: Install as a Claude Code plugin for testing

```bash
# From the project root
claude --plugin-dir ./claude
```

Or for persistent install:
```bash
# Copy to user plugins
cp -r claude ~/.claude/plugins/ijfw
```

---

## What's Built (51 Files)

### Claude Code Plugin (Full Featured)
```
claude/
├── .claude-plugin/plugin.json          # Plugin manifest
├── skills/
│   ├── ijfw-core/SKILL.md              # ALWAYS-ON (51 lines) — output rules, routing, quality gates
│   ├── ijfw-workflow/SKILL.md          # HOT-LOAD — dual-mode project workflow + Donahoe audits
│   ├── ijfw-workflow/references/
│   │   └── donahoe-principles.md       # 22 principles quick reference for audit gates
│   ├── ijfw-team/SKILL.md              # HOT-LOAD — dynamic project team generation
│   ├── ijfw-metrics/SKILL.md           # HOT-LOAD — session tracking and efficiency reporting
│   ├── ijfw-commit/SKILL.md            # HOT-LOAD — terse conventional commits
│   ├── ijfw-review/SKILL.md            # HOT-LOAD — one-line code reviews
│   ├── ijfw-compress/SKILL.md          # HOT-LOAD — file compression
│   ├── ijfw-handoff/SKILL.md           # HOT-LOAD — session handoff
│   └── ijfw-summarize/SKILL.md         # HOT-LOAD — auto-generate project context
├── hooks/
│   ├── hooks.json                      # Event → script mapping (uses ${CLAUDE_PLUGIN_ROOT})
│   └── scripts/
│       ├── session-start.sh            # Detection, migration, memory, startup report
│       ├── pre-compact.sh              # Decision preservation before compaction
│       ├── pre-tool-use.sh             # Deterministic input stripping (defers to RTK/context-mode)
│       └── session-end.sh              # Metrics, journal, handoff, dream cycle trigger
├── commands/
│   ├── mode.md                         # /mode smart|fast|deep|manual
│   ├── workflow.md                     # /workflow [discover|plan|execute|verify|ship|status]
│   ├── team.md                         # /team [setup|list|add|remove|swap]
│   ├── cross-audit.md                  # /cross-audit — Multi-AI Quality Trident
│   ├── compress.md                     # /compress <filepath>
│   ├── status.md                       # /ijfw-status — mode, routing, memory, metrics
│   ├── handoff.md                      # /handoff [create|resume]
│   └── consolidate.md                  # /consolidate — dream cycle
├── agents/
│   ├── scout.md                        # Haiku, low effort — exploration, reads, search
│   ├── builder.md                      # Sonnet, medium effort — implementation
│   └── architect.md                    # Opus, high effort — architecture, security, debug
└── rules/
    └── ijfw-activate.md                # Auto-activation rule
```

### MCP Memory Server
```
mcp-server/
├── package.json                        # Zero dependencies
├── src/server.js                       # 4 MCP tools, JSON-RPC over stdio, 509 lines
└── test.js                             # 23-test smoke test suite — ALL PASSING
```

### Platform Configs (6 + universal)
```
codex/.codex/config.toml + instructions.md
gemini/.gemini/settings.json + GEMINI.md
cursor/.cursor/mcp.json + .cursorrules
windsurf/mcp_config.json + .windsurfrules
copilot/.vscode/mcp.json + copilot-instructions.md
universal/ijfw-rules.md (16 lines, paste anywhere)
```

### Docs & Support Files
```
CLAUDE.md                               # Project context for THIS repo
README.md                               # User-facing documentation
LICENSE                                  # MIT
.ijfw-gitignore                         # Template for user projects
PROJECT-INSTRUCTIONS.md                 # Full build instructions (previous version)
docs/README.md                          # Canonical README
docs/DESIGN.md                          # All architectural decisions
core/benchmarks/BENCHMARK-PLAN.md       # 14-task three-arm benchmark design
```

---

## Three Design Principles (Apply to Every Decision)

1. **Rory Sutherland** — Position as "smarter" not "cheaper." All user-facing output is positive framing only. No negatives, no "not found," no diagnostics. Wow factor.

2. **Steve Krug** — Don't make me think. Zero config. Smart defaults. One concept: mode. If something's missing, create it silently. Don't ask permission for safe actions.

3. **Sean Donahoe** — It just fucking works. One install. Works on session one. Auto-detects environment. No dependencies required.

---

## Key Architecture Decisions

### No Proxy
IJFW never intercepts network traffic. Configures behaviour, not infrastructure. Works on any billing setup.

### Auto-Detection
SessionStart detects OpenRouter, Claude Code Router, Ollama, LM Studio, DeepSeek — silently uses what's available, gracefully falls back to native provider.

### Plugin Migration
First run detects claude-mem, memsearch, MemPalace, Memorix, RTK, context-mode, caveman. Imports data where possible, defers to existing tools where they're more mature, coexists silently where there's no conflict.

### Startup Report (Sutherland UX)
Positive only. "Memory loaded (34 decisions)" not "Loading memory file..." "Upgraded thinking depth" not "Warning: effort was medium."

### MCP Memory — 4 Tools Only
`ijfw_memory_recall`, `ijfw_memory_store`, `ijfw_memory_search`, `ijfw_memory_status`. Not 19. Not 22. Four.

### Hot-Loading
Only `ijfw-core` is always-on (51 lines). Everything else loads when triggered, unloads when done.

### Dual-Mode Workflow
**Quick** (Superpowers-style): brainstorm → quick plan → execute → done check. 5 minutes.
**Deep** (GSD-style): discover → research → plan → execute → verify → ship. Full project management with state in `.ijfw/projects/`.

### Dynamic Team Generation
Workflow generates project-specific agents during Discovery. Software project → architect, senior-dev, qa, security. Novel → story-architect, world-builder, lore-master, prose-stylist. Any domain supported.

### Donahoe Principles Audit Gates
Every workflow stage transition audits against specific principles from the 22 Donahoe Principles. Micro-audits after every task during execution.

### Cross-Audit (Multi-AI Quality Trident)
`/cross-audit` generates a structured audit document stored in MCP memory. User opens Gemini/Codex/another AI and says "review the latest IJFW audit." Disagreements between AIs are the most valuable findings.

### Metrics Tracking
Session-end hook writes JSONL metrics. `/ijfw-status` shows cumulative efficiency data: routing savings, memory accumulation, session continuity rate.

---

## What to Test First

### 1. Basic Plugin Loading
```bash
claude --plugin-dir ./claude
# Should see IJFW startup report
# Type: /help — should list IJFW commands
```

### 2. Core Skill Behaviour
```bash
# Ask a simple question — should get terse response
# Ask "explain why X" — should get normal verbosity
# Try a destructive action — should get clarity override
```

### 3. MCP Memory Server
```bash
# Test standalone
node mcp-server/test.js

# Test in Claude Code
claude mcp add ijfw-memory -- node mcp-server/src/server.js
# Then: "remember that we chose PostgreSQL for the database"
# New session: "what database are we using?"
```

### 4. Mode Switching
```bash
# /mode fast — should get ultra-terse
# /mode deep — should get thorough with self-verification
# /mode smart — should auto-adapt
```

### 5. Workflow
```bash
# "Help me build a REST API for a todo app"
# Should trigger Discovery → ask questions → propose plan
# /workflow status — should show current stage
```

### 6. Hook Scripts
```bash
# Test session-start standalone:
bash claude/hooks/scripts/session-start.sh

# Check for errors, verify startup report format
# Test with Ollama running vs not running
```

---

## What Needs Building Next (Phase 2)

| Item | Priority | Effort |
|------|----------|--------|
| Effort auto-scaling keyword classifier | High | Medium |
| Dream cycle consolidation algorithm | High | Medium |
| Codebase index (SQLite + tree-sitter) | High | High |
| SQLite FTS5 warm layer for memory server | Medium | Medium |
| Self-verification enforcement hooks | Medium | Low |
| Auto-generate CLAUDE.md scanning logic | Medium | Medium |
| npx installer scripts per platform | Medium | Medium |
| Three-arm benchmark harness (automated) | Low | Medium |

---

## Known Constraints

- Core skill must stay ≤55 lines
- MCP server: 4 tools max
- No proxy, no network interception, ever
- Zero required external dependencies
- Positive framing only in all user-facing output
- Hot-load everything except core skill
- Defer to RTK/context-mode when detected
- Every platform config must include MCP memory server setup
- `.ijfw/` is the portable project directory

---

## Files to Read First (In Order)

1. `CLAUDE.md` — 30 seconds. Project context.
2. `claude/skills/ijfw-core/SKILL.md` — 2 minutes. The heart.
3. `claude/hooks/scripts/session-start.sh` — 5 minutes. The engine.
4. `mcp-server/src/server.js` — 5 minutes. The backbone.
5. `claude/skills/ijfw-workflow/SKILL.md` — 5 minutes. The workflow.
6. `claude/agents/architect.md` — 2 minutes. The quality guardrails.
7. `docs/DESIGN.md` — 10 minutes. Every architectural decision.

---

## Audit Status

All 26 audit checks passing. All 23 MCP server tests passing. Key fixes applied:
- `require('fs')` ESM bug that broke all memory reads — fixed
- `${CLAUDE_PLUGIN_ROOT}` correct variable in hooks — fixed
- MCP protocol compliance (resources/list, prompts/list) — fixed
- Input validation, crash protection, size limits — all added
- Curl timeouts, sqlite3 availability, stdin limits — all hardened

---

## The Big Picture

IJFW is the practical implementation of Sean Donahoe's "It Just Fucking Works" philosophy. The book describes the 22 principles. IJFW implements them as audit gates. Using IJFW means automatically following the book's framework.

The Donahoe Loop: **BUILD → AUDIT → FIX → SHIP → MEASURE → REPEAT**

This plugin IS the loop, made executable.

---

*IJFW — "It Just Fucking Works" — By Sean Donahoe*
*One install. Zero config. Your AI just got smarter.*
