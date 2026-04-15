---
name: ijfw-workflow
description: "Universal project workflow with built-in quality auditing. Two modes: quick (brainstorm/build fast) and deep (full project management). Trigger: 'build', 'create', 'plan', 'new project', 'brainstorm', 'help me build', or any project-level task."
context: fork
model: sonnet
---

# IJFW Workflow

Two modes. Same principles. Same audit gates.

**Quick** — brainstorm, plan, build. Pick up from where you are. 5 min to execution.
**Deep** — full project management. Phases, milestones, research, subagent orchestration.

Auto-detect: "brainstorm this feature" → quick. "New project" → deep.
User override: "go deeper" escalates. "Let's keep this quick" simplifies.
The Donahoe Loop applies to both: BUILD → AUDIT → FIX → SHIP → MEASURE → REPEAT

---

# QUICK MODE

For focused work. Features, fixes, content pieces, brainstorms.
Picks up from current context — no need to start from scratch.

## Step 1: Clarify (30 seconds)

Phase Quick / Wave QW — starting now.

Ask 2-3 sharp questions. Not 20. Just what's needed to avoid building the wrong thing.
If intent is already clear from context, skip straight to Step 2.

- What exactly are we building/changing?
- What does "done" look like? (success criteria)
- Any constraints I should know about?

Step 1 — done (intent captured, success criteria confirmed).

## Step 2: Quick Plan (1-2 minutes)

Draft a brief plan. Max 10 tasks. Each task: what to do, how to verify.
Present it. Get a thumbs up or adjustments. Then go.

For software: include file paths and test expectations.
For content: include sections, tone, key points.

### Quick Audit

Phase Quick / Wave QW · Step 2 — audit in progress (~30s).

Before executing, 30-second check:
- Does this match what was asked? (scope)
- Is this the simplest approach? (Donahoe P4: taste, not features)
- Any assumptions I'm making? State them now.

Step 2 — done (plan approved, audit clean).

## Step 3: Execute

Phase Quick / Wave QW · Step 3 — executing (~estimate).

Work through tasks. Run tests/verification after each.
Store key decisions in memory.

After each task: emit `Phase Quick / Wave QW · Step 3 — <task> done (verified).` then continue.

Step 3 — done (all tasks complete, tests pass).

## Step 4: Done Check

Quick verification: success criteria met? Tests pass? Consistent with existing work?
If yes → done. If gaps → fix. Update memory.

Step 4 — done (success criteria met, memory updated).

---

# DEEP MODE

For substantial projects. New products, major refactors, books, campaigns.
Full project lifecycle with state management.

State is stored in `.ijfw/projects/<project-name>/`:
- `brief.md` — what we're building (from Discovery)
- `research.md` — what we learned (from Research)
- `plan.md` — how we're building it (from Planning)
- `progress.md` — where we are (updated during Execution)
- `audit-log.md` — all audit findings

## Phase 1: DISCOVER

Phase Deep / Wave 1 — starting now.

Socratic interview. Understand the real problem.

Adapt questions to domain:
- **Software**: stack, users, deployment, existing codebase, security model
- **Content**: audience, format, tone, length, distribution, thesis
- **Business**: goals, metrics, timeline, stakeholders, constraints
- **Design**: platform, audience, brand, accessibility requirements

Must establish: What, Who, Why, Success Criteria, Constraints, Scope (in AND out).

Output: `brief.md` (max 30 lines). Present in chunks for approval.

After brief approval, propose a project team via ijfw-team skill:
- Identify domain-appropriate roles
- Generate specialised agents tailored to THIS project
- Present team for approval: "Project team ready: architect, senior-dev, qa..."
- Save to `.ijfw/agents/`. User can add/remove/swap agents anytime.
- Parallel and sequential execution assigned based on agent roles.

### DISCOVER AUDIT

Phase Deep / Wave 1 · Step 1.1 — discover audit in progress (~1min).

- [ ] Scope defined with boundaries (in AND out)
- [ ] Success criteria are testable
- [ ] No hidden assumptions
- [ ] Donahoe P3: Will this make users feel stupid?
- [ ] Donahoe P4: Taste or features? Cut the features.
- [ ] Donahoe P5: Can we auto-detect instead of configure?
- [ ] Donahoe P19: Progressive disclosure, not complexity dump?

Step 1.1 — done (discover audit passed, brief.md written).

## Phase 2: RESEARCH (skip for small projects)

Phase Deep / Wave 2 — starting now.

Investigate before planning. Scout agent for cheap exploration.
Tag findings with sources. Flag uncertainties.

Output: `research.md` with key findings and implications for the plan.

### RESEARCH AUDIT

Phase Deep / Wave 2 · Step 2.1 — research audit in progress (~1min).

- [ ] Did research change our understanding? Update brief if yes.
- [ ] Red flags? Security, feasibility, scope creep?
- [ ] Donahoe P9: Do we understand what we're about to build?

Step 2.1 — done (research audit passed, research.md written).

## Phase 3: PLAN

Phase Deep / Wave 3 — starting now.

Break into phases → milestones → tasks.

Each task:
1. What: clear deliverable, one line
2. Success criteria: testable verification
3. Files/assets: what gets created or modified
4. Dependencies: what must exist first
5. Blast radius: what else could be affected

Task sizing: 2-10 minutes, independently executable by subagent.
Group into phases with milestone checkpoints.

Output: `plan.md`. Present for approval.

### PLAN AUDIT

Phase Deep / Wave 3 · Step 3.1 — plan audit in progress (~1min).

- [ ] Every requirement from brief has a task
- [ ] Nothing silently dropped (scope reduction check)
- [ ] Logical dependency order
- [ ] Every task has testable success criteria
- [ ] Donahoe P4: Any tasks adding unrequested features? Cut.
- [ ] Donahoe P6: Does the plan expose architecture to users?
- [ ] Donahoe P22: Quality standards encoded, not assumed?

Step 3.1 — done (plan audit passed, plan.md approved).

## Phase 4: EXECUTE

Phase Deep / Wave 4 — starting now.

Work through plan. Dispatch to project team agents.
If team was set up in Discovery, match tasks to specialist agents:
- Task about auth flow → security agent + architect
- Task about UI scaffolding → dev agent (parallel)
- Task about plot structure → story-architect agent
- Task about world-building → world-builder agent (parallel with lore-master)

Fall back to default agents (scout/builder/architect) if no team configured.
Subagent isolation per task — main context stays clean.
Human checkpoints at phase boundaries.
Atomic commits for code. Store decisions in memory.
Update `progress.md` after each phase.

For long-running operations, emit a mid-step ping every meaningful interval:
`Phase Deep / Wave 4 · Step 4.M — <agent> in progress (~<estimate>).`

### TASK MICRO-AUDIT (every task)

Phase Deep / Wave 4 · Step 4.M — task audit in progress.

- [ ] Success criteria met
- [ ] Nothing outside scope changed
- [ ] For code: tests pass, linter clean, Donahoe P9 (can explain every line)
- [ ] For code: Donahoe P12 (security invisible), P18 (crash paths handled)
- [ ] For content: consistent with prior sections
- [ ] No new unstated assumptions

Step 4.M — done (task verified, progress.md updated).

### PHASE AUDIT (at milestones)

Phase Deep / Wave 4 · Step 4.M — phase audit in progress (~2min).

- [ ] All phase tasks complete and verified
- [ ] Brief still accurate or needs updating?
- [ ] Donahoe P2: Speed — is it fast? Measure if possible.
- [ ] Donahoe P3: Would a user feel stupid?
- [ ] Donahoe P7: Every error has a green path back
- [ ] Donahoe P13: Respecting user's machine and data?
- [ ] Donahoe P14: Accessible?
- [ ] Memory updated with phase outcomes

Step 4.M — done (phase audit passed, milestone complete).

## Phase 5: VERIFY

Phase Deep / Wave 5 — starting now.

Full audit against the original brief.

### For Software:

**Functional:**
- [ ] All tests pass (full suite)
- [ ] Donahoe P8: Starts when you click it
- [ ] Donahoe P10: Tested like someone's trying to break it
- [ ] Donahoe P11: Does something useful offline?

**User Experience:**
- [ ] Donahoe P1: First impression — what does a new user see?
- [ ] Donahoe P2: Startup time measured and respectful
- [ ] Donahoe P3: No moment where user feels stupid
- [ ] Donahoe P7: Every error has actionable recovery path
- [ ] Donahoe P17: User never opens a terminal
- [ ] Donahoe P19: Complexity revealed progressively

**Security & Quality:**
- [ ] Donahoe P12: Security invisible to user
- [ ] Donahoe P14: Accessible (screen reader, keyboard, motor)
- [ ] Donahoe P22: Quality in linters/tests/CI, not just vibes
- [ ] Auth on every endpoint, parameterised queries, no leaked secrets

### For Content:
- [ ] Consistency, tone, completeness read-through
- [ ] Audience alignment
- [ ] No logic gaps or missing sections

### For Anything:
- [ ] All success criteria from Discovery met
- [ ] Donahoe P4: Any bloat? Cut.
- [ ] Donahoe P5: Any configuration that should be automatic?

### Multi-AI Quality Trident (Donahoe P9)

For critical work, generate a cross-audit document:
1. Summarise what was built, key decisions, risk areas
2. Generate specific verification questions (testable, not vague)
3. Store in IJFW memory via ijfw_memory_store

Offer: "Cross-audit ready. Review in Gemini, Codex, or another AI."
If MCP memory shared: other agent says "review latest IJFW audit" — done.
Disagreements between AIs → flag, don't auto-resolve → present to user.

Use `/cross-audit` to generate the document explicitly.

Step 5.1 — done (verify complete, all criteria passed).

## Phase 6: SHIP

Phase Deep / Wave 6 — starting now.

Pre-flight: changelog, deployment, monitoring, rollback plan, documentation.

- [ ] Donahoe P15: Updates invisible, no user action needed
- [ ] Donahoe P20: Works on all target platforms
- [ ] Donahoe P21: Pricing respects the user
- [ ] Memory updated with full project summary

### SHIP GATE

Phase Deep / Wave 6 · Step 6.1 — ship gate in progress (~1min).

Re-read the original brief. Does what we built match? Ship or fix.

Step 6.1 — done (ship gate passed, project complete).

---

# WHERE AM I

When the user asks "where are we?", "status?", "progress?", or similar:

Respond with exactly this structure:
1. One sentence: `Phase <N> / Wave <NA> / Step <N.M> — <what is happening right now>.`
2. One sentence: `Recommended next: <specific action with default>.`

Example: "Phase Deep / Wave 4 / Step 4.2 — executing the auth module with the security specialist. Recommended next: run the task micro-audit when the agent responds (~2min)."

Never leave the user wondering where they are. Always include the recommended next action — no open menus.

---

# MID-STEP PING

For any operation expected to take more than 30 seconds (agent dispatch, test suite, build, research sweep):

Emit before starting: `Phase N / Wave NA · Step N.M — <agent or operation> in progress (~<estimate>).`
Emit on completion: `Step N.M — done (<evidence of success>).`

Do not wait until the end to narrate. Progress pings prevent the user from wondering if work is happening.

---

# VISUAL COMPANION (Software Projects)

For software projects in deep mode, offer to generate visual design documents.
Only when complexity warrants it. Hot-load, never force.

When offered and accepted, generate:

```markdown
## Architecture Overview
[Mermaid diagram: system components, data flow, external services]

## Component Breakdown
[Table: component, responsibility, dependencies, status]

## Data Model
[Mermaid ER diagram or table structure]

## API Surface
[Table: endpoint, method, auth, description]

## Security Model
[Diagram: auth flow, trust boundaries, data classification]
```

Present in digestible sections. Update as the project evolves.
Store in `.ijfw/projects/<name>/design.md`.

---

# STATE MANAGEMENT (Deep Mode)

Deep mode persists project state in `.ijfw/projects/<project-name>/`:

```
.ijfw/projects/my-project/
├── brief.md          # What we're building
├── research.md       # What we learned
├── plan.md           # How we're building it
├── progress.md       # Where we are
├── design.md         # Visual companion (software)
└── audit-log.md      # All audit findings
```

Resume at any point: `/workflow status` shows current stage and progress.
Switch projects: `/workflow` in a different directory picks up that project.
Memory integration: key decisions stored in IJFW memory for cross-session recall.

---

# OUTPUT RULES

Before emitting any "next step" text, scan for forbidden prefixes:
`gsd:`, `superpowers:`, `hookify:`, `claude-supermemory:`, `feature-dev:`, `pr-review-toolkit:`.
If found as an action verb (not inside an `Agent(` dispatch or attribution comment),
rewrite to an IJFW-native equivalent (e.g. "IJFW Plan phase", "code reviewer specialist via Agent tool")
or halt with: "Rewrite needed — foreign plugin verb detected."

---

# TASK SURFACE

Every phase transition and audit gate requires visible task tracking.

**At every phase boundary**, call `TaskCreate` for the upcoming phase before starting it.
**At every audit gate**, call `TaskCreate` with the gate name before executing the checklist.
**At every specialist dispatch** via `Agent(`, call `TaskCreate` with `agent_id` = the specialist role.
Call `TaskUpdate` to `completed` when the phase, gate, or agent concludes successfully.

Quick mode minimum: 3-5 tasks per cycle (Clarify, Plan, Quick Audit, Execute, Done Check).
Deep mode minimum: 15 tasks for a full run — one per phase (Phase 1 through Phase 6), one per audit gate
(DISCOVER AUDIT, RESEARCH AUDIT, PLAN AUDIT, TASK MICRO-AUDITs, PHASE AUDITs, SHIP GATE),
and one per specialist agent dispatch.

Example task IDs: `phase3-plan`, `gate-plan-audit`, `agent-code-reviewer`, `phase4-execute`, `gate-ship`.

---

# STAGE NAVIGATION

Auto-detect from context:
- "brainstorm this" / "quick idea" / "build this feature" → Quick mode
- "new project" / "plan the whole thing" / "let's go deep" → Deep mode
- "where were we?" / "continue" → Resume from last state
- "go deeper" → Escalate from quick to deep
- "keep it quick" → Simplify from deep to quick

If the user says "skip planning, just build" — push back gently:
"I'll build faster with a 2-minute plan. Want me to draft one quick?"
Never refuse. Always advocate for doing it right.

The Donahoe Loop: BUILD → AUDIT → FIX → SHIP → MEASURE → REPEAT
