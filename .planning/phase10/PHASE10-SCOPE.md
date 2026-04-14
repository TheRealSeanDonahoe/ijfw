# Phase 10 — Polish pass for publish

**Theme:** "Crystal clear · professionally polished · publish-ready."
**Branch (when started):** `phase10/polish-for-publish` off `main`
**Trigger:** start when user returns from in-the-wild testing of merged P7+P8+P9.
**Pre-publish gate:** full top-to-bottom cross-audit through Krug + Sutherland + Donahoe principles before any `npm publish`.

This is the polish pass user explicitly requested before publishing. Goal: anyone picks this up and goes "well holy shit, this just made my life infinitely easier" — and never has to think about where they are in the workflow.

---

## Item 0 — Workflow clarity overhaul (FLAGSHIP)

User's clearest pain point from P7-P9 session: workflow narration was unclear, naming inconsistent (`§E` style + ad-hoc letters), step transitions silent, "where am I?" required asking. Other tools (GSD, Superpowers, Superbase) feel smoother.

**Rule lives at:** `feedback_workflow_clarity_navigation.md` (memory).

**Work:**

### 0.1 Naming convention rewrite
Adopt this hierarchy across every IJFW workflow surface:
- **Phase N** (Arabic numerals only — no `§`, no letter-of-alphabet labels)
- **Wave NA / NB / NC** (parallel-safe groups within a phase)
- **Step N.M** (atomic actionable unit, 1:1 with TaskCreate entry)
- **GATE: <name>** (audit checkpoints, never silently transitioned)
Banned chars at user-facing surfaces: `§`, weird Unicode dividers, ANSI escapes in markdown, emoji unless user asks. Use ASCII: `==`, `--`, `[ ]`, `[x]`, `>`, `|`.

Files to refactor:
- `claude/skills/ijfw-workflow/SKILL.md` — rewrite Discover/Plan/Execute/Verify/Ship phase output templates
- `claude/skills/ijfw-commit/SKILL.md` — same
- `claude/commands/cross-{audit,research,critique}.md` — unify step labels
- `claude/commands/ijfw-{plan,execute,verify,audit,ship}.md` — same
- `mcp-server/src/cross-orchestrator-cli.js` — `printFindings` and `cmdStatus` rendered as `Phase / Wave / Step` blocks

### 0.2 Mandatory narration cadence
Skill bodies (LLM-executed prose) must include explicit instructions to emit:
- **Entry per Wave:** `"Phase N / Wave NA — starting now. <one sentence what's happening>."`
- **Per Step on completion:** `"Phase N / Wave NA · Step N.M — <name> — done (<evidence>)."`
- **Wave transition:** `"Phase N / Wave NA complete. <summary>. Next: Wave NB (<what>)."`
- **Mid-step pings during long ops:** `"Phase N / Wave NA · Step N.M — <agent> in progress (~<estimate>)."`
- **"Where am I" answer:** structured one-sentence + recommended-next-action format.

### 0.3 `/ijfw-status` extension
Top line shows current Phase / Wave / Step from active state file (e.g. `.ijfw/state/current-step.json` written by workflow skill). User runs `/ijfw-status` and sees exactly where they are without parsing logs.

### 0.4 Static guard in `scripts/check-all.sh`
- Lint user-facing surfaces (`claude/commands/*.md`, `claude/skills/**/SKILL.md`) for forbidden chars: `§`, certain Unicode dividers, raw ANSI escapes.
- Lint for narration discipline: every skill body should reference the Phase/Wave/Step pattern at least once (ensures the convention isn't bypassed).

### 0.5 Comparison reference
Document what GSD `/gsd:progress`, Superpowers `executing-plans` skill, and Superbase task lists do well. IJFW must match or beat them on clarity. Add to `.planning/phase10/UX-COMPARISON.md`.

---

## Item 1 — Live-test parity matrix upgrade

Walk each non-Claude platform in its real IDE; verify every `✓ via MCP` / `✓ via CLI` cell in `.planning/phase9/PARITY-MATRIX.md` actually delivers. Upgrade `C` (config-verified) cells to `L` (live-tested) where they pass; flag actual gaps.

**Work:**
- 6 platforms × ~5 capabilities each = ~30 manual verification points.
- Best done with the user (qualitative). Produce `.planning/phase10/LIVE-TEST-RESULTS.md` with screenshots / log excerpts.
- For each gap discovered: open a follow-up task or update the matrix to `△ partial` with a clear "by design" or "Phase 11 fix" note.

---

## Item 2 — Prompt caching on cross-dispatcher templates

The `getTemplate(mode, angle)` system prompts are reused across every `runCrossOp` invocation. Anthropic's API supports prompt caching for stable system prompts.

**Work:**
- In `mcp-server/src/api-client.js` Anthropic builder, add `cache_control: {type: 'ephemeral'}` to the system prompt.
- Document in receipt: when a cache hit occurred (Anthropic returns cache stats in response).
- Measure savings on a real run before/after. If meaningful, surface in `/ijfw-status` hero line as part of the measured-Δ field.
- Do NOT add caching to OpenAI / Gemini paths — different APIs, different mechanisms; out of scope.

---

## Item 3 — Quality-of-life polish

Smaller items that contribute to the "wow" without being individually large:

- **3a — Empty-state copy review.** Every `/ijfw-*` command and CLI subcommand: re-read the empty-state message through Krug + Donahoe lens. Each one should leave the user with a clear next action ("run X next").
- **3b — Help text harmonization.** `ijfw --help`, `ijfw cross --help`, every `claude/commands/*.md` description field. Same voice, same brevity, same call-to-action structure.
- **3c — Receipts pruning.** `.ijfw/receipts/cross-runs.jsonl` grows unbounded. Add automatic prune (keep last 100 entries) on each write. Add `--purge-receipts` CLI subcommand for explicit cleanup.
- **3d — `ijfw doctor`.** New subcommand: probe roster + show which CLIs / API keys are reachable + show install-hint for missing pieces. Single-screen "is it working?" answer.
- **3e — Clean up install.sh self-run artifacts permanently.** Currently `.gitignore` protects, but `install.sh` could detect "I'm in IJFW's own repo" and skip the platform-rule writes (this is the "don't pollute your own dev tree" rule). Add a `.ijfw-source` marker file at IJFW repo root and have install.sh refuse to install onto its own source.

---

## Item 4 — Top-to-bottom cross-audit (the publish gate)

This is what the user asked for: "full top-to-bottom cross-audit through Krug + Sutherland + Donahoe principles."

**Pattern:** same 4-way Trident as P7-P9, but the target is the entire repo + all user-facing surfaces, audited through three explicit principle lenses. Three audits in parallel:

- **Krug audit:** "Don't make me think." Walks every command, every error, every empty state, every CLI flag. For each: does the user have to think? If yes, name the thought.
- **Sutherland audit:** "Smarter not cheaper, costly signals visible, perceived value." Walks every output, every receipt, every hero line. For each: where's the wow? Where's the invisible-cost-made-visible moment?
- **Donahoe audit:** "It just fucking works, anywhere, for strangers, no config." Walks every install path, every fresh-machine scenario, every platform package. For each: would a stranger get the wow on first install?

Each audit produces a structured findings JSON with rebuttal-survival ranking. Merged via `mergeResponses('critique', ...)` per the existing dispatcher. Resulting `.planning/phase10/CROSS-AUDIT-PRINCIPLES.md` is the publish gate — every HIGH must be closed before `npm publish`.

This is the formal "polish pass" gate. Pass = ship.

---

## Build order

1. **Item 0 first** — workflow clarity is the load-bearing UX rule, and Items 2-3 will benefit from clearer Phase/Wave/Step labels in their PRs.
2. **Item 3 in parallel** with Item 0 (no file overlap).
3. **Item 1** when user is available (live-testing requires real IDEs).
4. **Item 2** any time after Item 0 (uses clearer logging conventions).
5. **Item 4** LAST — must audit the polished version, not the in-progress one.
6. After Item 4 passes: `npm publish` + marketplace PR.

## Out of scope (deferred to P11+)

- Strategic positioning review (Gemini P8 critical: CI/CD-first vs in-IDE) — needs user discussion, not code.
- New-machine bootstrap dockerized test harness.
- Uninstall clean-exit dockerized test harness.
- RTK coexist live-fire test (would need an RTK install).
- Cross-project audit / search.
- Team-tier memory.

## Success criteria (publish-blocking)

- [ ] Item 0 — `/ijfw-status` shows current Phase / Wave / Step in one line. No `§` chars anywhere user-facing.
- [ ] Item 1 — every parity-matrix cell either `L` live-tested or has a clear "Phase 11" / "by design" note.
- [ ] Item 2 — Anthropic API path uses prompt caching; one receipt shows measured cache-hit savings.
- [ ] Item 3 — every empty-state message includes a clear next action; `ijfw doctor` exists; install.sh refuses to install onto IJFW's own source.
- [ ] Item 4 — Krug + Sutherland + Donahoe audits produce zero unresolved HIGH findings.
- [ ] Eat own food: `ijfw cross critique HEAD~N..HEAD` on the P10 branch itself before declaring COMPLETE (4th consecutive phase using the loop).

When all six checks pass: ready to publish.
