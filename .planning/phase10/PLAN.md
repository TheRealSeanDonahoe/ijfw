# Phase 10 — Polish for Publish: Execution Plan

**Theme:** Crystal clear · professionally polished · publish-ready.
**Branch:** `phase10/polish-for-publish`
**Feature-freeze:** LOCKED. P10 is polish only. No new capabilities.
**Ownership rule:** No foreign-plugin verbs (gsd:*, superpowers:*, hookify:*) on any IJFW surface.

---

## Phase 10 Overview

```
Phase 10
|-- Wave 10A  Item 0 by surface (naming + narration — each surface is one Wave)
|   |-- Wave 10A-wf   Workflow skill
|   |-- Wave 10A-cm   Commit skill
|   |-- Wave 10A-hd   Handoff skill
|   |-- Wave 10A-cmd  Commands (ijfw-plan, ijfw-execute, ijfw-verify, ijfw-audit, ijfw-ship, cross-*)
|   |-- Wave 10A-cli  CLI output (cross-orchestrator-cli.js)
|   |-- Wave 10A-rx   Receipts + hero line
|   |-- Wave 10A-pd   Planning doc templates
|   |-- Wave 10A-ar   Audit report templates
|   |-- Wave 10A-hk   Hooks user-visible output
|   |-- Wave 10A-ir   Intent-router nudges
|   |-- Wave 10A-gd   Static guard (check-all.sh)
|   |-- Wave 10A-ux   UX comparison reference
|   |-- Wave 10A-st   /ijfw-status extension
|   GATE: 10A-complete — no § chars, narration pattern present, guard green
|-- Wave 10B  Item 3 QoL polish (parallel with 10A — no file overlap)
|   GATE: 10B-complete — empty-states have next-action, doctor exists, install self-guard
|-- Wave 10C  Item 1 live-test parity matrix (requires user + real IDEs)
|   GATE: 10C-complete — all matrix cells L or explicitly noted
|-- Wave 10D  Item 2 prompt caching
|   GATE: 10D-complete — cache_control present, receipt shows hit, no OpenAI/Gemini changes
|-- Wave 10E  Item 4 principle cross-audit (THE PUBLISH GATE)
|   GATE: PUBLISH — zero unresolved HIGH findings
```

---

## Wave 10A — Item 0: Crystal clarity across every surface

**Goal:** Eliminate § chars, `━` dividers, emoji, and ad-hoc labels; adopt Phase/Wave/Step hierarchy; install narration cadence.
**Parallelism:** Each sub-wave below is parallel-safe **EXCEPT** the following constraints (from SCOPE-AUDIT.md):
- **10A-gd runs LAST.** All other sub-waves must complete before the static guard runs, else the guard false-greens against unrewritten files.
- **10A-cmd runs before 10A-st** on `claude/commands/status.md` (file overlap).
- **10A-sk and 10A-in** (new sub-waves added post-audit) are independent and fire with the parallel batch.
**Precondition:** Naming convention from `feedback_workflow_clarity_navigation.md` frozen.

**Banned chars (enforced by 10A-gd):** `§` (U+00A7), `━` (U+2501), `🔍` and all emoji, ANSI escape sequences, weird Unicode dividers.

**Sub-waves added by SCOPE-AUDIT:**
- **10A-sk** — seven on-demand skills (`ijfw-review`, `ijfw-compress`, `ijfw-summarize`, `ijfw-team`, `ijfw-metrics`, `ijfw-auto-memorize`, `ijfw-critique`). Scan for banned chars; apply narration-compliance where skill narrates, whitelist where it doesn't.
- **10A-in** — installer surfaces (`installer/README.md` + `installer/src/install.js` console strings + post-install summary). Krug lens read-through.

---

### Wave 10A-wf — Workflow skill (`claude/skills/ijfw-workflow/SKILL.md`)

#### Step 10A-wf.1 — Audit current labels
- **What:** Scan SKILL.md for § chars, `━` dividers, emoji (🔍 known present), Q1/Q2/D1-D6 ad-hoc labels, terse step refs. List all violations.
- **Success:** Violation list captured, zero unreviewed occurrences remain unlogged.
- **Files:** `claude/skills/ijfw-workflow/SKILL.md` (read-only audit)
- **Pre-audit known findings (Explorer):** Q1/Q2/Q3/Q4 + D1/D2/D3/D4/D5/D6 ad-hoc labels throughout; `🔍` emoji on every audit-gate line. These must be the core of the rewrite in Step 10A-wf.2.

#### Step 10A-wf.2 — Rewrite phase output templates
- **What:** Replace all phase output prose blocks (Discover/Plan/Execute/Verify/Ship output sections) to use `Phase N / Wave NA — starting now.` entry lines, per-step `Step N.M — done (evidence)` completion lines, and wave-transition summary lines.
- **Success:** Every phase transition in the skill has an explicit entry/exit narration instruction. Zero § chars. Zero banned chars.
- **Files:** `claude/skills/ijfw-workflow/SKILL.md`
- **Blast radius:** Skill narration only — no functional logic changed.

#### Step 10A-wf.3 — "Where am I" response format
- **What:** Add explicit instruction block: when user asks "where are we?" / "status?" / "progress?" respond with structured one-sentence + recommended-next-action format (per the memory rule).
- **Success:** Format block present in skill, uses prescribed template exactly.
- **Files:** `claude/skills/ijfw-workflow/SKILL.md`

#### Step 10A-wf.4 — Mid-step ping instruction
- **What:** Add narration instruction for long-running ops: emit `Phase N / Wave NA · Step N.M — <agent> in progress (~<estimate>).` every meaningful interval.
- **Success:** Instruction present and references the exact format string from the memory rule.
- **Files:** `claude/skills/ijfw-workflow/SKILL.md`

---

### Wave 10A-cm — Commit skill (`claude/skills/ijfw-commit/SKILL.md`)

#### Step 10A-cm.1 — Audit current structure
- **What:** Check for § chars, inconsistent step labels in commit-message structure and post-commit narration blocks.
- **Success:** Violation list captured.
- **Files:** `claude/skills/ijfw-commit/SKILL.md` (read-only audit)

#### Step 10A-cm.2 — Rewrite commit message structure block
- **What:** Adopt Phase/Wave/Step refs in the commit context line (e.g. `chore(p10): Wave 10A-cm — commit skill clarity`). Update any step labels inside the skill body to ASCII-only hierarchy.
- **Success:** No § or banned chars. Commit message format section uses the convention. Post-commit narration says `Phase N / Wave NA · Step N.M — commit — done.` not ad-hoc text.
- **Files:** `claude/skills/ijfw-commit/SKILL.md`
- **Blast radius:** Narration only.

---

### Wave 10A-hd — Handoff skill (`claude/skills/ijfw-handoff/SKILL.md`)

#### Step 10A-hd.1 — Audit current handoff doc structure
- **What:** Scan for § chars, ad-hoc section headers, unclear phase/wave/step summary blocks.
- **Success:** Violations listed.
- **Files:** `claude/skills/ijfw-handoff/SKILL.md` (read-only audit)

#### Step 10A-hd.2 — Rewrite handoff doc structure
- **What:** Section headers in emitted handoff docs switch to ASCII `==` / `--` dividers. Phase/Wave/Step summary table uses `Phase N | Wave NA | Step N.M | status` columns. Entry/exit summaries use the prescribed narration format.
- **Success:** A freshly generated handoff doc contains zero § chars, uses the column format, and is readable in plain text viewers without interpretation.
- **Files:** `claude/skills/ijfw-handoff/SKILL.md`
- **Blast radius:** Output format of generated HANDOFF.md files — not stored state.

---

### Wave 10A-cmd — Commands

Covers: `claude/commands/ijfw-plan.md`, `ijfw-execute.md`, `ijfw-verify.md`, `ijfw-audit.md`, `ijfw-ship.md`, `cross-audit.md`, `cross-research.md`, `cross-critique.md`, `status.md`, `ijfw.md`, `handoff.md`, `consolidate.md`, `doctor.md`, `workflow.md`, `metrics.md`, `mode.md`, `team.md`, `memory-audit.md`, `memory-consent.md`, `memory-why.md`, `compress.md`.

#### Step 10A-cmd.1 — Audit all command files for violations
- **What:** Grep `claude/commands/*.md` for § chars, banned Unicode dividers, ANSI escapes, foreign-plugin verbs at action position.
- **Success:** Full violation list with file + line.
- **Files:** `claude/commands/*.md` (read-only audit)

#### Step 10A-cmd.2 — ijfw-plan / ijfw-execute / ijfw-verify / ijfw-audit / ijfw-ship
- **What:** Align step labels and narration instructions to Phase/Wave/Step convention. Ensure each command's "what to do next" narration uses IJFW-native verbs only (no gsd:*, superpowers:*, etc.).
- **Success:** Zero violations in these five files. Each ends with a GATE reference.
- **Files:** `claude/commands/ijfw-{plan,execute,verify,audit,ship}.md`
- **Blast radius:** Command invocation prose only.

#### Step 10A-cmd.3 — cross-audit / cross-research / cross-critique
- **What:** Unify step labels across the three cross-* commands. All use `Wave / Step` format for the sub-steps they describe. Remove any § chars.
- **Success:** Zero violations. All three use identical structural framing.
- **Files:** `claude/commands/cross-{audit,research,critique}.md`
- **Blast radius:** Cross-op narration only.

#### Step 10A-cmd.4 — Remaining commands (status, ijfw, handoff, consolidate, doctor, workflow, metrics, mode, team, memory-*)
- **What:** Same pass: remove § chars, align to convention, IJFW-native verbs only.
- **Success:** Zero violations across remaining command files.
- **Files:** All remaining `claude/commands/*.md` not covered in .2/.3.
- **Blast radius:** Command invocation prose only.

---

### Wave 10A-cli — CLI output (`mcp-server/src/cross-orchestrator-cli.js`)

#### Step 10A-cli.1 — Audit `printFindings` and `cmdStatus` render blocks
- **What:** Read printFindings and cmdStatus functions for § chars, raw ANSI in non-terminal paths, terse step labels without context.
- **Success:** Violation list with function name + line.
- **Files:** `mcp-server/src/cross-orchestrator-cli.js` (read-only audit)

#### Step 10A-cli.2 — Rewrite `printFindings` render
- **What:** Output findings as `Phase N / Wave NA · Step N.M — <finding>` blocks, not raw index arrays. Use ASCII box chars (`|`, `--`) not Unicode table borders.
- **Success:** `printFindings` output is readable in plain terminal and markdown viewer. Zero banned chars. Zero § chars.
- **Files:** `mcp-server/src/cross-orchestrator-cli.js`
- **Blast radius:** Rendered findings output only — no schema or data-structure changes.

#### Step 10A-cli.3 — Rewrite `cmdStatus` render
- **What:** Top line shows `Phase N / Wave NA · Step N.M` from current state. Subsequent lines use `--` ASCII dividers.
- **Success:** `cmdStatus` output matches the "Where am I" one-sentence format.
- **Files:** `mcp-server/src/cross-orchestrator-cli.js`
- **Blast radius:** Status output only.

---

### Wave 10A-rx — Receipts + hero line (`mcp-server/src/receipts.js`, `hero-line.js`)

#### Step 10A-rx.1 — Audit receipts rendered output
- **What:** Check rendered text in `cross-runs.jsonl` display path for § chars, inconsistent step labels, missing Phase/Wave context.
- **Success:** Violation list.
- **Files:** `mcp-server/src/receipts.js`, `mcp-server/src/hero-line.js` (read-only audit)

#### Step 10A-rx.2 — Rewrite receipt render header
- **What:** Receipt header becomes `Phase N / Wave NA — <operation> — <timestamp>`. Body uses `Step N.M — <finding>` lines. Hero line reframes work done as value delivered (Sutherland lens).
- **Success:** A rendered receipt shows Phase/Wave/Step framing. Hero line reads as value statement, not log entry.
- **Files:** `mcp-server/src/receipts.js`, `mcp-server/src/hero-line.js`
- **Blast radius:** Receipt output format only — JSONL schema unchanged.

---

### Wave 10A-pd — Planning doc templates

#### Step 10A-pd.1 — Audit `.planning/` structure and headers
- **What:** Scan existing planning docs (PHASE10-SCOPE.md, this PLAN.md, any PHASE*-COMPLETE.md) for § chars, inconsistent section headers, missing Phase/Wave/Step structure.
- **Success:** Violation list. Note: PHASE10-SCOPE.md is a locked source-of-truth, not rewritten.
- **Files:** `.planning/**/*.md` (read-only audit; PHASE10-SCOPE.md excluded from edits)

#### Step 10A-pd.2 — Define canonical planning doc template
- **What:** Create `.planning/TEMPLATES.md` with canonical section structure for: SCOPE docs, PLAN docs, PHASE-COMPLETE docs, DOGFOOD-CRITIQUE docs, SCOPE-AUDIT docs. Each template uses Phase/Wave/Step headers and ASCII-only dividers.
- **Success:** TEMPLATES.md exists, covers all 5 doc types, zero banned chars.
- **Files:** `.planning/TEMPLATES.md` (new file)
- **Blast radius:** Template reference only — no existing doc rewritten until P11+.

---

### Wave 10A-ar — Audit report templates

#### Step 10A-ar.1 — Audit existing SCOPE-AUDIT.md and DOGFOOD-CRITIQUE.md files
- **What:** Scan for § chars and inconsistent section structure across any existing audit reports.
- **Success:** Violation list with file + line.
- **Files:** `.planning/**/*AUDIT*.md`, `**/*CRITIQUE*.md`, `**/*COMPLETE*.md` (read-only audit)

#### Step 10A-ar.2 — Update audit report section headers
- **What:** In any SCOPE-AUDIT or DOGFOOD-CRITIQUE files that will be written during P10, enforce the canonical structure from 10A-pd.2 template. Existing historical reports annotated with `<!-- pre-P10-template -->` comment, not rewritten.
- **Success:** Any new audit report in P10 uses canonical structure. Historical reports preserved with annotation.
- **Files:** Depends on reports created during P10 execution.
- **Blast radius:** New reports only.

---

### Wave 10A-hk — Hooks user-visible output

Covers: `claude/hooks/scripts/session-start.sh`, `session-end.sh`, `pre-compact.sh`, `pre-tool-use.sh`, `post-tool-use.sh`, `pre-prompt.sh`.

#### Step 10A-hk.1 — Audit hook output for banned chars and clarity
- **What:** Read each hook script and check any `echo` / user-visible output for § chars, ANSI escapes embedded in plain-text paths, terse unlabelled status lines.
- **Success:** Violation list per hook file.
- **Files:** `claude/hooks/scripts/*.sh` (read-only audit)

#### Step 10A-hk.2 — Rewrite hook output lines
- **What:** Each hook's user-visible output follows: `[ijfw] <phase context if inside a workflow> — <one line of what happened> — <next action if relevant>.` No § chars, no raw ANSI in non-terminal paths, no unicode decorations.
- **Success:** All six hook scripts produce output that matches the format. check-all.sh lint passes.
- **Files:** `claude/hooks/scripts/*.sh`
- **Blast radius:** Output format only — hook logic and event semantics unchanged (per `project_hook_event_semantics.md`).

---

### Wave 10A-ir — Intent-router nudges (`mcp-server/src/intent-router.js`)

#### Step 10A-ir.1 — Audit nudge text for banned chars and foreign-plugin verbs
- **What:** Read intent-router.js nudge strings. Check for § chars, any `gsd:*` / `superpowers:*` verbs, terse one-word nudges without context.
- **Success:** Violation list with intent name + line.
- **Files:** `mcp-server/src/intent-router.js` (read-only audit)

#### Step 10A-ir.2 — Rewrite nudge copy
- **What:** Each nudge becomes: one sentence describing what IJFW can do, one IJFW-native action verb (no foreign-plugin refs). Format: `"Looks like you want to <do X>. Try: <IJFW-native command>."` Positive framing, no negatives.
- **Success:** Zero banned chars. Zero foreign-plugin verbs at action position. Positive framing preserved.
- **Files:** `mcp-server/src/intent-router.js`
- **Blast radius:** Nudge copy only — routing logic unchanged.

---

### Wave 10A-gd — Static guard (`scripts/check-all.sh`)

#### Step 10A-gd.1 — Add § char lint rule
- **What:** Add a grep rule to `check-all.sh` that scans `claude/commands/*.md`, `claude/skills/**/SKILL.md`, `mcp-server/src/*.js` hook output strings, and `claude/hooks/scripts/*.sh` for `§` character. Fail with exit 1 and file:line on match.
- **Success:** Running `check-all.sh` after introducing a `§` char in any covered file produces a failing exit code and identifies the file.
- **Files:** `scripts/check-all.sh`

#### Step 10A-gd.2 — Add narration-pattern lint rule
- **What:** Add a check that every `claude/skills/**/SKILL.md` references the string `Phase` and `Wave` at least once (ensures the convention isn't bypassed when skills are updated). Warn-only (not fail) for skills that have no workflow narration context.
- **Success:** check-all.sh emits a WARN for any skill SKILL.md that never mentions Phase/Wave.
- **Files:** `scripts/check-all.sh`

#### Step 10A-gd.3 — Add foreign-plugin-verb lint rule
- **What:** Add a grep rule that scans IJFW surfaces for `\b(gsd|superpowers|hookify|claude-supermemory|feature-dev|pr-review-toolkit):[a-z-]+` at action position. Allow-list: `Agent(` call blocks, `<!-- attribution -->` comments, migration-detection strings. Fail on violation.
- **Success:** A deliberate test injection of `gsd:plan-phase` in a command file triggers a failing check.
- **Files:** `scripts/check-all.sh`

---

### Wave 10A-ux — UX comparison reference

#### Step 10A-ux.1 — Research GSD / Superpowers / Superbase clarity patterns
- **What:** Read `gsd:progress`, `superpowers:executing-plans`, and any Superbase task-list skill accessible in the environment. Document: what each does well, specific pattern (format string, update cadence, structure), what IJFW is missing.
- **Success:** `.planning/phase10/UX-COMPARISON.md` created with ≥3 concrete takeaways per tool.
- **Files:** `.planning/phase10/UX-COMPARISON.md` (new file)

#### Step 10A-ux.2 — Map takeaways to Wave 10A steps
- **What:** For each takeaway in UX-COMPARISON.md, annotate which Wave 10A step it was addressed by (or note "deferred P11" with rationale).
- **Success:** Every takeaway has a disposition annotation. No unresolved takeaway.
- **Files:** `.planning/phase10/UX-COMPARISON.md`

---

### Wave 10A-st — `/ijfw-status` extension

#### Step 10A-st.1 — Define current-step state file schema
- **What:** Define `.ijfw/state/current-step.json` schema: `{ phase, wave, step, label, started_at, recommended_next }`. Document the write contract: workflow skill writes it at each step transition; `/ijfw-status` reads it.
- **Success:** Schema documented as a comment block in `claude/commands/status.md`.
- **Files:** `claude/commands/status.md`

#### Step 10A-st.2 — Update workflow skill to write state file
- **What:** In `claude/skills/ijfw-workflow/SKILL.md`, add instruction to write `.ijfw/state/current-step.json` at every Step transition using the schema from 10A-st.1.
- **Success:** Workflow skill has explicit write-state instruction. File path matches schema definition.
- **Files:** `claude/skills/ijfw-workflow/SKILL.md`
- **Blast radius:** State write only — no existing reads broken.

#### Step 10A-st.3 — Update `/ijfw-status` command to read state file
- **What:** `claude/commands/status.md` reads `.ijfw/state/current-step.json` on invocation. Top line of output: `Phase {phase} / Wave {wave} · Step {step} — {label}`. Second line: `Recommended next: {recommended_next}. Say no/alt to override.`
- **Success:** Running `/ijfw-status` during a workflow shows current step in the prescribed format. Running it outside a workflow shows `No active workflow session.` with a clear next-action prompt.
- **Files:** `claude/commands/status.md`

---

### GATE: 10A-complete

```
[ ] Zero § chars in: claude/commands/*.md, claude/skills/**/SKILL.md,
    mcp-server/src/cross-orchestrator-cli.js, hooks/*.sh, intent-router.js
[ ] check-all.sh passes with new lint rules (§ + narration + foreign-plugin-verb)
[ ] Workflow skill has entry/exit narration instructions for every phase
[ ] /ijfw-status top line shows Phase / Wave / Step
[ ] UX-COMPARISON.md exists with all takeaways dispositioned
[ ] Planning templates file exists at .planning/TEMPLATES.md
```

---

## Wave 10B — Item 3: Quality-of-life polish

**Runs parallel to Wave 10A.** No file overlap with 10A surfaces.

---

### Step 10B.1 — Empty-state copy review (Item 3a)
- **What:** Read every `/ijfw-*` command and CLI subcommand empty-state message through Krug + Donahoe lens. Each must leave the user with a clear next action ("run X next"). Rewrite any that don't.
- **Success:** Every empty-state message in `claude/commands/*.md` and CLI help blocks ends with a "run X next" action. Positive framing. No "not found" or "nothing here" dead-ends.
- **Files:** `claude/commands/*.md` (messages only), `mcp-server/src/cross-orchestrator-cli.js` (empty-state paths)
- **Blast radius:** Copy only.

### Step 10B.2 — Help text harmonization (Item 3b)
- **What:** Read `ijfw --help`, `ijfw cross --help`, every command description field. Rewrite to same voice: brief imperative sentence + one call-to-action example. No mixed tones.
- **Success:** All help text uses identical voice. Each entry has a runnable example.
- **Files:** `mcp-server/src/cross-orchestrator-cli.js` (help text), `claude/commands/ijfw.md`

### Step 10B.3 — Receipts automatic pruning (Item 3c)
- **What:** In `receipts.js`, on each write, prune `.ijfw/receipts/cross-runs.jsonl` to the last 100 entries. Add `--purge-receipts` CLI subcommand to `cross-orchestrator-cli.js` for explicit full cleanup.
- **Success:** After 101st write, file has exactly 100 entries. `ijfw --purge-receipts` empties the file and confirms with one-line positive message.
- **Files:** `mcp-server/src/receipts.js`, `mcp-server/src/cross-orchestrator-cli.js`

### Step 10B.4 — `ijfw doctor` subcommand (Item 3d)
- **What:** New CLI subcommand `ijfw doctor`: probes roster (which CLIs reachable, which API keys set), outputs a single-screen status table: `[ ok ] Anthropic API key`, `[ -- ] Gemini CLI not found — install: ...`. Positive framing on all lines.
- **Success:** `ijfw doctor` exits 0. Each present service shows `[ ok ]`. Each missing service shows `[ -- ]` with a clear install hint. No raw error stack traces.
- **Files:** `mcp-server/src/cross-orchestrator-cli.js`, `scripts/doctor.sh` (if probes stay in shell)
- **Note:** Item 3d introduces a new CLI subcommand — this is permitted in P10 as QoL polish tied to an existing feature (the roster). It does not add new capabilities beyond surfacing already-configured state.

### Step 10B.5 — install.sh self-run guard (Item 3e)
- **What:** Add `.ijfw-source` marker file at IJFW repo root. `install.sh` checks for this file at startup; if found, refuses with a clear positive-framed message: `"Running inside IJFW source repo — skipping platform-rule writes to protect your dev tree. Run outside the repo to install."` Exit 0 (not an error).
- **Success:** Running `install.sh` from IJFW repo root exits 0 with the expected message and writes nothing. Running it from any other directory proceeds normally.
- **Files:** `scripts/install.sh`, `.ijfw-source` (new marker file at repo root)

### Step 10B.6 — Cost/budget guard (Item 3f)
- **What:** Add `IJFW_AUDIT_BUDGET_USD` env var (default `2.00`). In `runCrossOp` within `cross-dispatcher.js`, before each provider call: estimate token cost using known list prices × approximate token count. If projected to exceed budget, skip that provider with a positive-framed message (exact copy from scope: "Skipping Anthropic API call — would exceed $2.00 session budget...").
- **Success:** With `IJFW_AUDIT_BUDGET_USD=0.01`, a cross-op run skips all providers that would exceed the limit. Message is positive-framed, no stack trace, no crash. Normal run ($2.00 default) is unaffected.
- **Files:** `mcp-server/src/cross-dispatcher.js`
- **Blast radius:** Provider-selection path only — dispatch logic and receipt writing unchanged.

### Step 10B.7 — CHANGELOG.md (Item 3g)
- **What:** Create `CHANGELOG.md` at repo root with one section per phase P0-P10. Initial draft generated from `git log --oneline` grouped by phase tags. Then hand-edited for narrative product-announcement voice. Must read like a product changelog, not a git log.
- **Success:** CHANGELOG.md exists, has ≥10 phase sections (P0-P10), reads as product announcements (present tense, user-benefit framing), no raw commit SHAs exposed.
- **Files:** `CHANGELOG.md` (new file)

### Step 10B.8 — README rewrite (Item 3h)
- **What:** Rewrite `README.md` (or `docs/README.md`) to lead with the 30-second hook: `npm install -g @ijfw/install && ijfw demo`. Sections: hook, demo output sample, installation, architecture one-pager, "why IJFW" (positive, factual). Remove Phase-6-era "current state" copy.
- **Success:** README opens with runnable one-liner. Demo output sample present. Architecture section fits on one screen. No "current state" or "in progress" copy.
- **Files:** `README.md` or `docs/README.md` (whichever is canonical)

### Step 10B.9 — PUBLISH-CHECKLIST.md refresh (Item 3i)
- **What:** Update `PUBLISH-CHECKLIST.md` (or create it if missing). Add P7-P9 steps: check-all.sh green, `bin/ijfw` executable, fixtures/ in package.json files, test count >= 175, dogfood receipts archived. Each step: one line + one runnable command.
- **Success:** PUBLISH-CHECKLIST.md has every pre-publish step as a runnable one-liner. P10-era additions clearly marked with `[P10]` prefix.
- **Files:** `PUBLISH-CHECKLIST.md`

---

### GATE: 10B-complete

```
[ ] Every empty-state message has a clear next action
[ ] All help text same voice, each with runnable example
[ ] Receipts auto-prune to 100 on write; --purge-receipts works
[ ] ijfw doctor runs and exits 0; shows ok/-- per service with install hints
[ ] install.sh refuses with positive message when run from IJFW source repo
[ ] Budget guard: IJFW_AUDIT_BUDGET_USD=0.01 skips over-budget providers positively
[ ] CHANGELOG.md exists P0-P10, narrative voice
[ ] README leads with npm install one-liner + demo sample
[ ] PUBLISH-CHECKLIST.md refreshed with P7-P10 steps as runnables
```

---

## Wave 10C — Item 1: Live-test parity matrix

**Requires user availability + real IDE access.**

### Step 10C.1 — Baseline review of Phase 9 parity matrix
- **What:** Read `.planning/phase9/PARITY-MATRIX.md`. List all `C` (config-verified) cells that need upgrade to `L` (live-tested). List the ~30 verification points (6 platforms x ~5 capabilities).
- **Success:** Numbered checklist of exactly which cells need live verification.
- **Files:** `.planning/phase9/PARITY-MATRIX.md` (read-only)

### Step 10C.2 — Live-test session: Codex + Cursor
- **What:** With user in Codex CLI and Cursor IDE, verify each targeted cell: memory recall, cross-audit dispatch, MCP tool availability, CLI command output, install.sh result.
- **Success:** Each tested cell upgraded to `L` in results doc, or annotated `△ partial` with clear "by design" / "Phase 11 fix" note.
- **Files:** `.planning/phase10/LIVE-TEST-RESULTS.md` (new file)

### Step 10C.3 — Live-test session: Gemini + Windsurf
- **What:** Same as 10C.2 for Gemini CLI and Windsurf IDE.
- **Success:** Same criteria.
- **Files:** `.planning/phase10/LIVE-TEST-RESULTS.md`

### Step 10C.4 — Live-test session: Copilot + Universal
- **What:** Same as 10C.2 for GitHub Copilot and the universal rules file.
- **Success:** Same criteria.
- **Files:** `.planning/phase10/LIVE-TEST-RESULTS.md`

### Step 10C.5 — Update parity matrix
- **What:** Write `.planning/phase10/PARITY-MATRIX-P10.md` with all cells updated from LIVE-TEST-RESULTS.md. Every gap has a filed disposition (fix in P10, defer to P11, or "by design" with justification).
- **Success:** Zero cells with unresolved disposition. All `C` cells either upgraded to `L` or annotated.
- **Files:** `.planning/phase10/PARITY-MATRIX-P10.md` (new file)

---

### GATE: 10C-complete

```
[ ] All ~30 parity cells have status L, △ partial, or explicitly noted disposition
[ ] LIVE-TEST-RESULTS.md exists with screenshots/log excerpts
[ ] PARITY-MATRIX-P10.md updated from results
[ ] Zero cells with unresolved "gap"
```

---

## Wave 10D — Item 2: Anthropic prompt caching

**Start after Wave 10A narration rewrite (cleaner log conventions available).**

### Step 10D.1 — Audit Anthropic API call path
- **What:** Read `mcp-server/src/api-client.js`. Identify the Anthropic builder's system prompt assembly. Confirm it is stable across invocations (same content = cacheable).
- **Success:** System prompt stability confirmed or documented where it varies.
- **Files:** `mcp-server/src/api-client.js` (read-only audit)

### Step 10D.2 — Add `cache_control` to Anthropic system prompt
- **What:** In the Anthropic message builder in `api-client.js`, add `cache_control: { type: 'ephemeral' }` to the system prompt block. Do NOT add to OpenAI or Gemini paths.
- **Success:** Anthropic requests include `cache_control` header on system prompt. OpenAI/Gemini paths unchanged. Existing tests still pass.
- **Files:** `mcp-server/src/api-client.js`
- **Blast radius:** Anthropic call path only — no other provider touched.

### Step 10D.3 — Surface cache-hit stats in receipt
- **What:** Anthropic API returns cache stats in the response object. Capture `cache_read_input_tokens` and `cache_creation_input_tokens`. Write to receipt under a `cache_stats` field.
- **Success:** A receipt for an Anthropic run contains a `cache_stats` field. A second run on the same template shows `cache_read_input_tokens > 0`.
- **Files:** `mcp-server/src/receipts.js`, `mcp-server/src/api-client.js`

### Step 10D.4 — Surface cache savings in hero line
- **What:** If `cache_read_input_tokens > 0`, hero line includes: `(prompt cache hit — ~$X saved)` where X is calculated from Anthropic's known cache-read price vs full-read price.
- **Success:** Hero line includes savings estimate on a cache-hit run. No change on non-cache runs.
- **Files:** `mcp-server/src/hero-line.js`

---

### GATE: 10D-complete

```
[ ] cache_control: {type: 'ephemeral'} on Anthropic system prompt only
[ ] Two sequential Anthropic runs show cache_read_input_tokens > 0 on second run
[ ] Receipt contains cache_stats field
[ ] Hero line shows cache savings estimate on hit
[ ] Zero changes to OpenAI / Gemini paths
```

---

## Wave 10E — Item 4: Fine-tooth principle cross-audit (PUBLISH GATE)

**Runs LAST — audits the polished version, not in-progress.**
**Precondition:** Waves 10A, 10B, 10C, 10D all gated-complete.

### Step 10E.1 — Prepare audit manifest
- **What:** List all 10 systems from the scope. For each system, identify the canonical entry file(s) to feed to the cross-audit. Write `.planning/phase10/AUDIT-MANIFEST.md`.
- **Success:** AUDIT-MANIFEST.md covers all 10 systems with specific file paths. No system omitted.
- **Files:** `.planning/phase10/AUDIT-MANIFEST.md` (new file)

### Step 10E.2 — Krug pass (10 systems)
- **What:** Run `ijfw cross critique` with Krug lens ("Don't make me think") on each of the 10 systems. Structured findings per system: surface, finding, severity (HIGH/MEDIUM/LOW), recommended action.
- **Success:** 10 Krug-lens runs completed. All HIGH findings documented with specific line/surface references.
- **Files:** `.planning/phase10/CROSS-AUDIT-KRUG.md` (new file)

### Step 10E.3 — Sutherland pass (10 systems)
- **What:** Run `ijfw cross critique` with Sutherland lens ("Smarter not cheaper, costly signals visible") on each of the 10 systems.
- **Success:** 10 Sutherland-lens runs completed. All HIGH findings documented.
- **Files:** `.planning/phase10/CROSS-AUDIT-SUTHERLAND.md` (new file)

### Step 10E.4 — Donahoe pass (10 systems)
- **What:** Run `ijfw cross critique` with Donahoe lens ("It just fucking works, anywhere, for strangers") on each of the 10 systems.
- **Success:** 10 Donahoe-lens runs completed. All HIGH findings documented.
- **Files:** `.planning/phase10/CROSS-AUDIT-DONAHOE.md` (new file)

### Step 10E.5 — Merge into master report
- **What:** Merge the three per-lens reports into `.planning/phase10/CROSS-AUDIT-PRINCIPLES.md`. Structure: consensus findings (>=2 lenses same issue), per-lens unique findings, HIGH count per system, ticketed disposition for every finding.
- **Success:** Master report exists. Every finding has a disposition: "close in P10", "defer P11 — <rationale>", or "by design — <justification>".
- **Files:** `.planning/phase10/CROSS-AUDIT-PRINCIPLES.md` (new file)

### Step 10E.6 — Close all HIGH findings
- **What:** For each HIGH finding in the master report: implement the fix, verify it, mark the finding `[closed]` in the report. MEDIUM findings: either close or ticket with explicit rationale.
- **Success:** Zero unresolved HIGH findings. All MEDIUM findings have closed or deferred status with written rationale.
- **Files:** Depends on findings; updates to various source files.

### Step 10E.7 — Eat-own-food run
- **What:** Run `ijfw cross critique HEAD~N..HEAD` on the P10 branch itself. This is the 4th consecutive phase using the loop — proof that the tool audits the tool.
- **Success:** Run completes. Findings reviewed. Any new HIGH from the dogfood run closes before declaring COMPLETE.
- **Files:** `.planning/phase10/DOGFOOD-CRITIQUE-P10.md` (new file)

---

### GATE: PUBLISH — zero unresolved HIGH findings

```
[ ] CROSS-AUDIT-PRINCIPLES.md: zero unresolved HIGH findings
[ ] All MEDIUM findings: closed or deferred with written rationale
[ ] DOGFOOD-CRITIQUE-P10.md: zero new HIGH from self-audit
[ ] All six publish-blocking success criteria from PHASE10-SCOPE.md checked:
    [ ] /ijfw-status shows current Phase / Wave / Step in one line; no § anywhere user-facing
    [ ] All parity-matrix cells L or explicitly noted (Phase 11 / by design)
    [ ] Anthropic API path uses prompt caching; receipt shows cache-hit savings
    [ ] Every empty-state message has clear next action; ijfw doctor exists; install.sh self-guard active
    [ ] Zero unresolved HIGH findings across Krug + Sutherland + Donahoe passes
    [ ] Eat own food: ijfw cross critique on P10 branch ran and closed
```

When PUBLISH GATE passes: `npm publish` + marketplace PR.

---

## Build order summary

```
Wave 10A  +  Wave 10B  (parallel — different files)
                |
           GATE: 10A-complete + 10B-complete
                |
           Wave 10C  (user-dependent — schedule with user)
                |
           GATE: 10C-complete
                |
           Wave 10D  (any time after 10A due to logging conventions)
                |
           GATE: 10D-complete
                |
           Wave 10E  (last — audits polished version)
                |
           GATE: PUBLISH
```

---

## Deferred (not P10)

| Item | Rationale | Target |
|------|-----------|--------|
| Cross-project audit/search | New feature, not polish | V1.1 |
| `ijfw import` (claude-mem / MemPalace migration) | New feature | V1.1 |
| Team-tier memory | New capability | V2 |
| CI/CD-first positioning | Strategy decision, not feature | Milestone review |
| New-machine bootstrap docker harness | Infra, not feature | P11 |
| Uninstall clean-exit docker harness | Infra, not feature | P11 |
| RTK coexist live-fire test | Needs RTK install | P11 |

---

## Addendum — Patches from SCOPE-AUDIT (2026-04-15)

This addendum captures the 12 plan adjustments specified in `SCOPE-AUDIT.md`. Applied inline above where obvious; this section covers the additions that don't have a home in the original structure.

### New Wave 10A-sk — On-demand skills compliance pass

**Skills in scope:**
- `claude/skills/ijfw-review/SKILL.md`
- `claude/skills/ijfw-compress/SKILL.md`
- `claude/skills/ijfw-summarize/SKILL.md`
- `claude/skills/ijfw-team/SKILL.md`
- `claude/skills/ijfw-metrics/SKILL.md`
- `claude/skills/ijfw-auto-memorize/SKILL.md`
- `claude/skills/ijfw-critique/SKILL.md`

#### Step 10A-sk.1 — Scan all 7 skills for banned chars
Grep `§ ━ 🔍` + emoji block. List violations per file.

#### Step 10A-sk.2 — Rewrite where violations exist
Remove banned chars. For skills that genuinely narrate workflow progress (ijfw-critique comes close), apply Phase/Wave/Step convention at narration points. For skills that are pure capability surfaces (ijfw-compress, ijfw-metrics), a one-line opening that states the capability cleanly is sufficient — no forced narration template.

#### Step 10A-sk.3 — Whitelist legitimately-non-narrating skills
Update 10A-gd narration-compliance lint to accept skills that declare `<!-- IJFW: narration-not-applicable -->` at the top. Legitimate escape hatch; must be used sparingly.

### New Wave 10A-in — Installer surfaces

#### Step 10A-in.1 — installer/README.md rewrite
Current file still references `/doctor inside Claude Code` (pre-Phase 3d). Rewrite to match the V1.0 flow: `npm install -g @ijfw/install` → `ijfw demo` → wow.

#### Step 10A-in.2 — installer/src/install.js console strings
Lines 124-143 (approx). Positive-framed, next-action-including, ASCII-only. Strings like `"IJFW ready."` and `"Memory preserved at..."` pass Krug.

### Step 10E.0 (NEW) — Pre-audit receipts purge

Before Item 4's 30 principle-audit runs, move `.ijfw/receipts/cross-runs.jsonl` to `.ijfw/receipts/pre-p10-audit.jsonl.bak`. Create fresh empty file. This gives Item 4's hero-line a clean baseline — no pollution from accumulated P7-P9 runs.

### Step 10E.1 (UPDATED) — Lens injection convention

Before firing each of the 30 audit runs, the caller prepends the principle-lens definition to the target text:

```
## Audit lens

<Krug | Sutherland | Donahoe principles definition — ~3 sentences>

---

<original target content>
```

No dispatcher change required. The dispatcher sees a regular target and audits normally; the system prompt (benchmarks/technical/etc.) combined with the prepended lens gives per-lens adversarial framing.

### Step 10D.1 (UPDATED) — Prompt-length pre-check

Before enabling `cache_control` on the Anthropic path, measure assembled `system + format` length. If below 1024 tokens (Sonnet 4.5 threshold), log a warning in receipt: `"cache-eligible: false (prompt < 1024 tokens)"` and skip the `cache_control` block — it would silently no-op otherwise. If above threshold, enable caching and record `cache_creation_input_tokens` + `cache_read_input_tokens` in receipt (new schema fields — adds to Wave 10A-rx work).

### Step 10B.3f (UPDATED spec for Item 3f — cost budget)

Post-flight accumulation only. On each new `runCrossOp` call:
1. Read prior receipts in current session (by timestamp window ≥ session start).
2. Sum `cost_usd` across them.
3. Estimate next call cost (rough char-count / 4 × provider list price).
4. If `accumulated + estimated_next > IJFW_AUDIT_BUDGET_USD`, refuse: emit `"Budget $X.XX reached (accumulated $X.XX + next ~$X.XX). Raise IJFW_AUDIT_BUDGET_USD to continue."` to stderr, exit 2.
5. Document in `ijfw --help` that first-call surprise is unavoidable — budget only enforces on 2nd+ calls within a session.

### Step 10C (UPDATED caveat for Item 1 live-test)

Add to `LIVE-TEST-RESULTS.md` top matter:
```
Coverage note: this parity matrix reflects live testing by a single user session per platform.
Per usability research (MeasuringU), 5-user tests catch ~85% of issues affecting ≥31% of users
but only ~40% of issues affecting ≤10% of users. Rare platform-specific gaps may persist
beyond this matrix.
```

### Step 10E (UPDATED severity rule for Item 4)

Any principle-audit finding that does NOT include an explicit `file:line` reference is automatically downgraded one severity tier (HIGH → MED, MED → LOW). Justification: Codex's SWE-bench re-audit (2026) found 59.4% of residual benchmark failures were actually bad tests, not bad code — line-level evidence is the difference between actionable findings and noise. Findings downgraded by this rule are flagged `[no-file-ref]` in the merged report.

---

## Addendum GATE — Run before execution

- [ ] Wave 10A now has `10A-gd runs LAST` constraint
- [ ] Wave 10A now has 10A-sk (7 on-demand skills)
- [ ] Wave 10A now has 10A-in (installer surfaces)
- [ ] 10A-gd lint covers `§`, `━`, emoji
- [ ] 10A-wf.1 pre-audit findings noted (Q1/D1 labels + 🔍 emoji)
- [ ] 10A-cmd → 10A-st serialization noted on `status.md`
- [ ] Step 10E.0 added (purge receipts)
- [ ] Step 10E.1 updated (lens injection convention)
- [ ] Step 10D.1 updated (prompt-length pre-check + receipt schema)
- [ ] Step 10B.3f respec'd (post-flight accumulation only)
- [ ] Step 10C live-test caveat documented
- [ ] Step 10E severity-downgrade rule for evidence-free findings
