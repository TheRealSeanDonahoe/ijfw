# IJFW Roadmap — post-V1.0 work

**Stamp:** 2026-04-15
**V1.0 gate:** Phase 10 polish + principle cross-audit (zero unresolved HIGH) → `npm publish @ijfw/install@1.0.0`.
**This file:** the genuine unshipped features that user-locked for V1.1+ on 2026-04-15. Not in P10 (P10 is feature-freeze polish). This roadmap is the handshake with future-you: nothing gets silently forgotten.

---

## V1.1 — "Work across projects"

### R1 — Cross-project audit / search

**What:** `/ijfw-cross-project-search <pattern>` + `/ijfw-cross-project-audit <rule>` via a registry of known IJFW project dirs.

**Why:** User memory backlog (`project_cross_project_search.md` from Phase 3). "I want to audit this pattern across all my IJFW projects" is a common power-user move — catches consistency drift across a user's portfolio.

**Scope sketch:**
- `~/.ijfw/projects.json` — registry of project paths auto-populated on first IJFW session per project.
- New MCP tool `ijfw_cross_project_search(pattern)` — greps BM25 warm layer across every registered project; returns hit list with project attribution.
- New CLI subcommand `ijfw cross project-audit <rule-file>` — runs `ijfw cross audit` on every registered project with the same rule, aggregates results into a portfolio-wide findings doc.
- Per-project isolation stays DEFAULT; cross-project is explicit opt-in via the command.
- Estimated effort: 1.5-2 days.

**Blockers:** none.

---

### R2 — `ijfw import` (migrate from other tools)

**What:** One-command migration from claude-mem / MemPalace / Memorix / RTK into IJFW's memory format.

**Why:** The migration-philosophy memory (`feedback_migration_philosophy.md`) says we "absorb, not coexist" where possible. Right now IJFW detects competitors and defers. No absorption path exists. `ijfw import claude-mem` would run once and bring the user's prior memory into IJFW's tiers.

**Scope sketch:**
- `mcp-server/src/importers/` — one module per source (`claude-mem.js`, `mempalace.js`, `memorix.js`, `rtk.js`).
- Each importer reads the source's native format (SQLite, ChromaDB, markdown, etc.), normalizes to IJFW schema, writes to `.ijfw/memory/` or the faceted globals.
- New CLI: `ijfw import <tool>` with `--dry-run` (show what would be imported) and `--force` (overwrite existing IJFW entries on collision).
- Framing: positive, upgrade-story — "Imported 47 sessions from claude-mem + 23 knowledge entries" not "claude-mem detected, converting."
- Estimated effort: 2-3 days (depends on which importers ship in V1.1 vs V1.2).

**Priority:** ship claude-mem + RTK importers in V1.1; MemPalace + Memorix in V1.2 as demand surfaces.

---

## V1.2 — "Work with teammates"

### R3 — Team-tier memory

**What:** Shared memory across teammates. Project-tier stays private; team-tier lives at `~/.ijfw/team/<team-id>/` and syncs via a chosen backend (git repo, S3, local NAS).

**Why:** Phase 2 deferral — three-tier memory (working / project / global) shipped; team-tier was deferred until we had evidence it was needed. V1.2 is where "IJFW for teams" becomes a story.

**Scope sketch:**
- Team-tier schema in `mcp-server/src/schema.js`.
- `ijfw team init <team-id>` and `ijfw team sync` CLI subcommands.
- Backend pluggable: git (default — user provides repo URL), S3 (env creds), local-shared-dir.
- Per-team access control via signed commits or bucket ACLs (don't reinvent auth).
- Team-tier writes go through a consent prompt on first-run per-team.
- Estimated effort: 5-7 days.

**Priority:** V1.2 — needs V1.1 deployed in the wild first to shape the right API.

---

## V1.x — "Decisions and positioning" (not code)

### R4 — CI/CD-first positioning review

**What:** Strategic review flagged by Gemini in Phase 8 dogfood. As native IDE multi-model orchestration matures (Cursor/Windsurf/Copilot roadmaps), the CLI-on-CLI approach risks being redundant. Decision: pivot messaging toward CI/CD-first autonomous reviewer, or hold in-IDE position?

**Why:** This is a positioning decision, not a feature. Affects README, marketing, publish-release-notes voice.

**Resolution trigger:** when V1.0 has been in the wild ~4 weeks and we have real adoption signal. Decision meeting, not a PR.

---

## V2 — "Rewrite candidates"

Items flagged by dogfood critiques as things to revisit once V1 has live-data to inform the rewrite:

- **`scoreRebuttalSurvival` rubric**: replace structural heuristic with falsifiability + blast-radius + evidence-strength scoring informed by real finding outcomes (Codex dogfood finding, P7 M1).
- **Research merge semantic clustering**: delegate to a dedicated clustering pass over claim embeddings (today it's the synthesis pass; V2 could dedicate a step).
- **Cross-process rate-limiting**: per-process in-memory limiter is V1 scope; if users split gateway/worker V2 needs shared-state.
- **Idempotency keys**: caller-supplied idempotency key for true replay protection.
- **Intent-router specificity scoring**: currently priority + pattern-length heuristic; V2 could use learned scoring from intent-match telemetry if we ever collect that.

---

## Process notes

- **Feature freeze applies to V1.0 only.** P10 is the final V1.0 work. Everything above waits.
- **Each V1.1+ item gets its own Phase doc when activated.** `.planning/phaseN/` with scope → audit → plan → execute → dogfood → complete, same pattern as P7-P9.
- **4-way Trident audit applies to every V1.1+ phase.** Pre-gate and post-gate both, same loop.
- **Roadmap is the handshake.** If a feature idea surfaces that isn't on this list, land it here first as a candidate (with a WHY), then promote to a Phase when activated. Nothing gets silently forgotten.
