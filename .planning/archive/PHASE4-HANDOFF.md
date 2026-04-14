# IJFW — Phase 4 Handoff

**Written:** 2026-04-14 (end of Phase 3 Session B)
**Status:** Phase 3 complete. All 7 Phase 3 items shipped to `main`.

## Phase 3 final state

| Item | Commit family | Landed |
|------|---------------|--------|
| #0 #3 | `1c71e41` | CLAUDE.md cap ≤8; Cursor/Windsurf/Copilot install merge verified |
| #8    | `8d94586` | Team tier `.ijfw/team/` |
| #6    | `5269f4e` | JSONL schema v2 + `ijfw_metrics` + `/ijfw-metrics` |
| #2    | `9f71b8c` | Prompt-check hook + `ijfw_prompt_check` MCP tool |
| pre-B | `b607d02` | `IJFW_TERSE_ONLY` gate in `ijfw-core/SKILL.md` |
| #5    | `27de9c0` | Benchmark harness scaffold (`core/benchmarks/`) + 4 task fixtures |
| #4    | `5220f6e` | `@ijfw/install` npx package + 6 smoke tests |

- **Tests:** 83 (check-all.sh) + 6 (installer) = **89**. Both suites green.
- **MCP tools:** 7/8 — `recall, store, search, status, prelude, metrics, prompt_check`.
- **Hooks:** SessionStart, PreCompact, Stop, PreToolUse, PostToolUse, UserPromptSubmit.
- **Installer tarball:** 1.1 KB dry-run (far under 100 KB cap). `dist/` added by `npm run build` before publish.
- **Plugin cache parity:** verified (md5).
- Dead code removed: `appendToKnowledge` in `mcp-server/src/server.js` (audit carry-over #3).

## Explicitly deferred to Phase 4

1. **#7 FTS5 warm layer** — SQLite FTS5 over `~/.ijfw/memory/`. Linear scan still <10ms at current scale; FTS5 pays off at ~500+ knowledge entries.
2. **#9 Vector recall** — optional cold tier. Gated behind `IJFW_VECTORS=1`, uses local embeddings; zero-deps promise preserved by keeping it optional.
3. **10 additional benchmark tasks** — scaffold covers 4 categories, full suite per `research-benchmark-harness.md` §6 needs 14 tasks × 3 arms × ≥5 epochs with paired design.
4. **Windows-native installer path** — currently recommends WSL. Native path via Powershell shim + `git-for-windows` detection.
5. **Automated `npm publish`** — CI job with 2FA + npm provenance + semver tag gating. Manual publish first to claim the scope.
6. **Arm A isolation verification** — empirically confirm `CLAUDE_DISABLE_PLUGINS=1` fully disables IJFW hooks + skills. If not, introduce a dedicated `IJFW_DISABLE=1` recognized by every hook + `ijfw-core`.

## Gotchas still live

- **Positive-framing guard** now covers `core/benchmarks/` + `installer/` + `mcp-server/src/prompt-check.js`. Any new user-facing surface: add to `SCAN=` in `scripts/check-positive-framing.sh`.
- **Benchmark runs cost money.** `run.js` defaults to `--max-cost-usd 10` and refuses to spawn claude without `--really`. Keep the cap; lower it for smoke tests.
- **Installer does NOT publish.** `npm publish` is a deliberate follow-up with 2FA. Building via `npm run build` is safe.
- **Memory preservation** on uninstall: default keeps `~/.ijfw/memory/` via tmp-stash + restore. Only `--purge` removes it.

## How to resume

1. Read `.planning/phase3/PHASE3-PLAN.md`, `.planning/phase3/AUDIT.md` for historical context.
2. Archived handoffs: `.planning/archive/{HANDOFF,PHASE3-HANDOFF,SESSION-B-HANDOFF}.md`.
3. Phase 4 scope is: ship the first real benchmark run, expand task suite, FTS5, publish the installer. Start with a new milestone plan (`gsd:new-milestone` or equivalent).

## Real benchmark: still needed

Session B did NOT burn the `--really` run the audit suggested as a verification gate. The scaffold is proven via `--dry-run` across multiple tasks/arms; a single real-money run is deferred so the next session can choose cost vs. signal deliberately. Recommended first run:

```bash
node core/benchmarks/run.js --task 01-bug-paginator --arm C --epochs 1 --really --max-cost-usd 2
node core/benchmarks/report.js core/benchmarks/runs/*.jsonl
```

## Exit criteria hit

- [x] 7/7 Phase 3 items shipped to `main`
- [x] Test count ≥ 88 (89 total)
- [x] `scripts/check-all.sh` green
- [x] `npm pack` tarball < 100 KB (1.1 KB)
- [x] `PHASE3-HANDOFF.md` + `SESSION-B-HANDOFF.md` archived
- [x] `PHASE4-HANDOFF.md` written (this file)
- [ ] Real benchmark run JSONL — **intentionally deferred**; scaffold validated via dry-runs
