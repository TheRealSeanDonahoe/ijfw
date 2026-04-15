---
name: ijfw-verify
description: "Run the IJFW workflow Verify phase (Deep D5). Full audit against the original brief. Usage: /ijfw-verify"
---

Run the full Verify phase of the IJFW workflow. This is the quality gate before
shipping -- a structured audit of everything built against the original brief.

**What runs:**

- Functional checks: all tests pass, startup verified, offline behaviour tested
- UX audit: first impression, no "feel stupid" moments, every error has a recovery path
- Security and quality: auth on every endpoint, parameterised queries, no leaked secrets,
  accessibility, linter clean
- Brief alignment: every success criterion from Discovery is checked explicitly

**Multi-AI Quality Trident (Donahoe P9):** For critical work, Verify also prepares
a cross-audit document summarising what was built and key risk areas, ready for
review in Gemini, Codex, or another AI session. Use `/cross-audit` to generate it
explicitly.

This command invokes `ijfw-workflow` at the D5 Verify phase directly. IJFW owns
the audit loop end-to-end.

**Natural triggers:** "verify the work", "run the audit", "check everything",
"quality gate", "are we ready to ship?"

If gaps are found, Verify stays open until they're resolved -- it does not
auto-advance to Ship on a partial pass.

**GATE:** Verify phase ends at the SHIP GATE -- original brief re-read, what was
built matches what was asked. All items pass before advancing to Ship.
