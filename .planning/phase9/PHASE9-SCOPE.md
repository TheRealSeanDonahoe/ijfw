# Phase 9 — Robust for strangers

**Theme:** Anyone picks this up and it just works — no authenticated CLIs required, nothing hangs, the wow is visible in 30 seconds, and every platform package delivers.

Closes the two HIGH-severity strategic findings deferred from P8 dogfood + two highest-leverage Tier B polish items from SCOPE-v2.

**Branch:** `phase9/robust-for-strangers` (sits on top of `phase8/trident-enforced`)
**Est:** 3-4h wall with parallel swarm

## Tier A — locked

### 1. API-key fallback for auditor CLIs (P8 dogfood S1, HIGH)

When a roster auditor's CLI is not installed/authenticated, fall back to calling the provider's HTTPS API directly with the user's API key. Zero-deps: use Node's built-in `https` module. Keys live in env vars with explicit names (OPENAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY).

Work:
- Extend `mcp-server/src/audit-roster.js` ROSTER entries with `apiFallback: { endpoint, model, auth: 'env:VAR_NAME' }` per family.
- New `mcp-server/src/api-client.js` — thin wrappers: `callOpenAI(req, key)`, `callGemini(req, key)`, `callAnthropic(req, key)`. Return raw response string like a CLI would.
- Orchestrator (`cross-orchestrator.js`): when `spawn` exits nonzero OR command-not-found, check `apiFallback` + env key; if present, fall back to HTTPS call. Mark auditor `source: 'cli' | 'api'` in receipt.
- `isInstalled` check broadened to "installed OR API fallback available."
- Status: `ok|empty|failed|fallback-used` with provenance in receipt.
- Tests: mock `spawn` to exit 127, assert API path taken; mock HTTPS to return fixture, assert parse.

### 2. Timeout + graceful degradation (P8 dogfood S1 follow-through)

Current orchestrator has a 10-minute timeout per auditor but doesn't gracefully handle partial Trident. If codex hangs, the whole run hangs.

Work:
- Per-auditor `AbortController` with default 90-second timeout (configurable via `IJFW_AUDIT_TIMEOUT_SEC`).
- On timeout, auditor marked `status: 'timeout'` with elapsed ms in receipt. Run continues with other auditors.
- Orchestrator returns partial results instead of hanging. If ALL auditors time out, emit "All auditors timed out — check network or increase IJFW_AUDIT_TIMEOUT_SEC" and exit 1.
- Tests: stub a never-responding child, assert timeout fires; assert other auditors still merge.
- Cap concurrent spawns at 4 to avoid resource exhaustion on partial rosters with --expand.

### 3. `ijfw demo` — first-run wow (Sutherland, Tier B)

One command, 30 seconds, showcases the full Trident on a canned target.

Work:
- New CLI subcommand `ijfw demo` that:
  1. Prints "IJFW demo — a 30-second tour of the Trident."
  2. Creates a tiny throwaway target (e.g. a sample JS file with a deliberate null-check bug) in a tmp dir.
  3. Runs `runCrossOp({ mode: 'audit', target: <tmpfile> })` against whichever auditors are ready (including API fallback from item 1).
  4. Renders findings with explicit per-finding attribution ("Codex found the null-check, Gemini cross-checked with a citation").
  5. Writes a receipt — proves the whole pipeline to the user.
  6. Deletes the throwaway file.
  7. Final line: "Try `ijfw cross audit <your-file>` next."
- The canned target must have ≥1 real bug every auditor should catch so the demo never looks flat.
- Positive framing throughout; no conditional "if you have codex installed" nonsense — the API fallback (item 1) handles that.

### 4. Non-Claude platform parity audit (SCOPE-v2 Tier B)

Walk every platform package (`codex/`, `gemini/`, `cursor/`, `windsurf/`, `copilot/`, `universal/`) and verify what each actually delivers vs. what Claude gets. Produce a parity matrix; close the largest gaps that don't require full platform-port work.

Work:
- Write `.planning/phase9/PARITY-MATRIX.md` — rows = IJFW capabilities (memory via MCP, intent routing, cross-audit, auto-critique-on-commit, combo policy, ownership discipline, visible TODO surface); columns = 6 non-Claude platforms.
- Cell values: `✓ native` / `✓ via CLI` / `△ partial` / `—` (not supported, explain why).
- For every `—` that COULD be `✓ via CLI`, patch the platform's rules file to add the one-line CLI invocation (some of this landed in P8 item 1; this is the closing sweep).
- For every `△ partial` surface the gap and either close it or document "Claude-flagship-only by design."
- No per-platform port work (that would be a whole milestone) — just the parity gaps that the CLI + existing packages can already close.

## Tier B — deferred to P10+

- Prompt caching on cross-dispatcher templates (marginal savings; not a user-visible win)
- New-machine bootstrap live-fire test (would need dockerized test harness — overkill for now)
- Uninstall clean-exit test (ditto)
- RTK coexist path live-fire (similar infra question)
- Intent phrase gap audit (qualitative, better with user sampling)
- Coverage sweep of untested hook paths (systematic, P10 polish)

## Success criteria

- `ijfw cross audit <target>` works when codex/gemini CLIs NOT installed but env keys are set
- `ijfw cross audit <target>` against a hanging fake auditor times out in ≤95s and still returns other results
- `ijfw demo` runs end-to-end in ≤45s from a fresh shell, shows real findings, exit 0
- `.planning/phase9/PARITY-MATRIX.md` is complete; every CAN-close gap is closed in this phase
- `scripts/check-all.sh` green; ≥3 new tests per item 1 and item 2
- Eat own food: run `ijfw cross critique HEAD~N..HEAD` on the P9 branch itself before declaring COMPLETE

## Audit gates (Donahoe Loop, same as P7/P8)

**Pre-gate:** Fire `ijfw cross research` on this SCOPE-v1 via the dispatcher we built in P7. Codex + Gemini via bg bash; Claude architect + explorer via Agent tool. Resolve consensus findings into SCOPE-v2 before implementation.

**Post-gate:** Dogfood `ijfw cross critique HEAD~N..HEAD` from a fresh shell. Fix what it catches.
