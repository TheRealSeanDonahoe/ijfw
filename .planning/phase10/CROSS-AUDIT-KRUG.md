# Krug lens cross-audit -- Phase 10

Lens: Don't Make Me Think. Under-3-second scan; obvious next action; copy that matches mental model; empty states that teach; friction cost <=2 clicks/reads between intent and result.

Severity rule (per PLAN Step 10E): findings without a `file:line` reference are auto-downgraded one tier. Such findings are tagged `[no-file-ref]`.

Working dir: /Users/seandonahoe/dev/ijfw. Branch: phase10/polish-for-publish.

---

## System 1 -- Workflow skill
Entry: `claude/skills/ijfw-workflow/SKILL.md`

HIGH count: 2 | MED count: 3 | LOW count: 1

### Finding 1.1 [HIGH] [closed] claude/skills/ijfw-workflow/SKILL.md:17
The Donahoe Loop phrase `BUILD -> AUDIT -> FIX -> SHIP -> MEASURE -> REPEAT` is the single most load-bearing mental model in the skill, yet it is dropped inline inside prose with zero visual emphasis; a new user scanning for "what does this skill do" will not see it inside 3 seconds.
Recommended: Promote the loop to a fenced pre-block immediately under the Two modes line so it is visible on first glance.

### Finding 1.2 [HIGH] [closed] claude/skills/ijfw-workflow/SKILL.md:28
First user-facing line of Quick mode says `Phase Quick / Wave QW -- starting now.` -- `QW` is an undocumented abbreviation. A user cannot translate `QW` to "Quick Wave" in under 3 seconds without hunting; this violates mental-model matching on the very first transition the user will ever see.
Recommended: Either expand to `Wave Q1` (matches Deep mode's numeric style) or define `QW` on first use in the file, e.g. `Wave QW (Quick Wave)`.

### Finding 1.3 [MED] claude/skills/ijfw-workflow/SKILL.md:264
"Multi-AI Quality Trident (Donahoe P9)" section header mentions `P9` with no inline definition of what Donahoe's 22 principles are; a user seeing P9/P12/P15 through the file repeatedly has no 1-step way to know what each means.
Recommended: Add a one-line pointer at first Donahoe reference, e.g. "(see CLAUDE.md Donahoe 22 Principles)" or link to the canonical list.

### Finding 1.4 [MED] claude/skills/ijfw-workflow/SKILL.md:83
Deep-mode state files are enumerated (`brief.md / research.md / plan.md / progress.md / audit-log.md`) but `design.md` is added only on line 384 under "STATE MANAGEMENT". Reader scanning top-down sees a 5-file contract, then 6 files later -- which is right?
Recommended: Make the two lists consistent, or merge into a single state-file table at the top.

### Finding 1.5 [MED] claude/skills/ijfw-workflow/SKILL.md:305
"WHERE AM I" says "Respond with exactly this structure" and defines two sentences, yet the example on line 308 uses `~2min` (tilde+min) while STEP STATE FILE on line 365 uses `<specific next action with default>` -- different templates for the same concept.
Recommended: Lock a single "recommended next" grammar (with or without time estimate) and use it in both the WHERE AM I example and the STATE FILE schema.

### Finding 1.6 [LOW] claude/skills/ijfw-workflow/SKILL.md:394
"OUTPUT RULES" bans foreign-plugin verbs but is deep in the file (line 394 of 440) -- user scanning the skill for what NOT to do will miss it.
Recommended: Move the one-sentence ownership-discipline rule to a "Guardrails" callout near the top.

---

## System 2 -- On-demand skills bundle
Entries: `claude/skills/ijfw-core/SKILL.md`, `claude/skills/ijfw-critique/SKILL.md`, `claude/skills/ijfw-compress/SKILL.md`, `claude/skills/ijfw-review/SKILL.md`

HIGH count: 0 | MED count: 2 | LOW count: 1

### Finding 2.1 [MED] claude/skills/ijfw-core/SKILL.md:9
Describes five modes `smart|fast|deep|manual|brutal` but the file gives no 1-line hint what each mode does differently; a user hitting /mode for the first time is forced to read another surface.
Recommended: Add a single line glossary, e.g. `smart=auto-route, fast=minimum latency, deep=Opus-first, manual=no routing, brutal=code-only`.

### Finding 2.2 [MED] claude/skills/ijfw-critique/SKILL.md:43
Output shape block uses `<...>` placeholder slots with no concrete example. A user hitting the skill for the first time has to instantiate four placeholders from imagination before they see what the output looks like.
Recommended: Add one worked example filled in, below the template.

### Finding 2.3 [LOW] claude/skills/ijfw-review/SKILL.md:16
Empty state `"Clean. No findings."` teaches nothing about what WAS checked. Krug empty states should teach, not sit silent -- a brief "Clean. No findings across null handling, error paths, security boundaries, test coverage." would match the Rules list already on line 18 and reassure the user.
Recommended: Expand the clean-state message to list the dimensions reviewed.

---

## System 3 -- Commands surface
Entries: `claude/commands/ijfw.md`, `claude/commands/cross-audit.md`, `claude/commands/cross-critique.md`, `claude/commands/status.md`, `claude/commands/doctor.md`, `claude/commands/team.md`

HIGH count: 1 | MED count: 3 | LOW count: 1

### Finding 3.1 [HIGH] claude/commands/ijfw.md:18
Index lists `/ijfw memory audit` as a sub-command but the corresponding file is `claude/commands/memory-audit.md` (top-level) -- the slash form `/ijfw memory audit` does not actually route anywhere in Claude Code's command model (which uses filename-based routing). User typing the documented path gets nothing; this is a dead link in the help index.
Recommended: Either document the actual command as `/memory-audit` / `/memory-why` / `/memory-consent`, or add a dispatcher command file that implements the sub-command routing.

### Finding 3.2 [MED] claude/commands/cross-audit.md:125
"Default pick order: codex -> gemini -> opencode -> aider -> copilot -> claude" -- six names, no one-line description of each. A user seeing this for the first time has no idea that `opencode` is an OSS CLI vs a model; friction to understand is one external lookup.
Recommended: Add parenthetical one-liners per auditor, e.g. `codex (OpenAI), gemini (Google), opencode (OSS CLI)`.

### Finding 3.3 [MED] claude/commands/cross-audit.md:175
"Tell the user (one block, positive-framed)" template includes `Next step: open a new terminal, run <invoke>, paste the file contents, save the response...` -- that is 4 manual steps. Elsewhere the doc (line 153) says auto-fire is required; the two instructions contradict and the human will pick the worse one.
Recommended: Remove the manual-paste Next-step copy from Wave A or mark it clearly as "fallback only when auto-fire is unavailable".

### Finding 3.4 [MED] claude/commands/doctor.md:6
Doctor command indirects through `$IJFW_REPO`/`$IJFW_HOME`/`scripts/doctor.sh` -- a user who runs `/doctor` in a fresh project with neither env var set gets undefined behaviour with no visible failure path.
Recommended: Document the resolution fallback and the output expected at each branch; or have the command inline-detect and print a positive-framed "run `ijfw install` first" hint.

### Finding 3.5 [LOW] claude/commands/team.md:6
`/team` with no args "List current team" but the file does not say what the listing shows (names? roles? file paths?). User guesses.
Recommended: One-line example of the listing output.

---

## System 4 -- CLI + ijfw doctor
Entries: `mcp-server/bin/ijfw`, `mcp-server/src/cross-orchestrator-cli.js`

HIGH count: 2 | MED count: 2 | LOW count: 0

### Finding 4.1 [HIGH] mcp-server/src/cross-orchestrator-cli.js:313
Doctor output row `[ -- ] <id> CLI -- not found -- install <x> or set <env>` -- this violates the Positive-framing invariant called out as sacred in CLAUDE.md and the user memory. A user running doctor sees literal "not found" text, which is exactly the string the product promises never to print.
Recommended: Replace `not found` with forward-looking framing, e.g. `[ -- ] <id> CLI -- install to unlock -- try: brew install <x>`.

### Finding 4.2 [HIGH] mcp-server/src/cross-orchestrator-cli.js:320
Same positive-framing violation on API key rows: `[ -- ] <ENV> -- not set`. The IJFW product invariant is that empty states teach the next action; "not set" is a status, not an action.
Recommended: `[ -- ] <ENV> -- set to unlock <feature>` with the export command inline.

### Finding 4.3 [MED] mcp-server/src/cross-orchestrator-cli.js:148
`Environment: IJFW_AUDIT_BUDGET_USD ...` in usage text explains the enforcement quirk ("Enforces on 2nd+ calls; first-call cost is always allowed") but the wording forces the reader to translate from explanation to policy. Under 3 seconds, user cannot tell if first call is free or tracked.
Recommended: Rewrite as "Session cap. First call is always allowed (no cap). Cap enforced from the 2nd call on."

### Finding 4.4 [MED] mcp-server/bin/ijfw:15
Launcher error `Error: ijfw CLI not found at $CLI` to stderr -- negative framing, and no next action. Breaks product invariant even at preflight.
Recommended: `ijfw CLI missing at $CLI -- reinstall with: npm install -g @ijfw/install`.

---

## System 5 -- MCP server + memory tools
Entries: `mcp-server/src/server.js` (tool descriptions at lines 464-541)

HIGH count: 0 | MED count: 2 | LOW count: 1

### Finding 5.1 [MED] mcp-server/src/server.js:521
`ijfw_memory_prelude` description starts with "CALL THIS AT SESSION START." in all-caps. Effective for attention but ijfw_prompt_check (line 536) also opens with "CALL THIS" -- two tools both shouting "call me first" creates a routing ambiguity. A fresh agent cannot decide which to call first.
Recommended: One tool gets the top slot; the other's description names its specific trigger ("call on first turn if prompt <30 tokens" -- already present but buried).

### Finding 5.2 [MED] mcp-server/src/server.js:464
`ijfw_memory_recall` description says `Pass from_project to pull from a different IJFW project (by absolute path, 12-char hash, or basename).` -- three identifier forms with different coupling to the filesystem. A calling agent trying to do this in 3 seconds must read schema examples to disambiguate.
Recommended: Lead with the simplest form (basename), mention path/hash as fallback.

### Finding 5.3 [LOW] mcp-server/src/server.js:493
Stored `type` enum (`decision/pattern/observation/handoff/preference`) has subtly different downstream behaviours (decision -> knowledge.md with frontmatter; handoff -> overwrites handoff.md; observation -> journal only). Description compresses the differences into one sentence that runs hot -- a first-time storer has to decode "decision and pattern promote to knowledge base with frontmatter block".
Recommended: Bullet the five types each on its own line in the description.

---

## System 6 -- Cross-AI dispatcher + receipts + hero line
Entries: `mcp-server/src/cross-dispatcher.js`, `mcp-server/src/hero-line.js`

HIGH count: 0 | MED count: 2 | LOW count: 1

### Finding 6.1 [MED] mcp-server/src/hero-line.js:46
Empty-state string `'No cross-audit runs yet'` is silent -- does not tell the user how to create one. Krug empty state should teach.
Recommended: `'No cross-audit runs yet. Run: ijfw cross audit <file>'`.

### Finding 6.2 [MED] mcp-server/src/hero-line.js:112
Delta renders as `\u2212<pct>% tokens vs solo Claude <n>\u00D7` -- the unicode minus (U+2212) and multiplication sign are intentional but render inconsistently across terminals/fonts; a user scanning a receipt may see a box glyph.
Recommended: Stay ASCII-only per P10 convention: use `-` and `x`.

### Finding 6.3 [LOW] mcp-server/src/cross-dispatcher.js:40
`TEMPLATES.audit.general.system` prompt ends "Positive framing in your prose is welcome; your findings must remain blunt." -- correctly nuanced but the contradiction (positive + blunt) is exactly the kind of thing a downstream model will interpret three different ways. Mental-model violation at the external-model boundary.
Recommended: Split into two explicit instructions: "Findings: blunt and specific." + "Wrapping prose: neutral tone."

---

## System 7 -- Hooks
Entries: `claude/hooks/scripts/session-start.sh`, `claude/hooks/scripts/post-tool-use.sh`, `claude/hooks/scripts/pre-prompt.sh`

HIGH count: 0 | MED count: 2 | LOW count: 1

### Finding 7.1 [MED] claude/hooks/scripts/session-start.sh:353
Banner line `[ijfw] Next: <next-step>` is injected but truncated to first non-blank line of the `### Next Steps` section. If the user wrote a multi-line next action the banner silently shows only line 1 -- friction when the user wonders "was it cut off".
Recommended: Either cap with a visible `...` on truncate or expand to the first sentence stop.

### Finding 7.2 [MED] claude/hooks/scripts/pre-prompt.sh:123
Vague-prompt detector suggestion ends with `'Signals: <...>. Override with leading * or "ijfw off".'` -- the override syntax is mentioned only at the end of a long string and bracketed inside parens. A user who wants to bypass the nudge has to re-read to spot the escape hatch.
Recommended: Put the override clause on its own line and lead with the action word `Bypass:`.

### Finding 7.3 [LOW] claude/hooks/scripts/session-start.sh:29
Pre-flight message `A file named ".ijfw" exists in this project -- IJFW needs that name for its directory. Rename or remove the file, then start a new session.` is correct and actionable but uses two sentences where one would suffice; first-time hit cost is high.
Recommended: Compress to one line: `A file ".ijfw" blocks the IJFW directory -- rename or remove it, then start a new session.`

---

## System 8 -- Installer
Entries: `installer/README.md`, `installer/src/install.js`, `scripts/install.sh`

HIGH count: 1 | MED count: 2 | LOW count: 1

### Finding 8.1 [HIGH] installer/src/install.js:107
`console.error('Preflight:')` followed by issue lines that include `'Node X detected; IJFW wants Node >=18.'` and `'git not on PATH -- install git, then retry.'` -- the word `Preflight:` alone gives the user no indication whether this is informational or blocking. One missing bin kills the install silently from the user's perspective (exit 1).
Recommended: Replace `Preflight:` header with `Install blocked -- fix these and re-run:` so the user immediately understands blast radius.

### Finding 8.2 [MED] installer/README.md:13
`That's it. IJFW configures every agent on your machine and you're ready to go.` -- but the README then lists 4 options and 2 uninstall commands. For a Krug 3-second scan the "that's it" claim and the 20 lines of options below contradict.
Recommended: Move Options and Uninstall under a `## Advanced` heading so the scan path stays: "one command, done".

### Finding 8.3 [MED] scripts/install.sh:22
Self-guard message on inside-repo run: `Running inside IJFW source repo -- skipping platform-rule writes to protect your dev tree. Run outside the repo to install.` -- message prints to stdout then `exit 0`. A user running via npx will see this and think install succeeded (exit 0) while no configs were written. Signal vs expectation mismatch.
Recommended: Print the message but exit with a distinct non-zero code OR rephrase to make the no-op explicit: `IJFW dev-tree detected -- no configs written. To install on this machine, cd out of the repo and re-run.`

### Finding 8.4 [LOW] scripts/install.sh:124
Each platform block emits `[Claude Code]` etc. in brackets but uses three different status-line prefixes inside (`ok`, `note`, `info`). User cannot tell at a glance which are actions, which are tips.
Recommended: Legend at the top of the script's output, or reduce to one prefix per line-type.

---

## System 9 -- Platform configs
Entries: `cursor/.cursorrules`, `gemini/GEMINI.md`, `universal/ijfw-rules.md`

HIGH count: 1 | MED count: 2 | LOW count: 0

### Finding 9.1 [HIGH] [no-file-ref] (downgraded from HIGH candidate: manifest cites `universal/rules.txt` but actual file is `universal/ijfw-rules.md`; README.md line 87 also references `universal/ijfw-rules.md`; CLAUDE.md describes universal as `15-line paste-anywhere` but the actual file is 19 lines with a 3-line header banner)
Source-of-truth disagreement across three surfaces on the same artefact forces any user or auditor to reconcile before acting. Downgraded because no single file:line anchors the contradiction; it is a cross-file identity gap.
Recommended: Pick one canonical path and one line budget, update AUDIT-MANIFEST.md, README.md, and CLAUDE.md to match.

### Finding 9.2 [MED] universal/ijfw-rules.md:12
Line `Session start: call \`ijfw_memory_prelude\` once (hydrates memory, skip grep cascade).` -- the "paste anywhere" surface tells the agent to call an MCP tool. A non-MCP agent (ChatGPT web, vanilla Copilot chat) pasted this will try to call a tool it has no access to. Fails silently with no fallback.
Recommended: Either condition the instruction ("if MCP available, call ...") or split the file into an MCP-aware and an MCP-free variant.

### Finding 9.3 [MED] gemini/GEMINI.md:38
Last line: `To cross-audit, cross-research, or cross-critique, run \`ijfw cross <mode> <target>\`.` -- a Gemini user just installing will see this instruction before `ijfw` is on PATH. No mention of install precondition.
Recommended: Add `(install first: npm i -g @ijfw/install)` or reorder to list install before usage.

---

## System 10 -- README + CHANGELOG + PUBLISH-CHECKLIST
Entries: `README.md`, `CHANGELOG.md`, `PUBLISH-CHECKLIST.md`

HIGH count: 2 | MED count: 2 | LOW count: 0

### Finding 10.1 [HIGH] README.md:13
`npm install -g @ijfw/install && ijfw demo` is the 30-second hook, but `ijfw demo` only works AFTER `ijfw install` (installer/README.md line 10 says `ijfw demo` post-install). Main README conflates install-time and post-install; a user following the main README hits an error at the first command.
Recommended: Change to `npm install -g @ijfw/install && ijfw install && ijfw demo` or clarify that `ijfw` binary is auto-run by the installer.

### Finding 10.2 [HIGH] README.md:110
"MCP server (5 tools): recall, store, search, status, prelude" -- but the actual server exposes 7 tools (per server.js lines 464-552: recall, store, search, status, prelude, prompt_check, metrics). CLAUDE.md says `<=8 tools`. The README misrepresents a user-visible feature count at the headline spec line.
Recommended: Update to "7 tools" and list all; or simplify to "shared via stdio, zero deps" without an exact count.

### Finding 10.3 [MED] [closed] README.md:20
Demo Output block shows `IJFW v1.0.0` but `installer/package.json` / actual released version may differ. A user copies the header verbatim and the demo they run looks different.
Recommended: Mark the demo output as `# sample output` and drop the version string, or template it from package.json.

### Finding 10.4 [MED] PUBLISH-CHECKLIST.md:66
`grep "HIGH" .planning/phase10/CROSS-AUDIT-PRINCIPLES.md` / `# Expected: no output (or only resolved/closed lines)` -- the guard instruction passes if `HIGH` appears on a "resolved" line. A publisher scanning for "no output" is given an ambiguous pass condition.
Recommended: Replace with a two-step check: first grep for `HIGH` with context, then manually verify every match is suffixed `[closed]`. Or provide the exact passing regex (e.g. `grep -v '\[closed\]' | grep HIGH`).

---

# Roll-up

System | HIGH | MED | LOW
-------|------|-----|----
1 Workflow skill           | 2 | 3 | 1
2 On-demand skills         | 0 | 2 | 1
3 Commands surface         | 1 | 3 | 1
4 CLI + doctor             | 2 | 2 | 0
5 MCP server               | 0 | 2 | 1
6 Dispatcher + hero line   | 0 | 2 | 1
7 Hooks                    | 0 | 2 | 1
8 Installer                | 1 | 2 | 1
9 Platform configs         | 1 | 2 | 0
10 README/CHANGELOG/checklist | 2 | 2 | 0

Totals: HIGH=9, MED=22, LOW=6, grand total=37.
Systems with zero findings: none.

Highest-impact clusters:
- Positive-framing regressions in CLI doctor + launcher (System 4.1, 4.2, 4.4).
- README/manifest/file-truth drift across systems 9 and 10 (9.1, 10.1, 10.2).
- Next-action ambiguity in workflow + commands surface (1.2, 3.1, 3.3).
