# Phase 8 — scope lock

**Theme:** "Trident, enforced · visible · everywhere."

Close the enforcement + visibility + parity gaps surfaced by the Phase 7 dogfood. Make the invisible value visible (Sutherland), keep the zero-friction defaults (Krug), and deliver the same wow across all 7 platform packages (Donahoe).

## Tier A — locked in P8

### Enforcement

1. **M3 — executable cross-orchestrator.** New capability (MCP tool OR small CLI wrapper `ijfw cross <mode> <target>`) that owns probe → family-diversity pick → auto-fire externals → dispatch Claude specialist swarm → wait → merge → archive. Runbooks shrink to a one-line invocation. Auto-fire becomes impossible to skip because code does it, not prose. Kills the "got lazy on another project" regression class.

2. **L1 — intent-router specificity scoring.** Explicit `priority` field per INTENTS entry (specific cross-* = 10, generic verbs = 1). Matches sort by priority then array order. Kills shadow-class bugs like cross-critique falling through to generic critique.

3. **Trident combo policy — family diversity picker.** Implement the lineage-family algorithm from `project_trident_combo_policy.md` in `audit-roster.js::pickAuditors({strategy:'diversity'})`. Default external combo = 1 OpenAI + 1 Google excluding caller's family. OSS auditors float as `--expand`. Batch=2 external default, cap=4.

4. **M4 — Trident default-fire reconcile.** Fire-immediately with 2s abort window; no "which combo?" prompt when family-diversity pick is unambiguous. Prompt only for partial roster or explicit `--confirm`.

5. **Swarm roster as config.** `.ijfw/swarm.json` (or extension of audit-roster.js) declares which specialist subagents are active per project type. Defaults by language (Node → code-reviewer + silent-failure-hunter + pr-test-analyzer; typed codebases → add type-design-analyzer). Caller leg of the Trident becomes data, not prose.

### Visibility

6. **Session receipts + hero numbers.** After every `/cross-*` run, append `.ijfw/receipts/<ts>-<mode>.md` with hero line: "3 AIs · 47s · 6 findings, 2 consensus-critical · ~8K tokens saved vs re-running Claude 3×". Aggregated view via `/ijfw-status` shows session-level totals. Makes the invisible visible (Sutherland).

7. **Auto-critique on commit.** `/ijfw-commit` (or a post-commit hook) silently spawns `/cross-critique` on the diff in background. Findings surface after the commit completes as a FYI — never blocking. The commit happens; the review comes along for free. This is the flagship wow moment for a new user.

### Cross-platform parity

8. **`ijfw cross <mode> <target>` CLI wrapper.** Pure Node, zero-deps, callable from any shell. Platform rules files (cursor, windsurf, copilot, codex, gemini) all get a one-line addition: "to cross-audit, run `ijfw cross audit <target>`." Non-Claude platforms get full Trident via the CLI, even without the intent-router nudges. Closes the "only Claude gets the intelligence" gap.

## Tier B — polished pass (post-P8 audit)

- `ijfw demo` — canned 30-second first-run wow demo.
- Timeout / hang handling for auditors (graceful degradation, not hanging session).
- Prompt-caching on cross-dispatcher templates (free token savings).
- Live-fire test: new-machine bootstrap, uninstall clean exit, RTK coexist path — add to `scripts/check-all.sh` or new `scripts/smoke-external.sh`.
- Coverage sweep: inventory untested hooks/skills/paths; pick what's worth adding.
- Intent phrase gap audit: common phrases that miss ("I'm stuck", "is there a better way", "help me understand").
- Non-Claude platforms: audit each package against the universal 15-line promise vs what Claude gets — decide per-gap whether to port or to honestly narrow.

## Tier C — deferred (P9+)

- Cross-project audit (memory backlog: `project_cross_project_search.md`).
- Team-tier memory.
- `/cross-audit` on past sessions via the memory journal (retroactive Trident).

## Success criteria

- `ijfw cross <mode> <target>` runs end-to-end on all 7 platforms.
- Family-diversity picker selects correct combo for every caller identity.
- Shadow-class router bugs eliminated (re-run the shadow-regression tests; add new ones for the priority field).
- One receipt file per cross-run; `/ijfw-status` shows session totals.
- Post-commit cross-critique fires on at least one real commit in the P8 branch itself (eating own food).
- All new code covered by `node --test`; `scripts/check-all.sh` green.

## Estimated scope

~6-8h wall time with parallel subagent swarm. Larger than P7 because of the cross-platform CLI wrapper and the family-diversity refactor.

## Audit gate

After scope lock: fire `/cross-research` (not audit — this is design-mode thinking) on this scope via Codex + Gemini to stress-test the family-diversity heuristic and the CLI-wrapper approach before implementation. Same plan-audit-replan loop as P7, which caught 9 findings.
