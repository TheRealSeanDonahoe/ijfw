# IJFW v1.1 -- Build Plan (Codex + Gemini deep parity)

5 waves, ~7 days end-to-end. Every wave commits atomically. User signs off
between waves. Marketplace-ready format throughout, submission deferred.

## Wave V1.1A -- Shared skills source restructure (~1 day)

**Goal:** one canonical SKILL.md per skill, used verbatim where possible
across Claude / Codex / Gemini packagers.

**Files to create:**
- `shared/skills/ijfw-workflow/SKILL.md` (canonical)
- `shared/skills/ijfw-handoff/SKILL.md`
- `shared/skills/ijfw-commit/SKILL.md`
- `shared/skills/ijfw-cross-audit/SKILL.md`
- `shared/skills/ijfw-recall/SKILL.md`
- `shared/skills/ijfw-compress/SKILL.md`
- `shared/skills/ijfw-team/SKILL.md`
- `shared/skills/ijfw-debug/SKILL.md`
- `shared/skills/ijfw-review/SKILL.md`
- `shared/skills/ijfw-critique/SKILL.md`
- `shared/skills/ijfw-memory-audit/SKILL.md`
- `shared/skills/ijfw-summarize/SKILL.md`
- `shared/skills/ijfw-status/SKILL.md`
- `shared/skills/ijfw-doctor/SKILL.md`
- `shared/skills/ijfw-update/SKILL.md`

**Implementation:** copy current `claude/skills/*/SKILL.md` into
`shared/skills/`, normalize the frontmatter to a cross-platform safe
subset (`name`, `description`, `model`, `context` only), preserve the
body verbatim where it is platform-neutral.

**Acceptance:** existing 84/84 tests still pass. Claude install still
works (skills are read from the same files via path indirection or copy).

## Wave V1.1B -- Codex packager (~2 days)

**Goal:** ship a marketplace-format-ready Codex plugin in `codex/`.

**Files to create:**
- `codex/.codex-plugin/plugin.json` -- manifest (name, version, description,
  author, homepage, license, marketplace-category, dependencies)
- `codex/skills/{15 skills}/SKILL.md` -- copied from `shared/skills/`,
  Codex-tailored frontmatter
- `codex/.codex/hooks.json` -- declarative hook registration (declares
  which scripts handle which of the 7 events)
- `codex/.codex/hooks/{6 scripts}` -- ports of `claude/hooks/scripts/*.sh`
  adapted to Codex's JSON in/out schema. PreCompact has no Codex
  equivalent; document as gap.
- `codex/.codex/config.toml` -- template MCP server registration
- `codex/.agents/plugins/marketplace.json` -- repo-tier marketplace entry

**Hook mapping (Claude -> Codex):**
- session-start.sh -> SessionStart
- session-end.sh -> Stop
- pre-prompt.sh -> UserPromptSubmit
- pre-tool-use.sh -> PreToolUse
- post-tool-use.sh -> PostToolUse
- pre-compact.sh -> (no equivalent, documented gap)

**Installer changes:** `scripts/install.sh` codex case drops the full
bundle to the project's `.codex/` dir + global `~/.codex/` skills.

**Acceptance:** running `bash scripts/install.sh codex` from a clean
project drops a working Codex plugin. `codex` invocation in that project
shows `/skills` populated with IJFW skills, hooks fire correctly.

## Wave V1.1C -- Gemini packager (~2 days)

**Goal:** ship a marketplace-format-ready Gemini extension in `gemini/`.

**Files to create:**
- `gemini/extensions/ijfw/gemini-extension.json` -- manifest with `name`,
  `version`, `description`, `mcpServers`, `excludeTools`, `contextFileName:
  "IJFW.md"`, `settings`, marketplace metadata
- `gemini/extensions/ijfw/skills/{15 skills}/SKILL.md` -- copied from
  `shared/skills/`, Gemini-tailored frontmatter
- `gemini/extensions/ijfw/commands/{15}.toml` -- TOML slash commands.
  Each contains `description` + `prompt` (with `{{args}}` interpolation)
  that route to the corresponding skill
- `gemini/extensions/ijfw/hooks/hooks.json` -- 11-event hook map. Map
  Claude PreCompact -> Gemini PreCompress (direct match). Use BeforeModel
  / AfterModel for memory-recall context injection (richer than Claude).
- `gemini/extensions/ijfw/hooks/{scripts}` -- ports of
  `claude/hooks/scripts/*.sh` adapted to Gemini's JSON in/out
- `gemini/extensions/ijfw/agents/{specialist-swarm}/*.md` -- subagent
  definitions matching Claude specialist swarm
- `gemini/extensions/ijfw/policies/ijfw.toml` -- workflow discipline as
  policy rules (e.g., deny destructive shell ops without user approval)
- `gemini/extensions/ijfw/IJFW.md` -- context file (loaded as
  contextFileName, replaces the current single-file `gemini/GEMINI.md`)

**Hook mapping (Claude -> Gemini):**
- session-start.sh -> SessionStart
- session-end.sh -> SessionEnd
- pre-prompt.sh -> BeforeAgent
- pre-tool-use.sh -> BeforeTool (or BeforeToolSelection)
- post-tool-use.sh -> AfterTool
- pre-compact.sh -> PreCompress
- (bonus) BeforeModel -> first-turn memory injection
- (bonus) AfterModel -> response auto-memorize trigger

**Installer changes:** `scripts/install.sh` gemini case drops the
extension to `~/.gemini/extensions/ijfw/`. PowerShell installer mirrors.

**Acceptance:** running `bash scripts/install.sh gemini` drops a working
extension. `gemini extensions list` shows ijfw. `/cross-audit` slash
command fires. Hooks observed in `.gemini/telemetry.log`.

## Wave V1.1D -- Installer + doctor parity (~1 day)

**Goal:** installer cleanly drops both new bundles; `ijfw doctor` reports
per-platform integration depth.

**Files to modify:**
- `scripts/install.sh` -- both codex + gemini cases drop full bundles
  (skill source -> platform target via per-platform packager logic)
- `installer/src/install.ps1` -- mirror Windows-side
- `mcp-server/src/cross-orchestrator-cli.js` cmdDoctor -- new "Integration
  depth" section per platform: native plugin (Claude), native skills + hooks
  (Codex), native extension (Gemini), MCP + rules baseline (Cursor / Windsurf
  / Copilot)
- `scripts/check-all.sh` TARGETS -- add `codex/.codex-plugin/`,
  `codex/skills/`, `gemini/extensions/ijfw/` so banned-char lint covers
  the new bundles

**Acceptance:** `bash scripts/install.sh` on a clean project drops all
six platform configs including the two new deep bundles. `ijfw doctor`
output reads correctly per platform.

## Wave V1.1E -- Tests + verify + ship (~1 day)

**Goal:** GATE V1.1 closure.

**Tasks:**
- Write per-platform smoke tests (manual or scripted) that exercise:
  workflow skill invocation, memory recall, Trident cross-audit, hook
  firing on session start/end.
- `bash scripts/check-all.sh` clean across expanded TARGETS.
- Trident cross-audit on the new bundles -- close any new HIGH inline.
- Update README parity matrix to reflect "native plugin / native skills +
  hooks / native extension" depth for the big three.
- Update CHANGELOG with v1.1 entry.
- Tag `v1.1.0`, push, merge to main.

**Acceptance:** GATE V1.1-complete checklist in SCOPE.md fully checked.

## Out-of-band (do not run inline with waves)

- **OpenAI Plugin Directory submission** -- when product is ready, run
  `codex plugins submit` flow with the marketplace.json metadata already
  in place. Reviewer process at OpenAI's pace.
- **Gemini Extension Gallery submission** -- PR to gemini-cli-extensions
  org or self-host the URL for `gemini extensions install` distribution.

## Locked decisions (2026-04-16, signed off by user)

1. **Skill naming:** keep `ijfw-` prefix on every platform. Consistent
   naming across the big three; users who jump tools see the same names.
2. **Repo structure:** replace existing single rules files. New bundles
   are the source of truth; old `codex/.codex/instructions.md` and
   `gemini/GEMINI.md` are absorbed into the bundle's context file
   (`IJFW.md` / equivalent) so there is one path, not two.
3. **Parity-gap handling:** build a PreCompact workaround for Codex.
   Approach: poll context-window utilization in a long-running hook
   (Stop or PostToolUse) and trigger compress when threshold crossed.
   Documented as best-effort but functional. If the workaround proves
   brittle in V1.1B, fall back to documented gap and ship.
4. **Cross-platform parity is the floor; Gemini bonuses are additive
   when they cost nothing to add:** ship the policy engine + checkpointing
   integration as Gemini extras since the surfaces exist natively. Do
   NOT withhold core functionality from other platforms to maintain
   artificial parity. Other platforms get the same workflow discipline
   via their own native primitives where available.
