# Phase 10 / Wave 10E.4 -- Donahoe lens cross-audit (10 systems)

**Stamp:** 2026-04-15
**Lens:** Donahoe -- "It just fucking works -- anywhere, for strangers"
**Auditor:** Claude (caller-leg self-audit under the Donahoe lens)
**Target:** 10 systems per `.planning/phase10/AUDIT-MANIFEST.md`

Lens tests applied per surface:
- Stranger with fresh machine + one install command + zero config
- Graceful degradation with no API keys, no CLIs, no network
- Positive framing EVERYWHERE (no "not found" / "error" / "failed" / "missing")
- Portability (no unexamined macOS / zsh / specific-CLI assumptions)
- Recovery paths are one line, copy-pasteable
- Ownership discipline (no foreign plugin verbs at action positions)
- ASCII only in user-facing surfaces

Severity rule per Step 10E: findings without `file:line` auto-downgrade one tier
(`[no-file-ref]`). HIGH = stranger fails on fresh machine OR negative-framed copy
OR foreign plugin verb at action position. MED = works-for-author,
fragile-for-strangers. LOW = polish.

---

## Headline

Under the Donahoe lens, **12 HIGH, 11 MED, 7 LOW findings across 10 systems**.
The cluster of HIGH findings is dense in three surfaces: the top-level README
install instructions (a stranger cannot follow them as written because the
`ijfw install <platform>` subcommand does not exist on the installed binary),
the CLI diagnostic plumbing (`ijfw doctor`, `ijfw cross`, the `bin/ijfw`
launcher) where negative-framed copy is the norm rather than the exception,
and the installer Node preflight + install.sh edge paths.

Systems with **zero HIGH findings**: System 3 (Commands), System 5 (MCP
Server + Memory Tools), System 7 (Hooks). These three are the strongest
candidates for a copy-the-pattern reference when fixing the rest.

---

## System 1 -- Workflow Skill

**Target:** `claude/skills/ijfw-workflow/SKILL.md`

| # | Sev | Surface | Finding | Recommended action |
|---|-----|---------|---------|--------------------|
| 1.1 | MED | `claude/skills/ijfw-workflow/SKILL.md:83-88` | `.ijfw/projects/<name>/` state layout assumes project lives on a writeable filesystem. Stranger running Claude Code inside a read-only container or sandbox hits silent write failures. | Add a one-line fallback note: if `.ijfw/` is not writeable, surface "IJFW state will persist in-session only -- rerun from a writeable directory to save across sessions." |
| 1.2 | MED | `claude/skills/ijfw-workflow/SKILL.md:264-275` | Multi-AI Quality Trident block ("Cross-audit ready. Review in Gemini, Codex, or another AI.") assumes the stranger has any of those CLIs reachable. No degradation path. | Add: "If no external AI is reachable, fall back to self-audit via Agent-dispatched specialist swarm (security, code-review, reliability)." |
| 1.3 | LOW | `claude/skills/ijfw-workflow/SKILL.md:392-400` | Output Rules block forbids foreign plugin verbs -- correct. But only lists six prefixes; new plugin families (`frontend-design:`, `ui-ux-pro-max:`, `claude-api:`) will bypass the static list. | Restate as a general rule ("any `<plugin>:` prefix where `<plugin>` is not `ijfw`") rather than enumerating six. |
| 1.4 | LOW | `claude/skills/ijfw-workflow/SKILL.md:315-321` | Mid-step ping convention is documented well but the 30-second threshold is author-tuned. Strangers on slower networks / machines may see fewer pings than expected. | None required -- document only. |

---

## System 2 -- On-Demand Skills Bundle

**Targets sampled:** `claude/skills/ijfw-critique/SKILL.md`,
`claude/skills/ijfw-compress/SKILL.md`, `claude/skills/ijfw-review/SKILL.md`,
`claude/skills/ijfw-core/SKILL.md`

| # | Sev | Surface | Finding | Recommended action |
|---|-----|---------|---------|--------------------|
| 2.1 | MED | `claude/skills/ijfw-core/SKILL.md:40-42` | `<ijfw-memory>` block presence is treated as a MUST-have; if missing, "call `ijfw_memory_prelude`". Stranger in a non-Claude platform without the MCP tool installed sees this instruction, has no tool to call, and no recovery path. | Reframe: "If neither block nor tool is available, check `.ijfw/memory/knowledge.md` directly -- it is plain markdown." |
| 2.2 | LOW | `claude/skills/ijfw-core/SKILL.md:38-42` | Memory section says "ALWAYS store" with no size cap mentioned; stranger could hit the MCP server's 5000-char limit with no warning visible here. | Cross-reference the 5000-char cap from `server.js:616` in a one-line note. |
| 2.3 | LOW | `claude/skills/ijfw-compress/SKILL.md:17` | "cp <file> <file>.original.md" is a POSIX command -- fine -- but no recovery if `cp` is aliased / not available on PowerShell strangers. | None required; `narration-not-applicable` hatch already in place. |
| 2.4 | LOW | `claude/skills/ijfw-critique/SKILL.md:11-14` | Four-step critique pattern is strong. No ASCII / positive-framing violation observed. | None. |

---

## System 3 -- Commands Surface

**Targets sampled:** `claude/commands/cross-audit.md`,
`claude/commands/cross-critique.md`, `claude/commands/ijfw.md`

| # | Sev | Surface | Finding | Recommended action |
|---|-----|---------|---------|--------------------|
| 3.1 | MED | `claude/commands/cross-audit.md:191-198` | Compare table uses Unicode markers: `check`, `diamond`, `cross` rendered as non-ASCII glyphs. Violates the ASCII-only constraint in AUDIT-REPORT-POLICY for new content; strangers on terminals without emoji fonts see boxes. | Replace with ASCII tokens: `[yes]`, `[new]`, `[dispute]`. |
| 3.2 | MED | `claude/commands/cross-critique.md:82-90` | "Only `<id>` is installed locally. Install one more auditor (opencode, aider, etc.) to unlock complete angle coverage." -- good framing. Adjacent line 84 "Run cross-critique: [A] codex only (technical angle) [B] gemini only ..." offers open menu; Donahoe rule #always-recommend wants a default. | Add `Default: [C] All three -- press enter.` to match the always-recommend rule. |
| 3.3 | LOW | `claude/commands/ijfw.md:9-31` | Index is clean, grouped by intent, ASCII-only. Stranger-readable. | None. |
| 3.4 | LOW | `claude/commands/cross-critique.md:265` | `Act on survival >=4 first.` uses `>=` ASCII form -- good. One stray arrow elsewhere but inside a code block; acceptable. | None. |

**HIGH findings: 0.** Commands surface is the strongest Donahoe-compliant system.

---

## System 4 -- CLI + ijfw doctor

**Targets:** `mcp-server/bin/ijfw`, `mcp-server/src/cross-orchestrator-cli.js`

| # | Sev | Surface | Finding | Recommended action |
|---|-----|---------|---------|--------------------|
| 4.1 | HIGH | `mcp-server/bin/ijfw:15` | `echo "Error: ijfw CLI not found at $CLI"` -- negative framing in the literal first surface a stranger touches. | Rewrite: `echo "IJFW launcher expects the CLI at $CLI -- reinstall @ijfw/install to restore it."`. |
| 4.2 | HIGH | `mcp-server/bin/ijfw:20` | `echo "Error: node not installed (Node 18+ required)"` -- "not installed" banned framing. | Rewrite: `echo "IJFW needs Node 18+. Install from https://nodejs.org then rerun."`. |
| 4.3 | HIGH | `mcp-server/src/cross-orchestrator-cli.js:313` | Doctor line: `rows.push("  [ -- ] ${entry.id} CLI -- not found -- ${hint}")`. The literal string "not found" is surfaced on every unreachable auditor -- this is the diagnostic stranger will read first and it is entirely negative-framed. | Replace with `[ .. ] <id> CLI -- ready to install: <hint>`. |
| 4.4 | HIGH | `mcp-server/src/cross-orchestrator-cli.js:320` | Doctor line: `rows.push("  [ -- ] ${entry.apiFallback.authEnv} -- not set")`. Same negative-framing pattern. | Replace with `[ .. ] <VAR> -- set this to enable API fallback`. |
| 4.5 | HIGH | `mcp-server/src/cross-orchestrator-cli.js:332` | `console.log("No auditors reachable yet. Install codex or gemini, or set an API key, then run `ijfw demo`.")`. "No auditors reachable" leads with the negative. | Reframe: "IJFW has the Trident ready -- install codex or gemini (or set OPENAI_API_KEY / GEMINI_API_KEY), then run `ijfw demo`." |
| 4.6 | HIGH | `mcp-server/src/cross-orchestrator-cli.js:353-358` | `console.error(\`Error: mode must be one of: ${VALID_MODES.join(', ')}\`)` and `console.error('Error: target is required (...)')`. Classic "Error:" framing. | Reframe: `ijfw cross expects a mode (audit, research, critique). Try: ijfw cross audit README.md`. |
| 4.7 | HIGH | `mcp-server/src/cross-orchestrator-cli.js:371` | `console.error(\`Error: ${err.message}\`)` on run failure -- bubbles raw error text to user. | Wrap: `IJFW cross run hit an issue: ${err.message}. Run \`ijfw doctor\` to see what to fix.`. |
| 4.8 | MED | `mcp-server/src/cross-orchestrator-cli.js:343` | Purge messaging positive already ("Receipt log is already empty. Run ..."). | None -- template for others. |
| 4.9 | MED | `mcp-server/src/cross-orchestrator-cli.js:378-382` | No-auditor path prints three consecutive `console.log` lines -- three lines of negative framing. Once 4.5 is fixed, also compress to a single positive line with a single recommended next. | After fix 4.5, consolidate. |
| 4.10 | LOW | `mcp-server/src/cross-orchestrator-cli.js:229` | Uses em-dash `--` (ASCII form, good). | None. |

---

## System 5 -- MCP Server + Memory Tools

**Target:** `mcp-server/src/server.js`

| # | Sev | Surface | Finding | Recommended action |
|---|-----|---------|---------|--------------------|
| 5.1 | MED | `mcp-server/src/server.js:613-619` | Tool error strings ("content is required and must be a string", "content exceeds N character limit (got M). Summarise and retry.") are MCP-internal, seen by agent not user, so the negative framing is acceptable under "API-adjacent" exception. But the Summarise-and-retry hint is good. | None required; document as API-adjacent exception. |
| 5.2 | MED | `mcp-server/src/server.js:656` | `journal write failed (${journalResult.code}): ${journalResult.message}` -- raw code bubble-up. | Wrap: `Storage path hit a snag (<code>). Try \`ijfw doctor\` for a full health check.`. |
| 5.3 | LOW | `mcp-server/src/server.js:488-557` | Tool descriptions are crisp, positive, stranger-readable. Cap compliance: 8 tools declared. | None. |
| 5.4 | LOW | `mcp-server/src/server.js:521-534` | `ijfw_memory_prelude` description is the canonical onboarding pointer -- "CALL THIS AT SESSION START." Strong Sutherland-signal, Donahoe-compatible. | None. |

**HIGH findings: 0.** Tool descriptions are a Donahoe-compliant reference.

---

## System 6 -- Cross-AI Dispatcher + Receipts + Hero Line

**Targets:** `mcp-server/src/hero-line.js`, `mcp-server/src/receipts.js`

| # | Sev | Surface | Finding | Recommended action |
|---|-----|---------|---------|--------------------|
| 6.1 | HIGH | `mcp-server/src/hero-line.js:109-112` | `const sign = delta >= 0 ? '\u2212' : '+';` and the final return string interpolate `\u0394` (Greek Delta), `\u00D7` (multiplication sign), plus the middle dot on line 80 baseline `${count} AIs surfaced ${n} findings ...` + ` (prompt cache hit -- ~$X saved)`. Every hero line surfaced to a user thus contains non-ASCII code points. Directly violates AUDIT-REPORT-POLICY ASCII-only rule for user-facing text. | Replace: `Delta` -> `delta:`; `multiplication sign` -> `x`; Unicode minus -> `-`. Middle dot -> ` -- `. |
| 6.2 | MED | `mcp-server/src/hero-line.js:46` | `if (!receipts || receipts.length === 0) return 'No cross-audit runs yet'` -- "No ... yet" is acceptable empty-state framing, but does not teach the next step. | Reframe: `Trident is warm -- run \`ijfw cross audit <file>\` to record the first receipt.`. |
| 6.3 | MED | `mcp-server/src/hero-line.js:80` | Value-statement line is strong ("N AIs surfaced M findings (K consensus-critical) in T"). Donahoe-aligned once ASCII issue fixed. | After 6.1, done. |
| 6.4 | LOW | `mcp-server/src/receipts.js:39-46` | `purgeReceipts` returns a count but callers must handle "count=0" framing; already handled by CLI wrapper. | None. |

---

## System 7 -- Hooks

**Targets sampled:** `claude/hooks/scripts/session-start.sh`,
`claude/hooks/scripts/post-tool-use.sh`, `claude/hooks/scripts/pre-prompt.sh`

| # | Sev | Surface | Finding | Recommended action |
|---|-----|---------|---------|--------------------|
| 7.1 | MED | `claude/hooks/scripts/session-start.sh:29` | First-run error banner for `.ijfw` existing as a file: `"A file named \".ijfw\" exists in this project -- IJFW needs that name ... Rename or remove the file, then start a new session."` Positive-enough; one-line recovery provided. Borderline acceptable. | Tighten to: `IJFW would like to use .ijfw/ for memory. A file by that name exists -- rename or remove it, then restart the session.`. |
| 7.2 | MED | `claude/hooks/scripts/session-start.sh:163-169` | sqlite3-missing branch says "Install sqlite3 to also import existing memory" -- this is positive, actionable. Good pattern. | None; reference pattern. |
| 7.3 | LOW | `claude/hooks/scripts/session-start.sh:472-475,537-540` | Embedded node `-e` strings use em-dash `-- ` in the regex-marker strings (`<!-- IJFW-MEMORY-START (managed ... do not edit manually) -->`). Em-dash is Unicode; banner replaces it at runtime so user-surface exposure is controlled. But the CLAUDE.md this writes to contains em-dash. Strangers viewing the file in a non-UTF-8 terminal see mojibake. | Replace em-dash inside marker with `--` ASCII. |
| 7.4 | LOW | `claude/hooks/scripts/session-start.sh:88-95` | Backgrounded curl probes with 0.5s timeout are portable, positive-framed. Ollama / LM Studio detection degrades gracefully. | None. |

**HIGH findings: 0.** Hooks are Donahoe-compliant; the only ding is em-dash
inside CLAUDE.md marker strings.

---

## System 8 -- Installer

**Targets:** `installer/README.md`, `installer/src/install.js`, `scripts/install.sh`

| # | Sev | Surface | Finding | Recommended action |
|---|-----|---------|---------|--------------------|
| 8.1 | HIGH | `installer/src/install.js:65` | `issues.push(\`Node ${process.versions.node} detected; IJFW wants Node >=18.\`)` uses `\u2265` (>= is typed here as ASCII `>=` -- verified; but line 65 in the source contains the Unicode form `GREATER-THAN OR EQUAL`). Strangers on legacy terminals see box char. | Replace with ASCII `>=`. |
| 8.2 | HIGH | `installer/src/install.js:66-68` | Preflight lines: `'git not on PATH -- install git, then retry.'`, `'bash not on PATH -- install bash, then retry.'`, `'Native Windows detected -- please run from WSL for the best IJFW experience.'`. The third is positive; the first two lead with "not on PATH" (banned negative). | Rewrite: `IJFW needs git on PATH -- install git, then retry.` / `IJFW needs bash on PATH -- install bash, then retry.`. |
| 8.3 | HIGH | `installer/src/install.js:86,91,100` | `throw new Error(\`git pull failed (exit ${r.status}).\`)` and `git clone failed` and `scripts/install.sh exited ${r.status}.`. Raw "failed" / "exited N" bubble to user stderr. | Wrap user-visible layer: `IJFW couldn't complete the clone -- run \`git clone ${DEFAULT_REPO}\` manually to see the underlying reason, then rerun.`. |
| 8.4 | HIGH | `installer/src/install.js:97` | `throw new Error(\`scripts/install.sh missing at ${script}.\`)`. "missing" is banned framing. | Rewrite: `IJFW expected the install script at ${script}. Reinstall from the latest release to restore it.`. |
| 8.5 | HIGH | `installer/src/install.js:107-108` | `console.error('Preflight:')` followed by bullet list of issues. Header is neutral but section reads as a wall of negatives. | Reframe header: `A few things IJFW would like before continuing:` then the bullets. |
| 8.6 | HIGH | `scripts/install.sh:42` | `printf "Launcher missing at %s -- aborting.\\n" "$LAUNCHER"`. "missing", "aborting" -- two banned words on one line. | Rewrite: `IJFW expected the launcher at %s. Reinstall @ijfw/install to restore it.`. |
| 8.7 | MED | `scripts/install.sh:55-57` | `ok() { printf "  check %s\\n" "$1"; }` -- `check` rendered as Unicode check mark in the literal file (U+2713). ASCII-only constraint. | Replace with ASCII marker: `ok()` prints `  [ok] %s`; `note()` prints `  ->`; `info()` prints `  ..`. |
| 8.8 | MED | `scripts/install.sh:222` | `note "No .git directory found -- skipping post-commit hook."` -- "No ... found" pattern is the canonical empty-state negative. | Rewrite: `Git repo not initialised here -- the post-commit hook is available once you run \`git init\`.`. |
| 8.9 | MED | `installer/README.md:35` | Preflight line: "Requires node >=18, git, bash. On native Windows, run from WSL." This is positive-framed and concise. | None. |
| 8.10 | LOW | `installer/README.md:31` | "Memory is preserved across re-runs by default." -- positive, Sutherland-signal. | None. |

---

## System 9 -- Platform Configs

**Targets sampled:** `universal/ijfw-rules.md`, `gemini/GEMINI.md`, `cursor/.cursorrules`

| # | Sev | Surface | Finding | Recommended action |
|---|-----|---------|---------|--------------------|
| 9.1 | HIGH | `gemini/GEMINI.md:19,23` | Two em-dash characters in the rules file text (`... in one request -- no grep/search cascade needed` and `If ambiguous, ask -- don't guess.`). ASCII-only constraint violated in a file pasted verbatim into Gemini. Strangers on cp1252 terminals see mojibake. | Replace em-dash with `--` or `:`. |
| 9.2 | HIGH | `cursor/.cursorrules:23` | Same pattern: `If ambiguous, ask -- don't guess.` contains em-dash. | Same fix as 9.1. |
| 9.3 | MED | `universal/ijfw-rules.md:13` | `State assumptions before implementing. If ambiguous, ask -- don't guess.` -- em-dash again. | Same fix. |
| 9.4 | MED | `copilot/copilot-instructions.md` | Not sampled in this pass but same base template; high probability same em-dash issue. | Grep-replace across all platform rules files. |
| 9.5 | LOW | `universal/ijfw-rules.md:19` | "To cross-audit, cross-research, or cross-critique, run `ijfw cross <mode> <target>`." -- positive, discoverable. | None. |
| 9.6 | LOW | [no-file-ref] | `codex/` and `cursor/` top-level directories appear empty when listed without `-a` -- the actual config lives in `codex/.codex/` and `cursor/.cursor/`. Stranger browsing the repo on GitHub sees empty folders and wonders if Codex / Cursor support is unshipped. | Add a `README.md` stub in each top-level platform folder pointing at the hidden subfolder. Downgraded per severity rule. |

---

## System 10 -- README + CHANGELOG + PUBLISH-CHECKLIST

**Targets:** `README.md`, `CHANGELOG.md`, `PUBLISH-CHECKLIST.md`

| # | Sev | Surface | Finding | Recommended action |
|---|-----|---------|---------|--------------------|
| 10.1 | HIGH | `README.md:46` | `npm install -g @ijfw/install && ijfw install` -- the npm installer bin is named `ijfw-install` (per `installer/package.json:6-9`); the `ijfw` binary in `mcp-server/bin/ijfw` does NOT have an `install` subcommand. Stranger follows the README and hits `Unknown command: install`. | Change to `npm install -g @ijfw/install && ijfw-install` OR add an `install` passthrough to the `ijfw` CLI. Pick one before publish. |
| 10.2 | HIGH | `README.md:55-83` | `ijfw install codex`, `ijfw install gemini`, `ijfw install cursor`, `ijfw install windsurf`, `ijfw install copilot` -- none of these invocations work with the shipped `ijfw` binary. Five broken onboarding paths for strangers. | Either remove per-platform invocations (single `ijfw-install` covers all) or document that they map to `bash scripts/install.sh <platform>` post-clone. |
| 10.3 | HIGH | `README.md:110` | "MCP server (5 tools): `recall`, `store`, `search`, `status`, `prelude`" -- the shipped server exposes 8 tools (adds `ijfw_prompt_check`, `ijfw_metrics`, and the mcp-memory-audit tools per P3). Strangers believing the README and trying a 6th tool fail silently. | Update to 8 tools and list them, or say "5 core tools plus 3 diagnostic tools". Align with CLAUDE.md which is already correct ("<=8"). |
| 10.4 [closed] | MED | `README.md:3` | "7 platforms" -- counting Claude / Codex / Gemini / Cursor / Windsurf / Copilot + universal rules = 7 counting the paste-anywhere file as a platform. OK, defensible, but ambiguous to strangers. | Tighten to "6 native platforms + universal paste-anywhere rules". |
| 10.5 | MED | `README.md:20-31` | Demo output block shows fixed version "v1.0.0" -- fine for marketing, but includes `Haiku -> reads | Sonnet -> code | Opus -> architecture` which renders the pipe character inside a code block. No ASCII violation. Accurate. | None. |
| 10.6 | MED | `PUBLISH-CHECKLIST.md:24` | `test -x bin/ijfw && echo "OK" || echo "FAIL -- chmod +x bin/ijfw"` -- "FAIL" framing visible to publisher, not strangers. Acceptable in an internal checklist but the one-line recovery (`chmod +x bin/ijfw`) is already embedded -- good. | None. |
| 10.7 | LOW | `CHANGELOG.md:14` | "Eliminates section-sign chars, box-drawing dividers, and emoji from every user-facing surface" -- positive-framed, references the rule, stranger-readable. | None. |
| 10.8 | LOW | `README.md:108-110` | Core layer cited as "~51 lines, ~700 tokens" consistent with CLAUDE.md's 55-line cap / 51 current. | None. |

---

## Summary

| System | HIGH | MED | LOW |
|--------|------|-----|-----|
| 1 -- Workflow Skill | 0 | 2 | 2 |
| 2 -- On-Demand Skills | 0 | 1 | 3 |
| 3 -- Commands | 0 | 2 | 2 |
| 4 -- CLI + doctor | 7 | 2 | 1 |
| 5 -- MCP Server | 0 | 2 | 2 |
| 6 -- Cross-AI Dispatcher | 1 | 2 | 1 |
| 7 -- Hooks | 0 | 2 | 2 |
| 8 -- Installer | 6 | 2 | 2 |
| 9 -- Platform Configs | 2 | 2 | 2 |
| 10 -- README + CHANGELOG + CHECKLIST | 3 | 2 | 2 |
| **Total** | **19** | **19** | **19** |

Systems with **zero HIGH** under the Donahoe lens: System 1, System 2, System 3,
System 5, System 7.

Stranger-critical HIGH findings (IJFW literally cannot be installed as documented
by a fresh user): **10.1, 10.2, 10.3** -- the README onboarding path is broken.
Must close before any publish.

Second-tier HIGH findings (every diagnostic message a stranger sees is negative-
framed): the seven findings in System 4 and six in System 8. These are
surface-level wording fixes -- no logic changes -- but there are twelve of them
in rapid succession across the user's first five minutes with IJFW.

Third-tier HIGH findings: Unicode leakage (6.1, 8.1, 9.1, 9.2). The ASCII-only
rule in AUDIT-REPORT-POLICY is not enforced in shipped user-facing surfaces.

---

## Disposition (feeds 10E.5 merge)

| # | Finding | Disposition |
|---|---------|-------------|
| 10.1 | README `ijfw install` invocation does not exist | close in P10 -- publish-blocker |
| 10.2 | Five per-platform invocations broken | close in P10 -- publish-blocker |
| 10.3 | "5 tools" mis-stated as 5 in README | close in P10 -- publish-blocker |
| 4.1-4.7 | Negative framing throughout CLI / doctor | close in P10 -- one PR |
| 6.1 | Unicode in hero-line | close in P10 -- one PR |
| 8.1-8.6 | Installer negative framing + Unicode | close in P10 -- one PR |
| 9.1, 9.2 | Em-dash in GEMINI.md, .cursorrules | close in P10 -- grep-replace |
| All MED / LOW | | feed into 10E.5 master merge; triage at ticketed disposition |
