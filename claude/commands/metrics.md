---
name: ijfw-metrics
description: "Show IJFW token / cost / session metrics over a time window. Reads .ijfw/metrics/sessions.jsonl via the ijfw_metrics MCP tool."
---

Call the `ijfw_metrics` MCP tool with:
- `period`: `$1` if provided (one of `today`, `7d`, `30d`, `all`), else `7d`
- `metric`: `$2` if provided (one of `tokens`, `cost`, `sessions`, `routing`), else `tokens`

Render the result inside a fenced code block — no extra commentary, no headers.
The tool returns positive-framed text even when no data is available yet.

Examples the user might invoke:
- `/ijfw-metrics` — last 7 days, tokens
- `/ijfw-metrics 30d cost` — last 30 days, cost in USD
- `/ijfw-metrics all sessions` — all-time session counts and handoff rate
- `/ijfw-metrics today routing` — today's routing mix

Footer note (only if data appears): metrics reflect clean session-ends only —
crashes or force-quits skip the Stop hook and undercount tokens for that turn.
