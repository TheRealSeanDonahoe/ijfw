---
description: "Second-model review. Picks an auditor (codex/gemini/opencode/aider/copilot), excludes the caller, writes a prompt to paste, reads the response back. Usage: /cross-audit [--with <id> | list | compare] <target>"
allowed-tools: ["Read", "Write", "Bash", "Grep"]
---

Structured peer review from a different agent. Solves "don't trust a single
model." Works by preparing a prompt for you to paste into another CLI tab,
then comparing their response against our own findings.

## Subcommands

| Form | Behavior |
|------|----------|
| `/cross-audit`                     | **Zero-arg auto-pick.** Detect target from git state (staged → unstaged → last commit). Pick default auditor (first non-self). Generate request. |
| `/cross-audit <target>`            | Pick default auditor (first non-self). Generate request for the named target. |
| `/cross-audit --with <id> [target]` | Force a specific auditor: `codex`, `gemini`, `opencode`, `aider`, `copilot`, `claude`. Target optional (auto-detect if omitted). |
| `/cross-audit list`                | Show the roster with self marker. No request generated. |
| `/cross-audit compare`             | Read `.ijfw/cross-audit/response.md`, render agreement/new/disputed table, archive. |

## Smart target auto-detection (bare `/cross-audit`)

When invoked without a target, run this detection cascade and use the
first non-empty result as the target:

1. **Staged changes** — `git diff --cached --name-only` (the user is mid-commit)
2. **Unstaged changes** — `git diff --name-only`
3. **Last commit** — `git diff HEAD~1 --name-only`
4. If all empty: print the roster and ask "what would you like audited?" — don't guess at random files.

Tell the user which step succeeded:

```
Cross-audit target auto-detected: 3 staged file(s)
  installer/src/install.js
  installer/src/marketplace.js
  installer/test.js
(Override with /cross-audit <path> or /cross-audit --with <id> <path>.)
```

If >5 files match, group them in the request body but list all paths so
the auditor can scope themselves. If a single huge file (>2000 lines),
include only the diff hunks not the full file, to stay under typical
context windows.

The natural-language phrase **"cross audit this"** / **"second opinion"**
fires the intent router (see `mcp-server/src/intent-router.js`) which
nudges Claude to invoke `/cross-audit` automatically — same auto-detect
flow runs.

## Auditor picking

Invoke `node -e "import('./mcp-server/src/audit-roster.js').then(m => console.log(m.formatRoster()))"` (or just read `mcp-server/src/audit-roster.js`) to see:

- Who we detect as the current caller (via env fingerprint)
- Who's available as auditors
- Invocation command for each

Default pick order (first non-self): `codex → gemini → opencode → aider → copilot → claude`.

Rationale: different training lineages first (Codex/Gemini), then OSS (opencode), then specialised (Aider/Copilot), then a fresh-session Claude as fallback.

**If the user asks for `list`:** print `formatRoster()` output verbatim. Do not generate a prompt.

## Phase 1 — Generate the prompt

When user runs `/cross-audit <target>` (or with `--with <id>`):

1. **Determine auditor**: run `defaultAuditor(process.env)` from `audit-roster.js`, or use `rosterFor({only: id})[0]` when `--with` specified. If no match, print the roster and ask.
2. **Write `.ijfw/cross-audit/request.md`** with:

```
# IJFW Cross-Audit Request
Auditor: <auditor.name>
Caller:  <detected-self or "unknown">
Target:  <target string>
Stamp:   <ISO timestamp>

## Context
<3-5 lines describing goal, constraints known, prior audit notes if any>

## What I'm asking you to do
Independently review the target against these dimensions:
1. Correctness — logic errors, missing edge cases, off-by-one, null/undefined paths
2. Security — injection, secrets, auth, trust boundaries
3. Operational — observability, failure modes, idempotency, concurrency
4. Maintainability — readability, naming, structure, unused code, dead branches

Return findings in this format (markdown):

### Finding N
- **Severity:** critical | high | medium | low
- **Dimension:** correctness | security | operational | maintainability
- **Location:** <file:line or "general">
- **Issue:** <one-sentence description>
- **Why it matters:** <one-sentence consequence>
- **Recommended fix:** <one-sentence action>

Rules:
- Don't praise or pad — only actionable findings
- Don't flag style preferences as issues
- If you have no findings for a dimension, say so explicitly
- Prefer confidence: 3-5 bets over 10 maybes

## Paste target below
<inline the file contents, commit diff, spec excerpt, or prose description here>
```

3. **Tell the user** (one block, positive-framed):

```
Cross-audit request prepared.
  Auditor:    <name>   (<invoke>)
  File:       .ijfw/cross-audit/request.md
  Next step:  open a new terminal, run <invoke>, paste the file contents,
              save the response to .ijfw/cross-audit/response.md,
              then run /cross-audit compare here.
```

## Phase 2 — Compare (`/cross-audit compare`)

1. Read `.ijfw/cross-audit/response.md` + the original `request.md`.
2. Parse findings (any `### Finding` blocks).
3. Render a side-by-side table:

```
| # | Finding (auditor) | Severity | Dimension | Our take        |
|---|-------------------|----------|-----------|-----------------|
| 1 | <summary>         | high     | security  | ✓ agreed        |
| 2 | <summary>         | medium   | correct.  | ◆ new to us     |
| 3 | <summary>         | low      | maint.    | ✗ disputed (why) |
```

For each finding classify:
- **✓ agreed** — Claude's own review previously identified this or agrees after reading
- **◆ new** — Genuinely new; Claude adds it to the to-investigate list
- **✗ disputed** — Claude can explain why the finding doesn't apply; show the explanation

End with:
> `N findings. Overlap: X% (agreed). Y new for us to investigate. Top priority: <one-liner>.`

4. **Archive**: move both `request.md` and `response.md` into `.ijfw/cross-audit/archive/<YYYY-MM-DDTHHMM>-<auditor_id>/`.

## Notes

- Nothing leaves your machine automatically. You drive the paste.
- Works with any CLI that can accept pasted text and return text — the roster is advisory.
- `audit-roster.js` detection is conservative: if we can't identify the caller, we show all options rather than guessing.
