# Phase 7 Plan — `/cross-research` + `/cross-critique`

**Branch:** `phase7/cross-research-critique`
**Est:** 3-4h
**Self (caller):** Claude (Opus 4.6, 1M)
**Cross-audit target:** Codex + Gemini (Donahoe Trident, 2 non-self reviewers available)

## Goal

Extend the existing `/cross-audit` dispatcher into a multi-mode engine with two new modes — `research` and `critique` — and expose them as thin alias commands plus intent-router phrases. Eat our own food: use `/cross-critique` on this very plan as part of the phase.

## Architecture

New shared module `mcp-server/src/cross-dispatcher.js` (naming may be `cross-modes.js` — decide in T7.1) that owns:

- `getTemplate(mode)` — returns the per-mode prompt template
- `buildRequest(mode, target, auditorId, roster)` — injects angle-specific framing for the assigned auditor
- `mergeResponses(mode, responses[])` — returns the mode-appropriate merge shape

Existing `/cross-audit` keeps its current behaviour (mode defaults to `audit`). `/cross-research` and `/cross-critique` are thin command files that invoke the same dispatcher with `--mode research` / `--mode critique`.

## Modes

### research (per-angle, not broadcast)

| Auditor | Angle | Output field |
|---------|-------|--------------|
| Codex   | Benchmarks / implementation precedent / numbers | `claim + evidence + confidence` |
| Gemini  | Citations / search-grounded primary sources | `claim + source + confidence` |
| Claude (fresh session) | Synthesis — runs AFTER other two, consumes their findings | `consensus / contested / unique matrix + open-questions` |

Merge shape: matrix of claims by source with contradictions flagged.

### critique (adversarial triangulation)

| Auditor | Angle | Output field |
|---------|-------|--------------|
| Codex   | Technical / operational weaknesses | `counter-arg + conditions + mitigation` |
| Gemini  | Strategic / market / assumption weaknesses | same |
| Claude  | User-experience / adoption risks | same |

Merge shape: counter-args ranked by **rebuttal survival** (how hard the counter-arg is to rebut), not raw severity.

## Waves

### Wave 1 — Shared dispatcher engine

- **T7.1** Create `mcp-server/src/cross-dispatcher.js`. Export `getTemplate`, `buildRequest`, `mergeResponses`. Cover modes: `audit` (delegates to current inline prompt), `research`, `critique`.
- **T7.2** Create `mcp-server/test-cross-dispatcher.js`. Unit tests: every mode × every auditor angle for `buildRequest`; merge-matrix shape per mode; edge cases (empty responses, single-auditor fallback).

### Wave 2 — Command files

- **T7.3** Create `claude/commands/cross-research.md`. Mirrors `cross-audit.md` structure. Uses `research` mode. Same zero-arg auto-detect cascade. Same Trident picker default. Output format: consensus/contested/unique matrix with source tags.
- **T7.4** Create `claude/commands/cross-critique.md`. Uses `critique` mode. Counter-arg table ranked by rebuttal-survival score.

### Wave 3 — Intent router

- **T7.5** Extend `mcp-server/src/intent-router.js` with two new INTENTS entries:
  - `cross-research`: `/\bcross[- ]?research(?:\s|ing)?\b/i`, `/\bdig into .* from multiple angles\b/i`, `/\bmulti[- ]?angle research\b/i`, `/\blet'?s cross[- ]?research\b/i`
  - `cross-critique`: `/\bcross[- ]?critique(?:\s|ing)?\b/i`, `/\bstress[- ]?test this claim\b/i`, `/\badversarial (?:critique|review)\b/i`, `/\bchallenge this from every angle\b/i`
- **T7.6** Extend `mcp-server/test-intent-router.js` with matching positive + negative cases.

### Wave 4 — Green check + archive

- **T7.7** `bash scripts/check-all.sh` → all checks passed.
- **T7.8** Write `.planning/phase7/PHASE7-COMPLETE.md` with list of files changed, tests added, and one-line summary per wave.

## Out of scope

- `book` mode (explicitly skipped)
- Changes to `audit-roster.js` (already picks correctly)
- New MCP tools (respects ≤8 cap)
- Installer / CI changes (pure JS + markdown)

## Success criteria

- `/cross-research` and `/cross-critique` commands exist and follow existing `/cross-audit` conventions (zero-arg auto-detect, Trident default, positive framing).
- Intent phrases fire deterministically for the listed triggers.
- `node --test` passes for dispatcher + intent router.
- `scripts/check-all.sh` stays green.
- Dogfood smoke: run `/cross-critique` on this plan itself, archive the reference report.

## Dogfood gate (eating own food)

Before execution, this very plan gets cross-audited by Codex + Gemini (Donahoe Trident). Findings block execution until addressed. After implementation, `/cross-critique` is run against the completed phase as a second dogfood proof.
