<!-- pre-P10-template: historical, preserved as-is -->
# Phase 9 Scope Audit — 4-way Trident consensus

**Stamp:** 2026-04-14T23:40
**Mode:** `research` (design-level stress-test)
**Sources:** Codex (benchmarks), Gemini (citations), Architect (specialist), Explorer (specialist) — 4-leg Trident via the P7+P8 pattern on our own branch.

Archived: `.ijfw/cross-audit/archive/2026-04-14-p9-scope-research/`

---

## Consensus findings (≥2 sources agree)

### 🔴 C1 — API fallback interface is wrong as written
**Sources:** Architect + Explorer.
Scope says `callOpenAI(req, key)` takes the pre-baked `buildRequest` string. But `buildRequest` assembles system + user content into one plaintext blob. APIs need `system` and `user` messages in separate role slots, with provider-specific schemas (Anthropic uses top-level `system` key; OpenAI uses `messages[{role:"system"}]`; Gemini uses `systemInstruction`). Passing the pre-baked string as user content loses the adversarial framing → `parseResponse` sees no JSON fence → zero items recorded as success.
**Fix:** `api-client.js` takes `(mode, angle, target)`, calls `getTemplate(mode, angle)` itself to get the system role, assembles per-provider correctly.

### 🔴 C2 — Timeout status must be explicit, not folded into `failed`
**Sources:** Codex + Architect.
Current `fireExternal` timeout resolves `{exitCode:null, stderr:'timeout'}` which falls through to `status:'failed'` because `exitCode !== 0`. A timeout should be `status:'timeout'` distinct from crashes. Codex also flagged a single-settlement guard is needed — Node emits both `error` and `close` events when spawn fails.
**Fix:** `fireExternal` returns a discriminated status. Orchestrator classifies `timeout | failed | empty | ok | fallback-used`. Single-settlement guard (a `settled` flag) prevents double-resolve.

### 🔴 C3 — Demo 45s promise conflicts with 90s default timeout
**Sources:** Codex + Architect.
Demo promises ≤45s wall time. But if any demo auditor hangs at the default 90s timeout, demo blows past its own claim. Need: demo uses a tighter per-auditor timeout (e.g. 30s) AND `Promise.race`-style "fail-fast on first response" OR pre-flight reachability check.
**Fix:** Demo calls `runCrossOp({ mode:'audit', target, perAuditorTimeoutSec: 30, minResponses: 1 })`. Orchestrator returns as soon as `minResponses` auditors have settled, aborts stragglers. Hero line is computed against whoever finished in time.

### 🟢 C4 — Platform CLI one-liners already present
**Sources:** Codex + Explorer.
Codex verified all 6 non-Claude rules files already contain the `ijfw cross <mode> <target>` line (P8 Item 1 landed it). Good news: Item 4 (parity matrix) is lighter than planned — CLI parity already achieved. Remaining parity gap is memory/MCP, which splits into "platforms with MCP" (gemini, cursor, windsurf, copilot) and "platforms without" (codex has config.toml MCP but instructions say no MCP; universal has none).
**Fix:** Item 4 shrinks to a 2-axis matrix (capability × platform) with ≤8 rows. Less work. `✓ via CLI` cells caveat `(if ijfw on PATH)` per Architect.

---

## Unique per source

### Codex (benchmarks-anchored)
- **U1:** Node's `https.globalAgent` enables Keep-Alive by default in v19+ with 5s timeout — fine for API fallback. But Gemini's U4 flags `fetch` (Undici) as more robust. **Reconcile:** use `fetch` (Node 19+ native) for simpler API and better connection handling.
- **U2:** Cold-start codex CLI can take 120s+ on first invocation. 90s default timeout will produce false timeouts. **Per-provider defaults:** codex=120s, gemini=45s, anthropic=60s, API-mode=30s (APIs are fast). Override via `IJFW_AUDIT_TIMEOUT_SEC`.
- **U3:** Expanded 6-auditor roster with cap=4 concurrent + 90s timeout = 180s wall for all-hang case. That's already bad. With per-provider defaults this compounds. **Fix:** cap=3 concurrent + `minResponses:2` short-circuits the expanded-roster hang scenario.
- **U4:** Cost of a demo run at list prices on low-cost models (gpt-5.4-mini + Gemini 2.5 Flash + Claude Haiku 4.5) ≈ $0.02 per run. Acceptable for a first-run wow. Free-tier Gemini keys would make it $0.
- **U5:** Codex confirmed all 6 platform rules files already contain `ijfw cross` one-liner (P8 Item 1). Memory/MCP parity is the only genuine Item 4 gap.

### Gemini (citation-anchored)
- **U6:** "Time to Hello World" under 5min is the PLG adoption threshold; successful tools target ≤60s for first-run wow (Vercel, Stripe). Demo's 30s target is aligned. **Bakes into success criteria.**
- **U7:** CWE-based canned bugs (CWE-476 null pointer dereference etc.) are the industry standard for evaluating AI auditor recall. **Use:** demo fixture includes explicit CWE-tagged bugs so findings can be validated programmatically in tests (assert each auditor catches the known CWEs).
- **U8:** Node's native `fetch` (Undici) beats legacy `https` for zero-dep clients — auto connection pooling, 40% less GC pressure. **Confirmed:** use `fetch` for api-client.

### Architect (repo-aware)
- **U9:** `AbortController` + `spawn` sends SIGTERM by default on abort. Some CLIs ignore SIGTERM. **Add:** explicit `proc.kill('SIGKILL')` in abort branch.
- **U10:** Demo fixture must be committed file (`mcp-server/fixtures/demo-target.js`), not generated. Reproducibility requires stable content. Fixture must be in `package.json` `files` array.
- **U11:** `mergeResponses` loses per-auditor identity — demo's "Codex found X, Gemini found Y" attribution needs per-auditor rendering BEFORE merge. Read `auditorResults` in demo renderer, not merged output.
- **U12:** Demo should suppress `uxGate` partial-roster stderr warning (it confuses the wow UX). Pass `quiet: true` to `runCrossOp`.

### Explorer (dependency-anchored)
- **U13:** `test-audit-roster.js:73-96` asserts `isInstalled` returns a boolean. API-fallback availability check must be a **new exported function** (`isReachable(id, env)` — returns `{cli, api, any}`) so existing tests don't regress.
- **U14:** Zero existing HTTPS code in `mcp-server/src/`. `api-client.js` is net-new. Pattern reference from `installer/src/uninstall.js:47` for `mkdtempSync` is reusable for demo tmpdir only.
- **U15:** `Promise.all` at `cross-orchestrator.js:166` must become `Promise.allSettled` for partial-Trident tolerance. Safe because `fireExternal` never rejects today.

---

## Disputed / contested

None — the four legs converge. Codex and Gemini agree on fetch (U1/U8 align). Architect and Explorer agree on interface shape for api-client. Timeouts: Codex says 90s default conflicts with cold codex; Architect says 90s is reasonable. Reconciled to per-provider defaults.

---

## Open questions → default-answered (per always-recommend rule)

| # | Question | Default | Rationale |
|---|----------|---------|-----------|
| 1 | `fetch` vs `https` for api-client? | **fetch** (Node 19+) | Codex U1 + Gemini U8 align; cleaner code; auto pooling |
| 2 | Timeout default — flat or per-provider? | **per-provider** (codex=120, gemini=45, anthropic=60, api=30) | Codex U2 evidence on cold-start variance |
| 3 | All-timeout wall time on expanded roster? | **cap=3 + minResponses=2** | Codex U3 math: prevents 180s hang |
| 4 | Demo fixture: generated or committed? | **committed** (`mcp-server/fixtures/demo-target.js`) | Architect U10 reproducibility; Gemini U7 CWE standard |
| 5 | Anthropic API system prompt placement? | **top-level `system` key** (Anthropic convention) vs **messages[0] system role** (OpenAI) | Provider-specific per C1 |
| 6 | Demo attribution rendering? | **read `auditorResults` pre-merge**, not merged output | Architect U11 |
| 7 | Parity-matrix scope | **shrunk** — CLI parity confirmed; matrix focuses on memory/MCP + flag config-verified vs live-tested | Codex U5 + Architect |

## Scope changes before Plan phase

1. Rewrite Item 1 interface: `api-client.js` exports per-provider `(mode, angle, target, env) → rawString`. Uses native `fetch`. Each provider gets its own schema helper (`buildOpenAI`, `buildGemini`, `buildAnthropic`).
2. Item 2: split timeout into per-provider defaults + `IJFW_AUDIT_TIMEOUT_SEC` global override. Explicit `status:'timeout'`. Add `SIGKILL` on abort. Single-settlement guard in `fireExternal`. `Promise.all` → `Promise.allSettled`. Cap=3 concurrent.
3. Item 3: commit `mcp-server/fixtures/demo-target.js` with 3 CWE-tagged bugs (CWE-476 null deref, CWE-89 SQL inj or similar, CWE-755 improper error handling). Update `package.json` files array. Demo uses per-auditor 30s timeout, `minResponses:2`, `quiet:true`. Attribution from `auditorResults`.
4. Item 4: shrink to memory/MCP parity matrix. 4 capabilities × 6 platforms = 24 cells, annotated `✓ native / ✓ via CLI (if on PATH) / △ partial / — (by design)`. Distinguish config-verified vs live-tested in a legend row.

## Build order (consensus)

1. Item 1a — `apiFallback` field on ROSTER + `isReachable(id, env)` helper
2. Item 1b — `api-client.js` with fetch-based provider builders
3. Item 1c — wire into `fireExternal` / `runCrossOp`; `source` field in receipt
4. Item 2 — timeouts (parallel-safe with 1c since different files in different parts of orchestrator)
5. Item 3a — commit `mcp-server/fixtures/demo-target.js` + update package.json
6. Item 3b — `cmdDemo` in CLI + `runCrossOp` partial-result params
7. Item 4 — PARITY-MATRIX.md (after 1–3 because matrix reflects post-P9 CLI)
8. Gate: run `ijfw demo` once end-to-end as smoke
9. Dogfood: `ijfw cross critique HEAD~N..HEAD` on P9 branch

## Verdict

**Block v1. Revise → SCOPE-v2 per the 7 locked answers above. Proceed to Plan.**
