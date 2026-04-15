# Cross-Audit -- Sutherland Lens (Wave 10E.3)

Lens: Smarter not cheaper. Costly signals visible. Value reframing over
feature narration. A smart system that looks dumb is worse than a dumb
system that looks smart. Avoid commoditization; aim for premium
perception with asymmetric perceived value.

Severity rule (per Plan Step 10E): findings without `file:line` auto-downgrade
one tier and are marked `[no-file-ref]`.

Systems audited: 10. All scoped from `.planning/phase10/AUDIT-MANIFEST.md`.

---

## System 1 -- Workflow Skill

Canonical: `claude/skills/ijfw-workflow/SKILL.md`

- Finding 1.1 [closed] -- `claude/skills/ijfw-workflow/SKILL.md:60-67` -- Execute-step
  narration reads "Step 3 -- done (all tasks complete, tests pass)". The
  workflow performs significant audit work (22 Donahoe principles, scope
  check, assumption surfacing) but the costly signal of that work is
  invisible at completion. The headline is internal state, not value.
  -- Severity: HIGH
  -- Action: Close each step with a value line that counts the work done,
     e.g. "Step 3 -- done (5 tasks shipped, 3 audit gates cleared, 0
     assumptions left unflagged)." Reframe progression from procedural to
     receipts-of-work-delivered.

- Finding 1.2 [closed] -- `claude/skills/ijfw-workflow/SKILL.md:198-209` -- TASK
  MICRO-AUDIT lists seven principle checks but never surfaces "this task
  passed N of N audit gates" back to the user. The audit load is the
  premium signal; it is collapsed to one generic "task verified" line.
  -- Severity: HIGH
  -- Action: After each micro-audit, emit "N-point task audit cleared" (or
     specify which of the principles applied) so the user sees the rigor.

- Finding 1.3 -- `claude/skills/ijfw-workflow/SKILL.md:264-276` -- Trident
  offer reads "Cross-audit ready. Review in Gemini, Codex, or another AI."
  This is a to-do for the user, not a framing of value. A Sutherland-lens
  copy says what the Trident prevents, not what it is.
  -- Severity: MED
  -- Action: Rewrite to "Trident stands ready -- 2 more models will
     independently challenge this. Consensus findings jump to high-priority;
     lone flags become watch-items. Fire now?"

- Finding 1.4 -- `claude/skills/ijfw-workflow/SKILL.md:300-310` -- WHERE AM I
  response template gives position but no indicator of cumulative work.
  "Phase Deep / Wave 4 / Step 4.2" is navigation; Sutherland expects also a
  scoreboard ("12 tasks shipped, 3 audit gates cleared so far").
  -- Severity: LOW
  -- Action: Optional progress-so-far line appended to the "where am I"
     response.

---

## System 2 -- On-Demand Skills Bundle

Canonical: `claude/skills/ijfw-*/SKILL.md` (excl. workflow + core).
Sampled: ijfw-critique, ijfw-compress, ijfw-review.

- Finding 2.1 [closed] -- `claude/skills/ijfw-critique/SKILL.md:44-58` -- Output
  template is steelman + assumptions + counter-args + verdict. The WORK
  done to reach the verdict (number of assumptions pressure-tested,
  counter-angles considered) is never surfaced as a costly signal. A
  rigorous critique that reads like a casual opinion will be trusted like a
  casual opinion.
  -- Severity: HIGH
  -- Action: Append a single metadata line: "Stress-tested against 3
     assumptions, 3 angles (operational + social + correctness). Verdict
     confidence: med/high." Shows the audit cost behind the verdict.

- Finding 2.2 -- `claude/skills/ijfw-compress/SKILL.md:21` -- Reports
  "Compressed: 1,847 -> 923 tokens (50% saved)". This is textbook
  Sutherland -- value reframed as savings. Good baseline.
  -- Severity: LOW
  -- Action: Extend to include dollar/minute conversion where known, e.g.
     "50% saved (approx $0.02 per session at Sonnet input pricing)". Makes
     the costly signal quantitatively vivid.

- Finding 2.3 -- `claude/skills/ijfw-review/SKILL.md:16` -- Empty-state
  message "Clean. No findings." is terse but undersells the review pass.
  A successful no-findings review is still work; Sutherland says name it.
  -- Severity: MED
  -- Action: "Clean. Reviewed N lines against bug/warn/suggest/nice gates.
     No findings." Same length, signals the check was thorough.

- Finding 2.4 -- `[no-file-ref]` -- Several on-demand skills declare
  `<!-- IJFW: narration-not-applicable -->` (legitimate escape hatch per
  10A-sk.3). A skill that legitimately does not narrate can still emit a
  one-line completion receipt -- today they are silent on success. This is
  commoditization: looks like every other plugin.
  -- Severity: LOW (auto-downgraded from MED)
  -- Action: Allow non-narrating skills a single closing "done: <one-line
     summary of what changed>" without forcing full Phase/Wave/Step.

---

## System 3 -- Commands Surface

Canonical: `claude/commands/*.md`. Sampled: cross-audit.md, cross-critique.md,
ijfw.md.

- Finding 3.1 -- `claude/commands/ijfw.md:7-32` -- The command index is a
  flat grouped list -- categorically identical to every other CLI's help
  screen. No headline value ("20 commands; one replaces your setup work
  across 7 platforms"), no wow framing.
  -- Severity: HIGH
  -- Action: Add a one-line pre-list value reframe: "IJFW -- one interface,
     7 platforms. Memory, routing, cross-audit, handoffs. Pick any:"

- Finding 3.2 -- `claude/commands/cross-audit.md:196-207` -- Wave B compare
  output ends with "N findings. Overlap: X% (agreed). Y new for us to
  investigate. Top priority: <one-liner>." Strong, but the VALUE frame
  (what the user was saved from) is absent.
  -- Severity: MED
  -- Action: Append "N findings caught by Trident that a single model
     missed: Y." Names the asymmetric value.

- Finding 3.3 -- `claude/commands/cross-critique.md:253-267` -- Ranked table
  renders survival scores 1-5. Excellent mechanic, but the rubric
  (deterministic score derived from condition specificity + mitigation +
  evidence + severity + independence) is invisible. Users treat the score
  like a vibe rather than a costly signal.
  -- Severity: MED
  -- Action: Add a one-line rubric disclosure under the table header:
     "Survival score: weighted across 5 rebuttal dimensions -- see
     scoreRebuttalSurvival in cross-dispatcher.js." Signals methodology.

- Finding 3.4 -- `claude/commands/cross-critique.md:300-302` -- Footer note
  "Positive framing throughout: no 'missing auditor error' -- 'install to
  unlock the full Trident.'" The copy is good, but the word "Trident" is
  underleveraged as a brand signal. It appears as a term of art but no
  user-facing line explains WHY three models matter.
  -- Severity: LOW
  -- Action: Optional one-sentence Trident origin note on first invocation
     per project ("Three diverse models -- the Trident -- independently
     catch blind spots no single model will.")

---

## System 4 -- CLI + ijfw doctor

Canonical: `mcp-server/bin/ijfw`, `mcp-server/src/cross-orchestrator-cli.js`.

- Finding 4.1 -- `mcp-server/src/cross-orchestrator-cli.js:162-179` --
  `cmdStatus` renders the hero-line (strong Sutherland signal) but closes
  with "Total runs: <N>" and "Recommended next: ..." A value reframe would
  add cumulative savings: "X hours saved vs solo reviews" or "Y findings
  caught that solo review missed to date." Today the status is mechanical.
  -- Severity: HIGH
  -- Action: Aggregate across `readReceipts` to produce a cumulative value
     line. Hero-line already does this per run; extend to per-project total.

- Finding 4.2 -- `mcp-server/src/cross-orchestrator-cli.js:297-334` --
  `cmdDoctor` output is a grid of `[ ok ]` / `[ -- ]` rows. This is every
  other CLI's doctor -- maximum commoditization. Zero Sutherland framing
  around WHAT the user unlocks when a given auditor is reachable.
  -- Severity: HIGH
  -- Action: Group into two-line sections per auditor: row 1 = state, row
     2 = value unlocked ("Trident complete -- 1 OpenAI + 1 Google + caller
     swarm"). Closing line reframes: "N of 6 auditors reachable -- full
     Trident available / partial coverage available."

- Finding 4.3 -- `mcp-server/src/cross-orchestrator-cli.js:220-290` --
  `cmdDemo` closes with "Try `ijfw cross audit <your-file>` next." Misses
  the value closer -- the 30-second demo just demonstrated the Trident,
  but the closing line is a CTA for the next command rather than a
  receipt of the wow moment.
  -- Severity: MED
  -- Action: Add one line before the CTA: "That was <N> AIs, one command,
     <Xs>. Your solo-Claude session would have missed <consensus-critical>."

- Finding 4.4 -- `mcp-server/src/cross-orchestrator-cli.js:118-159` --
  Usage text lists commands as feature rows. No headline value statement
  ("IJFW: one command fires the Trident"). Feels like a generic CLI help.
  -- Severity: LOW
  -- Action: Replace the blank line after "It Just Fucking Works CLI" with
     one benefit-framed line, e.g. "Fire 2-4 AIs at any target. Receipts
     logged. Cache hits tracked. Your memory follows you."

---

## System 5 -- MCP Server + Memory Tools

Canonical: `mcp-server/src/server.js`.

- Finding 5.1 -- `mcp-server/src/server.js:464-465` -- Tool description
  "Retrieve context from IJFW memory" is what it DOES, not what the user
  GETS. Sutherland lens rewrites to the user-level benefit: "Wake up with
  project context intact -- no re-explaining decisions, no re-pasting
  handoffs."
  -- Severity: HIGH
  -- Action: Rewrite descriptions of the 5 core memory tools to lead with
     user benefit, trail with operational detail. Applies to recall, store,
     search, status, prelude.

- Finding 5.2 -- `mcp-server/src/server.js:517` -- `ijfw_memory_status`
  description: "Compressed critical-facts summary (~200 tokens) for
  context injection." Maximum commoditization -- reads like internal
  docstring. User has no reason to call this over anything else.
  -- Severity: HIGH
  -- Action: Rewrite: "Ready-to-inject project brief (~200 tokens) --
     decisions, conventions, open questions at a glance. Cheapest
     wake-up call."

- Finding 5.3 -- `mcp-server/src/server.js:521-522` -- `ijfw_memory_prelude`
  description is the strongest of the set: "Eliminates the need to
  grep/search/recall separately." Good Sutherland reframing (shows cost
  avoided). Keep as reference shape for fixing 5.1 / 5.2.
  -- Severity: LOW
  -- Action: Use this as the pattern for rewriting peer tools.

- Finding 5.4 -- `mcp-server/src/server.js:546-548` -- `ijfw_metrics`
  description says "Aggregate session metrics (tokens, cost, sessions,
  routing)". Mechanical. No value framing -- "see your spend, routing
  mix, and where you are saving" would land.
  -- Severity: MED
  -- Action: Reframe to benefit-first: "See tokens/spend saved,
  model routing mix, session totals -- the receipts behind your IJFW
  sessions."

---

## System 6 -- Cross-AI Dispatcher + Receipts + Hero Line

Canonical: `mcp-server/src/hero-line.js`, `mcp-server/src/receipts.js`,
`mcp-server/src/cross-orchestrator.js`, `mcp-server/src/cross-dispatcher.js`,
`mcp-server/src/api-client.js`.

- Finding 6.1 -- `mcp-server/src/hero-line.js:80-112` -- The hero line is
  the single strongest Sutherland asset in the codebase. Format: "N AIs
  surfaced X findings (Y consensus-critical) in Zs (prompt cache hit --
  ~$W saved)". And measured delta: "-X% tokens vs solo Claude Nx". This
  is gold-standard costly-signal rendering.
  -- Severity: HIGH (as a surfacing gap, not a quality gap)
  -- Action: Surface this line in MORE places: session-start banner (when
     receipts exist), workflow SHIP gate, installer post-install summary,
     `/status` output, and the demo closer. Currently it only appears in
     `cmdStatus`. Asset is buried.

- Finding 6.2 -- `mcp-server/src/receipts.js:49-105` -- `renderReceipt`
  outputs "Step N.2 -- findings: N items", "Step N.3 -- duration: 3s",
  "Step N.4 -- cache created: X tokens", "Step N.5 -- cache read: X tokens".
  All mechanical. The user sees WORK, not VALUE. Cache tokens rendered
  without the savings translation (hero-line translates; renderReceipt
  does not).
  -- Severity: MED
  -- Action: Extend renderReceipt to translate cache_read_input_tokens
     into dollars saved using the same constant as hero-line
     (CACHE_SAVINGS_PER_TOKEN). Consistency between the two renderers
     eliminates the asset gap.

- Finding 6.3 -- `[no-file-ref]` -- Cross-dispatcher's family-diversity
  rule (Trident combo policy: 1 OpenAI + 1 Google + caller swarm) is a
  premium signal that is never communicated in user-facing output. Users
  who don't read the plan don't know the selection is non-random.
  -- Severity: LOW (auto-downgraded from MED)
  -- Action: On auditor-pick output line, append rationale: "codex, gemini
     (diverse training lineages -- no shared blind spots)."

- Finding 6.4 -- `mcp-server/src/hero-line.js:46` -- Empty-state fallback
  "No cross-audit runs yet" is accurate but flat. Sutherland would turn
  the zero-state into an invitation with value framing.
  -- Severity: LOW
  -- Action: Rewrite to "No cross-audit runs yet -- fire the Trident at
     any file with `ijfw cross audit <file>`. First run in ~20s."

---

## System 7 -- Hooks

Canonical: `claude/hooks/scripts/*.sh`. Sampled: session-start.sh,
post-tool-use.sh, pre-prompt.sh.

- Finding 7.1 -- `claude/hooks/scripts/session-start.sh:334-336` -- Banner
  line "Memory loaded (N sessions, N decisions)" is a solid costly signal.
  Good baseline.
  -- Severity: LOW
  -- Action: Extend with cumulative cross-audit receipt count when
     present: "Memory loaded (N sessions, N decisions, M Trident runs)."
     Pulls hero-line asset into the wake-up surface.

- Finding 7.2 -- `claude/hooks/scripts/session-start.sh:310-385` -- The
  banner composes many positive signals (mode, memory, project type,
  indexed files, last status) -- strong Sutherland posture. Missing: no
  cumulative-value line (tokens saved to date, cache hit rate, findings
  caught by Trident). Hook does the work; the receipt never surfaces.
  -- Severity: HIGH [closed]
  -- Action: Append a single hero-line style summary when receipts file
     exists, so the wake-up moment shows CUMULATIVE asymmetric value.
     "Cumulative: ~$X in cache savings, N findings caught."
  -- Closed: Wave 10E.6 S7 -- added Trident cumulative block (lines 385-430,
     session-start.sh). Emits "[ijfw] Trident: N runs, M findings caught,
     ~$X in cache savings" when .ijfw/receipts/cross-runs.jsonl exists.

- Finding 7.3 -- `claude/hooks/scripts/post-tool-use.sh:95-114` -- The trim
  pipeline saves significant tokens per session (cuts 500-line outputs to
  head+tail+signals). Zero surface communication of this to the user --
  the skill does premium work and stays silent about it.
  -- Severity: MED
  -- Action: Emit a one-line signal when trimming fires: "[ijfw] trimmed
     N lines -> head/tail/signals." User sees the work.

- Finding 7.4 -- `claude/hooks/scripts/pre-prompt.sh:117-125` -- Vague
  prompt detector surfaces the sharpening prompt when fires -- this IS
  the costly signal. Silent on non-fire (correct). Good.
  -- Severity: LOW
  -- Action: None required. Keep as reference pattern for "show when
     value added, stay silent when not."

---

## System 8 -- Installer

Canonical: `installer/README.md`, `installer/src/install.js`,
`scripts/install.sh`.

- Finding 8.1 -- `installer/src/install.js:138-143` -- Post-install closer
  reads: "IJFW ready. / Memory preserved at ... / Run `ijfw demo` ... /
  Privacy: everything stays local." Good, but missing the receipt of
  what was just accomplished. User does not see the costly signal of "7
  platforms configured, 5 MCP tools registered, existing configs merged
  not clobbered."
  -- Severity: HIGH
  -- Action: Add one summary block before "IJFW ready.": "Configured: N
     platforms / merged into existing configs / M MCP tools ready." Names
     the breadth and the non-clobber invariant.

- Finding 8.2 -- `scripts/install.sh:206` -- Closing line "Done. Backups
  (if any): <config>.bak.$TS / Verify with: node ..." is maintenance-
  framed. No value statement at completion.
  -- Severity: MED
  -- Action: Add pre-done line: "<N> agents now share memory and rules.
     Decisions from any agent show up in every agent." Reframes the install
     as a unification event, not a config merge.

- Finding 8.3 -- `installer/README.md:13` -- "That's it. IJFW configures
  every agent on your machine and you're ready to go." Strong Sutherland
  framing -- feature reframed as benefit.
  -- Severity: LOW
  -- Action: None required. Reference pattern.

- Finding 8.4 -- `scripts/install.sh:245-246` -- Post-commit hook tip
  reads: "Tip: run with --post-commit-hook to enable background Trident
  critique on every commit." Feature-first. Sutherland flips this: "Make
  every commit a 3-AI-reviewed commit -- automatically. Run with
  --post-commit-hook."
  -- Severity: LOW
  -- Action: Reword the tip to benefit-first.

---

## System 9 -- Platform Configs

Canonical: `universal/ijfw-rules.md`, `gemini/GEMINI.md`, and the Cursor
rule template copied by install.sh into `.cursor/rules/ijfw.mdc`
(`cursor/` dir in repo is empty of a direct rule file at the moment --
install.sh references `cursor/.cursor/rules/ijfw.mdc`).

- Finding 9.1 -- `universal/ijfw-rules.md:1-4` -- Header "IJFW -- AI
  Efficiency Framework / By Sean Donahoe | It Just Fucking Works / Active
  every response. No revert. No filler drift." Strong premium positioning
  -- the name + tagline is Sutherland by construction. Good.
  -- Severity: LOW
  -- Action: None required.

- Finding 9.2 -- `universal/ijfw-rules.md:6-15` -- Output rules section
  lists disciplines (no preamble / no filler / etc.) without any line
  quantifying the saving. User who pastes this cannot tell how much they
  will save. Value is present but uncommunicated.
  -- Severity: MED
  -- Action: Add one closing line to the rules: "Typical session: 30-50%
     fewer output tokens vs default." Numeric Sutherland signal.

- Finding 9.3 -- `gemini/GEMINI.md:1-4` -- Identical header to universal.
  Good.
  -- Severity: LOW
  -- Action: None required.

- Finding 9.4 -- `[no-file-ref]` -- Platform parity message ("same rules
  across 7 agents") is a premium signal never surfaced IN the rules files
  themselves. A paster into Gemini has no idea the same bytes run in
  Codex / Cursor / Windsurf / Copilot.
  -- Severity: LOW (auto-downgraded from MED)
  -- Action: Add one line at the top of each rules file: "Same rules
     active in 7 agents. IJFW makes them consistent."

---

## System 10 -- README + CHANGELOG + PUBLISH-CHECKLIST

Canonical: `README.md`, `CHANGELOG.md`, `PUBLISH-CHECKLIST.md`.

- Finding 10.1 -- `README.md:1-13` -- Opening: "IJFW -- It Just Fucking
  Works. / Multi-AI orchestration layer for 7 platforms. One install,
  zero config, persistent memory. / npm install -g @ijfw/install && ijfw
  demo." Strong hook, but no numeric wow ("catches X bugs your single AI
  misses", "saves ~$Y per session via cache", "M AIs agreeing in Ns").
  First-screen Sutherland asks for an asymmetric-value headline above
  the install line.
  -- Severity: HIGH
  -- Action: Add a single line between tagline and install command:
     "Three AIs review every diff. Cache-hit savings logged per run. Your
     memory follows you across all seven agents." Numeric value above
     the fold.

- Finding 10.2 -- `README.md:19-31` -- Demo output block shows
  "Platforms detected: ... / Memory: 247 entries across 4 projects / MCP
  server: running / Mode: smart ... / All checks passed." Excellent
  Sutherland -- each line is a costly signal.
  -- Severity: LOW
  -- Action: None required. Reference pattern.

- Finding 10.3 -- `README.md:117-123` -- "Why IJFW" section names
  Sutherland's principle explicitly ("Smarter, not cheaper"). Good
  positioning. But bullet ordering buries the cross-audit angle -- the
  Trident is the single most distinctive Sutherland asset and it does not
  appear in Why IJFW at all.
  -- Severity: HIGH
  -- Action: Add a fourth bullet (or promote to second): "Three AIs, not
     one. IJFW fires the Trident -- one OpenAI model, one Google model,
     plus a specialist swarm -- at every cross-audit. Consensus findings
     jump to high-priority; blind spots never get a free pass."

- Finding 10.4 [closed] -- `CHANGELOG.md:33-42` -- P8 entry ("Trident Enforced,
  Visible, Everywhere") is correctly Sutherland-themed but the bullet
  list underneath reads "Enforces / Ships / Records / Makes / Adds". Pure
  feature verbs. Value-framing is in the theme line, not the bullets.
  -- Severity: MED
  -- Action: Rewrite each bullet to lead with what the user GETS. E.g.
     "Every cross-audit now leaves a receipt -- cache hits, duration,
     consensus findings -- archived and prunable." Phase themes already
     are strong; align the bullets.

- Finding 10.5 -- `PUBLISH-CHECKLIST.md:1-7` -- Header "Publish checklist
  -- @ijfw/install / Self-contained. Run every gate top to bottom before
  npm publish." Strictly operational, no Sutherland framing expected or
  needed -- internal doc.
  -- Severity: LOW
  -- Action: None required.

---

## Summary

| Severity | Count | Systems |
|----------|-------|---------|
| HIGH     | 10    | S1 (x2), S3 (x1), S4 (x2), S5 (x2), S6 (x1), S7 (x1), S8 (x1), S10 (x2) |
| MED      | 11    | S1 (x1), S2 (x2), S3 (x2), S4 (x1), S5 (x1), S6 (x1), S7 (x1), S8 (x1), S9 (x1), S10 (x1) |
| LOW      | 16    | S1 (x1), S2 (x2), S3 (x1), S4 (x1), S5 (x1), S6 (x2), S7 (x2), S8 (x2), S9 (x3), S10 (x2) |
| TOTAL    | 37    | across all 10 systems |

Systems with zero findings: none.

Dominant pattern across HIGH findings: the codebase DOES the work
(audit checks, cache hits, merge-not-clobber installs, 5-dimension
survival scoring, family-diverse Trident picks) but undersells it. The
hero-line asset in `mcp-server/src/hero-line.js` proves the team can
write Sutherland-grade copy. Action: promote that renderer's posture to
every user-facing surface. Close HIGH findings by pulling cumulative
value lines into session-start banner, `/status`, workflow step closers,
MCP tool descriptions, installer post-run summary, and the first screen
of README.
