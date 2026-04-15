# Phase 10 principle cross-audit -- master report

Stamp: 2026-04-15
Inputs: CROSS-AUDIT-KRUG.md, CROSS-AUDIT-SUTHERLAND.md, CROSS-AUDIT-DONAHOE.md
Manifest: AUDIT-MANIFEST.md (10 systems)
Lens keys: K = Krug, S = Sutherland, D = Donahoe
Severity resolution: effective severity = max(severity across lenses that flagged the same surface/theme). `[no-file-ref]` findings were already downgraded inside each lens report per Step 10E rule; this master report inherits those levels.

Banned chars re-scanned in this doc: section-sign, em-dash (U+2014), Greek delta (U+0394), multiplication sign (U+00D7), check marks (U+2713/U+2714), heavy box-drawing. All substituted with ASCII.

---

## Totals

| Lens       | HIGH | MED | LOW |
|------------|------|-----|-----|
| Krug       | 9    | 22  | 6   |
| Sutherland | 10   | 11  | 16  |
| Donahoe    | 19   | 19  | 19  |
| Combined raw totals | 38 | 52 | 41 |

After dedup via consensus clustering (below), unique finding count = 89 (38+52+41 = 131 raw; 42 consensus pairs/triples collapse to 17 consensus rows, net 131 - 42 = 89).

---

## Consensus findings (>=2 lenses flag same surface or same issue)

Match rules: exact file:line overlap, or same file within 5 lines, or same theme across file-less findings. Three-lens consensus = strong signal; two-lens consensus = confirmed.

| C#  | Surface (file:line)                                          | Lenses | Effective sev | Unified finding | Merged action |
|-----|--------------------------------------------------------------|--------|---------------|-----------------|---------------|
| C01 [closed] | mcp-server/src/cross-orchestrator-cli.js:313                 | K,D    | HIGH          | Doctor row `[ -- ] <id> CLI -- not found` is literal negative framing; violates sacred positive-framing invariant and is first diagnostic stranger sees. | Replace with `[ .. ] <id> CLI -- install to unlock -- try: brew install <x>`. |
| C02 [closed] | mcp-server/src/cross-orchestrator-cli.js:320                 | K,D    | HIGH          | Doctor API-key row `[ -- ] <ENV> -- not set` is same negative framing. | Replace with `[ .. ] <ENV> -- set to enable <feature>` with inline export hint. |
| C03 [closed] | mcp-server/bin/ijfw:15                                       | K,D    | HIGH          | Launcher stderr `Error: ijfw CLI not found at $CLI` is negative at the first surface a stranger touches. | Rewrite `IJFW launcher expects CLI at $CLI -- reinstall @ijfw/install to restore it.`. |
| C04 [closed] | mcp-server/src/hero-line.js:46                               | K,S,D  | MED           | Empty-state `No cross-audit runs yet` is silent / does not teach the next step. | Rewrite `Trident is warm -- run ijfw cross audit <file> to record the first receipt. First run ~20s.`. |
| C05 [closed] | mcp-server/src/hero-line.js:80-112                           | K,D    | HIGH          | Hero line interpolates non-ASCII code points (U+2212, U+0394, U+00D7, middle dot). Violates ASCII-only rule on the highest-value user-facing surface. | Replace: unicode minus -> `-`; delta glyph -> `delta:`; multiplication sign -> `x`; middle dot -> ` -- `. |
| C06 [closed] | mcp-server/src/cross-orchestrator-cli.js (cmdDoctor) 297-334 | K,S,D  | HIGH          | Doctor output is commoditised `[ok]/[--]` grid: negative-framed rows (K/D) and no value reframing of what each auditor unlocks (S). | Two-part fix: (a) positive-frame every row per C01/C02; (b) add per-auditor value line and closing "N of 6 auditors reachable -- full Trident available / partial coverage available". |
| C07 | README.md:13 (install one-liner) + README.md:46,55-83         | K,D    | HIGH [closed] | Install one-liner conflates install-time and post-install; `ijfw install <platform>` invocations in README do not exist on the shipped binary. Stranger cannot follow the README as written. | Change install one-liner to `npm install -g @ijfw/install && ijfw-install && ijfw demo` (or add `install` passthrough to `ijfw` CLI); remove or rewire the five per-platform invocations. |
| C08 | README.md:110 (tool count)                                   | K,D    | HIGH [closed] | README states "MCP server (5 tools)" but server exposes 7-8 tools; CLAUDE.md says `<=8`. | Update to accurate count and list all tools, or drop the count and describe as "shared via stdio, zero deps". |
| C09 [closed] | installer/src/install.js:107 (preflight header)              | K,D    | HIGH          | `Preflight:` header is neutral/unclear about blast radius; followed by negative bullets like `Node X detected; IJFW wants >=18` and `git not on PATH`. | Change header to `IJFW needs a couple of things first -- fix these and re-run:`; rewrite bullets to `IJFW needs git on PATH -- install git, then retry.` (and peers). |
| C10 [closed] | universal/ijfw-rules.md (file-truth + em-dash)               | K,D    | HIGH          | K flags manifest/README/CLAUDE.md disagreement about path and line budget (19 lines vs documented 15). D flags em-dash on line 13 violating ASCII-only. | Pick canonical path, align manifest + README + CLAUDE.md; replace em-dash with ASCII `--`. |
| C11 [closed] | gemini/GEMINI.md em-dash + install precondition              | K,D    | HIGH          | D flags em-dashes on lines 19, 23 (ASCII violation). K flags line 38 tells user to run `ijfw cross ...` before install precondition documented. | Replace em-dashes with `--` or `:`; prepend install precondition line. |
| C12 [closed] | cursor/.cursorrules:23 em-dash                               | D      | HIGH (single-lens, kept visible for grep consistency with C10/C11) | Same em-dash pattern in cursor rules file. | Same fix as C10/C11. |
| C13 [closed] | claude/skills/ijfw-review/SKILL.md:16 empty state            | K,S    | MED           | `Clean. No findings.` teaches nothing; empty state should name what was checked. | `Clean. Reviewed N lines across bug/warn/suggest/nice gates. No findings.`. |
| C14 [closed] | claude/skills/ijfw-workflow/SKILL.md Trident framing (264-276) | K,S,D | MED          | Trident block is a to-do for the user (S), cites `P9` with no in-file definition (K), and assumes external CLI reachability with no fallback (D). | Rewrite block: one-line Donahoe-22 pointer; value reframe ("2 models will independently challenge this"); explicit fallback to Agent-dispatched specialist swarm when no external CLI reachable. |
| C15 [closed] | claude/skills/ijfw-workflow/SKILL.md state-file enumeration (83 vs 384) | K | LOW (single-lens; tracked for closure) | design.md appears only in the tree diagram (optional visual companion); header list of 5 is authoritative. Treated as accurate. |
| C16 [closed] | mcp-server/src/server.js tool descriptions (488-557)         | K,S    | MED           | Descriptions lead with mechanics ("Retrieve context from IJFW memory") not user benefit (S); also routing ambiguity between prelude and prompt_check both shouting "CALL THIS" (K). | Rewrite descriptions benefit-first; keep prelude as canonical onboarding pointer; soften prompt_check opener to a trigger-specific clause. |
| C17 [closed] | Installer post-run messaging (install.sh:206, install.js:138) | S,D   | MED           | S: no value receipt of what was accomplished. D: `No .git directory found -- skipping post-commit hook` negative empty-state. | Add one summary line pre-done: `<N> agents now share memory and rules.`; rewrite empty-state to `Git repo not initialised here -- post-commit hook is available once you run git init`. |

Consensus row count: 17. Total lens findings absorbed into consensus: ~42 (some rows absorb 2 lenses, some 3).

---

## Per-lens unique findings

### Krug unique (not covered above)

| ID   | Sev  | Surface                                                     | Action |
|------|------|-------------------------------------------------------------|--------|
| K1.1 | HIGH [closed] | claude/skills/ijfw-workflow/SKILL.md:17                     | Promote `BUILD -> AUDIT -> FIX -> SHIP -> MEASURE -> REPEAT` to a fenced pre-block near top. |
| K1.2 | HIGH [closed] | claude/skills/ijfw-workflow/SKILL.md:28                     | `QW` abbreviation undefined; expand to `Wave Q1` or define on first use. |
| K3.1 | HIGH [closed] | claude/commands/ijfw.md:18                                  | `/ijfw memory audit` is a dead link; route to `memory-audit.md` or add dispatcher. |
| K1.3 [closed] | MED  | claude/skills/ijfw-workflow/SKILL.md:264                    | `P9` reference without inline Donahoe-22 pointer. |
| K1.5 [closed] | MED  | claude/skills/ijfw-workflow/SKILL.md:305                    | `WHERE AM I` grammar inconsistent between example and STATE FILE schema. |
| K2.1 [closed] | MED  | claude/skills/ijfw-core/SKILL.md:9                          | Five modes listed with no one-line glossary. |
| K2.2 [closed] | MED  | claude/skills/ijfw-critique/SKILL.md:43                     | Template has placeholder slots but no worked example. |
| K3.2 | MED [closed] | claude/commands/cross-audit.md:125                          | Six auditor names with no one-liner each. |
| K3.3 | MED [closed] | claude/commands/cross-audit.md:175                          | Wave-A "Next step: open new terminal, paste..." contradicts auto-fire requirement at line 153. |
| K3.4 | MED [closed] | claude/commands/doctor.md:6                                 | `$IJFW_REPO`/`$IJFW_HOME` resolution fallback undocumented. |
| K4.3 | MED [closed] | mcp-server/src/cross-orchestrator-cli.js:148                | Budget wording forces user to translate explanation to policy. |
| K5.2 | MED [closed] | mcp-server/src/server.js:464                                | `ijfw_memory_recall` has three identifier forms without priority order. |
| K6.3 | LOW [closed] | mcp-server/src/cross-dispatcher.js:40                       | "Positive framing + blunt findings" contradiction in template prompt. |
| K7.1 [closed] | MED  | claude/hooks/scripts/session-start.sh:353                   | `[ijfw] Next: ...` banner silently truncates multi-line next action. |
| K7.2 [closed] | MED  | claude/hooks/scripts/pre-prompt.sh:123                      | Vague-prompt override syntax buried at end of long string. |
| K8.2 [closed] | MED  | installer/README.md:13                                      | "That's it" claim contradicts 20 lines of options below. |
| K8.3 [closed] | MED  | scripts/install.sh:22                                       | Inside-repo self-guard exits 0 -- stranger thinks install succeeded. |
| K10.3| MED [closed] | README.md:20                                                | Demo output block hard-codes version string. |
| K10.4| MED [closed] | PUBLISH-CHECKLIST.md:66                                     | Ambiguous pass condition for HIGH-finding grep. |
| K1.6 | LOW  | claude/skills/ijfw-workflow/SKILL.md:394                    | OUTPUT RULES guardrail buried near EOF. |
| K2.3 | LOW  | claude/skills/ijfw-review/SKILL.md:16                       | Covered by C13. |
| K3.5 | LOW [closed] | claude/commands/team.md:6                                   | `/team` listing format unspecified. |
| K5.3 | LOW [closed] | mcp-server/src/server.js:493                                | Stored `type` enum runs hot in one sentence. |
| K7.3 [closed] | LOW  | claude/hooks/scripts/session-start.sh:29                    | Two-sentence `.ijfw` preflight could compress to one. |
| K8.4 [closed] | LOW  | scripts/install.sh:124                                      | Mixed prefixes `ok`/`note`/`info` without legend. |

### Sutherland unique (not covered above)

| ID   | Sev  | Surface                                                     | Action |
|------|------|-------------------------------------------------------------|--------|
| S1.1 | HIGH [closed] | claude/skills/ijfw-workflow/SKILL.md:60-67                  | Step-done line is procedural; add receipts-of-work: "Step 3 -- done (5 tasks shipped, 3 audit gates cleared)". |
| S1.2 | HIGH [closed] | claude/skills/ijfw-workflow/SKILL.md:198-209                | Task micro-audit does 7 principle checks but never surfaces "N-point task audit cleared". |
| S2.1 | HIGH [closed] | claude/skills/ijfw-critique/SKILL.md:44-58                  | Critique output hides the rigor behind the verdict; add metadata line with angles pressure-tested + confidence. |
| S3.1 | HIGH [closed] | claude/commands/ijfw.md:7-32                                | Command index is categorically identical to every other CLI help; add headline value reframe. |
| S4.1 [closed] | HIGH | mcp-server/src/cross-orchestrator-cli.js:162-179            | cmdStatus ends with "Total runs: N" -- no cumulative value (hours saved / findings caught). |
| S5.1 [closed] | HIGH | mcp-server/src/server.js:464-465                            | Tool desc "Retrieve context from IJFW memory" is what it does, not what user gets. Rewrite benefit-first. |
| S5.2 [closed] | HIGH | mcp-server/src/server.js:517                                | `ijfw_memory_status` description reads like docstring; rewrite as "Ready-to-inject project brief (~200 tokens)". |
| S6.1 [closed] | HIGH | mcp-server/src/hero-line.js:80-112                          | Hero line is strongest Sutherland asset but buried -- surface in session-start banner, /status, workflow SHIP gate, installer post-run, demo closer. |
| S7.2 | HIGH [closed] | claude/hooks/scripts/session-start.sh:310-385               | Wake-up banner composes many signals but lacks cumulative-value line (tokens saved, cache hit rate, findings caught). |
| S8.1 [closed] | HIGH | installer/src/install.js:138-143                            | Post-install closer misses receipt: "N platforms configured, M MCP tools registered, existing configs merged not clobbered". |
| S10.1| HIGH [closed] | README.md:1-13                                              | Opening missing numeric wow line above install command. |
| S10.3| HIGH [closed] | README.md:117-123                                           | Why-IJFW bullets do not mention Trident -- the most distinctive asset is absent. |
| S1.3 [closed via C14] | MED  | claude/skills/ijfw-workflow/SKILL.md:264-276                | Covered by C14. |
| S2.3 [closed via C13] | MED  | claude/skills/ijfw-review/SKILL.md:16                       | Covered by C13. |
| S3.2 | MED [closed] | claude/commands/cross-audit.md:196-207                      | Wave-B compare lacks value frame "N findings solo Claude missed". |
| S3.3 | MED [closed] | claude/commands/cross-critique.md:253-267                   | Survival-score rubric invisible; add one-line disclosure. |
| S4.3 | MED [closed] | mcp-server/src/cross-orchestrator-cli.js:220-290            | cmdDemo closes on CTA rather than wow receipt. |
| S5.4 | MED [closed] | mcp-server/src/server.js:546-548                            | `ijfw_metrics` mechanical description; rewrite benefit-first. |
| S6.2 | MED [closed] | mcp-server/src/receipts.js:49-105                           | renderReceipt lacks cache-savings translation; hero-line translates, receipts don't. |
| S7.3 [closed] | MED  | claude/hooks/scripts/post-tool-use.sh:95-114                | Trim pipeline silent; emit one-line `[ijfw] trimmed N lines -> head/tail/signals`. |
| S8.2 [closed via C17] | MED  | scripts/install.sh:206                                      | Covered by C17. |
| S9.2 [closed] | MED  | universal/ijfw-rules.md:6-15                                | No line quantifying the saving; add "Typical session: 30-50% fewer output tokens vs default". |
| S10.4| MED [closed] | CHANGELOG.md:33-42                                          | P8 bullets use feature verbs; rewrite benefit-first. |
| S1.4 | LOW  | claude/skills/ijfw-workflow/SKILL.md:300-310                | Optional progress-so-far line on WHERE AM I. |
| S2.2 | LOW  | claude/skills/ijfw-compress/SKILL.md:21                     | Add dollar/minute conversion to savings line. |
| S2.4 | LOW  | [no-file-ref]                                               | Non-narrating skills silent on success; allow one-line completion receipt. |
| S3.4 | LOW [defer-p13] | claude/commands/cross-critique.md:300-302                   | Trident term underleveraged; optional one-sentence origin note. Donahoe lens: no action needed. |
| S4.4 | LOW [closed] | mcp-server/src/cross-orchestrator-cli.js:118-159            | Usage text lacks headline value statement. |
| S5.3 | LOW  | mcp-server/src/server.js:521-522                            | Keep as reference pattern. |
| S6.3 | LOW  | [no-file-ref]                                               | Auditor-pick rationale not communicated (family diversity). |
| S6.4 | LOW [closed] | mcp-server/src/hero-line.js:46                              | Covered by C04. |
| S7.1 [closed] | LOW  | claude/hooks/scripts/session-start.sh:334-336               | Extend memory-loaded line with Trident-run count. |
| S7.4 | LOW  | claude/hooks/scripts/pre-prompt.sh:117-125                  | Reference pattern; no action. |
| S8.3 | LOW  | installer/README.md:13                                      | Reference pattern; no action. |
| S8.4 [closed] | LOW  | scripts/install.sh:245-246                                  | Flip post-commit-hook tip benefit-first. |
| S9.1 | LOW  | universal/ijfw-rules.md:1-4                                 | Reference pattern; no action. |
| S9.3 | LOW  | gemini/GEMINI.md:1-4                                        | Reference pattern; no action. |
| S9.4 | LOW  | [no-file-ref]                                               | Platform parity message never surfaced in rules files. |
| S10.2| LOW  | README.md:19-31                                             | Reference pattern; no action. |
| S10.5| LOW  | PUBLISH-CHECKLIST.md:1-7                                    | Internal doc; no action. |

### Donahoe unique (not covered above)

| ID    | Sev  | Surface                                                         | Action |
|-------|------|-----------------------------------------------------------------|--------|
| D4.5 [closed] | HIGH | mcp-server/src/cross-orchestrator-cli.js:332                    | `No auditors reachable yet` leads negative; reframe "IJFW has the Trident ready -- install codex or gemini (or set OPENAI_API_KEY / GEMINI_API_KEY), then run ijfw demo." |
| D4.6 [closed] | HIGH | mcp-server/src/cross-orchestrator-cli.js:353-358                | Classic `Error: mode must be one of ...` framing; rewrite actionable. |
| D4.7 [closed] | HIGH | mcp-server/src/cross-orchestrator-cli.js:371                    | Raw error bubble-up on run failure; wrap with `Run ijfw doctor to see what to fix.`. |
| D8.1 [closed]  | HIGH | installer/src/install.js:65                                     | `>=` rendered as Unicode `GREATER-THAN OR EQUAL`; replace with ASCII `>=`. |
| D8.2 [closed]  | HIGH | installer/src/install.js:66-68                                  | `git not on PATH` / `bash not on PATH` banned negatives; rewrite "IJFW needs git on PATH -- install git, then retry." |
| D8.3 [closed]  | HIGH | installer/src/install.js:86,91,100                              | Raw `git pull failed` / `git clone failed` / `scripts/install.sh exited N` bubbles to user stderr. Wrap user layer. |
| D8.4 [closed]  | HIGH | installer/src/install.js:97                                     | `scripts/install.sh missing at X.` banned "missing"; rewrite. |
| D8.6 [closed]  | HIGH | scripts/install.sh:42                                           | `Launcher missing at X -- aborting.` two banned words one line; rewrite. |
| D1.1 [closed] | MED  | claude/skills/ijfw-workflow/SKILL.md:83-88                      | Read-only filesystem fallback note absent. |
| D1.2 [closed via C14] | MED  | claude/skills/ijfw-workflow/SKILL.md:264-275                    | Covered by C14. |
| D2.1 [closed] | MED  | claude/skills/ijfw-core/SKILL.md:40-42                          | `<ijfw-memory>` block + prelude-tool absence case not documented; point to plain-markdown fallback. |
| D3.1  | MED [closed] | claude/commands/cross-audit.md:191-198                          | Compare table uses unicode check/cross/diamond glyphs; replace with ASCII `[yes]`/`[new]`/`[dispute]`. |
| D3.2  | MED [closed] | claude/commands/cross-critique.md:82-90                         | Open menu lacks default; add `Default: [C] All three -- press enter.`. |
| D4.9  | MED [closed] | mcp-server/src/cross-orchestrator-cli.js:378-382                | Three consecutive negative lines on no-auditor path; consolidate after C01/C02/D4.5 fixes. |
| D5.2  | MED [closed] | mcp-server/src/server.js:656                                    | `journal write failed (code): message` raw bubble; wrap. |
| D7.1 [closed via K7.3] | MED  | claude/hooks/scripts/session-start.sh:29                        | Covered by K7.3 (same file:line). |
| D8.7 [closed]  | MED  | scripts/install.sh:55-57                                        | `ok()` uses Unicode check mark U+2713; replace with `[ok]`. |
| D8.8 [closed via C17] | MED  | scripts/install.sh:222                                          | Covered by C17. |
| D9.3 [closed via C10] | MED  | universal/ijfw-rules.md:13                                      | Em-dash (covered by C10). |
| D9.4 [closed] | MED  | copilot/copilot-instructions.md                                 | Likely same em-dash issue; grep-replace across all platform rules. |
| D10.4 | MED [closed] | README.md:3                                                     | "7 platforms" ambiguous; tighten to "6 native platforms + universal paste-anywhere rules". |
| D1.3  | LOW  | claude/skills/ijfw-workflow/SKILL.md:392-400                    | Foreign-plugin-verb ban enumerates six prefixes; restate as general rule. |
| D1.4  | LOW  | claude/skills/ijfw-workflow/SKILL.md:315-321                    | Mid-step ping threshold author-tuned; document only. |
| D2.2  | LOW  | claude/skills/ijfw-core/SKILL.md:38-42                          | Cross-reference 5000-char cap. |
| D2.3  | LOW  | claude/skills/ijfw-compress/SKILL.md:17                         | No action. |
| D2.4  | LOW  | claude/skills/ijfw-critique/SKILL.md:11-14                      | No action. |
| D3.3  | LOW  | claude/commands/ijfw.md:9-31                                    | No action. |
| D3.4  | LOW  | claude/commands/cross-critique.md:265                           | No action. |
| D4.10 | LOW  | mcp-server/src/cross-orchestrator-cli.js:229                    | No action. |
| D5.3  | LOW  | mcp-server/src/server.js:488-557                                | No action. |
| D5.4  | LOW  | mcp-server/src/server.js:521-534                                | No action. |
| D6.4  | LOW  | mcp-server/src/receipts.js:39-46                                | No action. |
| D7.3 [closed]  | LOW  | claude/hooks/scripts/session-start.sh:472-475,537-540           | Em-dash inside CLAUDE.md marker string; replace with ASCII `--`. |
| D7.4  | LOW  | claude/hooks/scripts/session-start.sh:88-95                     | No action. |
| D8.9  | LOW  | installer/README.md:35                                          | No action. |
| D8.10 | LOW  | installer/README.md:31                                          | No action. |
| D9.5  | LOW  | universal/ijfw-rules.md:19                                      | No action. |
| D9.6  | LOW  | [no-file-ref]                                                   | `codex/` and `cursor/` top-level dirs look empty on GitHub; add README stub. |
| D10.5 | LOW  | README.md:20-31                                                 | No action. |
| D10.6 [closed] | MED  | PUBLISH-CHECKLIST.md:24                                         | No action -- internal. |
| D10.7 | LOW  | CHANGELOG.md:14                                                 | No action. |
| D10.8 | LOW  | README.md:108-110                                               | No action. |

---

## Per-system HIGH count + disposition (effective severity after merge)

| System                        | HIGH count | Status |
|-------------------------------|------------|--------|
| 1 Workflow skill              | 4          | ACTION REQUIRED (K1.1, K1.2, S1.1, S1.2) |
| 2 On-demand skills            | 1          | ACTION REQUIRED (S2.1) |
| 3 Commands surface            | 2          | ACTION REQUIRED (K3.1, S3.1) |
| 4 CLI + doctor                | 10         | ACTION REQUIRED (C01, C02, C03, C06, D4.5, D4.6, D4.7, S4.1) |
| 5 MCP server                  | 2          | ACTION REQUIRED (S5.1, S5.2) |
| 6 Dispatcher + hero line      | 2          | ACTION REQUIRED (C05, S6.1) |
| 7 Hooks                       | 1          | ACTION REQUIRED (S7.2) |
| 8 Installer                   | 7          | ACTION REQUIRED (C09, S8.1, D8.1, D8.2, D8.3, D8.4, D8.6) |
| 9 Platform configs            | 3          | ACTION REQUIRED (C10, C11, C12) |
| 10 README + CHANGELOG + checklist | 4      | ACTION REQUIRED (C07, C08, S10.1, S10.3) |
| **Total HIGH (effective)**    | **36**     | zero systems without HIGH |

(Raw lens totals 9+10+19=38 HIGH; consensus dedup produces 36 effective unique HIGH findings.)

---

## Disposition for EVERY finding

Rule: every HIGH must be `close in P10` or `by design`. MED and LOW may `defer P11`.

### Consensus HIGH / MED

| C# | Disposition |
|----|-------------|
| C01 | close in P10 |
| C02 | close in P10 |
| C03 | close in P10 |
| C04 | close in P10 (co-fix with C05 same file) |
| C05 | close in P10 |
| C06 | close in P10 |
| C07 | close in P10 -- publish-blocker |
| C08 | close in P10 -- publish-blocker |
| C09 | close in P10 |
| C10 | close in P10 |
| C11 | close in P10 |
| C12 | close in P10 |
| C13 | close in P10 (trivial co-fix) |
| C14 | close in P10 |
| C15 | close in P10 (trivial) |
| C16 | close in P10 |
| C17 | close in P10 |

### Krug unique disposition

HIGH: K1.1, K1.2, K3.1 -> close in P10. MED: K1.3, K1.5, K2.1, K2.2, K3.2, K3.3, K3.4, K4.3, K5.2, K7.1, K7.2, K8.2, K8.3, K10.3, K10.4 -> close in P10 (all are one-line wording fixes). K6.3 LOW -> defer P11 (template contract change, needs cross-platform test). LOW: K1.6, K3.5, K5.3, K7.3, K8.4 -> close in P10 (trivial). K2.3 covered by C13.

### Sutherland unique disposition

HIGH (not in consensus): S1.1, S1.2, S2.1, S3.1, S4.1, S5.1, S5.2, S6.1, S7.2, S8.1, S10.1, S10.3 -> close in P10.
MED: S3.2, S3.3, S4.3, S5.4, S6.2, S7.3, S9.2, S10.4 -> close in P10 (copy/one-line receipt additions).
LOW: S1.4, S2.2, S2.4, S3.4, S4.4, S6.3, S7.1, S8.4, S9.4 -> defer P11 (all "optional / nice-to-have / extend" work). S5.3, S7.4, S8.3, S9.1, S9.3, S10.2, S10.5 -> by design (explicitly marked reference patterns).

### Donahoe unique disposition

HIGH (not in consensus): D4.5, D4.6, D4.7, D8.1, D8.2, D8.3, D8.4, D8.6 -> close in P10.
MED: D1.1, D2.1, D3.1, D3.2, D4.9, D5.2, D8.7, D9.4, D10.4 -> close in P10 (one-line wording / ASCII replacement / fallback notes). D7.1 dup of K7.3. D9.3 covered by C10. D8.8 covered by C17.
LOW: D1.3, D2.2, D7.3, D9.6 -> close in P10 (trivial fixes / stub file). D1.4, D2.3, D2.4, D3.3, D3.4, D4.10, D5.3, D5.4, D6.4, D7.4, D8.9, D8.10, D9.5, D10.5, D10.6, D10.7, D10.8 -> by design (all "No action required"). 

### Publish-blocker HIGHs by system totals

- close_in_p10: 36 HIGH (all effective HIGH findings are closable in P10 with wording / fallback / accurate-doc fixes; none are logic changes).
- by_design: 0 HIGH.
- defer_to_p11: 0 HIGH.

MED breakdown: close_in_p10 ~40, defer_p11 0, by_design 0 (most MED are one-line copy fixes batched under one PR per system).
LOW breakdown: close_in_p10 ~12 (trivial batched), defer_p11 ~9 (optional extensions), by_design ~20 (reference patterns explicitly marked "no action").

---

## Publish-blocking HIGH summary (Wave 10E.6 closure checklist)

Ordered by system. Every row below MUST be closed before PUBLISH gate.

| #  | System | File:line | One-line fix |
|----|--------|-----------|--------------|
|  1 | S1  | claude/skills/ijfw-workflow/SKILL.md:17  | Promote BUILD -> AUDIT -> FIX -> SHIP -> MEASURE -> REPEAT to fenced pre-block near top. |
|  2 | S1  | claude/skills/ijfw-workflow/SKILL.md:28  | Define `QW` abbreviation or rename to `Wave Q1`. |
|  3 | S1  | claude/skills/ijfw-workflow/SKILL.md:60-67 | Close each step with receipts line ("N tasks shipped, M audit gates cleared"). |
|  4 | S1  | claude/skills/ijfw-workflow/SKILL.md:198-209 | Emit "N-point task audit cleared" line after each task micro-audit. |
|  5 | S2  | claude/skills/ijfw-critique/SKILL.md:44-58 | Add confidence + angles-tested metadata line to critique output. |
|  6 | S3  | claude/commands/ijfw.md:18               | Fix `/ijfw memory audit` dead link (route to memory-audit.md or dispatcher). |
|  7 | S3  | claude/commands/ijfw.md:7-32             | Add one-line headline value reframe above command index. |
|  8 | S4  | mcp-server/bin/ijfw:15                   | Replace `Error: ijfw CLI not found at $CLI` with positive reinstall framing. |
|  9 | S4  | mcp-server/bin/ijfw:20                   | Replace `Error: node not installed` with positive install hint. |
| 10 | S4  | mcp-server/src/cross-orchestrator-cli.js:313 | Doctor row: `not found` -> `install to unlock`. |
| 11 | S4  | mcp-server/src/cross-orchestrator-cli.js:320 | Doctor API-key row: `not set` -> `set to enable <feature>`. |
| 12 | S4  | mcp-server/src/cross-orchestrator-cli.js:332 | Reframe "No auditors reachable yet" to Trident-ready + install hint. |
| 13 | S4  | mcp-server/src/cross-orchestrator-cli.js:353-358 | Replace `Error:` mode/target messages with actionable try-this. |
| 14 | S4  | mcp-server/src/cross-orchestrator-cli.js:371 | Wrap raw run-failure bubble-up with `Run ijfw doctor` guidance. |
| 15 | S4  | mcp-server/src/cross-orchestrator-cli.js:162-179 | cmdStatus: add cumulative-value line (hours saved / findings caught). |
| 16 | S4  | mcp-server/src/cross-orchestrator-cli.js:297-334 | Doctor output: add per-auditor value + closing coverage line. |
| 17 | S5  | mcp-server/src/server.js:464-465         | Rewrite `ijfw_memory_recall` description benefit-first. |
| 18 | S5  | mcp-server/src/server.js:517             | Rewrite `ijfw_memory_status` description benefit-first. |
| 19 | S6  | mcp-server/src/hero-line.js:80-112       | Replace unicode minus / delta / multiplication / middle-dot with ASCII. |
| 20 | S6  | mcp-server/src/hero-line.js (surfacing)  | Surface hero line in session-start banner, /status, workflow SHIP gate, installer post-run, demo closer. |
| 21 | S7  | claude/hooks/scripts/session-start.sh:310-385 | Append cumulative-value line to wake-up banner when receipts exist. |
| 22 | S8  | installer/src/install.js:65              | Replace Unicode `>=` glyph with ASCII `>=`. |
| 23 | S8  | installer/src/install.js:66-68           | Replace `git not on PATH` / `bash not on PATH` with positive "IJFW needs git on PATH -- install git, then retry." |
| 24 | S8  | installer/src/install.js:86,91,100       | Wrap raw git pull / clone / install.sh exit errors with user-layer guidance. |
| 25 | S8  | installer/src/install.js:97              | Replace `scripts/install.sh missing at X` with positive reinstall hint. |
| 26 | S8  | installer/src/install.js:107             | Change `Preflight:` header to `IJFW needs a couple of things first -- fix these and re-run:`. |
| 27 | S8  | installer/src/install.js:138-143         | Add receipt summary pre-done: "<N> agents configured, <M> MCP tools ready, existing configs merged not clobbered". |
| 28 | S8  | scripts/install.sh:42                    | Replace `Launcher missing at X -- aborting.` with positive reinstall framing. |
| 29 | S9  | universal/ijfw-rules.md                  | Canonicalise path, align manifest + README + CLAUDE.md to same file+length; replace em-dash with ASCII `--`. |
| 30 | S9  | gemini/GEMINI.md:19,23,38                | Replace em-dashes with ASCII `--`; prepend install precondition line. |
| 31 | S9  | cursor/.cursorrules:23                   | Replace em-dash with ASCII `--`. |
| 32 | S10 | README.md:13,46,55-83                    | Fix install one-liner and per-platform invocations to match shipped binary (`ijfw-install`). |
| 33 | S10 | README.md:110                            | Update MCP tool count (7-8 tools) and list them accurately. |
| 34 | S10 | README.md:1-13                           | Add numeric wow line between tagline and install command. |
| 35 | S10 | README.md:117-123                        | Add Trident bullet to "Why IJFW" section. |
| 36 | S10 | PUBLISH-CHECKLIST.md:66                  | Tighten HIGH-finding grep to `grep -v '\[closed\]' | grep HIGH` or two-step. |

Checklist length: 36 rows. Wave 10E.6 must land all 36 before PUBLISH gate opens.

---

## Notes

- Re-scanned for banned chars post-draft: zero section-sign, zero em-dash, zero Greek delta, zero multiplication sign, zero check mark, zero box-drawing. All substituted.
- Three reference-pattern surfaces (universal/ijfw-rules.md:1-4 header, hero-line.js structural format post-ASCII-fix, installer/README.md:13 "That's it") are called out as templates for peer fixes.
- No "by design" HIGH findings. Every effective HIGH is a one-line wording / ASCII-replacement / accurate-doc fix. No logic change required.
