---
name: ijfw-workflow
description: "Universal project workflow with built-in quality auditing. Two modes: quick (brainstorm/build fast) and deep (full project management). Trigger: 'build', 'create', 'plan', 'new project', 'brainstorm', 'help me build', or any project-level task."
context: fork
model: sonnet
---

# IJFW Workflow

Two modes. Same principles. Same audit gates.

**Quick** -- brainstorm, plan, build. Pick up from where you are. 5 min to execution.
**Deep** -- full project management. Phases, milestones, research, subagent orchestration.

```
Donahoe Loop: BUILD -> AUDIT -> FIX -> SHIP -> MEASURE -> REPEAT
```

Auto-detect: "brainstorm this feature" → quick. "New project" → deep.
User override: "go deeper" escalates. "Let's keep this quick" simplifies.

---

# BRAINSTORM DISCIPLINE (applies to both modes)

A brainstorm is a conversation, not a solo exercise. The following rules are
mandatory for every DISCOVER, RESEARCH, and planning activity in this skill.
Violating any of them is a workflow failure worth auditing.

## Hard rules

1. **One question at a time during brainstorm.** Never dump 10 questions and
   wait. Ask, get the answer, absorb, ask the next. The user sets the pace.
2. **No offscreen research.** If you dispatch an Explore / scout / research
   agent, surface the synthesized findings to the user BEFORE you use them
   to write anything. Minimum: a one-paragraph summary + the 3 top findings
   + any contradictions. The user can steer based on what came back.
3. **No skipping to the plan.** `plan.md` is written only after the user has
   explicitly confirmed the brief + the research synthesis. If the user has
   not said "plan it" or equivalent, do not write a plan.
4. **Audit gates require user sign-off.** "Audit passed" is not a green
   light to advance on its own -- it is a checklist that the user confirms
   before the next phase starts. The skill never auto-advances between
   DISCOVER -> RESEARCH -> PLAN -> EXECUTE.
5. **Visible deliverables.** Every phase's artifact (brief.md, research.md,
   plan.md) is summarized to the user in-chat when written, not silently
   dropped in a directory. If you wrote it and did not tell the user what
   is in it, you failed this rule.
6. **Intermediate thinking is output, not a monologue.** When brainstorming
   back-and-forth, keep each turn short. Do not turn the user's "what about
   X?" into a 200-line internal analysis. Thirty-word answers, then ask
   the next clarifying question.

## Failure signatures to watch for

If you catch yourself doing any of the following, stop and reset:

- About to write `plan.md` without the user having confirmed the brief.
- About to dispatch a research agent whose output you will not paraphrase
  back to the user.
- About to say "Phase N plan complete. Ready to build" in a turn where the
  user has not actually seen the intermediate research findings.
- About to emit a 25-task breakdown after one user turn that said
  "brainstorm this".
- About to auto-advance past an audit gate without user confirmation.

The correct move in each case: pause, surface what you learned or intend
to learn, and hand the next decision back to the user.

---

# QUICK MODE

For focused work. Features, fixes, content pieces, brainstorms.
Picks up from current context -- no need to start from scratch.

## Step 1: Clarify (30 seconds)

Phase Quick / Wave QW (Quick Wave) -- starting now.
**Follow BRAINSTORM DISCIPLINE.** One question at a time. Do not dump 3.

Ask sharp questions in sequence until intent is clear. Typical arc:
  1. What exactly are we building/changing?  (wait for answer)
  2. What does "done" look like?              (wait for answer)
  3. Any constraints I should know about?     (wait for answer)

If intent is already clear from context, skip straight to Step 2.
Never write `plan.md` until the user has confirmed your understanding
in one of the turns above.

Step 1 -- done (intent captured, success criteria confirmed).

## Step 2: Quick Plan (1-2 minutes)

Draft a brief plan. Max 10 tasks. Each task: what to do, how to verify.
Present it. Get a thumbs up or adjustments. Then go.

For software: include file paths and test expectations.
For content: include sections, tone, key points.

### Quick Audit

Phase Quick / Wave QW -- Step 2 -- audit in progress (~30s).

Before executing, 30-second check:
- Does this match what was asked? (scope)
- Is this the simplest approach? (Donahoe P4: taste, not features)
- Any assumptions I'm making? State them now.

Step 2 -- done (plan approved, audit clean).

## Step 3: Execute

Phase Quick / Wave QW -- Step 3 -- executing (~estimate).

Work through tasks. Run tests/verification after each.
Store key decisions in memory.

After each task: emit `Phase Quick / Wave QW -- Step 3 -- <task> done (verified).` then continue.

Step 3 -- done (all tasks shipped, tests pass, audit gates cleared).

## Step 4: Done Check

Quick verification: success criteria met? Tests pass? Consistent with existing work?
If yes → done. If gaps → fix. Update memory.

Step 4 -- done (success criteria met, memory updated).

---

# DEEP MODE

For substantial projects. New products, major refactors, books, campaigns.
Full project lifecycle with state management.

State is stored in `.ijfw/projects/<project-name>/`:
- `brief.md` -- what we're building (from Discovery)
- `research.md` -- what we learned (from Research)
- `plan.md` -- how we're building it (from Planning)
- `progress.md` -- where we are (updated during Execution)
- `audit-log.md` -- all audit findings

Note: if `.ijfw/` is not writeable (read-only container or sandbox), state persists in-session only. Rerun from a writeable directory to save across sessions.

## Phase 1: DISCOVER

Phase Deep / Wave 1 -- starting now.

Socratic interview. Understand the real problem.
**Follow BRAINSTORM DISCIPLINE.** One question at a time. No long monologues.
No advancing to Phase 2 until the user has confirmed the brief.

Adapt questions to domain:
- **Software**: stack, users, deployment, existing codebase, security model
- **Content**: audience, format, tone, length, distribution, thesis
- **Business**: goals, metrics, timeline, stakeholders, constraints
- **Design**: platform, audience, brand, accessibility requirements

Must establish: What, Who, Why, Success Criteria, Constraints, Scope (in AND out).

Conversation pattern:
  1. Open question: "Tell me the problem in one sentence."
  2. User answers.
  3. One clarifying follow-up.
  4. User answers.
  5. Loop until What/Who/Why/Success/Constraints/Scope are all filled.
  6. Summarise what you heard: "Here's what I've got so far -- [3 bullets]."
  7. User confirms or corrects.
  8. ONLY THEN write brief.md.
  9. Paste the brief in-chat. Ask: "Does this read right?" before Phase 2.

Output: `brief.md` (max 30 lines). Do not write it until step 8 above.

After brief approval, propose a project team via ijfw-team skill:
- Identify domain-appropriate roles
- Generate specialised agents tailored to THIS project
- Present team for approval: "Project team ready: architect, senior-dev, qa..."
- Save to `.ijfw/agents/`. User can add/remove/swap agents anytime.
- Parallel and sequential execution assigned based on agent roles.

### DISCOVER AUDIT

Phase Deep / Wave 1 -- Step 1.1 -- discover audit in progress (~1min).

- [ ] Scope defined with boundaries (in AND out)
- [ ] Success criteria are testable
- [ ] No hidden assumptions
- [ ] Donahoe P3: Will this make users feel stupid?
- [ ] Donahoe P4: Taste or features? Cut the features.
- [ ] Donahoe P5: Can we auto-detect instead of configure?
- [ ] Donahoe P19: Progressive disclosure, not complexity dump?

Step 1.1 -- done (discover audit passed, brief.md written).

## Phase 2: RESEARCH (skip for small projects)

Phase Deep / Wave 2 -- starting now.
**Follow BRAINSTORM DISCIPLINE.** Research findings are surfaced to the user
before they feed any plan. Dispatched agents do not write directly to disk.

Investigate before planning. Scout / Explore agents for cheap exploration.
Tag findings with sources. Flag uncertainties.

Required sequence:
  1. State the research questions in-chat: "I want to answer X, Y, Z -- okay?"
  2. User confirms or edits the question list.
  3. Dispatch agents (scout / Explore / specialist) with those questions.
  4. When agents return, paste a synthesis in-chat:
     - What I asked
     - What came back (3-5 bullets)
     - Contradictions or gaps
     - How this would change the plan
  5. User reacts. Follow up if they push back.
  6. ONLY THEN write research.md (a cleaned-up version of the synthesis).
  7. Confirm the research.md contents in-chat before Phase 3.

Output: `research.md` with key findings and implications for the plan.
Do not write it until step 6 above.

### RESEARCH AUDIT

Phase Deep / Wave 2 -- Step 2.1 -- research audit in progress (~1min).

- [ ] Did research change our understanding? Update brief if yes.
- [ ] Red flags? Security, feasibility, scope creep?
- [ ] Donahoe P9: Do we understand what we're about to build?

Step 2.1 -- done (research audit passed, research.md written).

## Phase 3: PLAN

Phase Deep / Wave 3 -- starting now.

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

Phase Deep / Wave 3 -- Step 3.1 -- plan audit in progress (~1min).

- [ ] Every requirement from brief has a task
- [ ] Nothing silently dropped (scope reduction check)
- [ ] Logical dependency order
- [ ] Every task has testable success criteria
- [ ] Donahoe P4: Any tasks adding unrequested features? Cut.
- [ ] Donahoe P6: Does the plan expose architecture to users?
- [ ] Donahoe P22: Quality standards encoded, not assumed?

Step 3.1 -- done (plan audit passed, plan.md approved).

## Phase 4: EXECUTE

Phase Deep / Wave 4 -- starting now.

### DISPATCH PLANNING (Wave 4 entry)

Before any sub-wave dispatch, call the dispatch-planner to decide shared-branch
vs worktree-isolated parallelism per sub-wave:

```
ijfw-dispatch-plan .planning/phaseN/PLAN.md
ijfw-dispatch-plan .planning/phaseN/PLAN.md all-worktree   # override
```

Emit the one-line summary to the user before dispatching:
`Phase Deep / Wave 4 -- dispatch plan: <manifestSummary>.`

Override flags (from user or `/workflow` args):
- `--all-worktree` -> every sub-wave runs in its own worktree.
- `--all-shared`   -> every sub-wave commits to the parent branch.
- default: planner decides per `Files:` declaration in the plan.

Sub-waves without a `Files:` declaration fall back to worktree (safe default).
Plan authors declare files like:
`  Files: mcp-server/src/foo.js, claude/skills/bar/SKILL.md`

Work through plan. Dispatch to project team agents.
If team was set up in Discovery, match tasks to specialist agents:
- Task about auth flow → security agent + architect
- Task about UI scaffolding → dev agent (parallel)
- Task about plot structure → story-architect agent
- Task about world-building → world-builder agent (parallel with lore-master)

Fall back to default agents (scout/builder/architect) if no team configured.
Subagent isolation per task -- main context stays clean.
Human checkpoints at phase boundaries.
Atomic commits for code. Store decisions in memory.
Update `progress.md` after each phase.

For long-running operations, emit a mid-step ping every meaningful interval:
`Phase Deep / Wave 4 -- Step 4.M -- <agent> in progress (~<estimate>).`

### TASK MICRO-AUDIT (every task)

Phase Deep / Wave 4 -- Step 4.M -- task audit in progress.

- [ ] Success criteria met
- [ ] Nothing outside scope changed
- [ ] For code: tests pass, linter clean, Donahoe P9 (can explain every line)
- [ ] For code: Donahoe P12 (security invisible), P18 (crash paths handled)
- [ ] For content: consistent with prior sections
- [ ] No new unstated assumptions

Step 4.M -- done (6-point task audit cleared, task verified, progress.md updated).

### POST-WAVE MERGE (worktree sub-waves only)

After every sub-wave in a wave has reported done, merge worktree branches back
into the parent branch in the order emitted by `mergeOrder(manifest)`:

```
for sub in $(mergeOrder); do
  git merge --no-ff "$sub" || { echo "CONFLICT on $sub"; break; }
done
```

Shared sub-waves are skipped -- they already committed to the parent.

On conflict: do NOT auto-resolve. Halt the wave, emit via the workflow
audit-gate narration:
`Phase Deep / Wave 4 -- Step 4.M -- merge conflict on <sub-wave> (files: <paths>). Escalating for human resolution.`
Then surface the conflicted file list, wait for user direction, and only
resume `git merge --continue` after explicit approval.

Clean up worktrees only after a successful merge: `git worktree remove <path>`.

### PHASE AUDIT (at milestones)

Phase Deep / Wave 4 -- Step 4.M -- phase audit in progress (~2min).

- [ ] All phase tasks complete and verified
- [ ] Brief still accurate or needs updating?
- [ ] Donahoe P2: Speed -- is it fast? Measure if possible.
- [ ] Donahoe P3: Would a user feel stupid?
- [ ] Donahoe P7: Every error has a green path back
- [ ] Donahoe P13: Respecting user's machine and data?
- [ ] Donahoe P14: Accessible?
- [ ] Memory updated with phase outcomes

Step 4.M -- done (phase audit passed, milestone complete).

## Phase 5: VERIFY

Phase Deep / Wave 5 -- starting now.

Full audit against the original brief.

### For Software:

**Functional:**
- [ ] All tests pass (full suite)
- [ ] Donahoe P8: Starts when you click it
- [ ] Donahoe P10: Tested like someone's trying to break it
- [ ] Donahoe P11: Does something useful offline?

**User Experience:**
- [ ] Donahoe P1: First impression -- what does a new user see?
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

### Multi-AI Quality Trident (Donahoe P9 -- see CLAUDE.md Donahoe 22 Principles)

For critical work, generate a cross-audit document:
1. Summarise what was built, key decisions, risk areas
2. Generate specific verification questions (testable, not vague)
3. Store in IJFW memory via ijfw_memory_store

Offer: "Trident stands ready -- 2 more models will independently challenge this. Consensus findings jump to high-priority; lone flags become watch-items. Fire now?"
If no external AI is reachable, fall back to Agent-dispatched specialist swarm (security, code-review, reliability).
If MCP memory shared: other agent says "review latest IJFW audit" -- done.
Disagreements between AIs -- flag, don't auto-resolve -- present to user.

Use `/cross-audit` to generate the document explicitly.

Step 5.1 -- done (verify complete, all criteria passed).

## Phase 6: SHIP

Phase Deep / Wave 6 -- starting now.

Pre-flight: changelog, deployment, monitoring, rollback plan, documentation.

- [ ] Donahoe P15: Updates invisible, no user action needed
- [ ] Donahoe P20: Works on all target platforms
- [ ] Donahoe P21: Pricing respects the user
- [ ] Memory updated with full project summary

### SHIP GATE

Phase Deep / Wave 6 -- Step 6.1 -- ship gate in progress (~1min).

Re-read the original brief. Does what we built match? Ship or fix.

Step 6.1 -- done (ship gate passed, project complete).

---

# WHERE AM I

When the user asks "where are we?", "status?", "progress?", or similar:

Respond with exactly this structure:
1. One sentence: `Phase <N> / Wave <NA> / Step <N.M> -- <what is happening right now>.`
2. One sentence: `Recommended next: <specific action with default>.`

Example: "Phase Deep / Wave 4 / Step 4.2 -- executing the auth module with the security specialist. Recommended next: run the task micro-audit when the agent responds (~2min)."

Never leave the user wondering where they are. Always include the recommended next action -- no open menus.

Optional: if cumulative progress is useful context, append one line: "Progress so far: <N> tasks shipped, <M> audit gates cleared."

---

# MID-STEP PING

For any operation expected to take more than 30 seconds (agent dispatch, test suite, build, research sweep):

Emit before starting: `Phase N / Wave NA -- Step N.M -- <agent or operation> in progress (~<estimate>).`
Emit on completion: `Step N.M -- done (<evidence of success>).`

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

# STEP STATE FILE

At every Step transition (phase start, audit gate entry, step completion), write `.ijfw/state/current-step.json`:

```json
{
  "phase":            "<phase -- e.g. Deep, Quick, or phase number>",
  "wave":             "<wave -- e.g. 1, QW, 4>",
  "step":             "<step -- e.g. 1.1, 3, 4.2>",
  "label":            "<what is happening right now, one short sentence>",
  "started_at":       "<ISO 8601 timestamp>",
  "recommended_next": "<specific next action with default, no open menu>"
}
```

Write the file with `Write` or shell redirect. Overwrite on every transition -- this is a single-record file, not a log. Never skip a transition even if the step is brief. `/ijfw-status` reads this file to report current position.

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

Before emitting any "next step" text, scan for foreign plugin prefixes -- any `<plugin>:` prefix where `<plugin>` is not `ijfw`. If found as an action verb (not inside an `Agent(` dispatch or attribution comment), rewrite to an IJFW-native equivalent (e.g. "IJFW Plan phase", "code reviewer specialist via Agent tool") or halt with: "Rewrite needed -- foreign plugin verb detected."

---

# TASK SURFACE

Every phase transition and audit gate requires visible task tracking.

**At every phase boundary**, call `TaskCreate` for the upcoming phase before starting it.
**At every audit gate**, call `TaskCreate` with the gate name before executing the checklist.
**At every specialist dispatch** via `Agent(`, call `TaskCreate` with `agent_id` = the specialist role.
**At every wave/swarm dispatch** (2+ parallel agents), call `TaskCreate` with one task per sub-wave
BEFORE dispatching. Mark all tasks `in_progress` in the same turn as the Agent calls.
On each agent-completion notification, flip the matching task to `completed` immediately -- not batched.
Rationale: without the live strikethrough surface, the user sits through multi-minute parallel runs
with no feedback and assumes the system is broken. Krug + Donahoe + Sutherland all at once.
Call `TaskUpdate` to `completed` when the phase, gate, or agent concludes successfully.

Quick mode minimum: 3-5 tasks per cycle (Clarify, Plan, Quick Audit, Execute, Done Check).
Deep mode minimum: 15 tasks for a full run -- one per phase (Phase 1 through Phase 6), one per audit gate
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

If the user says "skip planning, just build" -- push back gently:
"I'll build faster with a 2-minute plan. Want me to draft one quick?"
Never refuse. Always advocate for doing it right.

The Donahoe Loop: BUILD → AUDIT → FIX → SHIP → MEASURE → REPEAT
