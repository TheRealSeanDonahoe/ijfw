# Phase 10 Scope + Plan — 4-way Trident pre-gate audit

**Stamp:** 2026-04-15
**Sources:** Codex (benchmarks), Gemini (citations), Architect (repo-aware), Explorer (file inventory)
**Target:** `PHASE10-SCOPE.md` v3 + `PLAN.md` + `ROADMAP.md` (47KB)

## Consensus critical findings (≥2 sources)

| # | Sev | Issue | Fix in PLAN-v2 |
|---|-----|-------|----------------|
| C1 | HIGH | Wave 10A-gd static guard MUST run LAST — listed as parallel-safe but will false-green if run before other sub-waves rewrite their files. | Explicit "runs last" constraint on Wave 10A header; 10A-gd waits on all other sub-waves. |
| C2 | HIGH | 7 on-demand skills not in Item 0 scope: `ijfw-review`, `ijfw-compress`, `ijfw-summarize`, `ijfw-team`, `ijfw-metrics`, `ijfw-auto-memorize`, `ijfw-critique`. 10A-gd.2 narration lint will produce WARN on all 7 with no close path. | New Wave 10A-sk — scan all 7 on-demand skills for `§` + `━` + emoji; apply narration-compliance rule where skill narrates; whitelist those that legitimately don't narrate. |
| C3 | MED-HIGH | status.md file overlap: Wave 10A-cmd.4 and 10A-st.1 both edit `claude/commands/status.md`. If parallel → conflict. | Serialize: 10A-st runs after 10A-cmd for status.md specifically. Documented in both sub-waves. |
| C4 | HIGH | Item 4 (principle audit) has no lens-injection mechanism in the dispatcher — `getTemplate(mode, angle)` has no `lens` slot. 30 runs would be lens-agnostic. | Step 10E.1 defines convention: lens text prepended to target as `## Audit lens\n\n<Krug/Sutherland/Donahoe definition>\n\n` before calling dispatcher. No dispatcher change needed. |
| C5 | MED | session-start.sh contains `━` (U+2501) box-drawing chars — violates "weird Unicode dividers" rule. Explorer confirmed 548-line file with multiple `━` dividers. | 10A-hk.1 (hooks wave) explicitly removes `━` dividers; replaces with `==` ASCII. 10A-gd lint catches `━` alongside `§`. |
| C6 | MED | ijfw-workflow skill uses `Q1/Q2/D1-D6` ad-hoc labels + emoji `🔍` on audit gates. Violates Phase/Wave/Step convention + banned-chars rule. | 10A-wf.1 rewrite replaces Q1/Q2/D1-D6 with Phase/Wave/Step pattern and drops emoji per ownership-discipline rule. |
| C7 | MED | Item 4 hero-line render: current `renderHeroLine` aggregates ALL receipts; 30 principle-audit runs will produce meaningless "1800s / 100+ findings" hero. | Step 10E.0 (new) — purge `.ijfw/receipts/cross-runs.jsonl` before the 30-run audit so hero reflects only audit. OR add `--last N` filter to cmdStatus. Default: purge + archive the old file to `.ijfw/receipts/pre-p10-audit.jsonl.bak`. |
| C8 | MED | `installer/README.md` + `installer/src/install.js` terminal strings (lines 124-143) NOT in Item 0 scope — user-facing for every npm install path. | New Wave 10A-in — installer surfaces (README + install.js console output strings + post-install summary). |

## Unique per source (non-duplicative)

### Codex (benchmarks)
- **U1:** Prompt caching saves 90% on cache hits (Anthropic). Min threshold 1024 tokens for Sonnet 4.5; smaller prompts silently don't cache. Our system prompts from `getTemplate` are ~300-500 tokens — **below threshold**. Item 2 must verify length OR pad to threshold OR accept that caching won't activate. **Plan impact:** document this in 10D.1; measure actual token count of assembled system+format+target.
- **U2:** Anthropic response includes `cache_creation_input_tokens` + `cache_read_input_tokens` — receipts schema can record cache behavior directly. Add to receipts.js schema in Wave 10A-rx.
- **U3:** Tool definition changes invalidate entire cache hierarchy. If we ever add tool-calling to the dispatcher, cache strategy needs rethink. Document as V2 concern.
- **U4:** 5-user live-tests catch only ~85% of 31%-frequent issues; 10%-frequent issues need 18 users. **Plan impact:** Item 1 parity live-test is inherently incomplete — document the limitation in `LIVE-TEST-RESULTS.md` so we don't over-claim.
- **U5:** Don't treat Trident consensus as ground truth without line-level evidence (OpenAI's SWE-bench re-audit found 59% of benchmark failures were actually bad tests). **Plan impact:** Item 4 findings with no file:line reference must be severity-downgraded.

### Gemini (citations)
- **U6:** Polish IS the costly signal (Sutherland). Narration is not cosmetic — it's trust-building. Reinforces Item 0 priority.
- **U7:** Nielsen 1st heuristic — visibility of system status. Silence = crash in CLI. Reinforces narration cadence.
- **U8:** Pre-release quality gates prevent reproducibility crisis. Item 4 publish gate is standard software hygiene, not over-engineering.

### Architect (repo-aware)
- **U9:** Item 3d `ijfw doctor` — `scripts/doctor.sh` already exists (81 lines) at check-all.sh line 39. `/doctor` command delegates to it. The P10 `ijfw doctor` CLI is a wrapper around existing probe + addition of live CLI/API-key checks. Legitimately polish, not feature. ✓ feature-freeze holds.
- **U10:** Item 3e self-source guard — `.gitignore` already documents problem (lines 15-18). Implementation is trivial: `.ijfw-source` marker file at repo root + check in `install.sh` after `REPO_ROOT` assignment (~line 18).
- **U11:** Item 3f cost budget can ONLY be post-flight accumulation, not pre-flight estimate. Dispatcher has no token count before call returns. **Plan fix:** spec 3f as accumulate-from-prior-receipts, refuse new calls when `accumulated + estimated_next > budget`.
- **U12:** Historical audit/plan docs annotated `<!-- pre-P10-template -->` rather than rewritten — preserves audit trail, acceptable trade-off.

### Explorer (file inventory)
- **U13:** Current state counts for execution context: 
  - `ijfw-workflow/SKILL.md` = 238 lines
  - `ijfw-commit/SKILL.md` = 22 lines
  - `ijfw-handoff/SKILL.md` = 28 lines
  - `session-start.sh` = 548 lines (largest rewrite target)
  - `cross-orchestrator-cli.js` = 280 lines
  - 21 `.md` files in `claude/commands/`
  - 7 on-demand skills (see C2)
  - 45 `.md` files in `.planning/`
  - 120 lines `README.md` (leads with git clone, not npm install)
  - 87 lines `PUBLISH-CHECKLIST.md` (last updated 2026-04-14, pre-P7)
- **U14:** Current `cross-runs.jsonl` has 7 entries — clean slate for Item 4's 30-run purge-and-reset approach.
- **U15:** No CHANGELOG.md exists. 3g creates from scratch.
- **U16:** `ijfw --help` and `ijfw cross --help` have NO explicit handlers — unknown commands fall through to error exit. 3b must actually add the handlers, not just harmonize existing text.

## Plan adjustments (written into PLAN-v2)

1. **Wave 10A header:** explicit "10A-gd runs LAST" constraint.
2. **New Wave 10A-sk:** 7 on-demand skills scan + narration compliance.
3. **New Wave 10A-in:** installer surfaces (README + install.js console strings).
4. **Serialize 10A-cmd ↔ 10A-st** on `status.md` (10A-st waits on 10A-cmd).
5. **10A-gd lint:** add `━` (U+2501) and emoji block to banned-chars list alongside `§`.
6. **10A-wf.1:** explicit replacement of Q1/Q2/D1-D6 with Phase/Wave/Step; drop `🔍` and any other emoji.
7. **New Step 10E.0:** purge cross-runs.jsonl to `.pre-p10-audit.jsonl.bak` before Item 4; keep P10-audit runs pristine in a fresh file.
8. **Step 10E.1:** define lens-injection convention — prepend `## Audit lens\n\n<definition>\n\n` to target before dispatcher call. No dispatcher change required.
9. **10D.1 (prompt caching):** measure assembled prompt length FIRST; if below 1024 tokens, either pad or document that caching is expected-no-op for small prompts. Add `cache_creation_input_tokens` + `cache_read_input_tokens` to receipt schema (Wave 10A-rx).
10. **Item 3f (cost budget):** respec as post-flight accumulation. Refuse N+1 call if `accumulated(prior receipts) + estimated(next)` > `IJFW_AUDIT_BUDGET_USD`. Document that first-call surprise is unavoidable by design.
11. **Item 1 (live-test):** add explicit caveat to `LIVE-TEST-RESULTS.md` — "N-user test detects ~85% of common issues; rare issues may persist."
12. **Item 4:** findings without file:line evidence auto-downgraded one severity tier (per Codex U5).

## Verdict

**Block PLAN-v1 execution. Revise per 12 adjustments above into PLAN-v2. Then execute.**
