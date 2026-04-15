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

## Default flow — Donahoe Trident (don't make me think)

Caller is one perspective. **Default ask is for two more.** Per the
Donahoe Loop: never trust a single AI; run through three. Two diverse
auditors triangulating the caller's findings catches gaps that any
single second-opinion would miss.

When invoked, do this in order:

1. **Probe roster.** Call `pickAuditors({ count: 2, env: process.env })` from `audit-roster.js`. Returns `{ picks, missing, note }` — picks are installed AND non-self.
2. **Show a TODO surface** in chat:

   ```
   Cross-audit plan
     [ ] Wave A Step 1: Generate request (target: <auto-detected>)
     [ ] Wave A Step 2: Run auditor 1: <picks[0].name>
     [ ] Wave A Step 2: Run auditor 2: <picks[1].name>   (or note if only 1 installed)
     [ ] Wave B Step 1: Compare findings
   ```

3. **Ask the user once** which combo to actually run:

   ```
   Auditors detected and ready: codex, gemini.
   Run cross-audit against:
     [A] codex only      (~$0.20-0.50 estimated)
     [B] gemini only     (free if Google AI Studio key, else ~$0.05)
     [C] Both — recommended (Donahoe Trident)
     [D] Cancel / pick custom
   ```

   Default suggestion: **C (Both)** when ≥2 installed.

4. **If only one installed**, surface the principle:

   > "Only `<id>` is installed locally. Per the Donahoe Loop and IJFW principles, you're best to have two top-tier AIs review to help avoid gaps and issues that one alone may miss. Install one of the missing auditors (`opencode`, `aider`, etc.) for the full Trident."

   Then offer to run the single auditor anyway.

5. **Run** via Bash (`<picks[i].invoke> < .ijfw/cross-audit/request.md > .ijfw/cross-audit/response-<id>.md`). Update TODO to `in_progress` then `completed` per auditor.

5a. **Fire Claude specialist swarm in parallel** (caller leg of the Trident).
   The caller's contribution is NOT a solo in-session opinion — it's a parallel
   dispatch of specialist subagents via the `Agent` tool. Fire these in the
   same message as the external bg-bash calls so they run concurrently:

   | Specialist | Dispatched via | Angle |
   |------------|---------------|-------|
   | Code reviewer specialist | `Agent` tool | convention/correctness |
   | Silent-failure hunter specialist | `Agent` tool | error-swallowing, fallbacks |
   | Test-coverage analyst specialist | `Agent` tool | coverage gaps |
   | Type-design analyst specialist | `Agent` tool (typed codebases only) | invariants |

   Pick the subset relevant to the target. Merge their findings into ONE
   composite JSON array matching the audit schema, write to
   `.ijfw/cross-audit/response-self.md`. This joins the external responses
   in step 6.

6. **Compare** all returned responses together — external auditors AND the
   caller's specialist-swarm composite (`response-self.md`):
   - Findings agreed by ≥2 sources → **high confidence**
   - Findings unique to one source → **investigate**
   - Render single merged table with a "consensus" column and a source tag
     per finding (codex | gemini | self:code-reviewer | self:silent-failure | …).

7. **Archive** all request + response files to `.ijfw/cross-audit/archive/<ts>-<ids>/`.

## Auditor picking

Invoke `node -e "import('./mcp-server/src/audit-roster.js').then(m => console.log(m.formatRoster()))"` (or just read `mcp-server/src/audit-roster.js`) to see:

- Who we detect as the current caller (via env fingerprint)
- Who's available as auditors
- Invocation command for each

Default pick order (first non-self): `codex -> gemini -> opencode -> aider -> copilot -> claude`.

| Auditor | Lineage | Notes |
|---------|---------|-------|
| codex | OpenAI | cloud or local via Codex CLI |
| gemini | Google | cloud via Gemini CLI |
| opencode | OSS CLI | model-agnostic open-source runner |
| aider | OSS CLI | git-aware; strong diff reasoning |
| copilot | GitHub/Microsoft | IDE-native; broad language support |
| claude | Anthropic | fresh session via `claude -p` |

Rationale: different training lineages first (codex/gemini), then OSS (opencode), then specialised (aider/copilot), then a fresh-session claude as fallback.

**If the user asks for `list`:** print `formatRoster()` output verbatim. Do not generate a prompt.

## Wave A — Generate the prompt

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
  Firing now via background bash (auto-fire required -- see Default flow above).
  Fallback only when auditor binary is unavailable: open a new terminal, run <invoke>,
  paste the file contents, save the response to .ijfw/cross-audit/response.md,
  then run /cross-audit compare here.
```

## Wave B — Compare (`/cross-audit compare`)

1. Read `.ijfw/cross-audit/response.md` + the original `request.md`.
2. Parse findings (any `### Finding` blocks).
3. Render a side-by-side table:

```
| # | Finding (auditor) | Severity | Dimension | Our take           |
|---|-------------------|----------|-----------|--------------------|
| 1 | <summary>         | high     | security  | [yes] agreed       |
| 2 | <summary>         | medium   | correct.  | [new] new to us    |
| 3 | <summary>         | low      | maint.    | [dispute] (why)    |
```

For each finding classify:
- **[yes]** -- agreed: Claude's own review previously identified this or agrees after reading
- **[new]** -- genuinely new; Claude adds it to the to-investigate list
- **[dispute]** -- Claude can explain why the finding doesn't apply; show the explanation

End with:
> `N findings. Overlap: X% (agreed). Y new for us to investigate. Top priority: <one-liner>.`
> `Trident advantage: Y of N findings were caught by the second auditor that a solo Claude review missed.`

4. **Archive**: move both `request.md` and `response.md` into `.ijfw/cross-audit/archive/<YYYY-MM-DDTHHMM>-<auditor_id>/`.

## Notes

- Nothing leaves your machine automatically. You drive the paste.
- Works with any CLI that can accept pasted text and return text — the roster is advisory.
- `audit-roster.js` detection is conservative: if we can't identify the caller, we show all options rather than guessing.
