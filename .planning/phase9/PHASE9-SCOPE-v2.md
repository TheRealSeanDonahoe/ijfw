# Phase 9 — Scope v2 (post 4-way Trident audit)

**Theme:** Robust for strangers.
**Branch:** `phase9/robust-for-strangers` (on top of `phase8/trident-enforced`)
**Est:** 3-4h parallel
**Closes:** 9 consensus findings from SCOPE-AUDIT.md; 7 open questions answered.

## Item 1 — API-key fallback (revised per C1)

**Files:**
- `mcp-server/src/audit-roster.js` — add `apiFallback: { provider, model, authEnv, endpoint }` to each ROSTER entry; add `isReachable(id, env) → {cli, api, any}`.
- `mcp-server/src/api-client.js` — NEW. Exports `runViaApi(pick, mode, angle, target, env)`. Uses Node 19+ native `fetch`. Per-provider builders:
  - `buildOpenAI(system, user, model, key)` → POST https://api.openai.com/v1/chat/completions with `messages:[{role:'system',content:system},{role:'user',content:user}]`, Bearer auth.
  - `buildGemini(system, user, model, key)` → POST generateContent with `systemInstruction:{parts:[{text:system}]}` and `contents:[{role:'user',parts:[{text:user}]}]`, `x-goog-api-key` header.
  - `buildAnthropic(system, user, model, key)` → POST https://api.anthropic.com/v1/messages with top-level `system:"..."`, `messages:[{role:'user',content:user}]`, `x-api-key`, `anthropic-version:2023-06-01`.
  - Each returns the text content; callers treat it like CLI stdout.
- `mcp-server/src/cross-orchestrator.js:fireExternal` — on spawn ENOENT OR nonzero exit AND `pick.apiFallback` AND `isReachable(pick.id, env).api`, fall back. Record `source: 'cli' | 'api'` on auditor result + receipt.

**Success:** `ijfw cross audit CLAUDE.md` runs when neither codex nor gemini CLI is installed but `OPENAI_API_KEY` + `GEMINI_API_KEY` are set. Receipt line shows `source: 'api'` per auditor.

**Tests:** `test-api-client.js` mocking `fetch` for each provider; `test-audit-roster.js` extended for `isReachable`.

## Item 2 — Timeouts + graceful degradation (revised per C2, U2, U3, U9, U15)

**Files:**
- `mcp-server/src/cross-orchestrator.js`:
  - Per-provider timeout defaults: codex=120s, gemini=45s, anthropic=60s, api-mode=30s, fallback=90s. Override via `IJFW_AUDIT_TIMEOUT_SEC` env (flat) per-call.
  - `fireExternal`: explicit `status: 'timeout' | 'failed' | 'empty' | 'ok' | 'fallback-used'`. Single-settlement guard (`settled` boolean). SIGKILL on abort (`proc.kill('SIGKILL')`).
  - `runCrossOp`: `Promise.all` → `Promise.allSettled`. Concurrency cap=3 (rolling window, zero-dep semaphore). `minResponses` param for partial-result short-circuit.
  - All-timeout guard: after settle, if every `auditorResults` entry is `timeout`, emit "All auditors timed out — check network or raise IJFW_AUDIT_TIMEOUT_SEC" to stderr, exit 1.

**Success:** Single hanging fake auditor doesn't block a 3-auditor run past 120s max. All-timed-out produces clear error. `status:'timeout'` distinct from `status:'failed'` in receipts.

**Tests:** stub never-responding child; assert per-auditor timeout; assert other auditors merge; assert all-timeout guard.

## Item 3 — `ijfw demo` first-run wow (revised per C3, U7, U10, U11, U12)

**Files:**
- `mcp-server/fixtures/demo-target.js` — NEW, committed. Three CWE-tagged bugs:
  - CWE-476 null pointer dereference
  - CWE-89 hardcoded SQL with user input concatenation
  - CWE-755 empty catch-swallow error handling
  Comments at the top describe the bugs so humans can verify.
- `mcp-server/package.json:files` — add `fixtures/` glob.
- `mcp-server/src/cross-orchestrator-cli.js`:
  - New `cmdDemo()` — pre-flight: call `isReachable` for each auditor; if zero reachable, print "Install codex or gemini, or set OPENAI_API_KEY/GEMINI_API_KEY — then retry `ijfw demo`." exit 0.
  - On go: emit "IJFW demo — 30-second tour of the Trident."
  - Call `runCrossOp({ mode:'audit', target: fixturePath, perAuditorTimeoutSec:30, minResponses:2, quiet:true })`.
  - Render findings per-auditor (from `auditorResults` pre-merge), attributing each finding to its source.
  - Final line: "Try `ijfw cross audit <your-file>` next."
- `cross-orchestrator.js` accepts `perAuditorTimeoutSec`, `minResponses`, `quiet` params.

**Success:** `./mcp-server/bin/ijfw demo` runs in ≤45s on a machine with ≥2 auditors reachable (CLI or API), shows real findings with per-auditor attribution, exit 0. Demo TTHW ≤60s matches Gemini U6 PLG threshold.

**Tests:** `test-demo.js` — assert fixture contains at least one line matching each CWE tag; assert CLI has `demo` subcommand; stub orchestrator to assert per-auditor timeout override is passed through.

## Item 4 — Memory/MCP parity matrix (shrunk per C4)

**File:** `.planning/phase9/PARITY-MATRIX.md` — NEW.

Rows (capabilities): memory recall, memory store, memory search, prompt check, cross-audit CLI, auto-critique on commit, intent routing, combo policy access.
Columns: claude, codex, gemini, cursor, windsurf, copilot, universal.
Cells: `✓ native / ✓ via MCP / ✓ via CLI (if ijfw on PATH) / △ partial / — (by design)`.
Legend row: mark `config-verified` vs `live-tested` vs `unverified`.

Platform CLI one-liners already landed in P8 Item 1 — the matrix just documents truth.

**Success:** Every cell has a clear value; every `✓` specifies which form; every `—` has a one-line "why by design."

## Success criteria (measured, per Codex U1)

- `ijfw cross audit CLAUDE.md` works with zero CLIs installed + env keys set (item 1).
- `ijfw cross audit CLAUDE.md` with a fake-hanging auditor completes in ≤130s (item 2).
- `ijfw demo` runs end-to-end ≤45s wall from fresh shell; exit 0; real findings rendered with attribution (item 3).
- `.planning/phase9/PARITY-MATRIX.md` exists; every cell filled + legend (item 4).
- `scripts/check-all.sh` green; new tests pass.
- Dogfood: `ijfw cross critique HEAD~N..HEAD` on P9 branch runs clean.
