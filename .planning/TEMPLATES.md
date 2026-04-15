# IJFW Planning Doc Templates

Canonical reference for Phase 11+ planning documents.
Convention: Phase/Wave/Step hierarchy, ASCII dividers only.
Banned chars: section sign, box-drawing Unicode, emoji (unless user requests).
ASCII dividers: `==`, `--`, `|` (pipe tables), `[ ]` / `[x]` (checklists).

---

## Template 1 — SCOPE

==============================================================================
# Phase N — <Theme>

**Theme:** "<one sentence positioning the phase>"
**Branch:** `phaseN/<slug>` off `main`
**Status:** DRAFT | LOCKED | SHIPPED

---

## Ground rules (user-locked YYYY-MM-DD)

1. Rule one.
2. Rule two.

---

## Item 0 — <Flagship item name> (FLAGSHIP)

<One paragraph describing what this item achieves and why it is primary.>

### 0.1 <Sub-task name>

**What:** <specific change>
**Files:** `path/to/file.ext`
**Success:** <observable outcome>

### 0.2 <Sub-task name>

...

---

## Item 1 — <Name>

<Short description paragraph.>

### 1.1 <Sub-task name>

**What:** ...
**Files:** ...
**Success:** ...

---

## Item 2 — <Name>

...

---

## Publish gate

- [ ] All HIGH findings from Item N closed
- [ ] Tests passing
- [ ] Dogfood critique run on final branch
==============================================================================

---

## Template 2 — PLAN

==============================================================================
# Phase N Plan

**Theme:** "<same as SCOPE>"
**Branch:** `phaseN/<slug>`
**Stamp:** YYYY-MM-DD

---

## Wave map

| Wave | Sub-waves | Items |
|------|-----------|-------|
| 10A | 10A-wf, 10A-cmd, 10A-hk | Item 0 |
| 10B | 10B-lv | Item 1 |

Wave ordering constraints: <list any must-run-last dependencies here>

---

## Phase N / Wave NA — <Wave name>

<One sentence description of what this wave accomplishes.>

Sub-waves may run in parallel unless a constraint is noted.

--

### Wave NA-xx — <Sub-wave name>

#### Step NA-xx.1 — <Step name>

- **What:** <specific, atomic action>
- **Success:** <observable, binary test>
- **Files:** `path/to/file.ext` (new | existing)
- **Blast radius:** <what else depends on this>

#### Step NA-xx.2 — <Step name>

...

---

## Phase N / Wave NB — <Wave name>

...

---

## GATE: <Gate name>

**Condition:** <what must be true>
**Auditors:** <which tools / agents>
**Blocks:** Phase N+1 start
==============================================================================

---

## Template 3 — PHASE-COMPLETE

==============================================================================
# Phase N — COMPLETE

**Theme:** "<same as SCOPE>"
**Branch:** `phaseN/<slug>`
**Wall time:** <actual duration>

---

## What shipped

| # | Item | Deliverable |
|---|------|-------------|
| 1 | <Item name> | <file or feature description> |
| 2 | <Item name> | <file or feature description> |

---

## Audit-gate loop

**Pre-gate (SCOPE-AUDIT.md):** <auditors used, finding count, how resolved>

**Post-gate (DOGFOOD-CRITIQUE.md):** <invocation, finding count, all-closed verdict>

---

## Commits

| SHA | What |
|-----|------|
| `abc1234` | <description> |
| `def5678` | <description> |

---

## Tests

- `path/to/test-file.js` — N tests (NEW | +N from phase)
- Total phase additions: +N tests.

---

## Deferred to Phase N+1

| # | Finding | Rationale |
|---|---------|-----------|
| 1 | <finding> | <why deferred> |
==============================================================================

---

## Template 4 — DOGFOOD-CRITIQUE

==============================================================================
# Phase N Dogfood — `ijfw cross critique <ref>`

**Stamp:** YYYY-MM-DD
**Target:** Phase N items (<commit range>)
**Invocation:** `./mcp-server/bin/ijfw cross critique <git-ref>`
**Auditors:** <auditor list, diversity note>

---

## Headline

<One paragraph: what the run caught, severity summary, whether all closed.>

---

## Findings

| # | Sev | Issue | Location | Fix |
|---|-----|-------|----------|-----|
| 1 | HIGH | <description> | `file.js:line-line` | <one-line fix> |
| 2 | MED | <description> | `file.js:line-line` | <one-line fix> |

Deferred (not closed in branch):

| # | Sev | Issue | Ticket |
|---|-----|-------|--------|
| 1 | LOW | <description> | P(N+1)-<id> |

---

## Why this run caught what it caught

<Short analysis: which auditor found what and why. Reference diversity, line-level evidence, angles.>

---

## Tests added

+N tests over the fix pass:
- N in `test-file.js` — <what they cover>

---

## Verdict

**<CLOSED | N open>:** <one sentence on branch state.>
==============================================================================

---

## Template 5 — SCOPE-AUDIT

==============================================================================
# Phase N Scope + Plan — <Audit type> pre-gate audit

**Stamp:** YYYY-MM-DD
**Sources:** <auditor list>
**Target:** `PHASEN-SCOPE.md` + `PLAN.md`

---

## Consensus critical findings (2+ sources)

| # | Sev | Issue | Fix in PLAN-v2 |
|---|-----|-------|----------------|
| C1 | HIGH | <description> | <plan change> |
| C2 | MED | <description> | <plan change> |

---

## Unique per source (non-duplicative)

### <Auditor name>

- **U1:** <finding with plan impact if any>
- **U2:** <finding>

### <Auditor name>

- **U3:** <finding>

---

## Plan adjustments written into PLAN-v2

1. <adjustment>
2. <adjustment>

---

## Open questions (answered before execution)

| # | Question | Default answer |
|---|----------|----------------|
| Q1 | <question> | <answer> |
==============================================================================
