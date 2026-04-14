# Phase 9 Dogfood — `ijfw cross critique HEAD~2..HEAD`

**Stamp:** 2026-04-15
**Target:** P9 Items 1-4 commits (`686daff` + predecessors)
**Invocation:** `./mcp-server/bin/ijfw cross critique HEAD~2..HEAD`
**Auditors:** codex + gemini via diversity picker, auto-fire (no confirm)

## Headline

The CLI we just shipped audited its own extension and caught **2 HIGH + 3 MED real bugs** that the implementation swarm missed. All 5 closed in-branch. Third consecutive phase where the dogfood loop proved itself by surfacing bugs the building agents couldn't see.

## Findings (all closed)

| # | Sev | Issue | Location | Fix |
|---|-----|-------|----------|-----|
| 1 | **HIGH** | API fallback unreachable for API-only users: `pickAuditors` filters on `installed` (CLI) only, so users with env keys but no CLI get zero picks → audit never runs. Contradicts `ijfw demo` preflight which accepts API keys as reachable. | `audit-roster.js:125-145` | `pickAuditors` now filters on `isReachable(id, env).any`; API-only picks annotated with `preferredSource:'api'`; orchestrator skips spawnCli entirely when that hint is set |
| 2 | **HIGH** | `minResponsesFanOut` claims to abort stragglers but doesn't cancel anything — pending auditor spawns / fetches keep running in background, wasting tokens and compute | `cross-orchestrator.js:217-230` | Shared `runAc: AbortController` per `runCrossOp` threaded into `spawnCli` + `runViaApi`. On `minResponses` reached, `runAc.abort()` + SIGKILL spawns + cancels fetches. Pending picks classified `status:'aborted'` (new state) |
| 3 | MED | `IJFW_AUDIT_CONCURRENCY` / `IJFW_AUDIT_TIMEOUT_SEC` parsed by raw `Number()` — `0`, negative, or non-numeric produce empty worker set or instant timeout | `cross-orchestrator.js:261-287` | `parsePosInt(raw, fallback, min, max)` helper with positive-framed stderr warning on invalid input; defaults apply; gated behind `!quiet` |
| 4 | MED | Timeout path never tried API fallback — slow CLI (cold start / auth prompt / update check) just gave up when a valid API key would have worked | `cross-orchestrator.js:164-185` | Timeout path now attempts `runViaApi` before returning; success → `status:'fallback-used'`; both fail → `status:'timeout'` |
| 5 | MED | `_printDemoFindings` only rendered `status === 'ok'` — successful API fallbacks (`status:'fallback-used'`) showed as "no findings returned" in demo output | `cross-orchestrator-cli.js:177-180` | `hasFindings` normalizer accepts both `ok` and `fallback-used` |

## Why this run caught so much

The dogfood ran through the NEW code path (API fallback, timeouts, abort semantics) — not the legacy path. Codex + Gemini both had specific line references in their counter-args, which the rebuttal-survival rubric ranks at the top. Three of five findings came from Codex (technical angle finding state-machine bugs); two from Gemini (strategic + UX angles finding integration gaps between `pickAuditors` and the new `isReachable`).

## Tests added

+7 tests over the fix pass:
- 1 in `test-audit-roster.js` — API-only diversity pick with no CLIs
- 3 in `test-cross-orchestrator.js` — abort propagation, env validation (2 cases)
- Plus shape updates to accommodate new `status:'aborted'`

## Verdict

**All 5 fixes land in the same branch.** P9 closes cleanly on the fix commit. Third phase in a row where the tool validates itself by finding real bugs the swarm missed — the dogfood pattern is durable.
