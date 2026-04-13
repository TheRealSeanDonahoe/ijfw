---
name: team
description: "Manage your project's agent team. Usage: /team [setup|list|add|remove|swap]"
---

Manage project-specific agents in `.ijfw/agents/`.

**/team** (no args) — List current team and their roles.
**/team setup** — Generate a team based on the project brief (or ask what you're building).
**/team add <role>** — Add a specialist to the team. Describe what you need.
**/team remove <role>** — Remove an agent from the team.
**/team swap <old> <new>** — Replace one agent with another.

Team agents are used automatically during workflow execution.
Tasks are dispatched to the agent whose specialty matches.
Parallel execution where tasks are independent.
