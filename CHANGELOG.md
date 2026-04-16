# Changelog

## [1.0.2] -- 2026-04-16

### Fixed

- `scripts/install.sh` crashed on macOS and Linux with
  `APPDATA: unbound variable` under `set -u` at the Copilot detection
  step. `$APPDATA` is a Windows-only env var. Fixed to `${APPDATA:-}`.
  Shipped versions v1.0.0 and v1.0.1 exhibit this crash on any non-Windows
  machine; both are now deprecated. Use v1.0.2 or later.

## [1.0.1] -- 2026-04-16

### Fixed

- `@ijfw/install` v1.0.0 npm publish stripped the `bin` field because
  `dist/install.js` and `dist/uninstall.js` shipped without the executable
  bit. The `ijfw-install` command did not exist after global install.
  v1.0.1 restores bin entries, adds `chmod +x` to the build step, and adds
  a `prepublishOnly` hook. v1.0.0 has been deprecated on npm.

## [1.0.0] -- 2026-04-16

First stable release of IJFW. One install configures a native-depth IJFW plugin
across three AI coding agents (Claude Code, Codex CLI, Gemini CLI) plus a
rules-and-memory baseline across three more (Cursor, Windsurf, Copilot). All
six platforms share the same skills, the same memory, and the same Trident
cross-audit -- each using its own native format.

### Native-depth platform bundles

- **Claude Code plugin**: 16 skills, full hooks, agents, slash commands, MCP.
  Auto-registered by the installer -- no manual `/plugin install` step.
- **Codex native plugin** (`codex/.codex-plugin/plugin.json` manifest, 16
  skills under `codex/skills/`, `codex/.codex/hooks.json` with 6 hook events:
  SessionStart, Stop, UserPromptSubmit, PreToolUse, PostToolUse, AfterAgent).
  Marketplace-ready with `codex/.agents/plugins/marketplace.json`.
- **Gemini native extension** (`gemini/extensions/ijfw/gemini-extension.json`
  manifest, 16 skills, 16 TOML slash commands with `{{args}}` interpolation,
  `hooks/hooks.json` with 11 hook events covering all Gemini lifecycle points).
- **Gemini bonuses**: native policy engine (`policies/ijfw.toml`) enforcing safe
  defaults for destructive operations; BeforeModel hook for first-turn memory
  injection; PreCompress hook mirroring Claude PreCompact; AfterModel
  auto-memorize trigger; hub-and-spoke agent files.
- **Baseline coverage** for Cursor, Windsurf, Copilot: MCP + native rules file
  with the same core discipline.

### Skills

- 16 canonical skills in `shared/skills/` used verbatim across all three
  native platforms: workflow, handoff, commit, cross-audit, recall, compress,
  team, debug, review, critique, memory-audit, summarize, status, doctor,
  update, plan-check.
- **ijfw-plan-check**: Donahoe Loop pre-execution audit gate. Checks goal
  alignment, scope leaks, risk surface, and dependency ordering. Returns a
  decisive PASS / FLAG / BLOCK verdict. Owns audit-plan, check-plan, and
  before-we-build intents.
- Dual-mode workflow skill: Quick mode (fast brainstorm, ~5 min) or Deep mode
  (full plan with audits, ~30 min). Auto-picks based on task size.

### Memory and MCP

- Cross-platform MCP memory server (zero npm dependencies) with 8 tools:
  recall, store, search, status, prelude, prompt_check, metrics,
  cross_project_search.
- Three memory tiers (working, project, global), faceted per-topic global
  files, BM25 keyword search with hybrid rerank path.
- Session auto-memorize with consent flow; corruption recovery.

### Installer

- `bash scripts/install.sh` drops all six platform configs with per-platform
  auto-detection, graceful fallbacks, and positive-framed summary.
- Deep-merges existing platform configs rather than overwriting. Backs up
  originals with `.bak.<timestamp>`. Idempotent -- safe to re-run.
- Auto-registers Claude Code plugin directly to `~/.claude/settings.json` +
  `known_marketplaces.json` -- no manual `/plugin install` required.
- Codex installer enables `codex_hooks = true` in config.toml and merges
  IJFW hooks with absolute paths; skills copied to `~/.codex/skills/`.
- Windows-native installer (`installer/src/install.ps1`) with PS 5.1+
  compatibility, explicit Git Bash resolution, state-machine JSONC parser.
- Visual redesign: ANSI-colored boxed banner, Live-now / Standing-by section
  summary, full-log redirection, `--verbose` / `-v` tee-to-console mode.
- Node.js 18+ validation at install time with positive-framed action message.
- `.ijfw-source` dev-tree guard (PWD-based) so user clones install cleanly.
- `ijfw doctor` reports integration depth per platform.

### CLI

- `ijfw import <tool>` with importers for claude-mem (SQLite via Node's
  built-in `node:sqlite` on Node 22.5+) and RTK (metrics-only, opt-in).
  Idempotent by default; `--dry-run` previews; `--force` overwrites.
- `ijfw cross project-audit <rule-file>` walks every registered IJFW project
  on the machine and aggregates findings into a portfolio doc.
- `ijfw demo` shows a complete IJFW session without requiring API keys.

### Trident cross-audit

- Three-way review: Claude specialist swarm (security, code-review,
  reliability, tests) + Codex + Gemini, merged into a single response.
- 2-second auto-fire default via background bash -- no manual paste.
- Perspective diversity guaranteed: picks one OpenAI-family and one
  Google-family auditor so blind spots never share a lineage.
- `/cross-research` and `/cross-critique` slash commands on a shared
  dispatcher.

### Quality

- 352-test suite: unit, installer, smoke tests for Codex and Gemini bundles.
- CI-guard (`scripts/check-all.sh`) enforces banned-char, positive-framing,
  foreign-plugin-verb, narration-pattern rules on every run.
- Atomic session-counter with `mkdir`-based lock -- no race on concurrent
  session end.
- Pre-release security audit: code-injection and TOML-injection fixes
  through all installer and hook paths.

---

## P10 -- Polish for Publish

**Theme:** Crystal clear, professionally polished, publish-ready.

- Eliminates section-sign chars, box-drawing dividers, and emoji from every user-facing surface; adopts a plain Phase/Wave/Step hierarchy throughout.
- Rewrites narration cadence across workflow, commit, handoff, and cross-audit skills so every transition tells the user where they are.
- Adds a static guard (`scripts/check-all.sh` rules) that enforces banned characters, narration patterns, and foreign-plugin verb constraints on every CI run.
- Extends `/ijfw-status` to show the current Phase, Wave, and Step at a glance.
- Hardens `install.sh` with a self-run guard: running the installer from inside the IJFW source repo exits cleanly with a positive message instead of silently corrupting state.

---

## P9 -- Robust for Strangers

**Theme:** First-run reliability -- IJFW works correctly the first time, on any machine, for anyone.

- Adds graceful API fallback and per-provider timeouts so a slow or unavailable Codex or Gemini endpoint does not block the session.
- Publishes a parity matrix showing which capabilities are available on each of the seven supported platforms.
- Ships a demo mode (`ijfw demo`) so new users see a complete IJFW session without needing API keys configured.
- Closes five dogfood findings from internal testing: edge cases around memory schema migration, hook ordering, and installer idempotency.

---

## P8 -- Trident Enforced, Visible, Everywhere

**Theme:** Cross-AI critique is automatic, visible, and owns its own execution loop.

- IJFW narration is now clean of foreign-plugin names: every surface uses its own verbs so the mental model stays coherent.
- Cross-audit is now a terminal command (`bin/ijfw`): invoke the Trident from the command line without opening a chat session.
- Every cross-audit session now leaves a receipt -- duration, consensus findings, cache hits -- auto-archived and prunable with `ijfw cross purge`.
- The Trident now auto-fires on a 2-second default: external auditors run via background bash, no manual paste or prompt required.
- Perspective diversity is now guaranteed: the default Trident always picks one OpenAI-family and one Google-family auditor so blind spots never share a lineage.

---

## P7 -- Cross-Research and Cross-Critique

**Theme:** Two AIs are smarter than one -- IJFW makes that the default, not an afterthought.

- Introduces `/cross-research` and `/cross-critique` slash commands backed by a shared cross-dispatcher module.
- Upgrades the Trident to a true three-way review: Claude specialist swarm (security, code-review, reliability, tests) + Codex + Gemini, results merged into a single response.
- Adds intent-router entries so phrases like "get a second opinion" or "cross-check this" auto-fire the right cross mode.
- Runs cross-critique on its own runbooks during Phase 7, catching and closing three critical findings before shipping.

---

## P6 -- Audit Hardening

**Theme:** Close every finding the cross-audit surfaces -- no carryovers.

- Closes all eleven Codex and Gemini cross-audit findings from Phase 5's first external review pass.
- Fixes hook event semantics: `PreToolUse` warns on `tool_input`; `PostToolUse` trims and emits a structured JSON envelope -- invariant baked into the hook scripts.
- Closes eight additional round-2 findings surfaced after the first fix batch, including output-format regressions and memory sanitizer gaps.

---

## P5 -- Adaptive Memory and Cross-Audit

**Theme:** Memory that learns, and a second model always watching.

- Ships the complete adaptive memory loop: BM25 keyword search, auto-memorize synthesis at session end (with user consent), and a hybrid rerank path for high-recall lookups.
- Delivers `/cross-audit` as a structured prompt generator for Gemini and Codex review, with a comparison renderer for the response.
- Adds a `--skill-variant` benchmark flag so users can A/B test custom skill files against the baseline.
- Publishes a tag-gated npm release workflow (`.github/workflows/publish.yml`) and a Windows PowerShell installer stub.
- Ships a self-aware cross-audit roster so IJFW knows which platforms are installed and offers only reachable auditors.

---

## P4 -- Intelligent and Visible

**Theme:** IJFW becomes smart about what you mean and honest about what it costs.

- Adds a deterministic intent router: saying "brainstorm" or "ship this" fires the right IJFW skill automatically, no LLM guess needed.
- Introduces `/mode brutal` -- a caveman-mode output discipline that cuts every response to the minimum tokens.
- Ships lazy prelude loading: the session-context summary loads only when the conversation needs it, not on every turn.
- Adds an error-aware output trimmer that reduces hook noise when nothing went wrong.
- Delivers BM25 memory search, a vectors scaffold, auto-memorize with consent flow, and corruption recovery for the memory store.
- Ships the `@ijfw/install` npx installer, a first-run welcome surface, a privacy posture statement, and an opinionated `.claudeignore` template.
- Adds `/ijfw doctor` -- a user-facing health check that shows ok or action-needed per service with install hints.

---

## P3 -- Intelligence Layer

**Theme:** Memory that persists, prompts that improve, and a first real benchmark.

- Ships cross-project memory search: a registry of known IJFW project directories lets you recall context from a different project without leaving the current one.
- Delivers the deterministic prompt-check hook: vague prompts (bare verbs, unqualified demonstratives) are caught before the agent guesses, saving turns.
- Adds a team memory tier (`.ijfw/team/`) so shared facts are available to every team member who installs IJFW on the project.
- Ships a token-usage dashboard (`/ijfw-metrics`) backed by a JSONL v2 schema with reserved fields for future prompt-check metrics.
- Delivers a three-arm benchmark harness scaffold with a hard cost cap, enabling measurable skill A/B comparisons.
- Publishes `@ijfw/install` as an npx-runnable installer so new users are one command away from a configured environment.

---

## P2 -- Platform Parity and Hardened Memory

**Theme:** Every platform gets the same intelligence; memory becomes a first-class citizen.

- Splits global memory into faceted per-topic files, making recall faster and keeping individual files human-readable.
- Adds `ijfw_memory_prelude` as the fifth MCP tool so Gemini, Codex, and Cursor get the same first-turn context recall that Claude gets via CLAUDE.md.
- Rewrites `scripts/install.sh` to parse and merge existing platform configs rather than overwriting them -- safe to run on any existing setup.
- Hardens all seven platform packages with the same core rules, adapted for each platform's native format.
- Introduces the cross-audit UX: a graduated offer at every workflow gate, dismissible in one keystroke.
- Adds a `PostToolUse` hook that trims verbose tool output and emits a structured JSON envelope for downstream tooling.

---

## P1 -- Foundation

**Theme:** One install, it just works.

- Ships the Claude Code plugin with full skills, hooks, agents, and slash commands.
- Delivers the cross-platform MCP memory server (zero npm dependencies) with `recall`, `store`, `search`, `status`, and `prelude` tools.
- Provides platform packages for six additional agents: Codex, Gemini, Cursor, Windsurf, Copilot, and a universal 15-line paste-anywhere rules file.
- Installs a session-start hook that loads project context and a session-end hook that captures signal for future auto-memorize.
- Ships the `ijfw-core` skill as the efficiency layer: smart defaults, terse output, and the positive-framing invariant baked in from day one.

---

## P0 -- Concept and Architecture

**Theme:** Define the problem, choose the constraints, commit to the design.

- Establishes the no-proxy principle: IJFW configures agent behavior, never intercepts network traffic.
- Locks the plugin architecture: one canonical source per platform, shipped as native packages the platform already understands.
- Defines the three design principles: Sutherland (smarter, not cheaper), Krug (zero config, smart defaults), Donahoe (one install, it just works).
- Sets the memory storage contract: plain markdown for hot recall, SQLite FTS5 for warm search, optional vectors for cold semantic lookup.
- Defines the hard cap: `ijfw-core` skill stays at or under 55 lines -- the single source of truth for every agent session.
