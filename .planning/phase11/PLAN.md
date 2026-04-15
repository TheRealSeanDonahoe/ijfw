# Phase 11 -- Completeness: MED + LOW closure + R0 + R5

**Theme:** Holy-shit-this-is-everything polish. Every finding closed.
**Branch:** continues on `phase10/polish-for-publish` (will re-tag before Phase 12 starts).
**Feature-freeze:** Still applies. Only items already in the ROADMAP V1.0 scope-creep slate.

## Scope

1. **All open MED findings** (~35) from `.planning/phase10/CROSS-AUDIT-PRINCIPLES.md`.
2. **All open LOW findings** (~41) from same report + `DOGFOOD-CRITIQUE-P10.md`.
3. **R0 Sutherland polish tail** (C06 + S6.1 enhancement deferrals from Wave 10E.6).
4. **R5 Slash-command cross-platform parity** -- per-platform rules-file mapping + README table.

## Out of scope for Phase 11

- R1 Cross-project audit/search -- Phase 12 Wave 12B.
- R2 Importers (claude-mem, RTK) -- Phase 12 Wave 12C.
- R3 Auto-swarm dispatcher -- Phase 12 Wave 12A.

## Waves

### Wave 11A -- MED + LOW sweep by file cluster (parallel swarm)

Each sub-wave gets one agent that reads the master + lens reports, finds all findings scoped to its cluster, closes each, marks `[closed]`.

- **11A-sk**: skills (workflow, core, critique, review, commit, handoff, summarize, team, auto-memorize, metrics, compress). Findings: K1.3, K1.5, K2.1, K2.2, C13, C14, plus LOWs.
- **11A-cmd**: commands (all `claude/commands/*.md`). Findings: K3.2, K3.3, K3.4, plus LOWs.
- **11A-mcp**: mcp-server src (server.js, cross-orchestrator-cli.js, receipts.js, hero-line.js, cross-dispatcher.js, api-client.js, intent-router.js, bin/ijfw). Findings: K4.3, K5.2, C04, C16, dogfood D01, D04, plus LOWs.
- **11A-hook+install**: hooks + installer + scripts. Findings: K7.1, K7.2, K8.2, K8.3, C17, plus LOWs.
- **11A-docs**: README, CHANGELOG, PUBLISH-CHECKLIST, CLAUDE.md, top-level docs. Findings: K10.3, K10.4, dogfood D02, D03, plus LOWs.

Partition constraint: clusters are file-disjoint. No agent conflicts.

### Wave 11B -- R0 Sutherland polish tail

- **11B-doctor**: per-auditor value lines in doctor output + "N of 6 auditors reachable" summary.
- **11B-hero**: propagate hero-line value framing to: session-start banner, `/ijfw-status`, workflow SHIP gate, installer post-run summary, `ijfw demo` closer.

### Wave 11C -- R5 Slash-command cross-platform parity

- **11C-gemini**: `gemini/GEMINI.md` section: IJFW commands are intent phrases.
- **11C-codex**: `codex/instructions.md` section: IJFW commands are shell invocations (list: `ijfw status`, `ijfw doctor`, `ijfw demo`, `ijfw cross`).
- **11C-universal**: `universal/ijfw-rules.md`: add single line about platform-specific invocation patterns.
- **11C-readme**: README cross-platform mapping table showing `/ijfw-status` (Claude) = `ijfw status` (shell) = "what's my status?" (intent).

## Banned chars enforcement (unchanged from Phase 10)

`§`, `━`, em-dash U+2014, Greek delta U+0394, multiplication sign U+00D7, minus U+2212, check marks U+2713/U+2714, middle-dot U+00B7, emoji block. Extended lint now covers all of these across skills, commands, mcp-server src, bin, installer src, hooks, scripts, platform rules, and top-level docs.

## GATE 11-complete

- [ ] All MED findings in CROSS-AUDIT-PRINCIPLES.md marked `[closed]`.
- [ ] All LOW findings marked `[closed]` or explicitly `[defer-p13]` with rationale.
- [ ] R0 doctor + hero-line propagation verified on `ijfw doctor`, `ijfw status`, `ijfw demo`.
- [ ] R5 docs landed: each platform rules file has invocation-pattern section; README has mapping table.
- [ ] `bash scripts/check-all.sh` PASS.
- [ ] 83/83 (or more) mcp-server tests pass.
