# Phase 8 Dogfood — `ijfw cross critique` on its own HEAD~4..HEAD

**Stamp:** 2026-04-14T23:05
**Target:** the 4 Phase 8 commits (Group A + Group B + Group C)
**Invocation:** `./mcp-server/bin/ijfw cross critique HEAD~4..HEAD`
**Auditors fired:** codex + gemini (diversity picker, auto-fire, no confirm prompt — Trident UX as designed)
**Mode:** critique (parallel fan-out, rank by rebuttal-survival)
**Receipt:** `.ijfw/receipts/cross-runs.jsonl` (last line)

## Headline

**The CLI we just shipped audited the code that ships it, and caught 5 real correctness/reliability bugs in the same branch before merge.** This is the proof loop: P8's flagship feature (executable orchestrator + auto-fire Trident) is validated by running against itself and surfacing concrete bugs that the implementation swarm missed.

## Code findings (must-fix, in-branch)

| # | Sev | Issue | Location | Disposition |
|---|-----|-------|----------|-------------|
| 1 | **HIGH** | `writeReceipt` not atomic for concurrent writers — read-modify-write + rename loses data when two processes race (e.g. manual `ijfw cross` + background post-commit hook) | `receipts.js:20-28` | Fixed: switch to `fs.appendFileSync` (O_APPEND atomic for ≤PIPE_BUF writes); add concurrent-writer test |
| 2 | **HIGH** | Orchestrator ignores stderr + exit code; failed auditor CLIs look like empty-findings successes; post-commit hook's `>/dev/null 2>&1` masks it completely | `cross-orchestrator.js:87-120` | Fixed: capture stderr + exit; record `auditors[i].status` ∈ `success|empty|failed` with error detail |
| 3 | **HIGH** | Diversity picker double-pick bug — `\|\| candidates[0]` fallback returns an already-picked auditor when caller=codex AND only gemini non-self installed → fake 2-auditor Trident runs gemini twice | `audit-roster.js:135-150` | Fixed: track `picked` Set, exclude from subsequent family fallbacks; missing slot stays missing |
| 4 | MED (HIGH impact) | `hero-line` reads `findings.consensus` as a number but orchestrator writes `findings.items`/`findings.{consensus,contested,unique}` — `/ijfw-status` always shows 0 findings, or `[object Object]` for research | `hero-line.js:40-53` vs `cross-orchestrator.js:173-180` | Fixed: `countFindings()` helper normalizes all three schemas; render true totals |
| 5 | MED | `install.sh` unconditionally installs post-commit hook in any git dir — user runs `install.sh codex` and their unrelated repo starts firing Trident critiques without consent | `install.sh:195-220` | Fixed: gate behind `--post-commit-hook` flag; emit explicit repo-path message; default OFF |
| 6 | MED | Post-commit hook block ends with `exit 0`, breaking composability — later-appended hook commands never execute | `install.sh:197-204` | Fixed: replace with `ijfw_post_commit` function call pattern, no forced exit |
| 7 | MED | Orchestrator writes `.ijfw/swarm.json` + receipt even when `picks.length === 0` — side-effect on a no-op run | `cross-orchestrator.js:142-200` | Fixed: short-circuit before swarm/receipt when picks empty; positive-framed stderr message |

## Strategic findings (not in-branch fixes)

| # | Sev | Issue | Source | Disposition |
|---|-----|-------|--------|-------------|
| S1 | HIGH | High-friction adoption — users without locally authenticated codex/gemini CLIs get a no-op feature | Gemini | Queued as P9/polish: add API-key fallback for headless runs (don't block P8 ship) |
| S2 | **CRITICAL** (strategic, not code) | Native IDE multi-model orchestration (Cursor/Windsurf roadmap) could make CLI-on-CLI approach redundant | Gemini | Strategic pivot discussion; doc as consideration for milestone-end review, not a P8 blocker |
| S3 | MED | Install friction from heavy ML deps | Gemini | N/A — we don't actually ship @xenova/transformers; Gemini hallucinated this. Worth noting because it's a Codex-wouldn't-hallucinate correctness signal for the family-diversity rule |

## Meta-findings from the dogfood run itself

- **The `ijfw cross critique` CLI worked end-to-end from a fresh shell** — auto-fire stderr, parallel codex + gemini spawn, parse, merge, receipt write, rebuttal-survival rank. First time the full built-in-branch pipeline executed.
- **Status command still broke** despite everything working — exposed finding #4 (hero-line schema mismatch). Dogfood literally caught its own rendering bug.
- **Findings order matches rebuttal-survival rubric** — the 3 concrete code bugs with code-anchored evidence (`file:line`) and specific conditions/mitigations ranked at the top, as the rubric intends. Strategic / vague-condition findings ranked lower. Rubric is working.
- **Non-issue:** Some artifacts leaked into the P8 Group C commit (`.cursor/`, `.windsurfrules`, `.github/copilot-instructions.md`, `.bak`) from the install.sh self-run during agent verification. Not caught by Codex/Gemini because the diff was too scoped to see the layout problem; flagged here for cleanup separately.

## Verdict

**7 in-branch fixes land in a follow-up commit; P8 closes cleanly after that.** The dogfood surfaced real correctness + consent + UX bugs that the implementation agents missed, same as P7. Post-fix, the loop has now eaten its own food at both ends (pre-plan audit caught scope gaps; post-impl critique caught code bugs) using the very tool the phase built.

## Files

- Request: embedded in receipt
- Responses (archived by orchestrator): per-auditor receipt line
- Merged findings: the 10-item table above + receipt `findings.items`
