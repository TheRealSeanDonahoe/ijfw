---
name: ijfw-status
description: "Show current IJFW state — mode, routing, memory, context health, and efficiency metrics."
---

Display current IJFW status with cumulative metrics. Positive framing — show what IJFW has done for the user.

## Current Session
- Mode (smart/fast/deep/manual)
- Effort level
- Routing (native / OpenRouter / local model / smart routing)
- Turns this session
- Agents dispatched this session
- Context usage %

## Cumulative Metrics (from .ijfw/metrics/sessions.jsonl)

Read the JSONL file. Each line is one session's metrics. Compute:

**Sessions:** total count, average duration
**Routing efficiency:** if routing detected, estimate savings:
  - Each scout (Haiku) turn instead of Opus saves ~$0.074 per 1K output tokens
  - Each builder (Sonnet) turn instead of Opus saves ~$0.060 per 1K output tokens
  - Rough estimate: 500 output tokens/turn average
**Memory:** total stores, decisions tracked, consolidations run
**Continuity:** % sessions with handoff generated

## Display Format

```
━━━ IJFW Status ━━━━━━━━━━━━━━━━━━━━━━
Mode: smart | Effort: high | OpenRouter + local model

This Session:
  14 turns | scout: 5, builder: 7, architect: 2
  3 decisions stored | Context: 34%

All Time (47 sessions):
  Smart routing saved ~$43 in model costs
  Memory: 89 decisions, 12 patterns
  Session continuity: 94%

Context: 34% used | Healthy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If no metrics exist yet (first session), show:

```
━━━ IJFW Status ━━━━━━━━━━━━━━━━━━━━━━
Mode: smart | Effort: high

First session — metrics start accumulating now.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
