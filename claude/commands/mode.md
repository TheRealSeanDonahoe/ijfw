---
name: mode
description: "Switch IJFW mode. Usage: /mode smart|fast|deep|manual|brutal"
---

Switch the active IJFW mode. Acknowledge with one line.

**smart** (default): Auto-routes models, effort, and verbosity by task type.
Routine → scout/builder, terse. Complex → architect, thorough. Teaching → normal verbosity.

**fast**: Maximum efficiency. Cheapest viable model. Low effort. Ultra-terse.
Aggressive compaction. For blasting through known tasks.

**deep**: Maximum quality. Best model. High/max effort. Self-verification on.
Plan-then-execute enforced. Normal verbosity. For architecture, security, complex debug.

**manual**: All IJFW automation off. User controls /model, /effort, verbosity.
Output rules still active but overridable. For power users.

**brutal**: Caveman mode -- 1-sentence answers, code-only, no explanation
unless user asks "why" or "explain". Reasoning/thinking preserved, output
constrained. Sets IJFW_TERSE_ONLY=1. For blast-mode task execution.

Natural language triggers also work:
- "go fast" / "speed mode" → fast
- "think deeper" / "be thorough" → deep
- "back to normal" / "auto" → smart
- "be brutal" / "caveman mode" / "ultra-terse" → brutal

Mode persists until changed or session ends.
