---
name: cross-audit
description: "Generate a cross-platform audit document for the Multi-AI Quality Trident. Usage: /cross-audit [scope]"
---

Generate a structured audit document for independent review by another AI.
Implements Donahoe Principle 9: Never trust a single AI. Run through three.

## What it generates:

1. **Project Summary** — What was built, for whom, key constraints
2. **Architecture Decisions** — Key choices with rationale
3. **Risk Areas** — Where things could break, security boundaries, edge cases
4. **Specific Verification Questions** — Not "is this good?" but precise, testable questions:
   - "Does the auth middleware handle expired tokens correctly?"
   - "Is user input validated before the database query at L47?"
   - "Does the error handler expose internal stack traces?"
5. **Files to Review** — Prioritised list of files that carry the most risk

## Output:

Stores the audit document in IJFW memory (available cross-platform via MCP).
Also outputs to `.ijfw/audits/cross-audit-<timestamp>.md` for manual sharing.

The user can then open Gemini CLI, Codex, Cursor, or any other agent and say:
"Review the latest IJFW cross-audit" — it pulls from shared memory.

Or copy the generated document and paste into any AI for review.

Disagreements between AIs are the most valuable findings.
Flag them. Present to the user. Don't auto-resolve.
