# IJFW — Session B Handoff (Phase 3 final batch)

**Date written:** 2026-04-14 (end of Session A)
**Status:** Phase 3 items #0, #3, #8, #6, #2 SHIPPED to `main`. Two items remain: **#5 benchmark harness** and **#4 npx installer**.

---

## Read first (15 min)

1. `.planning/phase3/PHASE3-PLAN.md` — **v2 post-audit plan** (canonical). All audit decisions baked in at the top.
2. `.planning/phase3/AUDIT.md` — audit rationale. Critical issues #1–#5 are DONE in Session A; #4 Arm B skill gate + benchmark cost cap are carry-overs.
3. `.planning/phase3/research-benchmark-harness.md` — task design, statistical methodology, token source of truth
4. `.planning/phase3/research-npx-installer.md` — package.json, install.js flow, marketplace merge details
5. `PHASE3-HANDOFF.md` — original phase context (gotchas still apply)

---

## State of the world (Session A outcomes)

| Commit | Item | Tests | What landed |
|--------|------|-------|-------------|
| `1c71e41` | #0 #3 | 47 | CLAUDE.md MCP cap 4→≤8; verified install merge Cursor/Windsurf/Copilot |
| `8d94586` | #8 | 54 | Team tier `.ijfw/team/` — ranks above personal; new `readTeamKnowledge` |
| `5269f4e` | #6 | 63 | JSONL schema v2 (tokens+cost+reserved prompt_check fields); `ijfw_metrics` MCP tool; `/ijfw-metrics` slash command |
| `9f71b8c` | #2 | 83 | `mcp-server/src/prompt-check.js` detector; UserPromptSubmit hook (severity1-aware); `ijfw_prompt_check` MCP tool; 6 platform rules files extended |

- **MCP tool count now 7/8** (new cap). Tools: `recall, store, search, status, prelude, metrics, prompt_check`.
- **Hooks registered:** SessionStart, PreCompact, Stop, PreToolUse, PostToolUse, **UserPromptSubmit** (new).
- **All `scripts/check-all.sh` green.** Plugin cache rsynced + MD5 parity verified at end of Session A.

---

## Session B work — 2 items, ~11h estimated

### ITEM #5 — Benchmark harness (5h estimated)

**Pre-step (15 min) — MUST do first per audit critical issue #4:**
`IJFW_TERSE_ONLY=1` is not honored anywhere. Arm B of the benchmark would measure nothing. Before writing the runner:
- Edit `claude/skills/ijfw-core/SKILL.md` to add a one-line rule: `If IJFW_TERSE_ONLY is set, ignore all non-terse rules below (verbosity only).`
- Verify line-cap still passes (≤55 lines).
- Commit separately as pre-benchmark fix.

**Scope:** scaffold + 4 tasks (one per critical category). Remaining 10 tasks deferred to Phase 3.5.

**Files to create (under `core/benchmarks/`):**
- `run.js` — runner; spawns `claude -p --output-format json` per (task, arm, epoch); parses `total_cost_usd` + `usage`; writes JSONL
- `verify.sh` — dispatcher calling per-task `verify.sh`
- `report.js` — reads JSONL, emits markdown table per research §6
- `README.md` — how to run + stat methodology caveats
- `tasks/01-bug-paginator/` — bug-fix single-file (Python, off-by-one)
- `tasks/07-refactor-dedupe/` — refactor; tests stay green
- `tasks/10-explore-ratelimit/` — explore (file-path match)
- `tasks/11-memory-store/` + `12-memory-recall/` — paired memory test

**Per-task fixture layout:**
```
tasks/NN-name/
├── README.md          # prompt (identical across arms)
├── repo/              # starter code, git-init'd
├── tests/hidden/      # verifier runs these
├── verify.sh          # exit 0 = pass
└── manifest.json      # {category, max_turns, timeout_s, allowed_tools}
```

**Arm definition (in `run.js`):**
```js
const arms = {
  A: { env: { CLAUDE_DISABLE_PLUGINS: '1' } },   // baseline (verify this env var exists!)
  B: { env: { IJFW_TERSE_ONLY: '1' } },           // terse rules only
  C: { env: {} }                                   // full IJFW
};
```

**Statistical design:**
- Paired across arms (same task, all 3 arms)
- n=**2 epochs** per (arm, task) for scaffold → 24 runs for 4 tasks × 3 arms × 2 epochs
- Paired bootstrap 95% CI on deltas (C−A, C−B, B−A)
- State in report: "scaffold; wide CIs expected; see Phase 3.5 for full suite"

**Critical: cost cap (audit fix):**
Add `--max-cost-usd N` flag to `run.js`, **default 10**. Abort immediately if running total exceeds cap. Never blow past $10 without explicit flag.

**Token source of truth:** `claude -p --output-format json` final-envelope `total_cost_usd` + `usage` block. Research §4.

**Verification:**
- `node core/benchmarks/run.js --task 01-bug-paginator --arm C --epochs 1 --dry-run` → validates fixture without running Claude
- With `--really --max-cost-usd 2`: one actual run emits valid JSONL
- `node core/benchmarks/report.js core/benchmarks/runs/*.jsonl` → renders markdown

**Risks (carry-over from audit):**
- Arm A env var (`CLAUDE_DISABLE_PLUGINS=1`) — verify it actually disables IJFW in Claude Code before running anything. If not, baseline isn't isolated.
- 2 epochs → wide CIs. Document, don't hide.

**Commit + merge + push** as `phase3/benchmark-scaffold`.

---

### ITEM #4 — `@ijfw/install` npx installer (5h estimated)

**Scope:** publishable package, **hold the actual `npm publish`** until a deliberate follow-up.

**Files to create (under `installer/`):**
- `package.json` — name `@ijfw/install`, zero runtime deps, 2 bin entries
- `src/install.js` — main flow
- `src/uninstall.js` — reverse install; preserves `~/.ijfw/memory/` unless `--purge`
- `src/marketplace.js` — JSON deep-merge `~/.claude/settings.json` for `extraKnownMarketplaces.ijfw` + `enabledPlugins["ijfw-core@ijfw"]`
- `README.md` — quickstart
- `.npmignore` — keep tarball <100KB
- `test.js` — 5 smoke tests (see below)

**package.json skeleton:**
```json
{
  "name": "@ijfw/install",
  "version": "0.3.0",
  "type": "module",
  "bin": { "ijfw-install": "./dist/install.js", "ijfw-uninstall": "./dist/uninstall.js" },
  "files": ["dist", "README.md"],
  "dependencies": {},
  "devDependencies": { "esbuild": "^0.23" },
  "scripts": { "build": "esbuild src/install.js src/uninstall.js --bundle --platform=node --target=node18 --outdir=dist --format=esm" },
  "engines": { "node": ">=18" }
}
```

**install.js flow (9 steps per research):**
1. Parse flags: `--yes`, `--dir`, `--no-marketplace`, `--branch`, `--purge`
2. Preflight: Node ≥18, `git`, `bash`, not Windows-without-WSL. Fail fast with actionable messages (positive-framed).
3. SIGINT handler: `fs.rm` partial target dir — BUT only if dir was just created this run (guard `--dir` pre-existing content).
4. Resolve target: `IJFW_HOME` env || `~/.ijfw`
5. Clone (depth 1) or `git -C <dir> pull --ff-only` if exists. Argv-form spawn, not shell-string.
6. `spawn('bash', ['scripts/install.sh'], { cwd: dir, stdio: 'inherit', env: { ...process.env, IJFW_NONINTERACTIVE: process.env.CI ? '1' : '' } })`
7. Marketplace merge via `src/marketplace.js` — read settings.json, deep-merge, atomic `.tmp` + rename. Skip if `--no-marketplace`.
8. Print positive-framed summary.
9. Exit 0.

**uninstall.js:** reverse step-by-step. PRESERVE `~/.ijfw/memory/` unless `--purge`.

**marketplace.js deep-merge:**
```js
settings.extraKnownMarketplaces = settings.extraKnownMarketplaces || {};
settings.extraKnownMarketplaces.ijfw = { source: { source: "github", repo: "TradeCanyon/ijfw" }};
settings.enabledPlugins = settings.enabledPlugins || {};
settings.enabledPlugins["ijfw-core@ijfw"] = true;
// Do NOT delete any other keys. Atomic write.
```

**Tests (`installer/test.js`):**
1. Preflight fails cleanly on Windows-without-WSL
2. Clone-then-build produces `dist/install.js` and `dist/uninstall.js`
3. `node dist/install.js --dir /tmp/x --no-marketplace` clones+runs install.sh, exit 0
4. Pre-existing `~/.ijfw/memory/` survives a re-run (no data loss)
5. `node dist/uninstall.js --dir /tmp/x` reverses config edits; `memory/` preserved without `--purge`; removed with `--purge`
6. Tarball `npm pack` reports <100KB

**npm scope confirmed unclaimed** (`npm view @ijfw/install` → 404 at Session A). Registering is part of publish, NOT this phase.

**Important: DO NOT run `npm publish` in Session B.** Build, test, commit. Publish in a deliberate follow-up with 2FA + provenance.

**Commit + merge + push** as `phase3/npx-installer`.

---

## Carry-over audit items to address opportunistically

1. **Extend `scripts/check-positive-framing.sh`** — add `installer/`, `core/benchmarks/`, `mcp-server/src/prompt-check.js` to its path list. One-line diff.
2. **Plugin cache rsync** — any `claude/` change in Session B: `rsync -a --delete claude/ ~/.claude/plugins/cache/ijfw/ijfw/1.0.0/` + MD5 parity check. Include in per-item verification gate.
3. **Remove dead code** `appendToKnowledge` in `mcp-server/src/server.js` (unused since Phase 1; auditor flagged). Trivial cleanup — include in a Session B commit if context allows.
4. **Arm A isolation verification** — `CLAUDE_DISABLE_PLUGINS=1` may or may not actually disable IJFW. Verify empirically before trusting baseline numbers.

---

## Phase 3 exit criteria (end of Session B)

- [ ] All 7 Phase 3 items shipped to `main` (or deferred to Phase 4 with docs)
- [ ] Test count ≥ 88 (83 from Session A + ≥5 installer tests)
- [ ] `scripts/check-all.sh` green
- [ ] `npm pack` tarball <100KB
- [ ] One real benchmark run JSONL line produced and report rendered
- [ ] `PHASE3-HANDOFF.md` archived; new `PHASE4-HANDOFF.md` written with deferred items (#7 FTS5, #9 vectors, 10 more benchmark tasks, Windows-native install, automated npm publish)

---

## Recommended Session B sequence

**Hour 0–0.25:** Read this doc + PHASE3-PLAN.md + AUDIT.md
**Hour 0.25–0.5:** Pre-step — add `IJFW_TERSE_ONLY` handling to `ijfw-core/SKILL.md`, commit
**Hour 0.5–5.5:** #5 benchmark scaffold (runner, 4 tasks, report), dry-run verified, commit
**Hour 5.5–10.5:** #4 npx installer (package + tests, no publish), commit
**Hour 10.5–11:** Write `PHASE4-HANDOFF.md`, final `check-all.sh`, push main

---

**You have everything. Next session: start by reading `.planning/phase3/PHASE3-PLAN.md` and this file, then execute per the Session B sequence above. Don't start on main — one feature branch per item.**
