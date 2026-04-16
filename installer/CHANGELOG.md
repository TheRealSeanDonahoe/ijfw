# Changelog -- @ijfw/install

## [1.1.0-rc.1] -- 2026-04-16

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

### Tests

- 404 passing (up from 352). Includes 10 new dashboard-server tests and 36 new observation tests.

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
