# Phase 7 Cross-Audit — Consensus Report

**Auditors:** Codex + Gemini (Donahoe Trident, self=Claude excluded)
**Target:** `.planning/phase7/PHASE7-PLAN.md` v1
**Stamp:** 2026-04-14T21:05

## Consensus findings (both auditors agree)

| # | Sev | Dim | Issue | Fix |
|---|-----|-----|-------|-----|
| C1 | **high** | correctness | Research mode assumes Claude synthesis runs AFTER codex+gemini and consumes their output, but the dispatcher has no staged orchestration — single `buildRequest` cannot feed prior responses into a synthesis prompt. | Split research mode into two phases: (a) parallel `buildRequest` for codex+gemini; (b) separate `buildSynthesisRequest(priorResponses)` for Claude once responses land. |
| C2 | **medium** | testability | "Rebuttal survival" ranking and merge semantics are hand-waved. No response schema, parsing rules, or scoring rubric → unit tests only assert shallow shape. | Define normalized response schema (JSON-in-markdown fences), parsing rules, and a deterministic 1-5 rubric for rebuttal survival. Test dedupe/contradiction + sort order. |

## Unique — Codex

| # | Sev | Dim | Issue | Fix |
|---|-----|-----|-------|-----|
| X1 | **high** | architecture | Mode-specific roles (Codex=benchmarks, Gemini=citations, Claude=synthesis) conflict with `pickAuditors()` which excludes self and picks by fixed priority. Plan says "no roster changes" — contradicts requirements. | Bring mode-aware role resolution into scope. Add `assignRoles(mode, roster, self)` with fallbacks when required role is self or unavailable. |
| X2 | **high** | correctness | Slash commands are Markdown runbooks, not executable. Plan says commands "invoke the dispatcher with --mode" but no CLI entrypoint exists. | Specify integration contract: command Markdown issues `node -e "import('./mcp-server/src/cross-dispatcher.js').then(m => m.buildRequest(...))"` with concrete args. Document the signature. |
| X3 | medium | architecture | Intent router is first-match-wins. New `cross-critique` phrase `challenge this from every angle` is shadowed by existing generic `critique` pattern `/challenge this/`. | Insert cross-research/cross-critique entries BEFORE generic `critique`. Add shadow-regression test. |
| X4 | medium | testability | `scripts/check-positive-framing.sh` does not scan `claude/commands/*.md`, so new command files can violate framing while CI stays green. | Extend the guard to cover command Markdown. |
| X5 | medium | dogfood | Pre-exec audit validates the plan, not the new dispatcher/routing/merge machinery. Post-impl critique risks circularity. | Smoke deliverables must include archived external request+response per mode, plus a committed merge-output report. |

## Unique — Gemini

| # | Sev | Dim | Issue | Fix |
|---|-----|-----|-------|-----|
| G1 | **high** | scope | Command file work underestimated — matrix/ranked-table output requires explicit format instructions in the prompt template so auditors return parseable structure. | Fold "template formatting contract" into T7.1 explicitly; tests assert parser round-trips the template output. |
| G2 | low | dogfood | Using `/cross-critique` on its own plan is circular — the metric defines the plan. | Pre-gate uses `/cross-audit` (DONE — this report). Reserve `/cross-critique` for post-impl only. |

## Disputed

None — the two auditors converge tightly on the orchestration + schema gaps.

## Plan changes required before execution

1. Rewrite **Architecture** section to split research mode into parallel-fan-out then synthesis-step (C1).
2. Add **T7.1.5**: response-schema + parser + rebuttal-survival rubric (C2, G1).
3. Remove "no roster changes" from out-of-scope; add **T7.2.5**: `assignRoles(mode, roster, self)` with fallbacks (X1).
4. Add **Integration contract** subsection documenting `node -e import(...)` pattern commands use (X2).
5. T7.5: order cross-research/cross-critique BEFORE generic `critique` in INTENTS; add shadow test (X3).
6. Add **T7.7.5**: extend `scripts/check-positive-framing.sh` to scan `claude/commands/*.md` (X4).
7. Dogfood gate: archive at least one external response per mode in the smoke (X5). Pre-gate done via `/cross-audit` (this report), post-gate via `/cross-critique` (G2).
8. Re-estimate: 4-5h (Codex noted 3-4h optimistic given role/orchestration work).

## Verdict

**Block execution on v1. Revise plan → PHASE7-PLAN-v2.md. Proceed to execute v2.**
