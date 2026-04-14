# Phase 8 Scope Audit — 4-way Trident consensus

**Stamp:** 2026-04-14T22:30
**Mode:** `research` (not `audit`) — this is design-level stress-test, not bug-hunt
**Sources:**
- **Codex** (OpenAI family, benchmarks angle) — grounded in live 2026 research (METR, Terminal-Bench 2.0, SWE-bench retraction, Anthropic scaffold)
- **Gemini** (Google family, citations angle) — LLM-TOPLA (Wang et al.), Sutherland signaling, Krug, shift-left CI patterns
- **Architect** (Claude specialist swarm, architecture angle) — repo-aware architectural gaps
- **Explorer** (Claude specialist swarm, dependency-inventory angle) — per-item file/line map

Archived: `.ijfw/cross-audit/archive/2026-04-14-p8-scope-research/`

---

## Consensus findings (≥2 sources agree)

### 🔴 C1 — Item 1 and Item 8 are the same artifact
**Sources:** Architect + Explorer.
The executable orchestrator (M3) and the `ijfw cross <mode>` CLI wrapper are one file, not two — building them separately duplicates logic. Unify: M3 *is* the implementation, Item 8 is the packaging + invocation entry. One bin in `mcp-server/bin/ijfw`, wired into `mcp-server/package.json` alongside existing `ijfw-memory`.

### 🔴 C2 — Item 5 is load-bearing for Item 1
**Sources:** Architect + Explorer.
The orchestrator needs `.ijfw/swarm.json` to know which specialists to fire. Build order must be: swarm config → orchestrator, not the reverse. `cross-dispatcher.js::assignRoles()` takes a flat id-string array; the orchestrator resolves swarm.json → id array before calling assignRoles. No dispatcher change needed if composition stays in the orchestrator.

### 🟠 C3 — Command docs become drift risk once orchestrator ships
**Sources:** Architect + Explorer.
Today the three `cross-*.md` runbooks ARE the orchestration logic (all prose). Post-orchestrator, they must either shrink to thin wrappers ("run `ijfw cross audit`") or stay as Claude-native fallbacks with an explicit "if `ijfw` CLI unavailable" gate. Left untouched they will diverge.

### 🟡 C4 — 2s abort UX doesn't fit a static markdown runbook
**Source:** Architect (only, but load-bearing).
Claude slash-command docs are prose; there's no live TUI sleep-and-listen path. In practice, "2s abort" becomes "auto-proceeds unless the user's next message says stop." User decision needed: preserve the 2s aspiration as UX copy, or rewrite as "auto-proceeds unless overridden." **Open question for user.**

### 🟢 C5 — Family diversity is directionally correct, not universal proof
**Sources:** Codex + Gemini.
Gemini cites **LLM-TOPLA (Wang et al., arXiv:2402.01831)** — structural diversity in ensembles beats same-lineage stacking. Codex grounds it in **Terminal-Bench 2.0** showing OpenAI/Anthropic/Google all near the frontier, so diversity picker won't sacrifice raw quality. Codex adds a caveat: the best direct diversity-wins-for-reasoning evidence (Hegazy arXiv:2410.12853) is from math/GSM-8K, not code review — treat as transfer evidence. **Rule stands.** Receipts must log exact CLI+model identity per run because CLI-level performance differs materially even within strong families (Codex: Codex CLI GPT-5.2 62.9% vs Gemini CLI Gemini 3 Flash 47.4% on Terminal-Bench 2.0).

### 🟢 C6 — Executable enforcement > markdown invariants
**Sources:** Codex + Architect + Phase 7 dogfood evidence.
Codex: Phase 7 dogfood already proved markdown-only invariants drift (M3 and M4 were both "invariant is prose, not code"). Architect: `/ijfw-commit` chain path is zero-infra for Claude; git `post-commit` hook in `scripts/install.sh` covers all platforms. **Both** paths produce the same receipt format; git-hook path depends on Item 8 landing first.

### 🟢 C7 — Receipts should piggyback on existing metrics schema, not reinvent
**Sources:** Architect + Explorer.
`session-end.sh` already writes `.ijfw/metrics/sessions.jsonl` schema v3 with `input_tokens`, `output_tokens`, `cache_read_tokens`, `cost_usd`, `model`. Receipts should be append-only JSONL at `.ijfw/receipts/cross-runs.jsonl` (not per-session `.md` files) for concurrent-safe writes. Rendered markdown hero-line is a derived view, not storage.

---

## Unique per source (high-value, non-redundant)

### Codex (benchmarks-anchored)
- **U1 (Codex, high):** Perceived productivity ≠ real productivity. METR RCT (n=16, 246 tasks, large OSS repos) found experienced devs **19% slower** with AI while forecasting and post-hoc believing they were **20–24% faster**. P8 receipts must be measured deltas, not subjective "wow." ← Sharpens the Sutherland framing: quantify, don't decorate.
- **U2 (Codex, high):** Existing `core/benchmarks/REPORT-001.md` is `n=1`. It's real evidence but NOT universal claim material. Don't let hero-lines outrun the sample.
- **U3 (Codex, high):** `project_trident_combo_policy.md` not found by repo-only scan — because it lives in Claude's auto-memory (`~/.claude/projects/…`), invisible to Codex/Gemini/Cursor users. **Cross-platform gap**: promote this memory file to `.planning/policies/trident-combo.md` so non-Claude platforms can read it too.

### Gemini (theory-anchored)
- **U4 (Gemini, high):** Sutherland signaling theory is the direct theoretical basis for session receipts — users assign higher trust to outputs when the "costly signal" (3 AIs × 47s) is visible. Makes the "hero number" a feature, not decoration.
- **U5 (Gemini, high):** Specificity+priority ordering is a proven enterprise NLU rule-engine pattern (Filter → Sort by Priority → Sort by Specificity → Execute). Item 2 should specifically add both `priority` AND pattern-length tiebreak, not just priority.

### Architect (repo-aware)
- **U6 (Architect, critical):** `isInstalled` cache in `audit-roster.js:70` is per-process. The CLI wrapper is a new process per invocation → cache always cold. Memoize across the roster loop at startup within orchestrator run.
- **U7 (Architect, medium):** `cross-dispatcher.js::buildRequest` stamps `new Date().toISOString()` inline. Parallel fan-out will have 3 different timestamps. Pass a canonical `runStamp` from orchestrator so all three requests share it — avoids skew in receipts.
- **U8 (Architect, medium):** `session-end.sh` savings-reframe (lines 286–303) already computes token savings. Receipt hero-line should pull from that schema, not invent a parallel cost model.

### Explorer (inventory)
- **U9 (Explorer, high):** `codex/` package has **no MCP config** — only `.codex/config.toml` + instructions text. The CLI wrapper is the **only** path to Trident for Codex users. Elevates Item 8's priority.
- **U10 (Explorer, high):** `mcp-server/package.json:scripts.test` is `node test.js` — does NOT glob all test files. Peer test files (`test-*.js`) are invoked via `node --test` separately. CI must explicitly run both paths or the 36-test cross-dispatcher suite silently drops. **Already wired in check-all.sh, but fragile — document.**
- **U11 (Explorer, medium):** `test-intent-router.js:56` shadow-regression test is positional ("cross-critique is declared before critique so match-order wins"). After Item 2, rewrite the test to assert priority explicitly — the current comment at line 107 ("first match wins, array-order is stable") becomes false.
- **U12 (Explorer, medium):** `session-start.sh:37` creates `.ijfw/memory/`, `.ijfw/sessions/`, `.ijfw/index/`. Add `.ijfw/receipts/` to that list when Item 6 ships.

---

## Disputed / contested

None — the four sources converge tightly. Codex's "transfer evidence" caveat on C5 is a refinement, not a contradiction.

---

## Open questions (user input needed before plan-phase)

1. **2s abort UX language** (C4) — keep as aspirational "2s abort" copy or rewrite as "auto-proceed unless overridden"? Recommended: rewrite — truthful beats aspirational.
2. **CLI distribution** — second bin in `mcp-server/package.json` alongside `ijfw-memory`, or new `@ijfw/cli` package? Recommended: second bin (zero-deps, one install).
3. **`swarm.json` default generation** — write at install time (`scripts/install.sh`) or lazy on first orchestrator call? Recommended: lazy first-use (works even if install was manual).
4. **Receipts cost model** — pull from existing `sessions.jsonl` schema (U8) or compute inline? Recommended: pull (one cost model in the tool).
5. **`.planning/policies/trident-combo.md`** — promote from Claude auto-memory (U3)? Recommended: yes. Makes the rule visible to non-Claude tooling and to cross-audit itself.

---

## Scope changes to PHASE8-SCOPE.md before plan-phase

1. **Merge Items 1 and 8** into unified "executable orchestrator + `bin/ijfw` entry + platform rules one-liners."
2. **Reorder build sequence** per consensus: Item 2 → Item 3 → Item 5 → Item 1+8 → Item 6 (parallel-safe with 1+8) → Item 4 → Item 7.
3. **Add receipts schema detail** — append-only JSONL, piggyback on `sessions.jsonl` schema where overlapping.
4. **Add U3 follow-through:** promote combo policy to `.planning/policies/trident-combo.md`.
5. **Add U9 detail:** codex/ package needs explicit mention that CLI wrapper is the sole Trident path.
6. **Add U6 to orchestrator tasks:** memoize `isInstalled` across probe loop.
7. **Reword success criteria around receipts** per U1: measured deltas over subjective wow.
8. **Revise estimate:** 6-8h was correct before C1 unification; now 5-7h with unified 1+8.

---

## Verdict

**Block v1 scope. Revise to v2 per consensus changes above. Resolve open questions. Then plan-phase.**
