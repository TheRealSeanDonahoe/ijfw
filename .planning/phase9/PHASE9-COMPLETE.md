<!-- pre-P10-template: historical, preserved as-is -->
# Phase 9 — COMPLETE

**Theme:** "Robust for strangers."
**Branch:** `phase9/robust-for-strangers`
**Wall time:** ~2.5h (SCOPE-v2 est 3-4h, swarm + parallel compression)

## What shipped

| # | Item | Deliverable |
|---|------|-------------|
| 1 | API-key fallback | `api-client.js` with per-provider `fetch` builders; `apiFallback` on ROSTER; `isReachable(id,env)`; `pickAuditors` now selects on reachability not just CLI-installed; orchestrator fires API path when CLI absent AND on timeout |
| 2 | Timeouts + graceful degradation | Per-provider timeout defaults; `IJFW_AUDIT_TIMEOUT_SEC` override; explicit `ok\|empty\|failed\|timeout\|fallback-used\|aborted` statuses; SIGKILL on abort; `Promise.allSettled` fanout; concurrency cap 3; `minResponses` short-circuit with actual abort propagation via shared `AbortController`; all-timeout guard |
| 3 | `ijfw demo` first-run wow | Committed `fixtures/demo-target.js` with 3 CWE-tagged bugs (476/89/755); `cmdDemo` with pre-flight reachability check; 30s per-auditor timeout; per-auditor attribution from pre-merge `auditorResults` |
| 4 | Memory/MCP parity matrix | `.planning/phase9/PARITY-MATRIX.md` — 8 capabilities × 7 platforms with config-verified vs live-tested legend |

## Audit-gate loop (eat own food, twice again)

**Pre-gate (SCOPE-AUDIT.md):** 4-way Trident on SCOPE-v1 — Codex + Gemini via CLI bg bash + Claude architect + explorer specialist swarm via Agent tool. 9 consensus findings, no disputes. Resolved in SCOPE-v2 with 7 default-answered open questions.

**Post-gate (DOGFOOD-CRITIQUE.md):** `./mcp-server/bin/ijfw cross critique HEAD~2..HEAD` — the CLI we just extended, auditing its own new code path. Caught 5 real bugs (2 HIGH: API-only user unreachable, minResponses doesn't actually abort; 3 MED: env validation, timeout-bypasses-fallback, demo drops fallback findings). All 5 closed in-branch.

## Commits (4 total)

| SHA | What |
|-----|------|
| `1c2bbc1` | P9 scope v1 lock |
| `852c770` | SCOPE-AUDIT + SCOPE-v2 (post 4-way Trident) |
| `686daff` | Items 1-4 (API fallback + timeouts + demo + parity matrix) |
| (pending) | Dogfood fixes (5 bugs) + DOGFOOD-CRITIQUE + COMPLETE |

## Tests

- `mcp-server/test-api-client.js` — 7 tests (NEW)
- `mcp-server/test-cross-orchestrator.js` — 10 tests (NEW, +3 from fix pass)
- `mcp-server/test-audit-roster.js` — 43 tests (+12 from P9 including apiFallback + isReachable + API-only diversity)
- `mcp-server/test-demo.js` — 6 tests (NEW)
- All existing P7/P8 tests unaffected

Total P9 test additions: +32 tests.

## Live verification

- `./mcp-server/bin/ijfw cross audit CLAUDE.md` → end-to-end, real findings from both Codex and Gemini (exit 0)
- `./mcp-server/bin/ijfw demo` → 30s wall time, Codex caught all 3 CWE bugs with correct severities, per-auditor attribution rendered
- `scripts/check-all.sh` → all passed, Ownership discipline clean, 31 positive-framing files

## Cumulative session (P7 + P8 + P9)

- **3 branches** pushed (`phase7/`, `phase8/`, `phase9/`)
- **3 PRs** opening (this one pending)
- **~175 tests** total across `mcp-server/test-*.js`
- **9 durable memory entries** across P7-P9 (workflow ownership, specialist swarm, auto-fire, combo policy, progress + recommend rule, etc.)
- **5 phases' worth** of dogfood audit-gate loops executed via the tool itself

## Not in P9 (queued for P10 / polish)

- Live-test upgrade campaign for the parity matrix (walk each platform in its real IDE)
- Prompt caching on cross-dispatcher templates (Sutherland marginal savings)
- New-machine bootstrap live-fire test
- Uninstall clean-exit test
- RTK coexist path live-fire
- Intent phrase gap audit
- Coverage sweep of untested hook paths
- Strategic positioning review (Gemini P8 dogfood critical finding — CI/CD-first vs in-IDE)

## Ready-to-merge checklist

- [x] `scripts/check-all.sh` green
- [x] All test files pass (`node --test`)
- [x] CLI smoke: `ijfw cross audit`, `ijfw demo`, `ijfw status` all exit 0
- [x] No foreign-plugin verbs at action surfaces
- [x] Dogfood caught + fixed 5 real bugs in-branch
- [x] Memory entries indexed
- [ ] Branch pushed + PR opened (next)
