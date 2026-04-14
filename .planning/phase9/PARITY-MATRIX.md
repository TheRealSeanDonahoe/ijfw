# IJFW Platform Parity Matrix

**Stamp:** 2026-04-14
**Source:** inventory of `claude/`, `codex/`, `gemini/`, `cursor/`, `windsurf/`, `copilot/`, `universal/` packages at Phase 9 (post-P8 + post-P9 scope).

## Legend

- `✓ native` — capability implemented directly inside the platform's own plugin mechanism (hooks, commands, skills)
- `✓ via MCP` — delivered by the shared `mcp-server` which the platform registers and calls
- `✓ via CLI` — delivered by `ijfw cross` binary, requires `ijfw` on PATH after `scripts/install.sh` or `npm link`
- `△ partial` — some aspects work; others fall back to a lesser experience
- `—` — not supported, with a short "why by design" note
- **verification:** `C` = config-verified (files inspected + JSON/TOML parses); `L` = live-tested (actually invoked end-to-end in this repo)

## Matrix

| Capability | Claude | Codex | Gemini | Cursor | Windsurf | Copilot | Universal |
|---|---|---|---|---|---|---|---|
| Memory recall (prelude on session start) | ✓ native (hook) `L` | △ partial (manual via instructions) `C` | ✓ via MCP `C` | ✓ via MCP `C` | ✓ via MCP `C` | ✓ via MCP `C` | — (paste rules only) |
| Memory store (durable write) | ✓ native (auto-memorize skill) `L` | △ partial (instructions reference `ijfw_memory_store` tool; depends on Codex MCP activation) `C` | ✓ via MCP `C` | ✓ via MCP `C` | ✓ via MCP `C` | ✓ via MCP `C` | — |
| Memory search (BM25 warm layer) | ✓ via MCP `L` | △ partial (same MCP caveat as above) `C` | ✓ via MCP `C` | ✓ via MCP `C` | ✓ via MCP `C` | ✓ via MCP `C` | — |
| Prompt-check (vague-prompt nudge) | ✓ native (UserPromptSubmit hook) `L` | — (Codex lacks equivalent hook) | ✓ via MCP tool call (in rules) `C` | ✓ via MCP tool call (in rules) `C` | ✓ via MCP tool call (in rules) `C` | ✓ via MCP tool call (in rules) `C` | — |
| Cross-audit / research / critique CLI | ✓ via CLI + native commands `L` | ✓ via CLI (if ijfw on PATH) `C` | ✓ via CLI (if on PATH) `C` | ✓ via CLI (if on PATH) `C` | ✓ via CLI (if on PATH) `C` | ✓ via CLI (if on PATH) `C` | ✓ via CLI (if on PATH) `C` |
| Auto-critique on commit | ✓ native (/ijfw-commit skill + post-commit hook via install.sh) `L` | ✓ via install.sh --post-commit-hook `C` | ✓ via install.sh --post-commit-hook `C` | ✓ via install.sh --post-commit-hook `C` | ✓ via install.sh --post-commit-hook `C` | ✓ via install.sh --post-commit-hook `C` | ✓ via install.sh --post-commit-hook `C` |
| Intent routing (deterministic keyword → skill) | ✓ native (pre-prompt hook) `L` | — (Codex no hook surface) | — (Gemini CLI no equivalent hook) | — (Cursor uses rules text) | — | — | — |
| Combo policy visibility (trident-combo doc) | ✓ via `.planning/policies/` doc + memory `L` | ✓ via `.planning/policies/` doc `C` | ✓ via `.planning/policies/` doc `C` | ✓ via `.planning/policies/` doc `C` | ✓ via `.planning/policies/` doc `C` | ✓ via `.planning/policies/` doc `C` | ✓ via `.planning/policies/` doc `C` |

## By-platform summary

**Claude (flagship):** every capability native or via MCP; 100% `L` live-tested in this repo.

**Codex:** MCP activation is the key gap — `codex/.codex/config.toml` contains an `[mcp_servers]` entry registering the IJFW MCP server, but `codex/.codex/instructions.md` warns "no MCP available in codex/" and uses manual prelude calls. Reality depends on which Codex CLI version the user runs. For the CLI tour (`ijfw cross`) it's fully parity-capable.

**Gemini + Cursor + Windsurf + Copilot:** MCP-first platforms with rules files referencing `ijfw_prompt_check` / `ijfw_memory_search` / `ijfw_memory_recall` MCP tool calls. Intent routing NOT present because these platforms don't expose a deterministic pre-prompt hook API — rules text plus MCP is the closest substitute.

**Universal:** paste-anywhere 19-line rules file. Deliberately minimal — intended for AI platforms not in the per-package roster. Gets cross-audit CLI parity, nothing else.

## Closing gaps (none in P9 scope)

No `—` cells represent gaps we can close in P9. Each `—` is "by design":
- Codex intent routing: Codex CLI doesn't expose a UserPromptSubmit equivalent. Pursuing this would require reverse-engineering Codex's CLI or shipping a shell wrapper — out of scope.
- Universal memory/prompt-check: Universal is the "paste-this-anywhere" one-pager by design. Adding MCP to it defeats the purpose. Users who want full IJFW install the per-platform package.

## Verification audit log

- Live-tested `L` cells: verified by direct invocation from this repo this session.
- Config-verified `C` cells: verified by file inspection + JSON/TOML parse validation via `scripts/check-all.sh`.
- To upgrade a `C` cell to `L`, run the capability end-to-end inside the target IDE and document the invocation chain in a follow-up PR.

## Notes for future work (not P9)

- Codex MCP activation: audit whether recent Codex CLI versions actually load MCP servers from `config.toml`. If yes, upgrade Codex memory cells from `△ partial` to `✓ via MCP`. If no, document the limitation in `codex/.codex/instructions.md`.
- Live-test upgrade campaign: walk each of the 6 non-Claude platforms, open the IDE, run the flagship capability, record a short evidence note in `.planning/polish/platform-live-tests.md`. This is qualitative work best done with a user.
