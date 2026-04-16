---
name: ijfw-handoff
description: "Session handoff generation and loading. Trigger: session end, context full, /handoff"
---

Generate a structured handoff for session continuity.

## Creating a Handoff

Capture in .ijfw/memory/handoff.md:

```
Handoff: <timestamp>
====================

Status
------
| Phase N | Wave NA | Step N.M | <done/in-progress/blocked> |

<What's done. What's in progress. What percentage complete.>

Decisions
---------
<Key decisions made this session with rationale. 1 line each.>

Modified Files
--------------
<Files created/edited with brief description of changes.>

Next Steps
----------
<Ordered list. What to do first when resuming.>

Blockers
--------
<Open questions, missing info, external dependencies.>
```

Rules:
- Max 30 lines. This loads at next SessionStart -- keep it lean.
- Specific file paths, function names, line numbers.
- Present tense for current state, imperative for next steps.
- No filler. Every line must help the next session start faster.

## Loading a Handoff

Read .ijfw/memory/handoff.md. Display a 2-3 line summary.
Set context for continuation.
