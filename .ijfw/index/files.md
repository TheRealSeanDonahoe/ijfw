<!-- ijfw schema:1 codebase-index -->
# Codebase index

Generated: 2026-04-14T04:33:52Z
Root: .

Files: 103

## By file

- `./.planning/archive/HANDOFF.md` (288 lines, .md) — IJFW is a unified AI efficiency framework. One install that makes any AI coding agent smarter, more efficient, gives it 
- `./.planning/archive/PHASE3-HANDOFF.md` (367 lines, .md) — 1. **`CLAUDE.md`** (this repo's root) — 30 sec, project conventions
- `./.planning/archive/SESSION-B-HANDOFF.md` (194 lines, .md) — 1. `.planning/phase3/PHASE3-PLAN.md` — **v2 post-audit plan** (canonical). All audit decisions baked in at the top.
- `./.planning/phase3/AUDIT.md` (131 lines, .md) — Date: 2026-04-14
- `./.planning/phase3/PHASE3-PLAN.md` (375 lines, .md) — Date: 2026-04-14
- `./.planning/phase3/PHASE3-VERIFICATION.md` (24 lines, .md) — Date: 2026-04-14
- `./.planning/phase3/research-benchmark-harness.md` (117 lines, .md) — Three-arm harness: (A) baseline Claude Code, (B) terse-only rules, (C) full IJFW. Goal: prove \"smarter not just cheaper
- `./.planning/phase3/research-codebase.md` (382 lines, .md) — The install script explicitly uses merge strategies for all platforms, never overwrites:
- `./.planning/phase3/research-npx-installer.md` (134 lines, .md) — Target: `npx @ijfw/install` → clones repo to `~/.ijfw`, runs `scripts/install.sh` to configure 6 AI agents, registers th
- `./.planning/phase3/research-prompt-improver.md` (104 lines, .md) — Date: 2026-04-14. Scope: landscape scan for IJFW deterministic prompt-improver hook across 6 agents.
- `./.planning/phase4/PHASE4-PLAN.md` (153 lines, .md) — > **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement each wave task-b
- `./.planning/phase4/WAVE0-PLAN.md` (895 lines, .md) — > **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-b
- `./.planning/phase4/WAVE0-VERIFICATION.md` (68 lines, .md) — | Audit ID | Item | Commit |
- `./.planning/phase4/WAVE1-PLAN.md` (107 lines, .md) — > **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`)
- `./CLAUDE.md` (36 lines, .md) — Stack: Node.js / Bash / Markdown
- `./claude/agents/architect.md` (34 lines, .md) — name: architect
- `./claude/agents/builder.md` (35 lines, .md) — name: builder
- `./claude/agents/scout.md` (19 lines, .md) — name: scout
- `./claude/commands/compress.md` (12 lines, .md) — name: compress
- `./claude/commands/consolidate.md` (87 lines, .md) — name: consolidate
- `./claude/commands/cross-audit.md` (31 lines, .md) — name: cross-audit
- `./claude/commands/doctor.md` (8 lines, .md) — description: \"Run IJFW health check (files, MCP server, hooks, memory, caps, framing)\"
- `./claude/commands/handoff.md` (14 lines, .md) — name: handoff
- `./claude/commands/metrics.md` (20 lines, .md) — name: ijfw-metrics
- `./claude/commands/mode.md` (25 lines, .md) — name: mode
- `./claude/commands/status.md` (61 lines, .md) — name: ijfw-status
- `./claude/commands/team.md` (16 lines, .md) — name: team
- `./claude/commands/workflow.md` (18 lines, .md) — name: workflow
- `./claude/hooks/scripts/post-tool-use.sh` (67 lines, .sh) — IJFW_DIR=\".ijfw\"
- `./claude/hooks/scripts/pre-compact.sh` (30 lines, .sh) — IJFW_DIR=\".ijfw\"
- `./claude/hooks/scripts/pre-prompt.sh` (86 lines, .sh) — if [ -d \"$HOME/.claude/plugins/cache/severity1-marketplace/prompt-improver\" ]; then
- `./claude/hooks/scripts/pre-tool-use.sh` (66 lines, .sh) — IJFW_DIR=\".ijfw\"
- `./claude/hooks/scripts/session-end.sh` (205 lines, .sh) — IJFW_DIR=\".ijfw\"
- `./claude/hooks/scripts/session-start.sh` (568 lines, .sh) — IJFW_DIR=\".ijfw\"
- `./claude/hooks/tests/test-wiring.sh` (32 lines, .sh) — set -euo pipefail
- `./claude/rules/ijfw-activate.md` (12 lines, .md) — name: ijfw-activate
- `./claude/skills/ijfw-commit/SKILL.md` (21 lines, .md) — name: ijfw-commit
- `./claude/skills/ijfw-compress/SKILL.md` (20 lines, .md) — name: ijfw-compress
- `./claude/skills/ijfw-core/SKILL.md` (53 lines, .md) — name: ijfw-core
- `./claude/skills/ijfw-handoff/SKILL.md` (40 lines, .md) — name: ijfw-handoff
- `./claude/skills/ijfw-metrics/SKILL.md` (90 lines, .md) — name: ijfw-metrics
- `./claude/skills/ijfw-review/SKILL.md` (17 lines, .md) — name: ijfw-review
- `./claude/skills/ijfw-summarize/SKILL.md` (45 lines, .md) — name: ijfw-summarize
- `./claude/skills/ijfw-team/SKILL.md` (165 lines, .md) — name: ijfw-team
- `./claude/skills/ijfw-workflow/references/donahoe-principles.md` (45 lines, .md) — Use this reference during audit gates. Check applicable principles per stage.
- `./claude/skills/ijfw-workflow/SKILL.md` (301 lines, .md) — name: ijfw-workflow
- `./codex/.codex/instructions.md` (35 lines, .md) — Active every response. No revert. No filler drift.
- `./copilot/copilot-instructions.md` (35 lines, .md) — Active every response. No revert. No filler drift.
- `./core/benchmarks/BENCHMARK-PLAN.md` (210 lines, .md) — Proves IJFW adds value beyond generic terseness.
- `./core/benchmarks/README.md` (59 lines, .md) — Measures cost/quality deltas between three arms:
- `./core/benchmarks/report.js` (90 lines, .js) — import { readFileSync } from 'node:fs';
- `./core/benchmarks/run.js` (131 lines, .js) — import { spawnSync } from 'node:child_process';
- `./core/benchmarks/tasks/01-bug-paginator/README.md` (5 lines, .md) — A Python paginator in `paginate.py` returns the wrong page count when the total
- `./core/benchmarks/tasks/01-bug-paginator/repo/paginate.py` (5 lines, .py) — def page_count(total, page_size):
- `./core/benchmarks/tasks/01-bug-paginator/tests/hidden/test_paginate.py` (15 lines, .py) — import sys, os
- `./core/benchmarks/tasks/01-bug-paginator/verify.sh` (4 lines, .sh) — set -euo pipefail
- `./core/benchmarks/tasks/07-refactor-dedupe/README.md` (5 lines, .md) — `utils.py` has three near-identical functions that each deduplicate a list
- `./core/benchmarks/tasks/07-refactor-dedupe/repo/app.py` (5 lines, .py) — from utils import dedupe_ints, dedupe_strs, dedupe_tuples
- `./core/benchmarks/tasks/07-refactor-dedupe/repo/utils.py` (20 lines, .py) — def dedupe_ints(xs):
- `./core/benchmarks/tasks/07-refactor-dedupe/tests/hidden/test_app.py` (7 lines, .py) — import sys, os
- `./core/benchmarks/tasks/07-refactor-dedupe/verify.sh` (4 lines, .sh) — set -euo pipefail
- `./core/benchmarks/tasks/10-explore-ratelimit/README.md` (5 lines, .md) — The repo in `repo/` contains multiple Python files. One of them implements a
- `./core/benchmarks/tasks/10-explore-ratelimit/repo/auth.py` (1 lines, .py) — def verify_token(t): return bool(t and len(t) > 16)
- `./core/benchmarks/tasks/10-explore-ratelimit/repo/db.py` (1 lines, .py) — def connect(url): return {\"url\": url, \"ok\": True}
- `./core/benchmarks/tasks/10-explore-ratelimit/repo/limits.py` (17 lines, .py) — import time
- `./core/benchmarks/tasks/10-explore-ratelimit/verify.sh` (8 lines, .sh) — set -euo pipefail
- `./core/benchmarks/tasks/11-memory-store/README.md` (5 lines, .md) — Remember the following fact for later retrieval: **\"The canary word for this
- `./core/benchmarks/tasks/11-memory-store/verify.sh` (5 lines, .sh) — set -euo pipefail
- `./core/benchmarks/tasks/12-memory-recall/README.md` (5 lines, .md) — In a prior session you were told a canary word. Retrieve it from IJFW memory
- `./core/benchmarks/tasks/12-memory-recall/verify.sh` (5 lines, .sh) — set -euo pipefail
- `./core/benchmarks/verify.sh` (13 lines, .sh) — set -euo pipefail
- `./docs/DESIGN.md` (318 lines, .md) — This document captures all architectural decisions made during the design phase,
- `./docs/README.md` (174 lines, .md) — One install. Zero config. Makes your AI coding agent smarter, more efficient, and gives it persistent memory across sess
- `./gemini/GEMINI.md` (35 lines, .md) — Active every response. No revert. No filler drift.
- `./installer/README.md` (47 lines, .md) — One-command installer for [IJFW](https://github.com/TradeCanyon/ijfw) — the AI
- `./installer/src/install.js` (157 lines, .js) — import { spawnSync } from 'node:child_process';
- `./installer/src/marketplace.js` (61 lines, .js) — import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
- `./installer/src/uninstall.js` (72 lines, .js) — import { existsSync, rmSync, cpSync, mkdtempSync } from 'node:fs';
- `./installer/test-resilient-parse.js` (72 lines, .js) — import { test } from 'node:test';
- `./installer/test-tagged-release.js` (38 lines, .js) — import { test } from 'node:test';
- `./installer/test.js` (111 lines, .js) — import { test } from 'node:test';
- `./mcp-server/src/caps.js` (37 lines, .js) — export const CAP_CONTENT = 4096;
- `./mcp-server/src/prompt-check.js` (131 lines, .js) — const RULES = [
- `./mcp-server/src/redactor.js` (61 lines, .js) — const PATTERNS = [
- `./mcp-server/src/schema.js` (20 lines, .js) — import { existsSync, readFileSync, writeFileSync } from 'node:fs';
- `./mcp-server/src/server.js` (1053 lines, .js) — import { createInterface } from 'readline';
- `./mcp-server/test-metrics-v3.js` (90 lines, .js) — import { test } from 'node:test';
- `./mcp-server/test-redactor.js` (116 lines, .js) — import { test } from 'node:test';
- `./mcp-server/test-schema-version.js` (50 lines, .js) — import { test } from 'node:test';
- `./mcp-server/test-size-caps.js` (97 lines, .js) — import assert from 'node:assert/strict';
- `./mcp-server/test.js` (672 lines, .js) — import { spawn } from 'child_process';
- `./NO_TELEMETRY.md` (74 lines, .md) — metric, every auto-extracted lesson stays on your machine unless you
- `./PHASE4-HANDOFF.md` (64 lines, .md) — | Item | Commit family | Landed |
- `./PROJECT-INSTRUCTIONS.md` (502 lines, .md) — IJFW (\"It Just Fucking Works\") is a unified AI efficiency framework by Sean Donahoe. One install that makes any AI cod
- `./README.md` (162 lines, .md) — One install. Zero config. Makes your AI coding agent smarter, more efficient, and gives it persistent memory across sess
- `./scripts/build-codebase-index.sh` (81 lines, .sh) — IJFW_DIR=\".ijfw\"
- `./scripts/check-all.sh` (33 lines, .sh) — set -u
- `./scripts/check-line-caps.sh` (42 lines, .sh) — set -u
- `./scripts/check-mcp.sh` (25 lines, .sh) — LAUNCHER=\"${1:-}\"
- `./scripts/check-positive-framing.sh` (80 lines, .sh) — set -u
- `./scripts/doctor.sh` (66 lines, .sh) — set -u
- `./scripts/install.sh` (164 lines, .sh) — set -u
- `./universal/ijfw-rules.md` (18 lines, .md) — Active every response. No revert. No filler drift. Off: \"ijfw off\" / \"normal mode\".

## By language
- .md: 57
- .sh: 20
- .js: 18
- .py: 8
