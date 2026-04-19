---
name: compress
description: "Compress a memory/context file into terse form. Saves ~40-50% tokens per session. Usage: /compress <filepath>"
---

Compress the specified file using ijfw-compress skill rules.

1. Back up original as <filename>.original.md
2. Rewrite prose in compressed form: drop articles, filler, hedging. Fragments OK.
3. Preserve exactly: code blocks, URLs, file paths, commands, headings, dates, versions.
4. Validate the compressed version retains all actionable instructions.
5. Report: original tokens → compressed tokens (% saved).
