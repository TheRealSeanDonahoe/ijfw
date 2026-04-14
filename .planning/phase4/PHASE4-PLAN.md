# IJFW Phase 4 — Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement each wave task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make IJFW *intelligent, visible, and published.* Ship adaptive memory (FTS5 + vectors default-on + auto-memorize), token-optimization enforcement (`/mode brutal`, lazy prelude, output trimmer), intent routing, the npx installer publish, and fix all Krug/Sutherland/Donahoe principle gaps + all audit findings.

**Architecture:** Config-layer only. No proxies, no wire interception. Deterministic hooks + declarative skills + zero-dep MCP server (SQLite FTS5 + `@xenova/transformers` for vectors) + npx installer. Headroom ideas absorbed as config, not infrastructure.

**Tech Stack:** Node 18+ (ESM), SQLite (bundled in Node via `better-sqlite3`-free path — use FTS5 via `node:sqlite` when available, else fallback JSON index), `@xenova/transformers` for embeddings, Bash hooks, Markdown memory files.

---

## Success criteria

Phase 4 ships when:
1. `npx @ijfw/install` claims the `@ijfw` scope on npmjs.com and installs end-to-end in under 30 seconds.
2. One real benchmark run JSONL is committed to the repo with rendered markdown report.
3. Session-end hook prints a one-line savings reframe that is measurable against Arm A baseline.
4. Saying "brainstorm" auto-fires `ijfw-workflow` quick mode deterministically (no LLM guess).
5. At session end, IJFW auto-extracts 0-N structured memories and shows them to the user. Users consent on first run.
6. Vectors default-on via `all-MiniLM-L6-v2`; FTS5 search returns recalls in <10ms at 1000 entries.
7. `scripts/check-all.sh` green, test count ≥120 (currently 89).
8. All 8 P1 Krug/Sutherland/Donahoe/security/stability/reliability findings from audit closed.
9. Hook-wiring bug, schema versioning, tagged-release install, and settings.json resilience all fixed.

## Wave structure

| Wave | Theme | P1 items | Hours | Blocks | Plan file |
|------|-------|----------|-------|--------|-----------|
| **W0** | Foundations (no-regret fixes) | 7 | ~6 | All | `WAVE0-PLAN.md` (detailed) |
| **W1** | Live + visible (publish, benchmark, savings) | 7 | ~10 | W2+ | drafted, expand when W0 done |
| **W2** | Intelligent now (router, rewrite, brutal, lazy, trimmer) | 5 | ~9 | W3 | drafted |
| **W3** | Adaptive memory (FTS5 + vectors default-on + auto-memorize) | 10 | ~20 | W4 | drafted |
| **W4** | Uniform (platform parity, `/ijfw` landing, polish) | 6 | ~10 | W5 | drafted |
| **W5** | Proof + polish (P2 tail) | 13 | ~24 | — | drafted |
| **W6** | Deep cuts (optional P3) | 7 | ~22 | — | deferred |

Total P1: **~55 hours, 35 items**. With Wave 5 polish: **~79 hours**.

## Execution strategy

- **Wave 0 blocks everything** — run first, commit, merge to main.
- **Per-wave feature branches**: `phase4/wave-0`, `phase4/wave-1`, etc.
- **Per-item sub-branches** only when independent: `phase4/w1-publish`, `phase4/w1-benchmark`. Otherwise single wave branch with atomic commits.
- **Swarm execution via `superpowers:subagent-driven-development`** — fresh subagent per task, review between tasks.
- **After each wave**: green `scripts/check-all.sh`, plugin cache rsync + md5 parity, merge to main, push, archive wave plan to `.planning/archive/phase4/`.
- **Plan the next wave** only after the previous wave lands and we've learned what changed.

## Wave 0 — Foundations (detailed in WAVE0-PLAN.md)

Goals (no-regret fixes that unlock everything else):
1. **F1 (E1)** Fix `hooks.json` PreToolUse/PostToolUse script swap + add integration test.
2. **F2 (S1)** Cap `ijfw_memory_store` content size (4KB content, 1KB why/how_to_apply).
3. **F3 (S3)** Resilient settings.json parse in installer (survive comments/trailing commas).
4. **F4 (R1)** Add `<!-- ijfw-schema: v1 -->` marker to memory files + read-path migration.
5. **F5 (R2)** Installer pins latest tagged release, not `main` HEAD. `--branch main` remains as escape hatch.
6. **F6 (S5)** Secret redactor library + test vectors (the redactor, not yet wired to auto-memorize).
7. **F7 (KS5)** `/ijfw doctor` slash command wrapping existing `check-*.sh` with human-friendly output.

See `WAVE0-PLAN.md` for bite-sized TDD tasks.

## Wave 1 draft (expanded before execution)

1. **W1.1 (C3)** Publish `@ijfw/install@0.4.0-rc.1` to npm — claim scope, verify install.
2. **W1.2 (C2)** Real benchmark run: 01-bug-paginator across all 3 arms, 1 epoch each, `--max-cost-usd 2`. Commit JSONL + rendered report.
3. **W1.3 (C1 + G2)** Metrics JSONL v3 schema bump (adds per-turn compression ratio) + Stop-hook one-line savings reframe.
4. **W1.4 (B4)** Ship opinionated `.claudeignore` via `scripts/install.sh`.
5. **W1.5 (S7)** Privacy posture doc (`NO_TELEMETRY.md` + loud README paragraph).
6. **W1.6 (KS2)** First-run welcome message in installer success path.
7. **W1.7 (C3-final)** After 24h soak: publish `@ijfw/install@0.4.0`.

## Wave 2 draft

1. **W2.1 (A1)** Intent router hook — UserPromptSubmit decision table (regex → skill dispatch). Keywords: `brainstorm`, `build`, `ship`, `remember`, `review`, `critique`, `what if`, `should I`.
2. **W2.2 (A2)** Prompt-rewrite on vague detection — extend existing prompt-check to append structured question pack.
3. **W2.3 (B1)** `/mode brutal` — new mode in ijfw-core with 1-sentence/code-only discipline. Added to `/mode` command.
4. **W2.4 (B2)** Lazy-load prelude — session-start injects 50-token pointer; full recall via `ijfw_memory_prelude` tool on demand.
5. **W2.5 (B3)** PostToolUse output trimmer — deterministic bash/JSON/log collapse above thresholds.

## Wave 3 draft — Adaptive Memory

1. **W3.1 (H4)** FTS5 warm layer — SQLite index over `.ijfw/memory/**/*.md` with BM25 ranking. Rebuild on change.
2. **W3.2 (ST4)** Corruption auto-recovery for memory files.
3. **W3.3 (H5a)** Vector backend scaffold using `@xenova/transformers` + `all-MiniLM-L6-v2`. Lazy-load model on first query (P3 fix from audit).
4. **W3.4 (H5b)** Hybrid recall: FTS5 + vector similarity → rerank fused.
5. **W3.5 (H5c)** `/ijfw memory why` — shows recall provenance (FTS5/vector/hybrid + score).
6. **W3.6 (H2)** PostToolUse signal capture — deterministic error/stack-trace/retry log to scratch.
7. **W3.7 (H3)** Feedback-phrase detector in UserPromptSubmit — regex set + session-end promotion.
8. **W3.8 (H8 + H7)** Consent flow + secret redactor wired to auto-memorize.
9. **W3.9 (H1)** `ijfw-auto-memorize` skill — session-end LLM synthesizer → structured entries. Uses Haiku.
10. **W3.10 (H6)** `/ijfw memory audit` — review/approve/remove auto-extracted entries.
11. **W3.11 (H9 + H10)** Session-start "I remember X about this project" + startup memory count.

## Wave 4 draft — Uniform

1. **W4.1 (E2)** Platform parity: install.sh auto-wires rules files for Codex/Gemini/Cursor/Windsurf/Copilot same depth as Claude.
2. **W4.2 (D1)** `/ijfw` landing command — intent-grouped index (Build/Remember/Ship/Review/Configure).
3. **W4.3 (B5)** Auto-compact at 70% context via `PreCompact` hook (currently manual-only).
4. **W4.4 (A3)** `ijfw-critique` skill — counter-args/assumption flagging for decision-framed prompts.
5. **W4.5 (ST1)** `set -euo pipefail` uniform sweep across all hooks.
6. **W4.6 (ST3 + R3 + R6)** Hook error log + memory archive (>90d) + session-dir pruning (keep 30).

## Wave 5 draft — Polish + proof

W5 rolls up all P2s: E4 isolation verification · A4 real second-model cross-audit · C5 mode indicator · D2-D4 Krug polish · B6-B7 compression tuning · G1 benchmark CI · E3 publish CI · KS4 · KS6 · KS7 · KS8 · S2 · S4 · S6 · S8 · P2 · P3 · P4 · R4 · R5 · ST2 · ST5.

## Wave 6 — Optional deep cuts

F3 10 more benchmarks · F4 Windows-native · A5 skill A/B · E5 opusplan · C4 Headroom recipe.

---

## Cross-cutting invariants (enforced every wave)

- Every user-facing surface passes `scripts/check-positive-framing.sh`.
- Every wave ends with `scripts/check-all.sh` green and plugin cache rsync + md5 parity.
- Test count strictly grows per wave.
- No hook runs an LLM (LLM work lives in skills).
- No infrastructure runs in background (no proxies, no daemons beyond MCP stdio servers that Claude/etc already manage).
- Memory files keep `<!-- ijfw-schema: vN -->` header from W0 onward.
- `~/.ijfw/` stays the portable state dir. `.ijfw/` stays project-scoped.

## Principles scoreboard

Each wave closes principle gaps flagged in audit:

| Wave | Sutherland wins | Krug wins | Donahoe wins |
|------|-----------------|-----------|--------------|
| W0 | — | KS5 doctor | hook fix, resilient parse, schema versioning, tagged releases |
| W1 | C1 savings reframe, C2 proof number | KS2 welcome, C3 one-command install | C3 publish, S7 privacy |
| W2 | intent router (wow) | A2 rewrite coach | B3 noise collapse |
| W3 | "I remember X" flagship moment, vectors | H6 audit surface, H8 consent | H1 local auto-memorize |
| W4 | — | D1 landing command | E2 platform parity |
| W5 | A4 second-model wow | KS4/KS6/KS7/KS8 | publish CI, full isolation story |

---

## Risks (to mitigate during execution)

1. **`npm` scope grab race** — competitor publishes `@ijfw` between now and W1.1. *Mitigation:* W1.1 is first W1 task; if lost, rename to `@tradecanyon/ijfw`.
2. **Benchmark Arm A isolation may not work** (audit E4) — if `CLAUDE_DISABLE_PLUGINS=1` doesn't disable hooks, Arm A isn't a baseline. *Mitigation:* W1.2 empirically verifies first; if broken, introduces `IJFW_DISABLE=1` before running.
3. **Haiku API budget** for auto-memorize — if org doesn't have Haiku access. *Mitigation:* Make model configurable (`IJFW_AUTOMEM_MODEL`, default haiku); allow `off`; allow local Ollama path.
4. **Transformers.js on older macOS/Linux** — WASM SIMD requirements. *Mitigation:* feature-detect at install; fall back to FTS5-only with visible message.
5. **Schema migration from pre-W0 memories** — users upgrading mid-Phase-4. *Mitigation:* W0 read-path treats missing `ijfw-schema` header as v0 and migrates on next write. No data loss.

---

## How to resume mid-wave

1. `git branch` — identify in-flight `phase4/wave-N` branch.
2. Read `.planning/phase4/WAVE{N}-PLAN.md`.
3. Check off completed `[x]` tasks; the first `[ ]` is the next step.
4. Continue via `superpowers:subagent-driven-development` per the plan.
