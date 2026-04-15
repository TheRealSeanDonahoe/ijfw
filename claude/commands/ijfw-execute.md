---
name: ijfw-execute
description: "Jump directly to the IJFW workflow Execute phase (Deep D4 / Quick Q3). Usage: /ijfw-execute [task or phase name]"
---

Jump straight into the IJFW workflow Execute phase. Use this when a plan is
already approved and you're ready to build.

**Quick mode (Q3):** Work through tasks in sequence. Run tests and verification
after each. Store key decisions in memory. One-keystroke: `/ijfw-execute`.

**Deep mode (D4):** Dispatch tasks to the project team agents set up during
Discovery. Specialist agents run in parallel where tasks are independent. Human
checkpoints fire at each phase boundary. Atomic commits for code changes.
`progress.md` updates after every phase.

This command invokes `ijfw-workflow` at the Execute phase directly. IJFW drives
the full execution loop via the `Agent` tool -- no external plugin hand-off.
Every task transition creates a visible task entry so you can see progress in
real time.

**Natural triggers:** "start building", "execute the plan", "let's go", "build it",
"kick off execution."

If no `plan.md` exists, this command offers a 2-minute Quick Plan pass first
before executing -- skipping planning reliably causes scope drift.

**GATE:** Execute phase ends at the PHASE AUDIT gate -- all phase tasks complete,
brief still accurate, memory updated. Gate runs at each phase boundary.
