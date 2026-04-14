# @ijfw/install

One-command installer for [IJFW](https://github.com/TradeCanyon/ijfw) — the AI
efficiency layer for Claude Code, Codex, Gemini, Cursor, Windsurf, Copilot.

## Install

```bash
npx @ijfw/install
```

Default: clones to `~/.ijfw`, runs `scripts/install.sh`, registers the IJFW
marketplace in `~/.claude/settings.json`.

### Options

| Flag | Default | Notes |
|------|---------|-------|
| `--dir <path>` | `$IJFW_HOME` or `~/.ijfw` | Install location |
| `--branch <name>` | `main` | Git branch to clone |
| `--no-marketplace` | off | Skip settings.json edits |
| `--yes` | off | Non-interactive |

### Uninstall

```bash
npx @ijfw/install uninstall        # preserves ~/.ijfw/memory/
npx @ijfw/install uninstall --purge # removes memory too
```

Memory is preserved across re-runs by default.

## Preflight

Runs `node ≥18`, `git`, `bash`. On native Windows, recommends WSL.

## Build (contributors)

```bash
cd installer
npm install
npm run build   # outputs dist/install.js + dist/uninstall.js
npm test
npm run pack:check
```

Tarball target: **<100 KB**.
