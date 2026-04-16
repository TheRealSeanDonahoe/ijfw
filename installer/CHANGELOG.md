# Changelog -- @ijfw/install

## [1.0.2] -- 2026-04-16

### Fixed

- `scripts/install.sh` crashed on macOS and Linux with
  `APPDATA: unbound variable` under `set -u` at the Copilot detection
  step. `$APPDATA` is a Windows-only env var. Fixed to `${APPDATA:-}`.
  Shipped versions v1.0.0 and v1.0.1 exhibit this crash on any non-Windows
  machine; both are now deprecated. Use v1.0.2 or later.

## [1.0.1] -- 2026-04-16

### Fixed

- `bin` field stripped on v1.0.0 publish because `dist/install.js` and
  `dist/uninstall.js` were shipped without the executable bit. `npm install
  -g @ijfw/install@1.0.0` installed the package but produced no
  `ijfw-install` command. v1.0.1 restores the bin entries, adds
  `chmod +x dist/*.js` to the build step, and adds a `prepublishOnly`
  hook so this cannot regress. v1.0.0 has been deprecated on npm.

## [1.0.0] -- 2026-04-15

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
