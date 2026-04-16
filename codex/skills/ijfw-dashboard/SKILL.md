---
name: ijfw-dashboard
description: "Control the IJFW observation dashboard (start/stop/status). Trigger: 'ijfw dashboard', 'open dashboard', 'show observations', 'dashboard start', 'dashboard stop', 'dashboard status', 'view session activity'."
---

# IJFW Dashboard

Local observability dashboard at `http://localhost:37891`. Shows observations from all platforms (Claude Code, Codex, Gemini) in real time via SSE.

## Commands

```
ijfw dashboard start    # bind port 37891, open browser (unless $CI)
ijfw dashboard stop     # send shutdown, clean up PID + port files
ijfw dashboard status   # show port, uptime, observation count
```

## How it works

- Port 37891 by default; walks to 37900 if busy. Actual port written to `.ijfw/dashboard.port`.
- Reads `~/.ijfw/observations.jsonl` (shared ledger across all platforms).
- SSE delivers new observations within 150ms of ledger append.
- Single-file HTML viewer -- no React, no build step, no external network.
- `localhost`-gated: external requests return 403.

## Platform coverage

| Platform     | Writes observations | Reads dashboard |
|---|---|---|
| Claude Code  | yes                 | yes             |
| Codex        | yes                 | yes             |
| Gemini       | yes                 | yes             |
| Cursor       | view-only           | yes             |
| Windsurf     | view-only           | yes             |
| Copilot      | view-only           | yes             |

## Session start

Dashboard observations render at session start via `session-start-dashboard.sh`. Run `ijfw dashboard start` to also open the browser view.
