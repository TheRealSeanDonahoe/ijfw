---
name: workflow
description: "Start or resume the IJFW project workflow. Usage: /workflow [discover|plan|execute|verify|ship|status]"
---

Start or continue the IJFW project workflow.

**/workflow** (no args) — Detect current stage and resume.
**/workflow discover** — Start a new project from Discovery.
**/workflow plan** — Jump to planning (if brief exists).
**/workflow execute** — Start or resume execution (if plan exists).
**/workflow verify** — Run full verification audit.
**/workflow ship** — Pre-flight checklist.
**/workflow status** — Show current project state, stage, and progress.

The workflow runs audit gates at every stage transition.
Audit gates check against the Donahoe Principles.
See references/donahoe-principles.md for the full framework.
