# IJFW — Phase 3 Handoff
## "It Just Fucking Works" — by Sean Donahoe
## Date: 2026-04-14
## Status: Phase 1 + Phase 2 shipped + battle-tested. Phase 3 ready to begin.

---

## Read-First Order (15 min total)

1. **`CLAUDE.md`** (this repo's root) — 30 sec, project conventions
2. **`HANDOFF.md`** — original Phase 1 handoff, historical context
3. **`docs/DESIGN.md`** — architectural decisions
4. **This file** — what was shipped + what's next
5. **All memories under `~/.claude/projects/-Users-seandonahoe-dev-ijfw/memory/`** — these capture every decision, design rationale, deferred item, and constraint accumulated across the build. Read MEMORY.md first.

---

## Where We Are

### Plumbing (proven end-to-end)
- **MCP memory server**: 5 tools (`recall`, `store`, `search`, `status`, `prelude`). 40/40 tests passing.
- **Cross-platform memory**: stored in Claude → readable by Gemini → readable by Codex (proven during Phase 2 testing in `~/dev/openclaw`).
- **Native auto-memory bridge**: IJFW MCP reads Claude Code's `~/.claude/projects/<encoded>/memory/*.md` and surfaces those entries to all platforms via `ijfw_memory_prelude` and `ijfw_memory_search`.
- **Plugin auto-registers MCP server** via `claude/.mcp.json` — no manual `claude mcp add` step needed.
- **Installer merges configs** instead of overwriting. `~/.codex/`, `~/.gemini/`, etc. configs preserved with backups.
- **All 6 platforms wired**: Claude Code (full plugin), Codex, Gemini CLI, Cursor (legacy `.cursorrules` + new `.cursor/rules/ijfw.mdc`), Windsurf, Copilot, plus universal paste-anywhere rules file.

### Intelligence layer (active)
- **Terse output rules** (caveman-style) — always-on in `ijfw-core` skill (53/55 lines, hard-capped)
- **Smart routing** — scout (Haiku) / builder (Sonnet) / architect (Opus) agents. Dispatch by task type.
- **Effort auto-scaler** — keyword classifier in core skill: high for security/architecture/debug/refactor/migration; low for scaffold/rename/format/docs.
- **Context discipline** — line ranges, no re-reads, defer to RTK/context-mode if installed.
- **Quality gates** — assumptions, surgical changes, verify-before-destructive, plan-then-implement, transform-to-verifiable-goals, 2-correction stop rule.
- **Self-verify hook** (PreToolUse) — detects rm -rf / git --force / git reset --hard / DROP / TRUNCATE / DELETE-without-WHERE / fork bomb / chmod 777 / npm publish before execution.
- **Tool output stripping** (PostToolUse) — ANSI codes, test noise, npm/pip noise, Docker layer hashes, etc.
- **Auto-CLAUDE.md generation** — first session on any new repo creates a rich CLAUDE.md from deterministic scan (stack, test cmd, lint, dirs, config files) + managed IJFW memory block.
- **Codebase index MVP** — text-based `.ijfw/index/files.md` with path/lang/size/first-line, rebuilt incrementally on session-start in background.
- **Dream cycle** (`/consolidate`) — promotes patterns crossing 3+ refs / 2+ sessions to knowledge base, reconciles contradictions (mark superseded, never delete), prunes >14-day stale entries, compresses dedups, optional cross-project facet promotion.
- **Faceted global memory** — `~/.ijfw/memory/global/{preferences,patterns,stack,anti-patterns,lessons}.md` with per-project namespace.

### Workflow + audit layer (active)
- **`ijfw-workflow` skill** — dual mode (Quick = Superpowers-style, Deep = GSD-style with `.ijfw/projects/<name>/` state).
- **`ijfw-team` skill** — dynamic project-specific agent generation (lore-master/CTO/junior-dev/etc.).
- **Donahoe 22 Principles audit gates** — between every workflow stage. Reference at `claude/skills/ijfw-workflow/references/donahoe-principles.md`.
- **Cross-audit Trident** (`/cross-audit`) — generates structured audit doc to MCP memory; user opens another AI and says "review the latest IJFW audit."
- **Hot-loadable skills**: `ijfw-commit`, `ijfw-review`, `ijfw-compress`, `ijfw-handoff`, `ijfw-summarize`. Load on trigger, unload after.

### CI guards (always run before commit)
- `bash scripts/check-all.sh` runs all of:
  - 40/40 MCP server tests
  - Hook syntax (bash -n on all 5 hooks)
  - JSON validity (plugin.json, marketplace.json, .mcp.json, hooks.json, all 4 platform MCP configs)
  - Line caps (`ijfw-core/SKILL.md` ≤55, `universal/ijfw-rules.md` ≤20)
  - Positive-framing grep (no "Warning:" / "Error:" / "Failed to" / "not found" in user-facing output)
  - MCP launcher health probe

### Known Claude Code platform issue (NOT IJFW bug)
- **SessionStart hook banner doesn't render visibly** in current Claude Code. Confirmed broken for `claude-mem` too. Our hook correctly emits `hookSpecificOutput.systemMessage` AND `additionalContext`, both per spec — Claude Code just isn't surfacing the systemMessage. When Claude Code restores it, banner appears with no code change.
- Workaround: enhanced `/ijfw-status` command renders the banner-equivalent content as a fenced code block on demand. Use that.

---

## Critical Conventions (NEVER violate)

1. **Positive framing** — every user-facing surface must show value delivered, not problems found. No "Warning:" / "Error:" / "missing" / "not found" / "failed to" in any banner, command output, or hook stdout. Enforced by `scripts/check-positive-framing.sh`. See memory `feedback_positive_framing_sacred.md`.

2. **No proxy, ever** — IJFW configures behaviour, never network infrastructure. Detect tools (OpenRouter / CCR / Ollama / LM Studio) via env vars + localhost ports, route directly. Never intercept. See memory `project_no_proxy_rule.md`.

3. **Hot-load discipline** — only `ijfw-core` is always-on. Everything else materializes on trigger, evaporates after. Core skill HARD CAPPED at 55 lines.

4. **Migration philosophy** — when detecting existing plugins (claude-mem, RTK, MemPalace, etc.): absorb / coexist / defer / never force uninstall. See memory `feedback_migration_philosophy.md`.

5. **Donahoe Loop is audit-between-every-stage** — NOT linear. Brainstorm → AUDIT → Plan → AUDIT → Build → AUDIT → Ship → AUDIT → Measure → AUDIT → loop. Each gate checks specific principles by number. See memory `project_donahoe_loop.md`.

6. **Cross-audit is a graduated offer** — at every audit gate, mode-dependent. Smart mode = always offer; auto mode = offer at critical gates only. Single keystroke. See memory `project_cross_audit_ux.md`.

7. **3 memory tiers, not more** — working / project / global. Phase 2 shipped faceted global. Team tier deferred to Phase 3.

8. **No proxy / no API interception** — repeated for emphasis. This is non-negotiable.

---

## Critical Gotchas (real bugs we hit)

1. **Plugin cache is at `~/.claude/plugins/cache/ijfw/ijfw/1.0.0/`**, NOT `~/.ijfw/claude/`. Edits to `~/.ijfw/` don't propagate automatically. Use `rsync -a --delete /Users/seandonahoe/dev/ijfw/claude/ ~/.claude/plugins/cache/ijfw/ijfw/1.0.0/` after edits, or `/plugin uninstall ijfw && /plugin install ijfw`.

2. **Claude Code hook schema is nested** — each event entry needs its own `hooks: [...]` array inside the matcher object. Plain `{type, command}` at the top level fails validation:
```json
"SessionStart": [{ "hooks": [{"type":"command","command":"...","timeout":15000}] }]
```

3. **PreToolUse fires BEFORE the tool call** (input visible), **PostToolUse fires AFTER** (output visible). I had them swapped initially. Verify-before-destructive lives in PreToolUse.

4. **`${IJFW_HOME}` doesn't shell-expand** in MCP client config args arrays (Cursor/Gemini/Windsurf/Copilot). Solution shipped: `scripts/install.sh` substitutes the absolute path at install time. The plugin's `.mcp.json` uses `${CLAUDE_PLUGIN_ROOT}` which Claude Code DOES expand.

5. **`require('fs')` inside ESM module silently throws** — every read returned null before this was found. All file ops in `mcp-server/src/server.js` use ESM `import`.

6. **macOS bash 3.2** — no `[[ ... ]]`, no `(())` arithmetic, no associative arrays, no array-defaults syntax. Used POSIX `case` statements + file-based state instead.

7. **Atomic writes** — `mcp-server/src/server.js` uses write-tmp-then-rename. Append-only for journal/knowledge avoids the read-modify-write race. Two parallel sessions on the same project are safe.

8. **Sanitizer must strip 4+ heading hashes, fences, HTML, control chars, bidi, multi-line** — not just 1-3 hashes. Stored content gets re-injected on next session, so it's a prompt-injection vector. See `sanitizeContent()` in server.js.

9. **Per-project namespacing in global memory** prevents cross-project worming via stored preferences. Lines tagged `[ns:<sha256-12-of-project-path>]`, filtered on read.

10. **Native Claude memory project encoding**: `/Users/foo/dev/bar` → `~/.claude/projects/-Users-foo-dev-bar/memory/`. IJFW reads this dir per-project.

---

## Quick verify the install is healthy (run this first in next session)

```bash
cd /Users/seandonahoe/dev/ijfw
bash scripts/check-all.sh
# Expect: 40/40 MCP tests, JSON valid, hooks syntax OK, line caps OK,
# positive framing clean, MCP launcher healthy, "All checks passed."

# Also verify cache is current:
md5 claude/hooks/scripts/session-start.sh \
    ~/.claude/plugins/cache/ijfw/ijfw/1.0.0/hooks/scripts/session-start.sh
# Both hashes must match. If not, rsync from claude/ to cache.
```

---

## Phase 3 — Work Queue (priority order)

### 1. Cross-project memory search (HIGH IMPACT, ~2 hrs)

User hit this gap during Phase 2 testing. Asked "what were we using for Waylander?" from a project that wasn't openclaw — IJFW returned nothing because per-project isolation. Claude eventually surfaced it via its own native cross-project memory after multiple retries.

**Implementation:**
- `~/.ijfw/registry.md` — append `<absolute-path> | <sha256-12-hash> | <first-seen-iso>` on every session-start of a new project. Skip if path already listed.
- Add `scope: 'project' | 'all'` arg to `ijfw_memory_search` tool. Default: `'project'`.
- When `scope: 'all'`: walk registry, for each entry read that project's `.ijfw/memory/{knowledge,project-journal,handoff}.md`, run keyword search, return results tagged `[project:<basename>] <content>`.
- `ijfw_memory_recall` could grow `from_project: '<path-or-hash>'` for explicit cross-project pull.
- Privacy: registry is in `~/.ijfw/` (gitignore), per-project memory IS committed (`.ijfw/memory/knowledge.md` is git-friendly).

**Reference memory:** `project_cross_project_search.md`

### 2. Prompt-improver hook (MEDIUM, ~2 hrs)

User has an external prompt-improver hook installed and wants IJFW-native version. Catches vague prompts (bare verbs without object, unqualified demonstratives, abstract goals without scope) before agent guesses.

**Implementation:**
- New `claude/hooks/scripts/pre-prompt.sh` registered as UserPromptSubmit hook.
- Deterministic pattern detection only (no LLM calls):
  - Bare action verbs: `^(refactor|fix|clean up|optimize|improve|change)\b` without an object
  - Unqualified demonstratives: `\b(this|that|it|these|those)\b` without referenced antecedent in conversation
  - Abstract goals: "make it better", "fix the issue" without specifics
- On flag, inject `<ijfw-clarify>` block with 2-4 sharp questions (not open-ended — minimum needed to disambiguate).
- Override keywords: `ijfw off`, `just do it` → bypass.
- Domain-aware where possible: if `.ijfw/index/files.md` exists and prompt mentions a generic term that matches multiple files, ask WHICH.

**Reference memory:** `project_prompt_improver_phase3.md`

### 3. Plugin merge for installer (MEDIUM, ~1 hr)

Already done for Codex/Gemini in Phase 2 Batch 1. Good shape — re-verify Cursor/Windsurf/Copilot also merge correctly (not just append).

### 4. npx installer (~3 hrs)

`npx @ijfw/install` should clone the repo to `~/.ijfw`, run `scripts/install.sh`, register the Claude Code marketplace entry. One command from cold.

**Implementation:**
- Tiny `installer/` package published to npm
- `package.json` with bin entry and dependency on git via simple shell-out
- `installer/index.js` clones → runs install.sh → prints success
- Publish to npm under `@ijfw/install`

### 5. Three-arm benchmark harness (~4 hrs)

Already specced in `core/benchmarks/BENCHMARK-PLAN.md`. Build the runner.

**Implementation:**
- `core/benchmarks/run.js` — drives 14 reproducible tasks through 3 arms (baseline / terse-only / IJFW)
- Captures: input tokens, output tokens, total cost, time, completion accuracy
- Reports as markdown table + raw JSONL
- Validates the "smarter, not just cheaper" pitch with real numbers

### 6. Token usage dashboard (~2 hrs)

`/ijfw-metrics` command. Reads `.ijfw/metrics/sessions.jsonl` (already populated by session-end hook), aggregates over time, shows cumulative routing savings, memory accumulation, session continuity rate.

### 7. SQLite FTS5 warm layer (~3 hrs) — DEFER until needed

Currently linear scan of markdown is <10ms at <500 entries. Trigger this when global memory > 1000 entries OR user reports slow search. See memory `project_fts5_deferred.md` for design notes.

### 8. Team memory tier (~4 hrs)

`.ijfw/team/` committed alongside project memory. PR-reviewed conventions shared across team. Distinct from `.ijfw/memory/` (personal) and `~/.ijfw/memory/global/` (per-user cross-project).

### 9. Optional semantic vector search (~6 hrs)

Stretch. Plug Ollama embeddings if available. Conceptual queries when keyword search misses.

---

## Files Modified Across Phase 1 + 2 (high-level)

```
mcp-server/
├── package.json                    # bin entry + version 1.1.0
├── bin/ijfw-memory                 # NEW launcher (resolves server.js anywhere)
├── src/server.js                   # rewritten — atomic writes, sanitizer, prelude tool, native bridge, faceted global
└── test.js                         # 40 tests covering all the above

claude/
├── .claude-plugin/
│   ├── plugin.json                 # author obj format, valid
│   └── marketplace.json            # NEW — plugins[] entry
├── .mcp.json                       # NEW — auto-registers ijfw-memory MCP
├── bin/ijfw-memory                 # NEW — plugin-internal launcher (resolves via CLAUDE_PLUGIN_ROOT)
├── hooks/
│   ├── hooks.json                  # nested-matcher format, 5 events wired
│   └── scripts/
│       ├── session-start.sh        # banner-first, parallel probes, lockfile migration, sanitised imports, auto-CLAUDE.md, codebase index trigger
│       ├── session-end.sh          # JSONL via node -e (no string injection), TZ=UTC fallback, schema-versioned
│       ├── pre-tool-use.sh         # tool OUTPUT stripping (registered as PostToolUse)
│       ├── post-tool-use.sh        # destructive-pattern self-verify (registered as PreToolUse)
│       └── pre-compact.sh          # decision preservation
├── skills/
│   ├── ijfw-core/SKILL.md          # 53/55 lines — output, verbosity, context, memory, routing+effort, quality gates, clarity override
│   ├── ijfw-workflow/              # dual-mode + audit gates + 22 principles ref
│   ├── ijfw-team/                  # dynamic agent generation
│   ├── ijfw-summarize/             # CLAUDE.md generation skill
│   ├── ijfw-commit/                # terse commits
│   ├── ijfw-review/                # one-line review
│   ├── ijfw-compress/              # file compression
│   └── ijfw-handoff/               # session handoff
├── agents/
│   ├── scout.md                    # haiku, low effort
│   ├── builder.md                  # sonnet, medium
│   └── architect.md                # opus, high
├── commands/
│   ├── status.md                   # Phase 2 Batch 2 enhanced — full state render
│   ├── consolidate.md              # full dream-cycle algorithm
│   ├── workflow.md
│   ├── team.md
│   ├── cross-audit.md
│   ├── compress.md
│   ├── handoff.md
│   └── mode.md
└── rules/
    └── ijfw-activate.md

scripts/
├── install.sh                      # MERGES configs (TOML for Codex, JSON for others), backups timestamped
├── build-codebase-index.sh         # NEW — text index of source files
├── check-all.sh                    # CI gateway
├── check-mcp.sh                    # MCP launcher health
├── check-line-caps.sh              # ijfw-core ≤55, universal ≤20
└── check-positive-framing.sh       # CI for negative-phrase blocklist

codex/.codex/
├── config.toml                     # IJFW_LAUNCHER_PATH placeholder, substituted by install.sh
└── instructions.md                 # MOVED inside .codex/ (was outside)

gemini/.gemini/settings.json        # IJFW_LAUNCHER_PATH placeholder
gemini/GEMINI.md                    # rules + prelude-tool instruction

cursor/
├── .cursor/mcp.json                # IJFW_LAUNCHER_PATH placeholder
├── .cursor/rules/ijfw.mdc          # NEW — modern Cursor Project Rules
└── .cursorrules                    # Legacy fallback

windsurf/
├── mcp_config.json                 # IJFW_LAUNCHER_PATH placeholder + correct mcpServers key
└── .windsurfrules

copilot/
├── .vscode/mcp.json                # IJFW_LAUNCHER_PATH placeholder
└── copilot-instructions.md

universal/ijfw-rules.md             # 18/20 lines — paste-anywhere
```

---

## How to Test Phase 1 + 2 Still Works (Smoke Test)

In Claude Code, in `/Users/seandonahoe/dev/openclaw`:
1. `/ijfw-status` — should render full status block
2. Ask "what are we using for the database?" — should answer "PostgreSQL" from memory immediately, no search cascade
3. `/consolidate` — should report "Knowledge base: 2 entries (stable). No patterns met threshold."
4. Ask Claude to `rm -rf /tmp/safe-test` — should ask for confirmation before executing (PreToolUse self-verify)
5. Open `~/dev/aion` (or any other project) — `/ijfw-status` should show that project's separate `.ijfw/memory/` (or "Fresh project" if none)

In Gemini CLI in `openclaw/`:
1. Ask "what are we using as a replacement for Waylander?" — should call `ijfw_memory_prelude` and answer "AionUI"

---

## Memory Files (read these for full context)

All under `~/.claude/projects/-Users-seandonahoe-dev-ijfw/memory/`:

- `MEMORY.md` — index of all memories, read first
- `project_donahoe_loop.md` — the audit-between-every-stage loop
- `feedback_positive_framing_sacred.md` — Sutherland reframe rule
- `project_book_tool_recursion.md` — IJFW = Donahoe Principles made executable
- `project_no_proxy_rule.md` — no traffic interception, ever
- `project_dual_mode_workflow.md` — Quick (Superpowers-like) + Deep (GSD-like)
- `feedback_migration_philosophy.md` — absorb / coexist / defer
- `project_ijfw_forge_portability.md` — `.ijfw/` is portable, peers with `.forge/`
- `project_cross_audit_ux.md` — graduated offer at every gate
- `project_installer_must_merge.md` — Phase 2 fix completed
- `project_plugin_auto_register_mcp.md` — Phase 2 fix completed
- `project_memory_tiers_faceted.md` — 3 tiers, faceted global, team deferred
- `project_prelude_tool_phase2.md` — Phase 2 fix completed
- `project_fts5_deferred.md` — why FTS5 stays Phase 3
- `project_prompt_improver_phase3.md` — Phase 3 #2
- `project_cross_project_search.md` — Phase 3 #1

---

## Donahoe 22 Principles (your audit framework)

Full reference at `claude/skills/ijfw-workflow/references/donahoe-principles.md`.

Tier 1 — Perception Is the Product (P1-P8): first impressions, speed, never feel stupid, ship taste, no config, hide architecture, every red has green, app starts when clicked.

Tier 2 — Invisible Architecture (P9-P16): explainable code, test like breaking, offline-first, security without friction, their data their choice, accessible, invisible updates, shared infra.

Tier 3 — The Craft (P17-P22): no terminal, no crashes, progressive disclosure, all platforms, honest pricing, standards encoded.

Phase 3 should be audited against P5 (no config — npx installer), P10 (test like breaking — benchmark harness), P15 (updates invisible — schema migrations), P22 (standards scale — lint/format encoded).

---

## Suggested Phase 3 Kickoff Sequence

**Session 1 (~3 hrs):**
1. Verify state with `bash scripts/check-all.sh`
2. Build cross-project search (#1) — ship, test in openclaw + a fresh project
3. Build prompt-improver hook (#2) — ship, test against the vague prompts user actually hits

**Session 2 (~3 hrs):**
4. Build npx installer (#4) — publish `@ijfw/install` to npm
5. Build benchmark harness scaffold (#5) — even the runner without full task suite is valuable

**Session 3 (~2 hrs):**
6. Token usage dashboard (#6) — `/ijfw-metrics`
7. Team tier (#8) if time allows

**Defer to Phase 4:** SQLite FTS5, semantic vector search.

---

## Ready State Verification (before opening Phase 3 work)

```bash
cd /Users/seandonahoe/dev/ijfw
bash scripts/check-all.sh           # All checks passed
git status --short                  # Should show all Phase 2 changes uncommitted (likely)
git log -1                          # Check last commit
```

If `git status` shows clean and last commit is "Phase 1 complete" — the user has been editing in place across the whole conversation. Phase 3 session can either:
(a) Commit Phase 2 first as a clean checkpoint
(b) Continue building Phase 3 on top, commit everything together at end

Recommend (a) — clean checkpoint at end of every batch makes Phase 3 work bisectable.

---

**You have the full context. Hit Phase 3 with #1 (cross-project search) — that's what the user just hit live and was the natural next step.**
