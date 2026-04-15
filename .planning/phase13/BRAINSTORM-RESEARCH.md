# Brainstorm Flow Research -- 2026-04-15

Research record for the ijfw-workflow brainstorm redesign. Dispatched via
Explore agent after user reported a regression in a sister project where
an agent silently skipped brainstorm + research and dropped a 25-task plan.

## Sources

### Frameworks
- Google Ventures Design Sprint (Day 1: Understand + Map) -- gv.com/sprint
- Double Diamond (Design Council UK) -- designcouncil.org.uk
- IDEO Human-Centered Design -- designthinking.ideo.com
- Stanford d.school Crazy 8s -- designsprintkit.withgoogle.com
- Amazon Working Backwards / PR-FAQ -- workingbackwards.com
- Lean Canvas -- canva.com/online-whiteboard/lean-canvas
- Toyota 5 Whys -- atlassian.com/incident-management/postmortem/5-whys
- Stanford d.school "How Might We" -- dschool.stanford.edu/tools/how-might-we-questions
- Gary Klein Pre-Mortem -- gary-klein.com/premortem
- Amazon Bar Raiser -- aboutamazon.eu/news/working-at-amazon/what-is-a-bar-raiser-at-amazon

### Competitor auto-detection
- GitHub Copilot Workspace (topic-generation soft gate)
- Cursor Composer Plan Mode (Shift+Tab toggle, optional planning)
- Claude Code SDD (hard-gate spec-driven)
- Cognition Devin (3-hour rule, task completion criteria)
- Aider (no gate, /architect mode)
- Sourcegraph Cody (chat-based clarification)

## Key findings

1. **Group-dependent frameworks fail for solo dev + AI.** GV Sprint interviews,
   Bar Raiser, Double Diamond Discover all require multiple voices. Replace
   with AI-as-challenger and AI-as-persona-generator.

2. **Five auto-detection signals converge across competitor tools:**
   prompt length, vague verbs, project novelty, scope ambiguity, missing
   acceptance criteria. These are the inputs the auto-picker uses.

3. **Quick-collapse winners** (5-min timebox friendly):
   HMW framing, 5 Whys, Crazy-8s-as-bullets, pre-mortem flash.
   **Require deep time:** Double Diamond Discover, Working Backwards
   iterations, IDEO HCD full Inspire.

4. **Working Backwards / PR-FAQ** is powerful for product launches but feels
   heavy for internal refactors. Gated as an optional module that
   auto-triggers on external-user / launch signals.

## Flow decision

Hybrid approach recommended by the agent: single flow, two entry ramps
(Quick / Deep), shared discipline. Further streamlined for IJFW:

- **Auto-picker first** (deterministic signals, visible reasoning).
- **Quick = 5 moves**, each one-input-slot: FRAME / WHY / SHAPE / STRESS / LOCK.
- **Deep = 6 required modules + 3 optional**: FRAME / RECON / HMW / DIVERGE /
  CONVERGE / LOCK, plus EXTERNAL BRIEF + ANTI-SCOPE + TRIDENT CROSS-CRITIQUE
  auto-triggered by signals.
- **Memory hook** at every FRAME -- surfaces past relevant decisions inline.
- **Trident hook** at LOCK on high-stakes -- Codex + Gemini challenge the
  brief before plan.
- **One-word commits** throughout (`lock`, `go deeper`, `just quick`,
  `skip Trident`, `rollback`, `help`).
- **Positive framing** enforced (no "found problems"; "surfaced N points").

## Gaps closed vs. agent's first recommendation

1. Added auto-picker signal table so the skill can pick itself.
2. Added memory hook at every FRAME -- the superpower missing from the
   research agent's proposal.
3. Added Trident cross-critique hook at LOCK -- IJFW's unique weapon,
   which the research framework survey didn't know about.
4. Replaced rigid Working Backwards with a signal-triggered optional
   module -- skip for internal refactors.
5. Added mid-flow escalation (`go deeper`) and de-escalation (`just quick`).
6. Added ANTI-SCOPE module (Donahoe P4) -- "what we won't do".
7. Added delight beats (memory recall, AI-generated pre-mortem,
   Trident consensus line) so each move makes the user feel smarter,
   not like they're answering a quiz.

## Downstream workflow streamlined

Same brutal logic applied to PLAN / EXECUTE / VERIFY / SHIP:
- Memory hook at every phase entry.
- Visible artifacts with user sign-off (no auto-advance).
- TaskCreate mandatory per specialist + per sub-wave (real-time progress).
- Narration without hardcoded phase numbers (replaced stale
  "Phase 10 / Wave 10A" pattern).
- VERIFY audits against the BRIEF, not the plan -- tasks can pass while
  brief goals miss.
- One-word commits across the board.
