---
description: "Run IJFW health check (files, MCP server, hooks, memory, caps, framing)"
allowed-tools: ["Bash"]
---

Run `bash $IJFW_REPO/scripts/doctor.sh` when `$IJFW_REPO` is set; otherwise invoke the doctor script from the user's IJFW install at `${IJFW_HOME:-$HOME/.ijfw}/scripts/doctor.sh`.

Report the output as-is. Do not summarize — the doctor output is already positive-framed and scannable.
