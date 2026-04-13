# PHASE 3 — IMPLEMENTATION PLAN (v2 — POST-AUDIT)

Date: 2026-04-14
Author: synthesized from 4 parallel research docs (`research-*.md` in this dir)
Status: APPROVED for execution. Audit FLAG (`AUDIT.md`) addressed in this revision.

## Audit decisions baked in (v1 → v2 deltas)
1. **CLAUDE.md amended**: MCP "4 tools max" → "≤8 tools" (Phase 1 minimalism outgrown)
2. **JSONL schema v2** has reserved `prompt_check_*` fields up front — single bump for #6 + #2
3. **#2 prompt-check detector**: pure-bash regex (50ms budget); node fallback only on ≥2 bash trips
4. **#8 team precedence**: team > personal — `team` source FIRST in `searchMemory`, README aligned
5. **#5 Arm B**: add `IJFW_TERSE_ONLY` handling to `ijfw-core/SKILL.md` BEFORE benchmark runs
6. **Benchmark**: 2 epochs (not 5) for scaffold; `--max-cost-usd 10` hard cap default
7. **`@ijfw` npm scope** confirmed unclaimed; will register at publish time in Session B
8. **Session split**: Session A = #3, #8, #6, #2 (~10h) → mid-batch audit → Session B = #5, #4 (~11h)
9. **Per-item verification gates** (every item): `bash scripts/check-all.sh`, `bash scripts/check-positive-framing.sh` (path list extended), plugin cache rsync + md5 parity for any `claude/` change
10. **Codex prompt-check honesty**: 1 platform enforced (Claude Code), 5 advisory (Codex/Cursor/Windsurf/Copilot/Gemini get rules-file guidance + MCP tool where supported)

## Scope summary

| # | Item | Effort | Decision |
|---|------|--------|----------|
| 1 | Cross-project memory search | 2h | ✅ SHIPPED (commit 56fdeed) |
| 2 | Prompt-improver hook (cross-platform) | 3h | BUILD |
| 3 | Plugin merge re-verify | 0.25h | VERIFY ONLY — research confirms all 6 platforms already merge cleanly |
| 4 | `@ijfw/install` npx installer | 4h | BUILD |
| 5 | Three-arm benchmark harness | 5h | BUILD (scaffold + 4 of 14 tasks; remaining tasks deferred to Phase 3.5) |
| 6 | Token usage dashboard `/ijfw-metrics` | 2h | BUILD |
| 8 | Team memory tier `.ijfw/team/` | 2h | BUILD |
| 7 | SQLite FTS5 warm layer | — | DEFER to Phase 4 (trigger: >1000 entries) |
| 9 | Semantic vector search | — | DEFER to Phase 4 |

**Total work: ~21h realistic** across two sessions.

### Session A (~10h) — intelligence layer
0. **CLAUDE.md amend** (5 min) — bump MCP tool cap to ≤8
1. **#3 verify** (30 min) — three-platform smoke test, write VERIFICATION.md
2. **#8 team tier** (2.5h) — team > personal in searchMemory + prelude + sanitizer test + README
3. **#6 metrics dashboard** (3h) — JSONL v2 (with reserved prompt_check_* fields), `ijfw_metrics` tool, `/ijfw-metrics` slash command, mixed v1/v2 reader, 0-session zero-state
4. **#2 prompt-improver** (5h) — pure-bash detector, hook for Claude Code, rules-file extensions for 5 advisory platforms, MCP tool, severity1 coexistence detect, edge-case tests (UTF-8/emoji/long-prompt/code-prompt)
5. **MID-BATCH AUDIT** (15 min) — Donahoe Loop gate, run check-all.sh + manual smoke before Session B

### Session B (~11h) — proof + on-ramp
6. **#5 benchmark scaffold** (5h) — runner, 4 tasks, 2 epochs, `--max-cost-usd 10` hard cap, Arm B verified non-phantom (skill gate added in Session A)
7. **#4 npx installer** (5h) — `installer/` package, esbuild bundle, 2 bin entries, settings.json marketplace merge, SIGINT-safe
8. **FINAL AUDIT** (1h) — full check-all.sh + smoke test all 6 items + retroactive Nyquist if needed

Each item gets its own feature branch off main, atomic commit, merge to main, push. No batch commit — keeps bisect clean.

### Per-item verification gate (every item, no skipping)
1. Item-specific tests pass (counts under each item)
2. `bash scripts/check-all.sh` → all green
3. `bash scripts/check-positive-framing.sh` → clean (path list extended for new dirs)
4. If item touches `claude/`: `rsync -a --delete claude/ ~/.claude/plugins/cache/ijfw/ijfw/1.0.0/` + `md5` parity check on changed file
5. Atomic commit on feature branch → merge to main (no-ff) → delete branch → push origin main

---

## ITEM #3 — Plugin merge re-verify

**Goal:** Confirm research finding that Cursor/Windsurf/Copilot install paths merge (don't overwrite) user configs.

**Steps:**
1. Read `scripts/install.sh` lines 47–163 — confirm same node JSON-merge logic used for all three.
2. Smoke test: pre-seed `~/.cursor/mcp.json` with a fake server entry, run `bash scripts/install.sh`, verify both `ijfw-memory` AND the fake entry survive. Repeat for windsurf/copilot.
3. If merge correct → record verdict in PHASE3-VERIFICATION.md; no code change.
4. If broken → write minimal patch to `install.sh`, add test.

**Verification:** `bash scripts/check-all.sh` still 47/47.

**Risk:** None expected based on research.

---

## ITEM #8 — Team memory tier

**Goal:** `.ijfw/team/{decisions,patterns,stack,members}.md` — committed, faceted, surfaced to all platforms via MCP.

### Files modified
- `mcp-server/src/server.js` — add `readTeamKnowledge()`, register as 4th source in `searchMemory`, surface in `handlePrelude`
- `mcp-server/test.js` — 4 new tests (read empty, read with content, search hit on team source, prelude includes team block)
- `.ijfw-gitignore` — add comment block clarifying team/ is committed

### server.js sketch
```js
const TEAM_DIR = join(IJFW_DIR, 'team');
const TEAM_FACETS = ['decisions', 'patterns', 'stack', 'members'];

function readTeamKnowledge() {
  if (!existsSync(TEAM_DIR)) return '';
  const out = [];
  for (const facet of TEAM_FACETS) {
    const raw = readOr(join(TEAM_DIR, `${facet}.md`));
    if (raw) out.push(`### ${facet} (team)\n${raw}`);
  }
  return out.join('\n\n');
}
```

### searchMemory addition
Insert `{ name: 'team', content: readTeamKnowledge() }` AFTER knowledge, BEFORE journal — team ranks above personal recent journal noise.

### Prelude addition
Insert team block AFTER knowledge, BEFORE handoff. Cap at 20 lines for `summary`, 60 for `standard`, 200 for `full`.

### Tests (in test.js, after cross-project block)
```js
// Seed team file in TEST_DIR/.ijfw/team/decisions.md
// Restart server (HOME=fake), call search
// Assert team:facet appears tagged in results
// Assert prelude full mode includes "## Team knowledge"
```

### Migration / docs
- README.md gains a "Team memory" section (≤15 lines): how to opt in (`mkdir .ijfw/team; commit it`), what facets exist, scope precedence (team > personal > global).

### Verification
- `node test.js` → 51/51 (47 + 4 new)
- Manually: in /tmp/test-proj, seed team file, run prelude tool, eyeball output

### Risk
- Search ranking change could surprise users with existing memory. Mitigation: team is empty by default (no `.ijfw/team/` until user creates it), so no behavior change for existing projects.

---

## ITEM #6 — Token usage dashboard `/ijfw-metrics`

**Goal:** Capture input/output tokens per session; aggregate via MCP tool + slash command.

### Token capture strategy (research finding)
Claude Code stop hook receives `transcript_path`. Parse last assistant message for `usage` block: `{ input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens }`. This is the canonical source — survives across CLI versions.

Fallback: if `CLAUDE_CODE_INPUT_TOKENS` / `CLAUDE_CODE_OUTPUT_TOKENS` env vars are set, prefer them (cheaper than transcript parse).

### Files modified
- `claude/hooks/scripts/session-end.sh` — bump JSONL schema v=1 → v=2, add token fields. Read transcript via `node -e` if env vars absent.
- `mcp-server/src/server.js` — new `ijfw_metrics` tool; new `handleMetrics({period, metric})` handler.
- `claude/commands/metrics.md` — slash command, calls `ijfw_metrics` tool with sensible defaults.
- `mcp-server/test.js` — 3 new tests (parse empty JSONL, sum tokens by day, routing-savings calc with mock pricing table).

### JSONL schema v2
```json
{
  "v": 2,
  "timestamp": "2026-04-14T07:15:30Z",
  "session": 1,
  "mode": "smart",
  "effort": "high",
  "routing": "native",
  "memory_stores": 5,
  "handoff": true,
  "input_tokens": 18422,
  "output_tokens": 2140,
  "cache_read_tokens": 12003,
  "cache_creation_tokens": 0,
  "cost_usd": 0.0934
}
```

`v: 1` lines remain readable — handler treats missing token fields as 0.

### handleMetrics handler
```js
function handleMetrics({ period = '7d', metric = 'tokens' }) {
  // Read .ijfw/metrics/sessions.jsonl
  // Filter by period (today | 7d | 30d | all)
  // Group by day, return:
  //   tokens   → in/out/cached per day
  //   cost     → $ per day, cumulative, rolling 7d
  //   routing  → minutes/cost saved by smart routing
  //   sessions → count + handoff rate + memory store rate
}
```

### Slash command (`/ijfw-metrics`)
```md
---
description: Show token usage, cost, and routing metrics
---
Call ijfw_metrics with period: $1 (default 7d), metric: $2 (default tokens).
Render result as a fenced code block with one line per day.
```

### Verification
- `node test.js` → 54/54
- Smoke: simulate 3 fake JSONL lines, call tool, verify table

### Risk
- Stop hook on Claude Code may not always be invoked (e.g. crash, force-quit). Token totals undercount. Mitigation: document caveat in slash command output footer ("metrics from clean session-ends only").
- Transcript parsing is fragile. Mitigation: tolerate parse failure (write 0 for tokens, don't fail the hook).

---

## ITEM #2 — Prompt-improver hook

**Goal:** Deterministic vague-prompt detector across 6 platforms.

### Detection rules (deterministic, <50ms)
Implement 7 regex checks (per research §3). Fire when **≥2 signals trip** AND prompt **<30 tokens** AND **no file path / identifier match**. Single signal = silent (low FP rate).

Signals:
1. `bare_verb` — bare imperative, no object
2. `unresolved_anaphora` — "this/that/it" sentence-start, no recent referent
3. `abstract_goal` — "better/cleaner/proper" without acceptance criteria
4. `no_target` — no file path, no CamelCase/snake_case identifier, no line number
5. `scope_plural` — "the tests / all / everything / stuff"
6. `polysemous` — bare "source/build/run/deploy"
7. `missing_constraint` — no "must/should/when/if/until/without/only" + no numeric threshold

### Files
- `mcp-server/src/prompt-check.js` — pure detection module, exports `checkPrompt(text, ctx)` → `{vague, signals, suggestion}`
- `mcp-server/src/server.js` — register new tool `ijfw_prompt_check` (calls into prompt-check.js)
- `claude/hooks/scripts/pre-prompt.sh` — UserPromptSubmit hook for Claude Code; calls Node module via `node -e`, emits `additionalContext` with one-line positive-framed notice
- `claude/hooks/hooks.json` — register new hook
- `gemini/GEMINI.md`, `cursor/.cursor/rules/ijfw.mdc`, `windsurf/.windsurfrules`, `copilot/copilot-instructions.md` — append `## Prompt Self-Check` section with the 7 rules + "call `ijfw_prompt_check` first" instruction
- `codex/.codex/instructions.md` — same self-check section (no MCP for Codex)
- `mcp-server/test.js` — 8 new tests (one per signal + the threshold rule)

### Bypass mechanisms
- `*` prefix on prompt → skip (severity1 compat)
- `ijfw off` keyword anywhere → skip
- `.ijfw/config.json` `promptCheck: 'off' | 'signals' | 'interrupt'` (default `signals`)

### UX
- `signals` mode (default): inject `<ijfw-prompt-check>Sharpening your aim — need a target file or symbol.</ijfw-prompt-check>` as `additionalContext`. Agent sees the hint, may ask one clarifying question or proceed if it can infer.
- `interrupt` mode: hook exits with status 1 and prints a structured prompt asking 1–3 questions. (Claude Code blocks until user replies.)

### Coexistence with severity1 plugin
Detect `~/.claude/plugins/cache/severity1-marketplace/prompt-improver/` — if present, IJFW hook **skips entirely** to avoid double-prompting. Logged in `.ijfw/.startup-flags`.

### Verification
- `node test.js` → 62/62
- Manual: 5 vague prompts + 5 specific prompts, eyeball detector output
- `bash scripts/check-positive-framing.sh` — notice text passes

### Risk
- False positives annoy. Mitigation: ≥2 signals + <30 tokens + no target gate is conservative; default mode is `signals` (no interrupt).
- Hook cost on every prompt. Budget: <50ms wall-time for detection. Verified via `time` in tests.

---

## ITEM #5 — Three-arm benchmark harness

**Goal:** Reproducible runner for arms A=baseline / B=terse / C=full IJFW. Fork Aider polyglot runner skeleton; replace problem set with IJFW-tuned 14.

**Phase 3 scope:** Build runner + 4 of 14 tasks (one per critical category: bug-fix, refactor, explore, memory). Remaining 10 tasks land in Phase 3.5.

### Files (new)
- `core/benchmarks/run.js` — runner: spawn `claude -p --output-format json` per task per arm, parse `total_cost_usd` + `usage`, write JSONL
- `core/benchmarks/verify.sh` — generic dispatcher; calls per-task `verify.sh`
- `core/benchmarks/tasks/01-bug-paginator/` — bug-fix single-file (Python, off-by-one)
- `core/benchmarks/tasks/07-refactor-dedupe/` — refactor (extract helper, tests stay green)
- `core/benchmarks/tasks/10-explore-ratelimit/` — explore (file-path match)
- `core/benchmarks/tasks/11-memory-store/` + `12-memory-recall/` — paired memory test (arm C should win)
- `core/benchmarks/report.js` — read JSONL, emit markdown table per research §6
- `core/benchmarks/README.md` — how to run, statistical methodology, caveats

### Per-task fixture layout
```
tasks/NN-name/
├── README.md         # prompt (identical across arms)
├── repo/             # starter code
├── tests/hidden/     # not visible; verifier runs these
├── verify.sh         # exit 0 = pass
└── manifest.json     # {category, max_turns, timeout_s, allowed_tools}
```

### Arm definition
```js
const arms = {
  A: { env: { CLAUDE_DISABLE_PLUGINS: '1' } },                 // baseline
  B: { env: { IJFW_TERSE_ONLY: '1' } },                         // terse rules only
  C: { env: {} }                                                // full IJFW
};
```

### Statistical design
- Paired across arms (same task, all 3 arms)
- n=5 epochs per (arm, task) → 60 runs for the 4-task scaffold
- Paired bootstrap 95% CI on deltas (C−A, C−B, B−A)
- Holm-Bonferroni across the 3 comparisons

### Verification
- `node core/benchmarks/run.js --task 01-bug-paginator --arm C --epochs 1` → produces 1 JSONL line, exits 0
- `node core/benchmarks/report.js benchmarks/runs/*.jsonl` → renders table

### Risk
- Token accounting via `claude -p --output-format json` may differ from interactive Claude Code. Mitigation: cross-validate first run via OTel.
- Runs cost $$ — gate behind explicit `--really` flag.

---

## ITEM #4 — `@ijfw/install` npx installer

**Goal:** `npx @ijfw/install` — clone repo, run `install.sh`, register marketplace, six-agent setup in one command.

### Files (new — under `installer/`)
- `installer/package.json` — name `@ijfw/install`, zero deps, 2 bin entries (`ijfw-install`, `ijfw-uninstall`), esbuild bundle target
- `installer/src/install.js` — main flow per research §recommendations
- `installer/src/uninstall.js` — reverse install; preserve `~/.ijfw/memory/` unless `--purge`
- `installer/src/marketplace.js` — JSON-merge `~/.claude/settings.json` for `extraKnownMarketplaces.ijfw` + `enabledPlugins["ijfw-core@ijfw"]`
- `installer/README.md` — quickstart
- `installer/.npmignore` — keep tarball <100KB

### install.js flow
1. Parse flags (`--yes`, `--dir`, `--no-marketplace`, `--branch`)
2. Preflight: Node ≥18, `git`, `bash`, not Windows-without-WSL → fail fast with actionable messages
3. SIGINT handler: `fs.rm` partial target dir
4. Resolve target: `IJFW_HOME` env or `~/.ijfw`
5. Clone or `git pull --ff-only` (depth 1 on first clone)
6. Spawn `bash scripts/install.sh` (argv-form, stdio inherit, env passthrough + `IJFW_NONINTERACTIVE=1` if `process.env.CI`)
7. Marketplace merge into `~/.claude/settings.json` (atomic `.tmp` + rename)
8. Print positive-framed summary
9. Exit 0

### Build
```
cd installer && npm install && npm run build
# produces dist/install.js, dist/uninstall.js
```

### Publish (manual, not automated this phase)
```
npm publish --access public --tag beta
```

### Verification
- `node installer/dist/install.js --dir /tmp/ijfw-test --no-marketplace` → clones + runs install.sh successfully
- `node installer/dist/uninstall.js --dir /tmp/ijfw-test` → removes cleanly, preserves any seeded `memory/`
- Tarball size: `npm pack` reports <100KB
- README quickstart: `npx @ijfw/install` (after publish) works on a fresh macOS account (manual test deferred to publish)

### Risk
- Marketplace registration via settings.json is the supported but not the official path; could break if Anthropic ships official CLI (`#12999`). Mitigation: `marketplace.js` is small and isolated — swap in CLI when shipped.
- npm publish is irreversible (versions can't be reused). Mitigation: publish under `--tag beta` first; promote to `latest` after smoke testing.

---

## Test summary at end of phase

| Stage | Test count | Notes |
|-------|-----------|-------|
| Pre-Phase 3 | 47/47 | After cross-project search |
| After #8 team | 51/51 | +4 |
| After #6 metrics | 54/54 | +3 |
| After #2 prompt-check | 62/62 | +8 |
| After #5 benchmarks | 62/62 | Benchmark harness has its own runner; not in test.js (different concern) |
| After #4 installer | 62/62 + installer smoke | Installer has its own `installer/test.js` (~5 tests) |

`scripts/check-all.sh` must remain green at every commit.

---

## Out of scope (defer to Phase 4)

- **#7 SQLite FTS5** — trigger when `~/.ijfw/memory/global/*.md` exceeds 1000 entries OR user reports slow search
- **#9 Semantic vector search** — stretch; consider once Ollama is more universally installed
- **Benchmark tasks 5–10, 13, 14** — ship in Phase 3.5 (separate session, no design work needed)
- **Windows-native install path** — POSIX-first stance for Phase 3; Windows users get clear WSL message
- **Automated npm publish CI** — manual publish for now; CI workflow deferred

---

## Open questions for user (BLOCKERS — answer before execute)

1. **Branch strategy:** one branch per item with merge to main between (matches Phase 3 #1 cadence) — confirm OK?
2. **#5 benchmarks scope:** scaffold + 4 tasks this session (defer 10 to Phase 3.5), OR build all 14 in one go (~+4h)? Recommend scaffold + 4 — proves runner works, lets us iterate task quality.
3. **#4 npm publish:** publish to npm this session, or hold the package locally and publish in a follow-up? Recommend hold — first npm publish should be deliberate, not bundled with code work.
4. **Prompt-check default mode:** `signals` (silent hint) or `interrupt` (block & ask)? Recommend `signals` — lower annoyance, lets agent decide whether to ask back.

---

**Total LOC estimate:** ~2400 added (+ tests). 6 commits to main.

**Ready for audit.**
