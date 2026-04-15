# Wave 10E.1 — Audit Manifest (10 Systems)

## System 1: Workflow Skill

**Canonical entry:** `claude/skills/ijfw-workflow/SKILL.md`

**Audit target:** Phase/Wave/Step narration clarity, boundary discipline between workflow stages, next-action visibility at every transition.

**Known considerations:** Core skill hard cap 55 lines (currently 51). Single source of truth for workflow state progression. Narration must follow ASCII convention (no unicode dividers, no emojis).

---

## System 2: On-Demand Skills Bundle

**Canonical entries:** `claude/skills/ijfw-*/SKILL.md` (except ijfw-workflow, ijfw-core)
- Representative files: `claude/skills/ijfw-critique/SKILL.md`, `claude/skills/ijfw-compress/SKILL.md`, `claude/skills/ijfw-review/SKILL.md`

**Audit target:** Individual skill surface clarity, narration discipline per capability, ASCII-only constraint, escape-hatch documentation for non-narrating skills.

**Known considerations:** Phase 10A-sk adds `<!-- IJFW: narration-not-applicable -->` escape hatch. 7 on-demand skills in scope. Each must declare or justify narration strategy.

---

## System 3: Commands Surface

**Canonical entries:** `claude/commands/*.md`
- Representative files: `claude/commands/cross-audit.md`, `claude/commands/cross-critique.md`, `claude/commands/ijfw.md`

**Audit target:** Command UX clarity, next-action guidance in help text, zero ambiguity in intent. Dispatcher routing completeness.

**Known considerations:** 20+ command files. Cross-audit/cross-critique/cross-research trio must maintain consistent interface. ijfw.md is entry point.

---

## System 4: CLI + ijfw doctor

**Canonical entries:** `mcp-server/bin/ijfw`, `mcp-server/src/cross-orchestrator-cli.js`

**Audit target:** CLI startup report (positive framing only), ijfw doctor diagnostics completeness, error recovery guidance, ASCII-only messaging.

**Known considerations:** Startup report bans negative framing (no "not found", no "missing"). Doctor must suggest next action for every condition detected.

---

## System 5: MCP Server + Memory Tools

**Canonical entries:** `mcp-server/src/server.js` (core tools: ijfw_memory_recall, ijfw_memory_store, ijfw_memory_search, ijfw_memory_status, ijfw_memory_prelude)

**Audit target:** Tool UX consistency, prelude injection completeness, memory tier boundaries (working/project/global), recall latency under 10ms per request.

**Known considerations:** Tool cap <=8. Phase 2 added prelude tool. FTS5 layer deferred to Phase 3 (linear scan <10ms at current scale). Memory schema stable across P10.

---

## System 6: Cross-AI Dispatcher + Receipts + Hero Line

**Canonical entries:** `mcp-server/src/cross-dispatcher.js`, `mcp-server/src/cross-orchestrator.js`, `mcp-server/src/receipts.js`, `mcp-server/src/hero-line.js`, `mcp-server/src/api-client.js`

**Audit target:** Receipt JSONL schema correctness, hero-line formatting (cache-hit savings visibility), prompt-caching cache_control placement, Trident swarm composition (diversity rule: 1 OpenAI + 1 Google excluding caller), dispatcher routing determinism.

**Known considerations:** Receipt schema unchanged in P10 (render format changes only). Cache-control requires prompt >=1024 tokens. Batch cap 4 auditors. Hero-line must show cache_creation and cache_read tokens when applicable.

---

## System 7: Hooks

**Canonical entries:** `claude/hooks/scripts/*.sh`
- Representative files: `claude/hooks/scripts/session-start.sh`, `claude/hooks/scripts/post-tool-use.sh`, `claude/hooks/scripts/pre-prompt.sh`

**Audit target:** Hook determinism (no LLM calls), event semantics correctness (PreToolUse carries tool_input; PostToolUse carries tool_input+tool_response), JSON envelope validity, error recovery.

**Known considerations:** Shell scripts only. Phase 6.2 locked event semantics. Hook must respect PostToolUse trimming rule. No stateful side effects across invocations.

---

## System 8: Installer

**Canonical entries:** `installer/README.md`, `installer/src/install.js`, `scripts/install.sh`

**Audit target:** Installer console messaging (positive framing, ASCII-only, next-action clarity), config merge strategy (must parse existing platform configs, not clobber), self-guard activation, feedback to user on memory preservation.

**Known considerations:** Phase 10A-in updates README and console strings. install.sh must activate self-guard. Parser must handle all platform config formats (JSON, YAML, shell). Merge logic must preserve user overrides.

---

## System 9: Platform Configs

**Canonical entries:** `codex/`, `gemini/`, `cursor/`, `windsurf/`, `copilot/`, `universal/`
- Representative files: `cursor/.cursorrules`, `gemini/GEMINI.md`, `universal/rules.txt`

**Audit target:** Core rules identity across platforms, platform-specific formatting fidelity, parity matrix cell completeness (all cells L or explicitly deferred), ASCII-only constraint in all files.

**Known considerations:** universal/rules.txt is 15-line paste-anywhere baseline. Platform-specific files adapt format (JSON, YAML, markdown, plain text) while preserving rule logic. Parity matrix tracks feature coverage per platform.

---

## System 10: README + CHANGELOG + PUBLISH-CHECKLIST

**Canonical entries:** `README.md`, `CHANGELOG.md`, `PUBLISH-CHECKLIST.md`

**Audit target:** README wow factor (Sutherland positioning: "smarter not cheaper"), CHANGELOG entry format consistency and completeness, PUBLISH-CHECKLIST enforcement (6 blocking criteria before npm publish), ASCII-only in all user-facing text.

**Known considerations:** README must lead with value, not features. CHANGELOG follows conventional-commits. PUBLISH-CHECKLIST gates on 6 specific conditions: Phase/Wave/Step visibility, parity matrix L/deferred, Anthropic API caching, empty-state actions, zero HIGH findings, dogfood run. All must pass before publish.

---

**Total systems: 10**

**Audit scope:** All 10 systems feed into Wave 10E.2 (Krug), Wave 10E.3 (Sutherland), Wave 10E.4 (Donahoe) cross-critique runs. Each system receives per-lens findings; findings merge into master report (Wave 10E.5) and close before PUBLISH gate (Wave 10E.6).
