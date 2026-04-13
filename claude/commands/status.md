---
name: ijfw-status
description: "Show IJFW state — mode, routing, memory, recent activity, codebase index, settings. Use when you want the at-a-glance banner you'd otherwise get at session start."
---

Render the IJFW status block as a fenced code block. **Compute it deterministically** from filesystem state — never invent values.

## Data sources (read in this order, skip silently if missing)

1. `IJFW_MODE` env var → mode (default: smart)
2. `CLAUDE_CODE_EFFORT_LEVEL` env var → effort (default: high)
3. Routing detection:
   - `OPENROUTER_API_KEY` env or `ANTHROPIC_BASE_URL` containing "openrouter" → "multi-model"
   - `~/.claude-code-router/config.json` exists → "smart routing"
   - `.ijfw/.detection.prev` contains `OLLAMA=1` or `LMSTUDIO=1` → "+ local model"
4. `.ijfw/sessions/` → count `*.md` files = sessions
5. `.ijfw/memory/project-journal.md` → count lines matching `^- \[\d{4}-` = decisions
6. `.ijfw/memory/knowledge.md` → count lines starting with `**` = knowledge entries
7. `.ijfw/memory/handoff.md` → first non-blank, non-`#`, non-`<!--` line = last status
8. `.ijfw/index/files.md` → count lines matching `^- \`` = indexed files
9. `~/.ijfw/memory/global/*.md` → count lines per facet matching this project's namespace `[ns:HASH]`
10. `.ijfw/.startup-flags` → list any IJFW_NEEDS_* flags

## Output format (positive framing — never "missing", "warning", "failed")

```
━━━ IJFW Status ━━━━━━━━━━━━━━━━━━━━━━━━
{mode} mode | {effort} effort{routing_str}

Memory
  Knowledge: {N} entries
  Sessions tracked: {N}
  Decisions logged: {N}
  Last session: {last_status_or_omit}

Codebase
  Indexed: {N} files{or_omit}

Project preferences
  preferences: {N}, patterns: {N}, stack: {N}, anti-patterns: {N}, lessons: {N}
  (omit any facet with 0 entries; omit whole section if all zero)

Recent decisions
  {top 3 most recent from knowledge.md, one per line, truncated to 100 chars each}
  (omit section if 0)

Pending
  {one line per IJFW_NEEDS_* flag — e.g. "Memory consolidation due (run /consolidate)"}
  (omit section if no flags)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Rules

- ALL counts are real reads from disk. No fabrication.
- Sections with zero values are OMITTED entirely (don't show "0 entries").
- Truncate decision lines at 100 chars with `…` if longer.
- If `.ijfw/` doesn't exist: render `Fresh project — no IJFW state yet. Memory will start accumulating from your next "remember X" or stored decision.`
- Do NOT use jargon like "JSONL", "SQLite", file paths, or "MCP". User-facing only.
- Do NOT include load times, check marks, or framework details. Just facts.
- Use the fenced code block (triple backticks) so the output renders as visible chrome regardless of Claude Code's hook output handling.
