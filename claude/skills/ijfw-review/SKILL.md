---
name: ijfw-review
description: "One-line code review comments. Trigger: review, code review, PR review, /ijfw-review"
---

Review code changes. One-line comments per finding.

Format: L<line>: <severity> <problem>. <fix>.

Severity: 🔴 bug | 🟡 warning | 🔵 suggestion | 🟢 nice

Rules:
- Lead with bugs. Then warnings. Then suggestions.
- No praise for meeting baseline expectations.
- If no issues: "Clean. No findings." (two words, not a paragraph)
- Max 10 findings unless asked for exhaustive review.
- Check: null handling, error paths, security boundaries, test coverage.
