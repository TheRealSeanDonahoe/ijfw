# Phase 8 — Execution Plan

Generated from: `PHASE8-SCOPE-v2.md`
Ownership rule: no foreign-plugin action verbs. All swarm agents use `Agent(` dispatch only.
Parallel-safe groups: A (Items 0, 2, 3, 4, 8), B (Item 1 + Item 6 concurrent), C (Items 5, 7).

---

## Pre-execution audit gate

Before any task begins, verify:

- [ ] `PHASE8-SCOPE-v2.md` locked answers rows all read "Answer" not "TBD"
- [ ] No open Trident disagreement in `SCOPE-AUDIT.md` left unresolved
- [ ] `scripts/check-all.sh` passes on current HEAD (clean baseline)
- [ ] `node --test mcp-server/test-intent-router.js` passes (no regressions going in)

Fail any check → stop, fix, re-run gate before proceeding.

---

## Group A — Parallel, no inter-dependencies (fire together)

### TASK-0a-1 — Verb-vacuum audit (inventory)

**What:** Read every file in `claude/commands/*.md`, `claude/skills/ijfw-workflow/SKILL.md`, and `claude/hooks/scripts/*.sh`. Produce a list of all locations where a foreign-plugin verb (`gsd:*`, `superpowers:*`, `hookify:*`, `claude-supermemory:*`, `feature-dev:*`, `pr-review-toolkit:*`) appears as an action instruction to the user or the model.

**Files touched:** read-only scan; output list written to `.planning/phase8/verb-violations.md`

**Success criteria:**
- `.planning/phase8/verb-violations.md` exists and lists every violation with file + line
- Zero lines silently skipped (grep pattern: `\b(gsd|superpowers|hookify|claude-supermemory|feature-dev|pr-review-toolkit):[a-z-]+`)
- Allow-list applied: `Agent(` call sites, lines containing "absorbed" or "pattern", migration-detection strings in install.sh

**Dependencies:** none

**Blast radius:** read-only; no production files changed

---

### TASK-0a-2 — Fix verb violations in commands

**What:** For each violation found in TASK-0a-1 that appears in `claude/commands/cross-audit.md`, `claude/commands/cross-critique.md`, `claude/commands/cross-research.md`: rewrite the swarm-specialist table rows to use IJFW-native agent-type descriptions (`Agent(` dispatch pattern) rather than foreign plugin identifiers as action verbs. Preserve the role description and angle column; replace the foreign verb with an `Agent(` invocation pattern or a plain-language role name.

**Files touched:**
- `claude/commands/cross-audit.md`
- `claude/commands/cross-critique.md`
- `claude/commands/cross-research.md`

**Success criteria:**
- Zero matches of `pr-review-toolkit:\|feature-dev:` in the three files after edit (excluding attribution comments)
- Each replaced table cell still communicates the specialist role clearly
- `bash -n` passes on any shell fragments in those files

**Dependencies:** TASK-0a-1 (violation list)

**Blast radius:** three command files; no JS, no tests, no hooks affected

---

### TASK-0a-3 — Add thin wrapper commands

**What:** Create five new command files in `claude/commands/`:
- `ijfw-plan.md` — invokes workflow Q2 / D3 planning phase
- `ijfw-execute.md` — invokes workflow Q3 / D4 execution phase
- `ijfw-verify.md` — invokes workflow D5 verify phase
- `ijfw-audit.md` — runs the current-stage audit gate inside workflow
- `ijfw-ship.md` — invokes workflow D6 ship phase

Each file: YAML frontmatter (`name`, `description`), one-paragraph body explaining it delegates to `ijfw-workflow` at the named phase. No foreign verbs. No new logic — pure jump-in shortcuts.

**Files touched (new):**
- `claude/commands/ijfw-plan.md`
- `claude/commands/ijfw-execute.md`
- `claude/commands/ijfw-verify.md`
- `claude/commands/ijfw-audit.md`
- `claude/commands/ijfw-ship.md`

**Success criteria:**
- All five files exist with valid YAML frontmatter (name + description fields)
- None contain any foreign-plugin verb
- Each body routes unambiguously to the correct workflow phase

**Dependencies:** none (can write in parallel with TASK-0a-1)

**Blast radius:** additive only; no existing files modified

---

### TASK-0a-4 — Static guard in check-all.sh

**What:** Add a new `run` entry to `scripts/check-all.sh` that greps IJFW user-facing surfaces (`claude/commands/`, `claude/skills/`, `claude/hooks/scripts/`) for the forbidden verb pattern and fails CI if any match is found outside the allow-list.

Pattern to detect (at action position): `\b(gsd|superpowers|hookify|claude-supermemory|feature-dev|pr-review-toolkit):[a-z-]+`

Allow-list exceptions (these must NOT trigger a failure):
1. Lines containing `Agent(` (swarm dispatch)
2. Lines containing the word `absorbed` or `pattern` (attribution comments)
3. Lines in `scripts/install.sh` (migration-detection strings)

Implementation: inline bash one-liner in `check-all.sh` using `grep -rn --include='*.md' --include='*.sh'` with a negative-grep pipe for the allow-list. Exit non-zero if any matches remain.

**Files touched:**
- `scripts/check-all.sh`

**Success criteria:**
- Running `scripts/check-all.sh` on the repo after TASK-0a-2 passes cleanly
- Manually introducing a `gsd:plan-phase` line in a test command causes the check to fail
- The check name in output is "Ownership discipline" or similar

**Dependencies:** TASK-0a-2 (so the guard starts green, not red)

**Blast radius:** CI script only; no production paths changed

---

### TASK-0a-5 — Runtime lint in workflow skill

**What:** Add a renderer-guard note to `claude/skills/ijfw-workflow/SKILL.md`. In the "Stage Navigation" section (or as a new "Output rules" section near the top), add a clear instruction: before emitting any "next step" text, the skill must scan the output for the banned verb patterns and either rewrite them to IJFW-native equivalents or halt with a note. The guard text should be concise (≤5 lines) and integrated into the skill's existing instruction style.

**Files touched:**
- `claude/skills/ijfw-workflow/SKILL.md`

**Success criteria:**
- The SKILL.md file contains an explicit "no foreign-plugin verbs" output rule
- The rule names the banned prefixes
- Line count remains under the 55-line hard cap for the core skill — check with `scripts/check-line-caps.sh` (note: this cap applies to `ijfw-core/SKILL.md`, not `ijfw-workflow/SKILL.md`; confirm cap applicability before editing)
- `scripts/check-line-caps.sh` still passes after edit

**Dependencies:** none

**Blast radius:** single skill file

---

### TASK-0b-1 — TaskCreate surface in workflow skill

**What:** Extend `claude/skills/ijfw-workflow/SKILL.md` to make every phase transition and audit gate produce a `TaskCreate` call. Specifically:

- Q1→Q2, Q2→Q3, Q3→Q4 transitions: create a task for the upcoming phase
- Every "Quick Audit" block: create a gate task before executing it
- D1→D2, D2→D3, D3→D4, D4→D5, D5→D6: create a gate task at each boundary
- Every "DISCOVER AUDIT / RESEARCH AUDIT / PLAN AUDIT / TASK MICRO-AUDIT / PHASE AUDIT / SHIP GATE" block: create a task owned by the audit name
- Every specialist subagent dispatch (`Agent(`): create a task with `agent_id` = the specialist role

Rule: task status updates to `completed` when the phase/gate concludes successfully.

Quick mode minimum: 3–5 tasks per cycle. Deep mode minimum: 15 tasks for a full phase run.

Add this as a new "Task Surface" section in the skill, referencing `TaskCreate` / `TaskUpdate` by name.

**Files touched:**
- `claude/skills/ijfw-workflow/SKILL.md`

**Success criteria:**
- Skill file contains a "Task Surface" (or equivalent) section with explicit `TaskCreate` / `TaskUpdate` calls at every phase boundary and audit gate
- Zero foreign verbs introduced
- Section is self-contained (no dependency on external state other than the workflow stage)

**Dependencies:** TASK-0a-5 (edit same file — sequence these within the file; do not edit SKILL.md in parallel)

**Blast radius:** single skill file

---

### TASK-2-1 — Add `priority` field to INTENTS

**What:** In `mcp-server/src/intent-router.js`, add a `priority: number` field to every entry in the `INTENTS` array. Assign values such that more-specific intents (cross-research, cross-critique, cross-audit) outrank generic overlapping ones (research, critique, audit) by at least 10 points. Suggested baseline: specific = 100, generic = 50.

**Files touched:**
- `mcp-server/src/intent-router.js`

**Success criteria:**
- Every `INTENTS` entry has a numeric `priority` field
- `cross-critique` priority > `critique` priority
- `cross-research` priority > any plain research intent
- `cross-audit` priority > any plain audit/review intent

**Dependencies:** none

**Blast radius:** intent-router module only

---

### TASK-2-2 — Replace first-match-wins with priority+specificity sort

**What:** In `mcp-server/src/intent-router.js`, rewrite the `detectIntent` loop. New logic:
1. Collect ALL entries whose patterns match the input (not just the first)
2. Sort collected matches: primary key = `priority` DESC, secondary key = pattern length DESC (longer pattern = higher specificity)
3. Return the top match

**Files touched:**
- `mcp-server/src/intent-router.js`

**Success criteria:**
- `detectIntent("challenge this from every angle")` returns `cross-critique` not `critique`
- `detectIntent("let's cross-audit this")` returns `cross-audit` not `review`
- Existing passing tests in `test-intent-router.js` continue to pass
- No `for` loop with early `return` inside the match phase

**Dependencies:** TASK-2-1 (priority fields must exist)

**Blast radius:** intent-router module; affects hook dispatch but no behavior change for unambiguous intents

---

### TASK-2-3 — Update shadow-regression test

**What:** In `mcp-server/test-intent-router.js` at line 56, update the shadow-regression test to assert priority-driven ordering explicitly. Add additional test assertions:
- `"challenge this from every angle"` → `cross-critique` (not `critique`) — this already exists; verify it tests the priority path not just positional order
- `"code review this"` → `review` (not `cross-audit`)
- `"cross-audit this file"` → `cross-audit` (higher priority than `review`)

Add a new test: given two patterns that both match, the higher-priority intent wins regardless of INTENTS array position.

**Files touched:**
- `mcp-server/test-intent-router.js`

**Success criteria:**
- `node --test mcp-server/test-intent-router.js` passes
- At least one test explicitly names priority as the discriminator in its description string
- No test relies on INTENTS array position to determine expected result

**Dependencies:** TASK-2-2 (logic must be in place)

**Blast radius:** test file only

---

### TASK-3-1 — Add `family` field to ROSTER

**What:** In `mcp-server/src/audit-roster.js`, add `family: 'anthropic' | 'openai' | 'google' | 'oss'` to each ROSTER entry:
- `claude` → `anthropic`
- `codex` → `openai`
- `gemini` → `google`
- `opencode` → `oss`
- `aider` → `oss`
- `copilot` → `openai`

Also add `model: string` field (empty string default) for receipt identity per Codex U3. This field is populated at runtime from CLI probe output; default is `''`.

**Files touched:**
- `mcp-server/src/audit-roster.js`

**Success criteria:**
- Every ROSTER entry has a `family` field with one of the four values
- Every ROSTER entry has a `model` field (string, default `''`)
- `node --test mcp-server/test-audit-roster.js` still passes

**Dependencies:** none

**Blast radius:** audit-roster module and any consumers that spread ROSTER entries

---

### TASK-3-2 — Add `strategy: 'diversity'` to pickAuditors

**What:** In `mcp-server/src/audit-roster.js`, extend `pickAuditors` to accept `strategy: 'diversity'` in its options object. When strategy is `'diversity'`:
1. Identify the caller's family via `detectSelf`
2. Pick 1 `openai`-family auditor + 1 `google`-family auditor, excluding caller's family
3. Tie-break (multiple in family): prefer installed, then first in roster order
4. If a required family has zero installed members: emit `missing: [{family, angle}]` and backfill from any other non-self family with a Trident-principle nudge in `note`
5. Existing default behavior (strategy unspecified) is unchanged

**Files touched:**
- `mcp-server/src/audit-roster.js`

**Success criteria:**
- `pickAuditors({ strategy: 'diversity', env: mockCodexEnv })` returns one google + one oss/openai pick (not codex)
- `pickAuditors({ strategy: 'diversity', env: mockClaudeEnv })` returns one openai + one google pick
- When google family unavailable: `missing` contains `{ family: 'google', angle: ... }`
- `node --test mcp-server/test-audit-roster.js` passes (update test for new strategy)

**Dependencies:** TASK-3-1

**Blast radius:** `audit-roster.js` + `test-audit-roster.js`

---

### TASK-4-1 — swarm.json schema + lazy init

**What:** Create `mcp-server/src/swarm-config.js` (new file). Exports:
- `SCHEMA`: object describing valid `swarm.json` shape: `{ project_type: string, specialists: [{ id, role, agent_type }] }`
- `DEFAULT_SPECIALISTS`: map of `project_type → specialist array`:
  - `node`: `[code-reviewer, silent-failure-hunter, pr-test-analyzer]`
  - `python`: same defaults
  - `typed` (TypeScript / typed Python): adds `type-design-analyzer`
  - `other`: `[code-reviewer, silent-failure-hunter]`
- `detectProjectType(projectDir)`: reads `package.json`, `tsconfig.json`, `pyproject.toml`, `requirements.txt` from `projectDir`; returns `'node' | 'python' | 'typed' | 'other'`
- `loadSwarmConfig(projectDir)`: reads `.ijfw/swarm.json` if it exists; returns parsed object. If missing, calls `detectProjectType`, builds default config, writes `.ijfw/swarm.json`, returns the config. **Never writes at install-time.** Only called when orchestrator first runs.

Agent type values use plain role names (not foreign plugin identifiers): `"code-reviewer"`, `"silent-failure-hunter"`, `"pr-test-analyzer"`, `"type-design-analyzer"`.

**Files touched (new):**
- `mcp-server/src/swarm-config.js`

**Success criteria:**
- `loadSwarmConfig` on a fresh dir writes `.ijfw/swarm.json` with correct defaults for detected type
- `loadSwarmConfig` on a dir with existing `.ijfw/swarm.json` returns that config unchanged
- No `swarm.json` is written at install/require time — only on explicit call
- `node -e "import('./mcp-server/src/swarm-config.js')"` loads without error

**Dependencies:** none

**Blast radius:** new file only; no existing modules changed until Item 1 imports it

---

### TASK-8-1 — Promote combo policy to repo

**What:** Copy the combo policy from `~/.claude/projects/-Users-seandonahoe-dev-ijfw/memory/project_trident_combo_policy.md` (or reconstruct from scope) to `.planning/policies/trident-combo.md`. The file must be readable by non-Claude platforms (no Claude-specific frontmatter). Create `.planning/policies/` directory if it doesn't exist.

**Files touched (new):**
- `.planning/policies/trident-combo.md`

**Success criteria:**
- File exists at `.planning/policies/trident-combo.md`
- Contains the combo A/B/C policy rules in plain markdown
- No Claude-specific frontmatter or YAML
- Readable as standalone policy doc

**Dependencies:** none

**Blast radius:** additive only

---

## Group B — Sequential backbone (Item 1 after TASK-3 and TASK-4 land; Item 6 concurrent with Item 1)

### TASK-1-1 — Create cross-orchestrator module

**What:** Create `mcp-server/src/cross-orchestrator.js` (new file). This module owns the full Trident execution flow:

```
probe roster → family-diversity pick → swarm resolve → parallel fire → wait → merge → receipt-write → archive
```

Exports:
- `runCrossOp({ mode, target, projectDir, env, runStamp })` — main entry point
  - `mode`: `'audit' | 'research' | 'critique'`
  - `target`: file path, git range, or topic string
  - `projectDir`: resolved from `process.cwd()` if omitted
  - `runStamp`: ISO timestamp; generated once by caller, shared across all parallel requests (Architect U7)

Internal flow:
1. Call `pickAuditors({ strategy: 'diversity', env })` (unblocked by TASK-3-2)
2. Call `loadSwarmConfig(projectDir)` to get specialist list (unblocked by TASK-4-1)
3. Memoize `isInstalled` results for this run (Architect U6 — per-process cache already exists in audit-roster.js; confirm it's being reused, not re-probed)
4. Build request payloads via `buildRequest(mode, target, runStamp)` — single timestamp shared by all
5. Fire external auditors via background bash (non-blocking); fire internal specialists via `Agent(` dispatch
6. Wait for all responses (Promise.allSettled)
7. Merge findings via existing `cross-dispatcher.js` merge logic
8. Write receipt to `.ijfw/receipts/cross-runs.jsonl` (call TASK-6-1's writer)
9. Return merged result object

**Files touched (new):**
- `mcp-server/src/cross-orchestrator.js`

**Success criteria:**
- Module loads without error: `node -e "import('./mcp-server/src/cross-orchestrator.js')"`
- `runCrossOp({ mode: 'audit', target: 'README.md', projectDir: '/tmp/test' })` runs without throwing (may have empty picks if no auditors installed)
- `runStamp` is identical across all parallel `buildRequest` calls in a single run
- `isInstalled` probe not re-executed within a single `runCrossOp` call

**Dependencies:** TASK-3-2, TASK-4-1, TASK-6-1 (receipt writer — can stub with no-op if 6-1 not yet done; but 6-1 runs concurrently so coordinate)

**Blast radius:** new file; no existing modules changed in this task

---

### TASK-1-2 — Create bin/ijfw shim

**What:** Create `mcp-server/bin/ijfw` (new file, no extension, executable). A bash shim following the same pattern as `mcp-server/bin/ijfw-memory`. Resolves the project root relative to `__dirname`, then calls `node cross-orchestrator-cli.js "$@"` (the CLI entry point created in TASK-1-3).

Register in `mcp-server/package.json`:
```json
"bin": {
  "ijfw-memory": "./bin/ijfw-memory",
  "ijfw": "./bin/ijfw"
}
```

**Files touched:**
- `mcp-server/bin/ijfw` (new, chmod +x)
- `mcp-server/package.json`

**Success criteria:**
- `mcp-server/bin/ijfw` is executable (`chmod 755`)
- `node mcp-server/bin/ijfw --help` prints usage without error
- `package.json` has both bin entries valid JSON

**Dependencies:** TASK-1-3 (CLI entry point)

**Blast radius:** new bin file + package.json bin field only

---

### TASK-1-3 — Create cross-orchestrator CLI entry point

**What:** Create `mcp-server/src/cross-orchestrator-cli.js`. A thin CLI wrapper around `runCrossOp`:

```
ijfw cross <mode> <target> [--confirm] [--with <auditor-id>]
ijfw status
ijfw --help
```

- `ijfw cross audit <file>` — calls `runCrossOp({ mode: 'audit', target: file })`
- `ijfw cross research <topic>` — calls `runCrossOp({ mode: 'research', target: topic })`
- `ijfw cross critique <git-range>` — calls `runCrossOp({ mode: 'critique', target: range })`
- `ijfw status` — reads `.ijfw/receipts/cross-runs.jsonl` and calls hero-line renderer (TASK-6-2)
- `--confirm` flag: prompt user before firing (used when roster is partial)
- `--with <id>` flag: pass as `only` override to `pickAuditors`

Parse args with `process.argv.slice(2)` — no external deps.

**Files touched (new):**
- `mcp-server/src/cross-orchestrator-cli.js`

**Success criteria:**
- `node mcp-server/src/cross-orchestrator-cli.js --help` exits 0 and prints usage
- `node mcp-server/src/cross-orchestrator-cli.js cross audit README.md` runs end-to-end without throwing (may produce empty results if no auditors installed)
- `ijfw cross audit <file>` runs from a fresh shell after `npm link` (no Claude session required)

**Dependencies:** TASK-1-1, TASK-6-2 (hero renderer — stub acceptable if not yet done)

**Blast radius:** new file only

---

### TASK-1-4 — Platform rules one-liners

**What:** Add one line to each platform rules file pointing to the `ijfw cross` CLI:

> "To cross-audit, cross-research, or cross-critique, run `ijfw cross <mode> <target>`."

Files to update:
- `codex/CODEX.md` or equivalent codex instructions file
- `gemini/GEMINI.md`
- `cursor/.cursorrules`
- `windsurf/.windsurfrules`
- `copilot/copilot-instructions.md`
- `universal/ijfw-rules.md`

For `codex/`: this is the **sole Trident path** for Codex (no MCP). Make this explicit in the line.

**Files touched:**
- All six platform rules files listed above

**Success criteria:**
- Each file contains a line matching `ijfw cross` (grep-verifiable)
- Codex file mentions CLI as sole Trident path
- No foreign plugin verbs introduced
- `scripts/check-all.sh` still passes after edits

**Dependencies:** TASK-1-3 (CLI must exist before documenting it)

**Blast radius:** six platform rules files; additive change only

---

### TASK-6-1 — Receipts JSONL writer

**What:** Create `mcp-server/src/receipts.js` (new file). Exports:
- `RECEIPTS_FILE(projectDir)` → `<projectDir>/.ijfw/receipts/cross-runs.jsonl`
- `writeReceipt(projectDir, record)` — appends one JSON line atomically. Record schema:

```json
{
  "v": 1,
  "timestamp": "<ISO>",
  "run_stamp": "<shared stamp from orchestrator>",
  "mode": "audit|research|critique",
  "auditors": [{ "id": "codex", "family": "openai", "model": "" }],
  "findings": { "consensus": 0, "contested": 0, "unique": 0 },
  "duration_ms": 0,
  "input_tokens": null,
  "cost_usd": null,
  "model": null
}
```

- `readReceipts(projectDir)` — reads and parses all lines; skips corrupt lines (same pattern as sessions.jsonl); returns array
- Atomic append: write to `.tmp` then `fs.renameSync` to avoid partial-line corruption

**Files touched (new):**
- `mcp-server/src/receipts.js`

**Success criteria:**
- `writeReceipt` creates `.ijfw/receipts/cross-runs.jsonl` with correct directory structure
- Two sequential `writeReceipt` calls produce two lines in the file
- `readReceipts` returns parsed array skipping any malformed lines
- `node -e "import('./mcp-server/src/receipts.js')"` loads cleanly

**Dependencies:** none (can be written in parallel with TASK-1-1)

**Blast radius:** new file only

---

### TASK-6-2 — Hero-line renderer

**What:** Create `mcp-server/src/hero-line.js` (new file). Exports:
- `renderHeroLine(receipts, sessions)` — takes array of receipt records + optional sessions.jsonl records; returns a one-line string

Rules from scope (Codex U1 caveat strictly enforced):
- If delta can be computed from real `sessions.jsonl` data: `"3 AIs · 47s · 6 findings, 2 consensus-critical · measured Δ: −41% tokens vs solo Claude 3×"`
- If delta cannot be computed (no sessions data, or insufficient baseline): `"3 AIs · 47s · 6 findings, 2 consensus-critical"` — NO fabricated savings
- Token delta formula: compare `sum(receipts.input_tokens)` vs `sum(sessions where model=claude, last N solo runs of equivalent scope)`; if baseline is unavailable, omit delta entirely

**Files touched (new):**
- `mcp-server/src/hero-line.js`

**Success criteria:**
- `renderHeroLine([{auditors:[...], duration_ms:47000, findings:{consensus:2,unique:4}}], [])` returns string without delta (no session baseline)
- `renderHeroLine` with real session data returns string including `measured Δ`
- Function never returns a fabricated percentage

**Dependencies:** TASK-6-1 (receipt schema must be finalized)

**Blast radius:** new file only

---

### TASK-6-3 — Wire receipts into orchestrator + update status command

**What:**
1. In `mcp-server/src/cross-orchestrator.js` (TASK-1-1), replace the receipt-write stub with a real call to `writeReceipt` from TASK-6-1
2. Update `claude/commands/status.md`: add a new data source entry — read `.ijfw/receipts/cross-runs.jsonl`, compute hero-line via `renderHeroLine`, include in the status block as "Cross-audit runs: {hero-line}" (omit section if file doesn't exist)

**Files touched:**
- `mcp-server/src/cross-orchestrator.js`
- `claude/commands/status.md`

**Success criteria:**
- After `runCrossOp` completes, `.ijfw/receipts/cross-runs.jsonl` has a new line
- `/ijfw-status` output includes cross-audit hero-line when receipts exist
- `/ijfw-status` omits the section entirely when no receipts file (positive-framing rule)

**Dependencies:** TASK-1-1, TASK-6-1, TASK-6-2

**Blast radius:** orchestrator module + one command file

---

### TASK-6-4 — Write test for receipts + hero-line

**What:** Create `mcp-server/test-receipts.js`. Tests:
- `writeReceipt` creates file and appends correctly
- `readReceipts` skips malformed lines
- `renderHeroLine` without sessions omits delta
- `renderHeroLine` with sessions and matching baseline includes `measured Δ`

Register in `scripts/check-all.sh` as `"node --test mcp-server/test-receipts.js"`.

**Files touched (new):**
- `mcp-server/test-receipts.js`
- `scripts/check-all.sh`

**Success criteria:**
- `node --test mcp-server/test-receipts.js` passes
- `scripts/check-all.sh` includes the new test and passes end-to-end

**Dependencies:** TASK-6-1, TASK-6-2

**Blast radius:** new test file + CI script

---

## Group C — Thin decorations on Item 1 (after Group B lands)

### TASK-5-1 — Replace combo-prompt with auto-fire UX

**What:** In `mcp-server/src/cross-orchestrator.js`, update the user-facing decision logic:
- Remove any "which combo A/B/C?" prompt
- Auto-fire when `pickAuditors({ strategy: 'diversity' })` returns ≥1 OpenAI + ≥1 Google auditor
- Show truthful UX string before firing: `"Auto-proceeding with {ids} unless you override on the next turn."`
- Prompt only when roster is partial (missing one family) or when `--confirm` flag passed

**Files touched:**
- `mcp-server/src/cross-orchestrator.js`

**Success criteria:**
- Full roster available → no interactive prompt, UX string emitted to stdout
- Partial roster (only one family) → prompt shown asking user to confirm or override
- `--confirm` flag always shows prompt regardless of roster completeness

**Dependencies:** TASK-1-1, TASK-3-2

**Blast radius:** orchestrator UX only; logic unchanged

---

### TASK-7-1 — /ijfw-commit chain integration

**What:** Update `claude/skills/ijfw-commit/SKILL.md` (or equivalent commit skill). After the commit is staged and the message is generated, add a step: fire `ijfw cross critique HEAD~1..HEAD` in the background before returning. The critique runs asynchronously — the commit is not blocked. User sees: `"Running background critique — check /ijfw-status for findings."`

No foreign verbs. No `superpowers:*` references.

**Files touched:**
- `claude/skills/ijfw-commit/SKILL.md` (or whichever file implements the commit skill)

**Success criteria:**
- Commit skill file includes background critique step
- Step references `ijfw cross critique` (the CLI from TASK-1-3), not any foreign plugin
- `scripts/check-all.sh` ownership guard passes

**Dependencies:** TASK-1-3

**Blast radius:** commit skill file only

---

### TASK-7-2 — Post-commit git hook

**What:** Update `scripts/install.sh` to write `.git/hooks/post-commit` in the user's repo. The hook:
1. Checks if `ijfw` binary is on PATH (`command -v ijfw`)
2. If yes: runs `ijfw cross critique HEAD~1..HEAD &` in background (non-blocking)
3. If no: silently exits 0 (no user-visible failure)

The hook must be idempotent (install.sh can re-run without duplicating the hook).

**Files touched:**
- `scripts/install.sh`

**Success criteria:**
- After running `scripts/install.sh`, `.git/hooks/post-commit` exists and is executable
- Hook content matches the pattern above
- Re-running `scripts/install.sh` does not duplicate the hook block
- Hook exits 0 even when `ijfw` is not installed

**Dependencies:** TASK-1-3 (CLI must exist for hook to call)

**Blast radius:** install.sh + one git hook file

---

## Post-group: regression test run

After all groups complete:

1. `scripts/check-all.sh` — full green
2. `node --test mcp-server/test-intent-router.js` — priority test passes
3. `node --test mcp-server/test-audit-roster.js` — family + diversity tests pass
4. `node --test mcp-server/test-receipts.js` — new test passes
5. Manual: `node mcp-server/bin/ijfw cross audit README.md` from a fresh shell — runs without error
6. Manual: `ijfw-workflow` run on Phase 8 plan itself → TaskList visible in sidebar with ≥1 task per audit gate

---

## Pre-execution audit gate (PLAN AUDIT)

- [ ] Every SCOPE-v2 requirement has ≥1 task (trace: Item 0→TASK-0a-*, Item 1→TASK-1-*, Item 2→TASK-2-*, Item 3→TASK-3-*, Item 4→TASK-4-1, Item 5→TASK-5-1, Item 6→TASK-6-*, Item 7→TASK-7-*, Item 8→TASK-8-1)
- [ ] No task introduces a foreign-plugin verb
- [ ] Every task has exactly one "Files touched" list and testable success criteria
- [ ] Parallel group assignments are consistent with the dependency graph
- [ ] TASK-0a-5 and TASK-0b-1 are sequenced (same file; do not run concurrently)
- [ ] TASK-6-1 can start in parallel with TASK-1-1 (no dependency between them)
- [ ] TASK-1-3 must complete before TASK-1-2 (shim calls CLI entry point)
- [ ] TASK-1-4 must follow TASK-1-3 (documents a CLI that must exist)
- [ ] Group C tasks must not start until TASK-1-1 is complete
- [ ] Codex U1 caveat encoded in TASK-6-2 acceptance criteria (no fabricated deltas)
- [ ] METR self-deception risk addressed by TASK-6-2's "omit if no baseline" rule
- [ ] Donahoe P4 (no unrequested features): no task adds scope beyond SCOPE-v2
- [ ] Donahoe P9 (can explain every line): every task maps to a locked SCOPE-v2 answer

Gate passes → proceed to Group A parallel execution.
Gate fails on any unchecked item → fix before executing.

---

## Task index (TaskCreate-ready)

| Task ID | Group | Item | Description | Blocked by |
|---------|-------|------|-------------|------------|
| TASK-0a-1 | A | 0a | Verb-vacuum audit + violation list | — |
| TASK-0a-2 | A | 0a | Fix foreign verbs in cross-* commands | TASK-0a-1 |
| TASK-0a-3 | A | 0a | Add 5 wrapper commands | — |
| TASK-0a-4 | A | 0a | Static guard in check-all.sh | TASK-0a-2 |
| TASK-0a-5 | A | 0a | Runtime lint rule in workflow skill | — |
| TASK-0b-1 | A | 0b | TaskCreate surface in workflow skill | TASK-0a-5 |
| TASK-2-1 | A | 2 | Add priority field to INTENTS | — |
| TASK-2-2 | A | 2 | Priority+specificity sort in detectIntent | TASK-2-1 |
| TASK-2-3 | A | 2 | Update shadow-regression test | TASK-2-2 |
| TASK-3-1 | A | 3 | Add family + model fields to ROSTER | — |
| TASK-3-2 | A | 3 | diversity strategy in pickAuditors | TASK-3-1 |
| TASK-4-1 | A | 4 | swarm-config.js lazy init | — |
| TASK-8-1 | A | 8 | Promote combo policy to repo | — |
| TASK-1-1 | B | 1 | cross-orchestrator.js | TASK-3-2, TASK-4-1 |
| TASK-1-2 | B | 1 | bin/ijfw shim + package.json | TASK-1-3 |
| TASK-1-3 | B | 1 | cross-orchestrator-cli.js | TASK-1-1 |
| TASK-1-4 | B | 1 | Platform rules one-liners | TASK-1-3 |
| TASK-6-1 | B | 6 | receipts.js writer | — |
| TASK-6-2 | B | 6 | hero-line.js renderer | TASK-6-1 |
| TASK-6-3 | B | 6 | Wire receipts into orchestrator + status | TASK-1-1, TASK-6-1, TASK-6-2 |
| TASK-6-4 | B | 6 | test-receipts.js + check-all.sh entry | TASK-6-1, TASK-6-2 |
| TASK-5-1 | C | 5 | Replace combo-prompt with auto-fire UX | TASK-1-1, TASK-3-2 |
| TASK-7-1 | C | 7 | /ijfw-commit background critique | TASK-1-3 |
| TASK-7-2 | C | 7 | Post-commit git hook in install.sh | TASK-1-3 |
