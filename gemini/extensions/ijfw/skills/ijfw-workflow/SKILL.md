---
name: ijfw-workflow
description: "Universal project workflow with built-in quality auditing. Quick mode (fast brainstorm, ~5 min) or Deep mode (full plan with audits, ~30 min). Auto-picks based on task size. Trigger: 'build', 'create', 'plan', 'new project', 'brainstorm', 'help me build', or any project-level task."
---

# IJFW Workflow

Two modes, same principles, same invariants.

- **Quick** -- 5 moves, 3-5 minutes, locked brief. For features, fixes, ideas.
- **Deep** -- 6 required modules + 3 optional, 20-45 minutes. For new projects, major refactors, launches.

```
Donahoe Loop: BRAINSTORM -> PLAN -> EXECUTE -> VERIFY -> SHIP -> MEASURE
              |<--- memory recall at every entry --->|
              |<--- Trident cross-audit on request --->|
```

---

# AUTO-PICKER (runs first, every time)

Deterministic signals, visible reasoning, no friction.

| Signal | Points towards |
|---|---|
| Prompt < 15 words | Quick |
| Prompt has clear verb + object | Quick |
| Vague verbs alone ("improve", "fix", "handle", "deal with") | Deep |
| "New project", "major refactor", "launch", "design" | Deep |
| Project dir has no `.ijfw/memory/` | Deep |
| Explicit "brainstorm", "quick idea", "just sketch" | Quick |

**Protocol:**
1. Read signals silently.
2. Say in one line: `Reading this as <Quick|Deep> -- <reason>. Say "go deeper" / "just quick" to switch.`
3. If signals tie, ask once: `Quick or Deep?` Accept any affirmative shortcut ("q" / "d").
4. Start immediately. The user should never wait on a modal.

Mid-flow escalation: user can say `go deeper` at any Quick step; skill re-enters Deep at the equivalent module. Mid-flow de-escalation: `just quick` collapses the remaining Deep modules into a single LOCK.

---

# EMPTY-STATE OPENER

First session in a project (no `.ijfw/memory/` or zero entries in it) is the onboarding moment. Do not stay silent. Open with one line:

> `Clean slate here. Want me to run a 5-minute Quick brainstorm on what we're building, or jump straight in?`

User replies `brainstorm` / `jump in` / custom intent. If they jump in, still offer memory hooks for the first 3 turns so decisions get captured. If they brainstorm, route into QUICK mode FRAME. Either way, `.ijfw/memory/` gets bootstrapped silently.

If memory is populated but the last handoff is >7 days old, open with a softer beat: `Welcome back -- last handoff was <N> days ago. Quick recap?` User says `recap` / `new task` / actual intent.

---

# BRAINSTORM DISCIPLINE (invariants)

Hard rules. Violating any of these is a workflow failure worth auditing.

1. **One question at a time.** Never dump a numbered list and wait. Ask, get the answer, absorb, ask the next.
2. **No offscreen research.** If you dispatch an Explore / scout agent, paste a synthesis (3-5 bullets + contradictions + plan implications) in-chat BEFORE using it for anything.
3. **No skipping to the plan.** `plan.md` is written only after the user has explicitly confirmed the brief.
4. **No auto-advance.** Audit gates are user-facing checklists, not silent passes.
5. **Visible deliverables.** Every artifact (brief.md, research.md, plan.md) is summarized to the user in-chat when written.
6. **Intermediate thinking is tight output, not monologue.** Thirty words, then the next question.

Failure signatures to catch in yourself: about to write `plan.md` without user confirming brief; about to dispatch a research agent whose output will not be paraphrased back; about to say "Phase N complete, ready to build" in a turn where the user has not seen the intermediate findings.

---

# MEMORY HOOK (every FRAME step)

At the start of every brainstorm or plan, call `ijfw_memory_recall` with the goal text. Surface up to 3 related past decisions inline:

> I remember: decision from <project> on <date> -- <1-line summary>. Pull full context?

This is the single biggest superpower IJFW delivers. Never skip it. If memory is empty, say so ("clean slate -- nothing recalled") so the silence is intentional, not absence of effort.

---

# QUICK MODE -- 5 moves, 3-5 min

For focused work. Picks up from current context. Each move has ONE input slot.

### Move 1 -- FRAME (45s)

- AI parses the goal from the ask or asks: `Goal in one line.`
- Memory hook fires. AI pastes up to 3 related recalls inline.
- AI echoes: `So: <concise goal>. Yes?`
- User confirms or edits.

### Move 2 -- WHY (30s)

- AI asks: `Why does this matter? What's broken if we don't ship it?`
- Single 5-Whys drill -- one follow-up question if the answer stays surface.
- AI surfaces the root motivation: `Root: <X>. That means we should <design implication>.`

### Move 3 -- SHAPE (60s)

- AI proposes **3 approaches**, each as 1 line + 1 tradeoff:
  > A: <approach> -- tradeoff: <cost>
  > B: <approach> -- tradeoff: <cost>
  > C: <approach> -- tradeoff: <cost>
- User picks, hybrids, or overrides. No blank page, ever.

### Move 4 -- STRESS (30s)

- AI runs a pre-mortem flash: `Top risk: <concrete scenario>. Mitigation: <concrete fix>.`
- User confirms mitigation or swaps.
- Sutherland wow: the risk the user hadn't thought of.

### Move 5 -- LOCK (15s)

- AI pastes the brief in-chat (max 6 lines: goal / root / approach / risk / mitigation / success).
- User says one word: `lock` / `fix <X>` / `go deeper`.
- On `lock`: write `.ijfw/memory/brief.md`. Route straight to PLAN.

**Quick-mode closer:** `You went from <original-ask> to locked brief with <N> risks mitigated in <M> minutes.` Receipt for the work.

---

# DEEP MODE -- 6 required modules + 3 optional

For substantial projects. Modules are a spine, not a checklist. Every module has a memory hook, a visible artifact, and a one-word commit.

## Required spine

### Module 1 -- FRAME (3 min)

- Memory recall on the goal keywords.
- Socratic arc: problem -> users -> constraints -> scope (in and out).
- One question per turn. Echo back every 3 turns to confirm understanding.
- Exit: `Brief draft ready to review. Paste now? (y/edit)`
- Artifact: `.ijfw/memory/brief.md` (30 lines max).

### Module 2 -- RECON (5-10 min)

- State the research questions in-chat first: `I want to answer X, Y, Z -- okay?`
- Dispatch scout / Explore agents with those questions (parallel where independent).
- When agents return, paste synthesis in-chat: **ask** + **answer** + **contradictions** + **plan implications**.
- User reacts. Follow up if they push back.
- Artifact: `.ijfw/memory/research.md` (cleaned-up synthesis, not raw agent output).

### Module 3 -- HMW (3 min)

- AI proposes 2-3 "How Might We" reframings based on FRAME + RECON.
- User picks one, rejects, or edits.
- The chosen HMW anchors DIVERGE.

### Module 4 -- DIVERGE (8 min)

- AI sketches **4-5 approaches** as 2-line bullets (shape + key tradeoff).
- User picks 2, rejects, or says `hybrid A + C`.
- No blank page. If user wants a 6th sketch, AI generates it on demand.

### Module 5 -- CONVERGE (5 min)

- AI drafts success metrics / acceptance criteria from the chosen approach.
- Pre-mortem pass: AI generates 4-5 plausible failure scenarios.
- User picks top 2 risks. AI proposes mitigation for each.
- Artifact: metrics + risks + mitigations appended to brief.md.

### Module 6 -- LOCK (2 min)

- AI pastes the full brief (goal / HMW / approach / metrics / risks / mitigations) in-chat.
- Optional Trident cross-critique fires here if ENABLED (see below).
- User says `lock` / `fix <X>` / `skip Trident` / `route to plan`.
- On `lock`: route to PLAN phase.

## Optional modules (auto-triggered)

### EXTERNAL BRIEF (5 min) -- mini PR/FAQ
Auto-triggers when: project has end-users, public launch, marketing surface, or user says "product".
Writes a 2-paragraph press-release + 5-question FAQ. Forces customer-POV thinking.

### ANTI-SCOPE (2 min) -- "what we won't do"
Auto-triggers when: 5+ candidate features surfaced in DIVERGE, or domain is feature-heavy (CRM, dashboards, admin panels).
AI lists 5 things we could build but won't. User confirms or pulls one back in.

### TRIDENT CROSS-CRITIQUE (~2 min) -- external AI challenge
Auto-triggers when: new project, major refactor, public launch, or LOCK on brief > 20 lines.
Fires `ijfw cross critique <brief>` in background. Surfaces consensus + contested findings. User decides.
User override: `skip Trident` or `force Trident` at any LOCK.

---

# POST-BRAINSTORM WORKFLOW

After LOCK, the brief drives every downstream phase. Same discipline, same memory hooks, same positive framing.

## PLAN (after LOCK)

- Memory hook: recall past similar plans.
- AI drafts `.ijfw/memory/plan.md` (max 15 tasks for Quick, 30 for Deep).
- Each task: what / how-to-verify / file paths.
- User reviews. One-word commit: `approve` / `trim` / `expand`.

**Plan audit** -- run `ijfw plan-check` or follow inline checklist, not silent:
- Every task has a verify step.
- No unstated assumptions.
- Scope matches brief (nothing new).
- Destructive ops flagged.
- User confirms before EXECUTE.

## EXECUTE

- Dispatch per manifest (shared branch or worktree per sub-wave).
- TaskCreate one task per sub-wave, flipped `in_progress` / `completed` in real time.
- Mid-step pings for operations > 30s: `<agent> in progress (~<estimate>).`
- After each task: task micro-audit (6 points).
- Post-wave: merge worktrees in `mergeOrder()`. Conflicts halt + escalate.
- **No auto-advance to VERIFY.** User confirms all tasks done.

**Task micro-audit** -- one line per task:
- Criteria met, scope clean, tests pass, no new assumptions.

**Phase audit** -- at wave/milestone boundaries:
- Brief still accurate? Speed respectful? Security invisible? Memory updated?

### VISUAL COMPANION (software projects, opt-in)

For software builds, the workflow can surface a visual companion that tracks
architecture, component boundaries, data model, API surface, and security
posture. Auto-offered at EXECUTE entry for Deep-mode software phases; one-word
`yes` activates it. Produces `.ijfw/visual/<phase>.md` with Mermaid diagrams
the user can render in any markdown viewer. Updated at every phase audit so
the picture never rots.

Skip for non-software projects (books, campaigns, research) where the brief
and plan carry enough structure.

## VERIFY

- Audit the result against the **brief**, not the plan. (Tasks can pass while brief goals miss.)
- Functional + UX + Security + Quality checklists.
- Optional Trident cross-audit on the diff: `ijfw cross audit <diff>`.
- User confirms: `verified` / `gap: <X>` / `ship it`.

## SHIP

- Atomic commit with the brief's one-liner as the title.
- Optional Trident final critique: `ijfw cross critique HEAD~1..HEAD` (background).
- Tag / release notes / CHANGELOG entry if this is a public ship.
- Memory write: decision + pattern + learning.
- Announcement copy -- user owns the channels, IJFW provides talking points.

**Ship gate** -- single pass:
- Diff matches brief. Tests green. Changelog updated. Memory stored. Trident receipt logged.

---

# NARRATION (every transition)

One sentence at every phase entry and mid-step ping. Format:

> `Phase <name> -- Move <n> -- <what's happening>.`

Examples:
- `Brainstorm Quick -- Move 3 SHAPE -- proposing three approaches.`
- `Brainstorm Deep -- RECON -- dispatching two research agents.`
- `Plan -- drafting 12 tasks from brief.`
- `Execute -- wave 1/3 in progress (~4 min).`
- `Ship -- Trident critique running in background.`

No hardcoded phase numbers. Narration tracks the current workflow step, not historical plan-doc coordinates.

---

# POSITIVE FRAMING (enforced everywhere)

Replace negatives with reframes. Applies to every user-facing string the skill emits.

| Never | Always |
|---|---|
| "found problems" | "surfaced X points" |
| "failed" | "didn't complete -- try again?" |
| "error" (as header) | "heads up" / "one thing" |
| "missing" | "ready to add" |
| "not supported" | "standing by" |
| "broken" | "needs a sharpening pass" |

End-of-phase closer is a receipt, not a report:

> `You went from <input> to <outcome> in <time>.`

---

# USER OVERRIDES (one-word commits)

The skill accepts these at any prompt:

- `lock` -- commit current artifact, advance.
- `go deeper` -- escalate Quick to Deep at the equivalent module.
- `just quick` -- collapse remaining Deep modules into one LOCK.
- `skip <module>` -- drop an optional module (Trident / External Brief / Anti-scope).
- `force Trident` -- run Trident cross-critique even on low-stakes LOCK.
- `rollback` -- revert to the prior module's artifact.
- `help` -- where am I + what's next.

---

# TASKCREATE USAGE (mandatory)

At every specialist dispatch via `Agent(`, call `TaskCreate` with the specialist role.
At every wave/swarm dispatch (2+ parallel agents), call `TaskCreate` with one task per sub-wave BEFORE dispatching. Mark `in_progress` in the same turn as the Agent calls. Flip to `completed` as soon as each finishes.

The user must see strikethrough progress in real time. Silent dispatch is a workflow violation.

Quick-mode minimum: 5 tasks (one per move).
Deep-mode minimum: one per module + one per specialist + one per audit gate + ship gate. ~12-18 tasks per full run.

---

# NAMING-GAP AUDIT (every turn)

Before emitting any "next step" text, scan for foreign plugin prefixes -- any `<plugin>:` pattern where `<plugin>` is not `ijfw`. If found as an action verb, rewrite to the IJFW-native equivalent or halt with: `Rewrite needed -- foreign plugin verb detected.`

Specialist swarm members (code-reviewer, silent-failure-hunter, pr-test-analyzer, type-design-analyzer) are allowed. Foreign plugin commands are not.

---

# STATE FILE (Deep Mode)

Write `.ijfw/state/workflow.json` at every transition:

```json
{
  "mode": "deep",
  "module": "HMW",
  "last_commit": "lock",
  "artifacts": ["brief.md", "research.md"],
  "next": "DIVERGE"
}
```

On session resume: read this file, echo the current state, offer `continue` / `restart`. Memory recall also fires on resume so context is live.

---

**Invariant:** every move the user experiences should make them feel smarter and more in control -- memory recall surfaces forgotten context, AI proposes before the user has to, Trident challenges before they commit, one word advances. Anything that makes them feel stupid or stuck is a workflow bug.
