# GATE 12 -- Principle Cross-Audit

**Scope:** all Phase 12 additions on `phase12/completeness`
- Wave 12A: `mcp-server/src/dispatch-planner.js` + ijfw-workflow SKILL.md edits
- Wave 12B: `mcp-server/src/cross-project-search.js` + `ijfw_cross_project_search` MCP tool + `ijfw cross project-audit` CLI
- Wave 12C: `mcp-server/src/importers/` + `ijfw import <tool>` CLI
- Installer redesign: `scripts/install.sh` + `installer/src/install.ps1`

**Method:** Self-review against Krug / Sutherland / Donahoe lenses.
Real-auditor Trident deferred to Phase 13 (API budget + user had a
concrete install path to validate instead).

## Findings

### Krug -- don't make me think

- **PASS** `ijfw import <tool>` -- help text surfaces the available
  tools and the minimum invocation. Unknown tool suggests the list.
- **PASS** Installer banner -- one glance tells you what is live and
  what is standing by. No bracketed section headers, no backup timestamps.
- **PASS** dispatch-planner -- sub-waves without a `Files:` line fall
  back to worktree (safe default). User never has to read a manifest
  to proceed -- the one-line summary is self-explanatory.
- **LOW** `ijfw cross project-audit` with zero registered projects
  prints a single positive-framed line; could hint at which command
  opens other projects in registry. Deferred -- hint space limited.

### Sutherland -- smarter not cheaper

- **PASS** Installer "Standing by" framing -- pre-staged configs reframed
  as premium behavior (auto-activate on platform install), not clutter.
- **PASS** RTK importer default-skip -- IJFW takes the position of
  refusing low-signal data by default; opt-in `--include-metrics`
  respects the user's choice but signals the judgment call.
- **PASS** MCP tool naming -- `ijfw_cross_project_search` is explicit
  about what it does. `scope:'all'` on `ijfw_memory_search` kept as a
  convenience alias; tool count now 8, at the CLAUDE.md cap.
- **PASS** `It just f*cking works.` closer preserved on the PS side.

### Donahoe -- it just fucking works

- **PASS** One-install story: `git pull && .\install.ps1` end-to-end
  configured 6 platforms on the Windows box. Failure modes are
  addressed (PS 5.1 compat, WSL-bash decoy, marketplace JSON parse
  failure -> graceful fallback with backup + manual commands).
- **PASS** Importers are idempotent by default (summary-based dedup
  on knowledge, sha12 on journal). Re-running is safe.
- **PASS** All 317 tests pass including the SQLite round-trip fixture
  (skipped cleanly on Node <22.5 instead of failing).
- **MED** The PS marketplace merge still chokes on at least one real
  user's settings.json even after BOM strip. Root cause likely a
  trailing-comma variant the regex misses. Graceful fallback ships, so
  no install-blocker, but worth a Phase 13 tightening.
- **LOW** Wave 12A skill wiring uses an inline `node -e` invocation.
  Works; a small `bin/ijfw-dispatch-plan` binary would be cleaner.
  Phase 13 polish candidate.

## Outcome

- Zero new HIGH findings.
- 1 MED (PS JSON parser) + 2 LOW -- all deferred to Phase 13 polish.
- 317/317 tests green. Banned-char sweep clean across all additions.
- GATE 12 closed.
