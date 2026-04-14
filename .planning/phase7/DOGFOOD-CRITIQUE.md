# Phase 7 Dogfood — /cross-critique on finished P7

**Stamp:** 2026-04-14T21:48
**Target:** commits 3f55a5f..964114a (cross-dispatcher + commands + intent router)
**Mode:** `critique` — parallel fan-out
**Auditors:** Codex (technical), Gemini (strategic), self-Claude (UX, in-session)
**Invocation:** dispatcher-generated request (proves integration contract works end-to-end)

## Headline

The dogfood **found real bugs** in the code we just shipped and blocked post-impl claim-of-done until they were fixed. That IS the proof — the tool caught regressions the implementation agents missed.

## Critical findings (from Codex, fixed this commit)

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 1 | Command runbooks call `.then()` on sync `buildRequest` → `TypeError` at runtime | `cross-research.md`, `cross-critique.md` (all request-gen blocks) | Replaced with `process.stdout.write(m.buildRequest(...))` direct; added explicit note in both files |
| 2 | `mergeResponses` expects parsed `{items}` but compare runbooks pass raw strings → silently empty merge | `cross-research.md:213`, `cross-critique.md:224` | Route each response through `parseResponse` first, then merge |
| 3 | Synthesis `priorResponses` passed as unlabeled array `[codex, gemini]` → implicit toString loses per-auditor provenance | `cross-research.md:192` | Build labeled string before passing to dispatcher |

Smoke verified: the exact runbook snippet that threw now runs exit-0 and emits a valid request.

## Medium findings (follow-up, not blocking)

| # | Issue | Source | Disposition |
|---|-------|--------|-------------|
| M1 | `scoreRebuttalSurvival` rewards verbosity over insight — both Codex and Gemini independently flagged this | consensus | Follow-up phase: replace length heuristics with falsifiability/blast-radius/rebuttal-availability rubric, or delegate ranking to synthesis pass |
| M2 | Research merge uses exact-text normalisation; misses semantically equivalent claims | Codex | Same follow-up; delegate semantic clustering to Claude synthesis pass |
| M3 | Auto-fire invariant is enforced in markdown, not code | Codex | Acknowledged; promoting to executable MCP orchestrator is Phase 8-scale work |
| M4 | Confirmation prompt before fan-out contradicts auto-fire invariant | Codex | Real tension; defer — the Trident picker is the "don't make me think" UX per user feedback. Reconcile in v2 of the command spec. |

## Low findings

- L1 (Codex): Router ordering is coarse — first-match-wins, no specificity scoring. Acknowledged; Phase 8 candidate.
- L2 (Gemini): Setup tax from multi-CLI dependency. Acknowledged; roster probe surfaces missing CLIs.
- L3 (Gemini): Value erosion as single models gain internal adversarial reasoning. Strategic concern; revisit at milestone-end.

## Verdict

**Dogfood passed.** The pre-plan audit caught 9 findings (closed via v2). The post-impl critique caught 3 criticals the implementation agents missed + 4 mediums + 3 lows. All 3 criticals fixed in this commit. Mediums queued as follow-ups.

The book sold the tool, the tool validated the book. This is the recursion working.

## Files

- Requests: `.ijfw/cross-audit/archive/2026-04-14-p7-critique/request-{codex,gemini}.md`
- Responses: `.ijfw/cross-audit/archive/2026-04-14-p7-critique/response-{codex,gemini}.md`
