# Phase 7 Plan v2 — `/cross-research` + `/cross-critique`

**Revised after Codex+Gemini consensus audit (see AUDIT.md).**
**Branch:** `phase7/cross-research-critique`
**Est:** 4-5h (v1 3-4h was optimistic per Codex)

## Architecture (revised)

### Shared module — `mcp-server/src/cross-dispatcher.js`

Exports:

```
getTemplate(mode, angle)              // returns { system, format } strings per mode+angle
assignRoles(mode, roster, self)       // returns [{auditorId, angle}] with fallbacks when role=self
buildRequest(mode, target, auditorId, angle, priorResponses?)
                                      // priorResponses only used by mode=research,angle=synthesis
mergeResponses(mode, responses[])     // returns mode-shaped merge object (matrix | ranked list)
parseResponse(mode, raw)              // parser for structured-markdown response blocks
scoreRebuttalSurvival(counterArg)     // 1-5 rubric, deterministic keyword + structural heuristic
```

Response schema (all modes): JSON-in-fenced-block + markdown prose. Parser extracts the JSON block; prose is passed through for humans.

### Mode: audit (existing)
Unchanged. Dispatcher keeps current prompt as the `audit` template for back-compat.

### Mode: research — TWO-PHASE

**Phase A (parallel):**
- Codex → benchmarks angle
- Gemini → citations angle
Both return structured claim objects: `{claim, evidence, source, confidence}`.

**Phase B (sequential, after A):**
- Claude (fresh session) → synthesis angle
- `buildRequest` passes `priorResponses` = concatenated Phase A responses into the synthesis prompt
- Returns consensus/contested/unique matrix + open-questions

Command `/cross-research` orchestrates both phases: generates Phase A requests, prompts user to run them, then on `compare` reads responses and generates the Phase B synthesis request.

### Mode: critique — parallel (no staged synthesis)

All three auditors fire in parallel with adversarial angles:
- Codex → technical weaknesses
- Gemini → strategic weaknesses
- Claude (fresh) → UX/adoption weaknesses

Each returns `{counterArg, conditions, mitigation, severity}`. Merge ranks by `scoreRebuttalSurvival()` deterministic rubric (1-5 based on: condition specificity, mitigation existence, evidence link, severity, independence from caller context).

### Integration contract

Command Markdown files are runbooks. They instruct the agent to invoke the dispatcher via:

```bash
node --input-type=module -e "import('./mcp-server/src/cross-dispatcher.js').then(m => m.buildRequest('research', '<target>', 'codex', 'benchmarks').then(r => process.stdout.write(r)))"
```

The result is written to `.ijfw/cross-audit/request-<mode>-<auditor>.md`. The agent then **auto-fires** the auditor via background bash (`cat request-<mode>-<id>.md | <invoke> > response-<mode>-<id>.md` with `run_in_background:true`) and waits for completion notifications. Only when the auditor CLI is missing from the roster does the agent fall back to human-paste. See `feedback_cross_audit_must_auto_fire.md` — the lazy "write-then-tell-user-to-paste" pattern is a regression, not a valid flow.

## Role assignment (`assignRoles`)

Input: `mode`, installed roster, `self` caller id.
Output: `[{auditorId, angle}]`.

Rules:
- Exclude self from non-synthesis angles.
- Research synthesis angle always goes to Claude (fresh session via `claude -p`) even if self=Claude — synthesis is "fresh Claude" not the caller.
- Critique: caller's own angle is dropped from the output; caller contributes their own findings from the in-session conversation when merging.
- If a required non-self role has no installed auditor, return `{missing: [...]}` with Donahoe-Trident nudge.

## Waves (revised)

### Wave 1 — Dispatcher core

- **T7.1** `cross-dispatcher.js`: `getTemplate`, `buildRequest` (audit/research/critique, incl. synthesis branch).
- **T7.1.5** Response schema + `parseResponse` (JSON-fence extractor) + format-contract instructions embedded in templates.
- **T7.2** `assignRoles(mode, roster, self)` with fallbacks.
- **T7.2.5** `scoreRebuttalSurvival` deterministic rubric.
- **T7.3** `mergeResponses(mode, responses[])` — matrix for research, ranked list for critique, passthrough for audit.
- **T7.TEST** `mcp-server/test-cross-dispatcher.js` — unit tests for every export, every mode. Schema round-trips. Role-fallback cases. Sort-order assertion for critique ranking.

### Wave 2 — Commands

- **T7.4** `claude/commands/cross-research.md` — runbook: invoke dispatcher, drive Phase A → Phase B flow, archive.
- **T7.5** `claude/commands/cross-critique.md` — runbook: parallel fan-out, invoke dispatcher, rank by survival, archive.
- **T7.5.5** Both command files use positive framing; add to guard scope.

### Wave 3 — Intent router + guards

- **T7.6** `mcp-server/src/intent-router.js` — insert `cross-research` and `cross-critique` entries **BEFORE** generic `critique` (first-match priority). Shadow-regression test: `challenge this from every angle` → `cross-critique` not `critique`.
- **T7.7** Extend `scripts/check-positive-framing.sh` to scan `claude/commands/*.md`.

### Wave 4 — Dogfood + green

- **T7.8** Run `/cross-critique` against the completed Phase 7 (post-impl dogfood). Archive request+response+merge to `.ijfw/cross-audit/archive/`.
- **T7.9** `bash scripts/check-all.sh` green.
- **T7.10** `.planning/phase7/PHASE7-COMPLETE.md` with file list, test list, audit findings closed.

## Out of scope (revised)

- `book` mode (explicitly skipped)
- New MCP tools (respects ≤8 cap)
- Installer / CI changes
- **Removed:** "no changes to `audit-roster.js`" — `assignRoles` lives in `cross-dispatcher.js`, but may call roster helpers.

## Success criteria

- Both commands end-to-end with dispatcher-generated prompts.
- Intent phrases fire deterministically; generic `critique` no longer shadows cross-critique.
- `parseResponse` round-trips on representative fixtures.
- `scoreRebuttalSurvival` is deterministic (same input → same score across runs).
- `scripts/check-all.sh` + new command-framing check green.
- Post-impl `/cross-critique` dogfood produces archived request+response+merge from at least one external auditor.

## Audit findings closed

See `AUDIT.md` — this plan closes C1, C2, X1–X5, G1, G2.
