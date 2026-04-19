# Changelog -- @ijfw/install

## [1.1.1] -- 2026-04-19

Docs and discoverability.

- New `ijfw help` command. Pages the full guide in your terminal (less -R fallback), or opens a rendered browser tab with `ijfw help --browser`.
- Ships `docs/GUIDE.md` inside the npm tarball: Part 1 quickstart with three 90-second wins, Part 2 command / skill / workflow reference, plus FAQ and troubleshooting.
- Browser render is pre-generated server-side via marked. No client-side script, no XSS surface. GitHub dark CSS, local assets copied to `~/.ijfw/guide/`.
- Claude Code slash command: `/ijfw-help`.

## [1.1.0] -- 2026-04-19

Public launch. One install, every AI coding agent, zero config.

### Cross-platform install verified

- macOS (Homebrew node)
- Linux (apt node) on a fresh hostkey VM
- Windows (Git Bash with Git for Windows)

### Unified `ijfw` CLI

One dispatcher, one source of truth:

- `ijfw install` -- install or re-install IJFW into every detected agent
- `ijfw uninstall` (alias `ijfw off`) -- revert, preserving memory by default
- `ijfw preflight` -- 11-gate quality pipeline, blocking + advisory
- `ijfw dashboard start|stop|status` -- local dashboard, zero deps
- `ijfw doctor` -- CLI and API-key reachability with literal fix commands
- `ijfw status` -- hero line, recent activity, cache savings
- `ijfw update` -- pull latest, reinstall merge-safely
- `ijfw cross audit|research|critique|project-audit` -- multi-AI adversarial review
- `ijfw import claude-mem [--all]` -- absorb existing claude-mem memory, per-project routing
- `ijfw receipt last` -- shareable, redacted block from the last Trident run

### Installer hardening

- Plugin cache invalidation on every install (fixes stale `.mcp.json`)
- Plugin source + `mcp-server` sibling-link auto-creation (POSIX) or copy (Windows)
- `server.js` falls back to HOME when CWD is unwritable -- no stderr spam during MCP handshake
- `.mcp.json` patched with absolute node + server.js paths at install time
- `install.ps1` invokes the same `install.sh` via bash.exe -- one code path, three platforms
- Post-install verification gates: plugin manifest, sibling link, MCP handshake, settings.json registration, CLI wiring. Exits non-zero if any gate fails.

### claude-mem migration

- `ijfw import claude-mem --all` auto-discovers projects from claude-mem's `project` column, matches to on-disk locations via `~/.claude/projects` and common dev parents, routes each project's entries into its own `.ijfw/memory/`.
- Schema introspection (PRAGMA table_info) tolerates claude-mem version drift.
- Idempotent -- safe to rerun.

### Publish

```bash
cd installer && npm publish --access public
```

---

## [1.1.0-rc.1] -- 2026-04-16 (pre-1.0 internal release candidate, superseded by 1.0.0)

Release candidate. Soak 24h before stable 1.1.0.

### New verbs on the `ijfw` binary

- `ijfw preflight` -- 11-gate blocking quality pipeline. Replaces ad-hoc manual checks before publish.
- `ijfw dashboard start|stop|status` -- local SSE dashboard on 127.0.0.1:37891, zero deps, single-file HTML client.

### Preflight highlights

- Gates: shellcheck, oxlint, eslint-security, PSScriptAnalyzer (CI Windows only), publint, gitleaks, audit-ci, knip, license-check, pack-smoke, upgrade-smoke.
- Blocking gates exit 1 on fail. Advisory gates warn only. Missing tools skip gracefully with install hint.
- `prepublishOnly` now runs preflight: no tag can publish with a blocking gate open.

### Dashboard highlights

- Observation ledger at `~/.ijfw/observations.jsonl` fed by PostToolUse hooks on Claude, Codex, and Gemini.
- SSE live feed delivers new observations within ~150ms of ledger append.
- Localhost-only (127.0.0.1); non-loopback requests receive 403.
- Zero runtime dependencies. `npm ls --production`: 0 entries.

### Unified cockpit: costs + savings + memory (Waves H + I)

- Hero bar shows live Today / 7d spend and a savings bubble (cache, memory, terse, trident savings totals).
- New endpoints: `/api/cost/today`, `/api/cost/period`, `/api/cost/history`, `/api/memory`, `/api/memory/search`, `/api/memory/recall-stats`. All localhost-guarded.
- Memory rail lists all `.ijfw/memory/` files with recall count badges and full-text BM25 search.
- Path traversal fix on `/api/memory/file`: uses `resolve()` before prefix check.
- Credit: cost tracking adapted from CodeBurn (AgentSeal, MIT) and ccusage (ryoppippi, MIT).

### Tests

- 392 passing. Cost and memory module tests included in the mcp-server suite.

Full project changelog at <https://github.com/TheRealSeanDonahoe/ijfw/blob/main/CHANGELOG.md>.

## [1.0.0] -- 2026-04-17

First stable release. One-command installer configures IJFW across six AI
coding agents (Claude Code, Codex, Gemini CLI, Cursor, Windsurf, Copilot).

### Highlights

- Cross-platform: bash installer for macOS/Linux/WSL, PowerShell installer
  for Windows (PS 5.1+, uses Git Bash under the hood -- no WSL required).
- Merge-safe: backs up existing platform configs before modifying, never
  clobbers user MCP servers or model preferences.
- Pre-staging: configures every supported platform even if only a subset
  is installed; the rest auto-activate the moment they are installed.
- Graceful fallbacks: state-machine JSONC parser for the Claude settings
  merge; on parse failure, backs up the file and prints the manual
  `/plugin marketplace add` + `/plugin install ijfw` commands.
- Polished output: ANSI-colored boxed banner, Live-now / Standing-by
  summary, full-log redirection to `~/.ijfw/install.log`.
- Zero runtime dependencies; 4 KB tarball.

Full project changelog at <https://github.com/TheRealSeanDonahoe/ijfw/blob/main/CHANGELOG.md>.
