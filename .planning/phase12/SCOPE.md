# Phase 12 -- V1.0 Completeness features

**Theme:** The three V1.1 items we're pulling into V1.0: auto-swarm + cross-project + importers.
**Branch:** new branch `phase12/completeness` off latest phase10/polish-for-publish after Phase 11 gates.
**Session:** fresh context (Phase 11 should close this session first).

## Waves

### Wave 12A -- R3 Auto-swarm dispatcher

**What:** Workflow skill decides shared-branch vs worktree-isolated parallelism per Wave, based on file-overlap analysis of sub-wave declared file lists.

**Scope:**
- New `mcp-server/src/dispatch-planner.js` helper: parses plan sub-wave `Files:` declarations, computes pairwise file-set intersection, emits dispatch manifest.
- Workflow skill addition: at Execute-phase entry, call dispatch-planner, surface manifest one-line to user before dispatch, dispatch accordingly.
- Override flags: `--all-worktree`, `--all-shared`.
- Default to worktree when sub-wave omits `Files:` declaration.
- Post-worktree: auto-merge branches in dependency order; conflicts surface via workflow audit-gate narration.
- Tests: file-set intersection math, manifest emission, override flag handling.

**Effort:** ~1.5 days.

### Wave 12B -- R1 Cross-project audit/search

**What:** Portfolio-wide grep + audit across registered IJFW projects.

**Scope:**
- `~/.ijfw/projects.json` registry -- auto-populated on first IJFW session per project.
- New MCP tool `ijfw_cross_project_search(pattern)` -- BM25 across every registered project; results tagged with project basename.
- New CLI subcommand `ijfw cross project-audit <rule-file>` -- runs `ijfw cross audit` on every registered project with same rule, aggregates into portfolio findings doc.
- Per-project isolation stays DEFAULT; cross-project opt-in via explicit command or MCP call.
- Tests: registry management, cross-project search with mocked multi-project fixture, project-audit aggregation.

**Effort:** ~2 days.

### Wave 12C -- R2 Importers

**What:** `ijfw import <tool>` migrates from claude-mem + RTK into IJFW memory.

**Pre-work:**
- Schema-research agent pass: read claude-mem source + RTK source (fetch via context7 or read local installs if present), document the native formats, write `.planning/phase12/IMPORTER-SCHEMAS.md` with field mappings to IJFW schema.

**Scope:**
- `mcp-server/src/importers/claude-mem.js` -- read claude-mem native storage, normalize to IJFW markdown+schema, write to `.ijfw/memory/` or faceted globals.
- `mcp-server/src/importers/rtk.js` -- same for RTK.
- New CLI: `ijfw import <tool>` with `--dry-run` (show what would be imported) and `--force` (overwrite on collision).
- Positive framing: "Imported 47 sessions from claude-mem + 23 knowledge entries."
- Tests: round-trip fixtures for each source.

**Effort:** ~2-3 days (schema research is the variable).

## GATE 12-complete

- [ ] R3 dispatch planner test suite green.
- [ ] R1 cross-project search + project-audit functional with live multi-project test.
- [ ] R2 claude-mem + RTK importers round-trip a fixture without data loss.
- [ ] Principle cross-audit (Krug/Sutherland/Donahoe) on Phase 12 additions -- zero new HIGH.
- [ ] Dogfood critique on Phase 12 branch.
- [ ] `bash scripts/check-all.sh` PASS.

## Phase 13 (after 12)

- Final polish pass: any new MED/LOW from Phase 12 audit closes.
- PUBLISH-CHECKLIST walkthrough with user.
- `npm publish @ijfw/install@1.0.0`.
- Marketplace PRs (Anthropic plugin marketplace, etc.).
- Announcement.
