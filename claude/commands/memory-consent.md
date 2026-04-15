---
description: "Grant or revoke consent for session-end auto-memorize. Usage: /memory-consent yes|no|ask"
allowed-tools: ["Write", "Read", "Bash"]
---

Writes `.ijfw/.automem-consent` with `{"consented": true|false, "at": "<iso>"}`.

- `yes` -- auto-memorize runs at session end, promotes feedback/signals to memory.
- `no` -- fully disabled. Session-end synthesizer exits silently.
- `ask` -- clears consent; auto-memorize will ask again next time it would fire.

Acknowledge with one line confirming the new state. Print the contents of `.ijfw/.automem-consent` so the user sees what was written.
