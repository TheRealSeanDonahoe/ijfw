---
description: "Run IJFW health check (files, MCP server, hooks, memory, caps, framing)"
allowed-tools: ["Bash"]
---

Resolution order for the doctor script:

1. `$IJFW_REPO/scripts/doctor.sh` -- if `$IJFW_REPO` is set (dev-tree override).
2. `$IJFW_HOME/scripts/doctor.sh` -- if `$IJFW_HOME` is set (custom install root).
3. `$HOME/.ijfw/scripts/doctor.sh` -- default install location.

If none of those paths resolve, surface: `IJFW doctor script not found -- run \`npm install -g @ijfw/install && ijfw install\` to restore it.`

Run the resolved script with `bash <path>`. Report the output as-is. Do not summarize -- the doctor output is already positive-framed and scannable.
