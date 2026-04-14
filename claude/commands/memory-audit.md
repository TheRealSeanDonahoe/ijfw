---
description: "List auto-extracted memory entries for review. Remove any with `/ijfw memory forget <pattern>`."
allowed-tools: ["Read", "Bash", "Grep"]
---

List recent entries tagged `auto-memorize` from `.ijfw/memory/knowledge.md` and `~/.ijfw/memory/global/*.md`. Show newest first, grouped by kind (correction/confirmation/preference/rule/error).

Format per entry:
```
[YYYY-MM-DD] <kind> — <summary>
  why:  <why line>
  how:  <how-to-apply>
  tags: <tags>
```

If the user asks to remove an entry, surface the exact file and line so they can delete or edit manually. Do not silently modify memory files — let the user do that so they see what's changing.

When no auto-entries exist: *"No auto-memorized entries yet. Enable with `IJFW_AUTO_MEMORIZE=on` or run a session with signals."*
