# IJFW v1.1 -- Codex + Gemini deep parity

## Brief

Bring Codex CLI and Gemini CLI from "MCP server + rules file baseline" to
**native-depth parity** with the Claude Code plugin. After v1.1, the IJFW
launch story changes from "works on six platforms" to "**native plugin on
Claude Code, native plugin-format on Codex, native extension on Gemini --
same skills, same memory, same workflow, three native homes**."

## Why now

Both platforms have caught up to Claude Code in 2026:

- **Codex** has SKILL.md skills, 7 hook events, native plugin marketplace
  (launched March 2026), git-worktree subagent isolation, persistent
  memory system, multi-IDE config sharing, OpenTelemetry built-in.
- **Gemini** has 11 hook events (including PreCompress that mirrors
  Claude PreCompact), TOML slash commands with `{{args}}` interpolation,
  native policy engine, hub-and-spoke + Remote subagents, GEMINI.md
  hierarchy, checkpointing with shadow Git repo, extension gallery with
  URL-based install.

Skipping this delay would leave IJFW positioned as a Claude plugin instead
of a cross-platform AI-coding standard. The window is now.

## Scope

### In scope (v1.1)

1. **Shared skills source** -- single canonical SKILL.md per skill, used
   verbatim where possible across all three platforms.
2. **Codex packager** -- ships `.codex-plugin/plugin.json` manifest,
   `.codex/skills/{name}/SKILL.md` bundle, `.codex/hooks.json` declarative
   + hook scripts, MCP server registration.
3. **Gemini packager** -- ships `gemini-extension.json` manifest,
   `extensions/ijfw/skills/`, `commands/*.toml`, `hooks/hooks.json`,
   `agents/`, `policies/ijfw.toml`, MCP registration.
4. **Installer updates** -- `scripts/install.sh` + `installer/src/install.ps1`
   drop the new bundles cleanly, merge-safe.
5. **Doctor parity** -- `ijfw doctor` reports per-platform integration depth.
6. **Marketplace-ready packaging** -- formats and metadata correct so
   submission to OpenAI's Plugin Directory and Gemini's Extension Gallery
   is a one-step action when we choose to do it.
7. **README + CHANGELOG updates** -- parity matrix updated to reflect new
   depth.

### Out of scope (v1.1)

- Marketplace submission and review (deferred to v1.0.x or v1.2).
- Cline, OpenClaw, Qwen, Kimi, Aider integrations (separate roadmap).
- Background-task scheduling (Codex needs it, Gemini has gjob; defer until
  we know the user-need shape).
- Cursor / Windsurf / Copilot deepening beyond current MCP+rules baseline
  (no planned upgrades; they are stable enough for v1.1).

## Constraints

- Zero new runtime dependencies. Both platforms get pure-JS / pure-bash
  packagers, no node_modules expansion in installer.
- All artifacts banned-char clean (existing `scripts/check-all.sh` lint).
- Marketplace-ready format from day one (manifests valid against published
  schemas even though we are not submitting yet).
- All Claude-side parity invariants preserved: brainstorm discipline,
  one-question-at-a-time, visible artifacts, explicit user sign-off
  between phases.

## Success criteria

- A user installing on a fresh machine via `ijfw-install` gets a fully
  functional IJFW environment in Claude Code, Codex, AND Gemini -- same
  slash commands work, same memory persists, same Trident fires.
- `ijfw doctor` reports "deep" status for all three platforms.
- README parity table reads "native plugin / native skills + hooks /
  native extension" for the big three.
- 84/84 tests still green; expanded `check-all.sh` covers the new
  bundle dirs.
- Zero breaking changes for existing v1.0 users on Cursor / Windsurf /
  Copilot baseline.

## GATE V1.1-complete

- [x] Shared skill source set up; existing Claude skills moved or symlinked. (6f5a4c3 V1.1A)
- [x] Codex bundle present, manifest validates, installer drops it cleanly. (ff0fecf V1.1B)
- [x] Gemini bundle present, manifest validates, installer drops it cleanly. (bff5709 V1.1C)
- [x] Both platforms tested end-to-end against a sample prompt that
      exercises memory recall + Trident + workflow. (V1.1E: 30 smoke tests green)
- [x] Doctor output updated, README parity matrix updated. (45fef07 V1.1D / V1.1E)
- [x] Trident cross-audit on the new bundles -- zero new HIGH. (V1.1E: ASCII-clean,
      shell lint clean, no LLM calls in hooks, manifests valid, positive framing)
- [x] Suite green (84+ tests), check-all clean. (V1.1E: 352 tests, all passing)
- [x] CHANGELOG v1.1 entry written. (V1.1E)
