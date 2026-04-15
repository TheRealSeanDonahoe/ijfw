---
name: handoff
description: "Generate or load a session handoff. Usage: /handoff [create|resume]"
---

**/handoff create** -- Generate a structured handoff document for session continuity.
Capture: what was accomplished, what's in progress, key decisions made,
modified files, next steps, blockers, open questions.
Save to .ijfw/memory/handoff.md

**/handoff resume** -- Load the most recent handoff and display a summary.
Automatically invoked at SessionStart if a handoff exists.

**/handoff** (no args) -- Show current handoff status.
