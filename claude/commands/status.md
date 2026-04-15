---
name: ijfw-status
description: "Show IJFW state — mode, routing, memory, recent activity, codebase index, settings. Use when you want the at-a-glance banner you'd otherwise get at session start."
---

Render the IJFW status block as a fenced code block. **Compute it deterministically** from filesystem state — never invent values.

<!--
CURRENT STEP STATE SCHEMA
File: .ijfw/state/current-step.json

{
  "phase":            string,   // e.g. "Deep", "Quick", "3"
  "wave":             string,   // e.g. "1", "QW", "4"
  "step":             string,   // e.g. "1.1", "3", "4.2"
  "label":            string,   // human description of what is happening right now
  "started_at":       string,   // ISO 8601 timestamp, e.g. "2026-04-15T14:32:00Z"
  "recommended_next": string    // specific next action with default, no open menus
}

Write contract: ijfw-workflow writes this file at every Step transition
(phase start, audit gate entry, step completion). /ijfw-status reads it
to report current position. Reader must not write; writer must not skip
any transition even if the step is brief.
-->

## Current workflow step (read first)

Read `.ijfw/state/current-step.json`. If present and valid, prepend to the status block:

```
Phase {phase} / Wave {wave} · Step {step} — {label}
Recommended next: {recommended_next}. Say no/alt to override.
```

If the file is absent: prepend `No active workflow session. Start one with: /ijfw-workflow deep plan`

---

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
11. `.ijfw/receipts/cross-runs.jsonl` → parse each line; aggregate via `renderHeroLine` from `mcp-server/src/hero-line.js` (omit the whole "Cross-audit runs" section if the file doesn't exist or has zero lines)

## Output format (positive framing — never "missing", "warning", "failed")

```
--- IJFW Status ---
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

Cross-audit runs
  {hero_line from renderHeroLine}
  Total runs: {N}
  (omit whole section if receipts file missing or empty)

Pending
  {one line per IJFW_NEEDS_* flag — e.g. "Memory consolidation due (run /consolidate)"}
  (omit section if no flags)
---
```

## Rules

- ALL counts are real reads from disk. No fabrication.
- Sections with zero values are OMITTED entirely (don't show "0 entries").
- Truncate decision lines at 100 chars with `…` if longer.
- If `.ijfw/` doesn't exist: render `Fresh project — no IJFW state yet. Memory will start accumulating from your next "remember X" or stored decision.`
- Do NOT use jargon like "JSONL", "SQLite", file paths, or "MCP". User-facing only.
- Do NOT include load times, check marks, or framework details. Just facts.
- Use the fenced code block (triple backticks) so the output renders as visible chrome regardless of Claude Code's hook output handling.
