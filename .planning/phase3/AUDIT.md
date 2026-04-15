<!-- pre-P10-template: historical, preserved as-is -->
# Phase 3 Plan — Audit

Date: 2026-04-14
Auditor: synthesized review against PHASE3-HANDOFF.md, CLAUDE.md, research docs, live codebase.

## Verdict: **FLAG** — proceed after addressing Critical Issues (≈45 min of plan edits). No blockers, several real gaps.

---

## Per-item verdicts

| # | Verdict | Top issues |
|---|---------|-----------|
| 3 verify | PASS | Scope tight. Note: `scripts/install.sh` is only 162 lines — plan cites "47–163", off-by-one. Research claim should be smoke-tested on a seeded config for all 3 platforms, not just a read. |
| 8 team tier | FLAG | (a) Violates handoff Convention #7 ("3 memory tiers, not more") — team is being added but plan doesn't explicitly call out that this supersedes the rule; document the override. (b) `.ijfw-gitignore` is the wrong file — the repo's `.gitignore` rules govern user projects. (c) Precedence "team > personal > global" asserted in README only; not enforced in `searchMemory` ranking logic (plan inserts team between knowledge and journal, which ranks it BELOW personal knowledge). Contradicts stated precedence. (d) Sanitizer must run on team content (prompt-injection vector — `sanitizeContent()` exists, confirm it's called). |
| 6 metrics | FLAG | (a) v2 schema breaks any v1 reader not yet tolerant; plan asserts "v:1 lines remain readable" but doesn't specify the v2 READER must also handle mixed files. Add explicit mixed-version test. (b) Pricing table is external state — where does it live? Hardcoded = stale; remote fetch = violates "no proxy / no network" stance. Spec this. (c) 0-session period returns what? Empty table must be positive-framed (e.g. "Ready to track — run a session"), not "No data." (d) Transcript parsing: path handling on cross-platform (spaces, unicode) not addressed. |
| 2 prompt-check | FLAG | (a) Hook latency stacking: session already has PreToolUse + PostToolUse + SessionStart hooks. Adding UserPromptSubmit with `node -e` cold-start (~80–150ms on macOS) blows the <50ms budget on first prompt. Benchmark cold-start specifically. (b) Codex has "No" hook capability per research §5 — plan just appends a rules section, but there's no runtime enforcement. Acceptance criterion for Codex is fuzzy. (c) Empty prompt, whitespace-only, emoji-only, non-ASCII, multi-line (>10KB pasted stack trace) — no test coverage listed. (d) Anaphora rule #2 requires "no recent referent" but the hook receives only the CURRENT prompt JSON, not conversation history — detection will over-fire. Research §3 acknowledges this but plan ignores. (e) severity1 coexistence check uses filesystem path — fragile if user uses different plugin dir or plugin is renamed. (f) Positive-framing CI will catch neither "vague" nor "sharpening" — but `additionalContext` text needs explicit check-positive-framing.sh extension. |
| 5 benchmarks | FLAG | (a) $ cost uncapped beyond `--really` flag. 60 runs (4 tasks × 3 arms × 5 epochs) at Opus rates could easily hit $50–150 — add explicit `--max-cost-usd` kill switch. (b) Arm A (`CLAUDE_DISABLE_PLUGINS=1`) — verify this env var actually exists in current Claude Code; otherwise baseline isn't isolated. (c) Paired bootstrap on n=5 is underpowered; CI will be wide. State this caveat in report. (d) Tasks live under `core/benchmarks/` but repo has no `core/` dir today — confirm new top-level is desired (not `benchmarks/` or `scripts/benchmarks/`). (e) No test that Arm B (`IJFW_TERSE_ONLY=1`) is actually respected by skills — that env var isn't referenced in `ijfw-core/SKILL.md` today. Must ADD handling before benchmark means anything. |
| 4 installer | FLAG | (a) `npm publish` supply-chain risk: no provenance, no 2FA requirement mentioned, no `--dry-run` verification step in plan. (b) `@ijfw/install` scope requires org ownership — is `@ijfw` scope registered? If not, 4h work blocks on npm admin. (c) SIGINT `fs.rm` of partial target can nuke user's existing `~/.ijfw/memory/` if it pre-exists and clone writes into it. Must check-before-clone. (d) Marketplace merge into `~/.claude/settings.json` is global user state — backup + atomic rename spec'd but no rollback on failure mid-write. (e) Windows-without-WSL: plan says "fail fast" — confirm message passes positive-framing CI ("Windows users: WSL recommended — docs at…" is OK; "Not supported" is not). |

---

## Critical issues (BLOCK until resolved)

1. **Ordering bug**: Plan builds #6 metrics BEFORE #2 prompt-check, but #2 introduces a new MCP tool (`ijfw_prompt_check`) and new hook that emits no metric. If metrics schema v2 is frozen at #6, #2 can't add `prompt_check_fired: bool` without bumping to v3. **Fix**: either define v2 with reserved fields for #2, or merge #2 and #6 schema changes.
2. **#8 precedence contradiction**: README states team > personal, code ranks team < knowledge. Pick one and align code + docs + test.
3. **#2 Codex scope**: Plan claims "cross-platform" but Codex gets only a rules-file paragraph with zero enforcement. State honestly: "6 platforms wired, 1 platform enforced (Claude), 5 advisory."
4. **#5 Arm B dead code**: `IJFW_TERSE_ONLY=1` not honored anywhere in current codebase — benchmark measures a phantom arm. Add skill-side gate before benchmark runs.
5. **#2 hook budget**: `node -e` cold-start will breach 50ms. Either persistent daemon or Bash-only regex detector.

---

## Missing items (in HANDOFF but not in plan)

- **Phase 3 item #7 SQLite FTS5** — correctly deferred, plan notes trigger.
- **Plugin cache propagation** (HANDOFF Gotcha #1) — `rsync` to `~/.claude/plugins/cache/ijfw/ijfw/1.0.0/` required after every `claude/` edit. Plan's 6 commits touching `claude/` never mention this. Add to per-item verification step.
- **`md5` hash check for cache parity** (HANDOFF §Quick verify) — belongs in per-commit verify loop.
- **Positive-framing CI extension** — new user-facing strings in #2 notice, #6 metrics output, #4 installer messages, #8 team README. Each item must include "check-positive-framing.sh passes" as exit gate.
- **Donahoe Loop audit gates** (Convention #5) — plan is linear (Build → verify). Handoff requires AUDIT gate between every stage. Either declare plan as a single "Build" stage (then one audit covers all 6), or insert mini-audits between items.
- **Cross-audit offer at gates** (Convention #6) — not mentioned.
- **Auto-CLAUDE.md / codebase index interaction** with new `.ijfw/team/` — team files indexed? Excluded? Decide.

---

## Test gaps

- **#8**: no test for team file with 4+ heading hashes (sanitizer regression); no test for symlinked `.ijfw/team/`; no test for CRLF line endings in committed team files.
- **#6**: no mixed v1/v2 JSONL test; no clock-skew test (session ends in different TZ); no 0-session test; no malformed JSONL line test (should skip, not crash).
- **#2**: no emoji/UTF-8/RTL/bidi tests; no >10KB prompt test; no "prompt that is itself code" test (fenced block with "fix this"); no test that severity1 detection actually triggers skip.
- **#5**: no test that Arm A isolation is real (plugin actually disabled); no seed/determinism test.
- **#4**: no test for pre-existing `~/.ijfw/memory/` preservation under re-install; no test for offline run (no network); no test for clone-interrupt + resume.

---

## Risk underestimates

- **Hook stacking cost** (§#2).
- **npm publish irreversibility** + scope ownership (§#4).
- **$ cost on benchmark** (§#5) — add hard cap, not just `--really` gate.
- **v2 schema across older pre-compact / session-end scripts** that may have been copied to `~/.claude/plugins/cache/...` but not rsync'd (§Missing Items).
- **MCP tool count**: current is 5 (`recall/store/search/status/prelude`). Plan adds `ijfw_metrics` (+1 = 6) and `ijfw_prompt_check` (+1 = 7). CLAUDE.md conventions say "MCP server: 4 tools max." **This is a hard convention violation**. Either consolidate (e.g. fold metrics into `status`) or amend the convention in CLAUDE.md. Plan must call this out.

---

## Integration risks with Phase 1/2

- Adding team source to `searchMemory` changes result ordering for every existing project that creates an empty `.ijfw/team/` dir inadvertently (e.g. tab-complete mkdir). Gate on at-least-one-file.
- `handlePrelude` cap math (20/60/200) changes existing prelude sizing — users relying on first-turn recall shape may see different output. Add a "prelude snapshot" test pinning pre- and post-team output for a known fixture.
- `check-positive-framing.sh` currently greps against `hooks/`, `commands/`, `skills/` — extend the path list to include `installer/`, `core/benchmarks/`, `mcp-server/src/prompt-check.js`.

---

## Scope issues

- **Over-scoped**: #5 five epochs × 4 tasks × 3 arms = 60 runs for "scaffold." Two epochs is enough to prove the pipeline; defer statistical rigor to Phase 3.5 alongside the remaining 10 tasks.
- **Under-scoped**: #2 Codex/Cursor/Windsurf/Copilot delivery is 1 line of plan each — realistic work is "write the `## Prompt Self-Check` section, lint it against 7 rules, test that each platform's existing rules file stays under its cap (universal=20, core=55)." Plan this out.
- **Under-scoped**: #4 uninstaller — "reverse install" is vague. What does un-merge of `settings.json` look like? Must preserve other plugins. Spec the diff.

---

## Acceptance criteria (one-sentence "done")

- #3: Seeded fake-server entries in cursor/windsurf/copilot MCP configs survive `install.sh` re-run on three platforms; verdict written to PHASE3-VERIFICATION.md.
- #8: With `.ijfw/team/decisions.md` present, `ijfw_memory_search "X"` returns tagged `[team:decisions]` result AND `prelude full` includes "## Team knowledge"; without it, no behavior change; 51/51 tests pass.
- #6: With ≥3 seeded sessions.jsonl lines (mix v1+v2), `/ijfw-metrics 7d tokens` prints a table, `cost` prints $ column, empty period prints positive-framed zero-state; 54/54 tests.
- #2: ≥2-signal vague prompt injects one-line positive notice; 1-signal or target-bearing prompt is silent; `*` prefix skips; severity1 presence skips; 62/62 tests + <50ms median on seeded 100-prompt bench.
- #5: `run.js --task 01 --arm C --epochs 1` emits one valid JSONL line with tokens+cost; `report.js` renders markdown; cost-cap flag aborts above threshold.
- #4: `node installer/dist/install.js --dir /tmp/x --no-marketplace` on a clean machine produces a working IJFW install; uninstall preserves seeded memory; tarball <100KB; no npm publish this phase.

---

## Time estimate reality check

| Item | Plan | Realistic | Delta |
|---|---|---|---|
| #3 verify | 0.25 | 0.5 | +0.25 (smoke tests across 3 platforms) |
| #8 team | 2 | 2.5 | +0.5 (precedence fix + sanitizer tests) |
| #6 metrics | 2 | 3 | +1 (pricing table decision + mixed-schema reader) |
| #2 prompt-check | 3 | 5 | +2 (latency benchmark, 5 platform rules files, edge-case tests, potential Bash rewrite if node-e too slow) |
| #5 benchmarks | 5 | 5 | 0 (if epochs reduced to 2) |
| #4 installer | 4 | 5 | +1 (scope registration, safer SIGINT handling, uninstaller spec) |
| **Total** | **16.25** | **21** | **+4.75** |

Likely overrun: #2 prompt-check (edge cases) and #6 metrics (pricing decision). If scoped realistically, this is a 2-session batch, not 1.

---

## Recommended plan edits (ordered)

1. Amend CLAUDE.md "4 tools max" convention OR fold metrics into `ijfw_status`. Decide before any build.
2. Coordinate #2 + #6 JSONL schema changes into a single v2 bump with reserved `prompt_check_*` fields.
3. Replace `node -e` in prompt-check hook with a persistent path or pure-Bash regex detector; benchmark cold-start first.
4. Fix #8 precedence: decide team > personal OR team < personal, align `searchMemory` insertion order + README.
5. Add `IJFW_TERSE_ONLY` handling in `ijfw-core/SKILL.md` BEFORE #5 benchmark or drop Arm B.
6. Add hard `--max-cost-usd N` flag to benchmark runner; default 10.
7. Add "rsync to plugin cache + md5 parity check" as a line in every item's Verification section that touches `claude/`.
8. Extend `check-positive-framing.sh` path list to `installer/`, `core/benchmarks/`, `mcp-server/src/prompt-check.js`, `.ijfw/team/` templates.
9. Confirm `@ijfw` npm scope ownership NOW (blocks #4).
10. Insert Donahoe Loop audit gates: at minimum one mid-batch audit after #8+#6+#2 before starting #5+#4.
11. Answer plan's 4 Open Questions. Recommended: (1) one branch per item ✅; (2) scaffold + 4 tasks ✅ but with 2 epochs not 5; (3) hold npm publish ✅; (4) default `signals` mode ✅.
12. Downscope #2 edge cases to a tracked follow-up if the latency rewrite is needed, so the batch still fits in one session.

---

## Approved as-is

- Item **#3 verify** (pending the 3-platform smoke test expansion — trivial).
- Build-order intuition: #8 before #2 (team feeds context) is correct.
- Deferral of #7 FTS5 and #9 semantic — correct per thresholds.
- "No automated npm publish this phase" — correct.
- Feature-branch-per-item + clean bisect — correct.
