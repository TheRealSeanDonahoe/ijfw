# Research: `npx`-runnable installer CLIs for IJFW

Target: `npx @ijfw/install` → clones repo to `~/.ijfw`, runs `scripts/install.sh` to configure 6 AI agents, registers the Claude Code marketplace. One command, cold install → working.

---

## 1. Exemplary `npx`-installed dev CLIs

**create-next-app** is the gold standard: zero runtime dependencies, sub-second cold start on warm npm cache. It bundles its deps via ncc/esbuild into a single compiled `dist/index.js`, so the published tarball is tiny and has no `dependencies:` to resolve. `bin` points at the compiled entry with a `#!/usr/bin/env node` shebang.

**shadcn** (renamed from `shadcn-ui`) uses `@antfu/ni` to detect the user's package manager and `execa` to shell out. It's not zero-dep (uses commander, prompts, execa, zod), but it compiles everything into a single esbuild bundle, so `npm i -g shadcn` pulls one file. Its `init` writes `components.json` as the idempotency anchor — rerunning the command merges rather than clobbers.

**create-vite** follows create-next-app's model almost verbatim: bundled with rollup, `bin` entry only, no `dependencies` in published package.json.

Common pattern that works:
```json
{
  "name": "@ijfw/install",
  "version": "0.3.0",
  "bin": { "ijfw-install": "./dist/index.js" },
  "files": ["dist"],
  "dependencies": {},
  "engines": { "node": ">=18" }
}
```
Everything heavy moves to `devDependencies`; the build step bundles it. This keeps the npm tarball < 200 KB and cold start < 500 ms.

## 2. Anti-patterns

- **Heavy `dependencies`** (lodash, chalk5 ESM, inquirer, ora). Every transitive require is a file read during cold start. Replace with stdlib: `util.styleText()` for color, `readline.createInterface` for prompts.
- **Unconditional interactive prompts**. Breaks CI. Always detect `process.stdout.isTTY` and `CI=true`; provide `--yes` and flag-driven equivalents for every prompt.
- **Repeat `sudo` or `chmod` requests**. Never write outside `$HOME`. `~/.ijfw` and `~/.claude` only.
- **No cleanup on cancel**. `SIGINT` handler must `rm -rf` partial clone.
- **Unchecked child process invocation**. Always use `spawn` with `{ stdio: 'inherit' }` and check exit codes; swallowed stderr is the #1 user complaint. Avoid shell-string APIs in favor of argv arrays to sidestep injection risk.
- **Pulling `@latest` with no lockfile** — a hostile npm republish runs arbitrary code. Pin transitive deps via lockfile-at-build-time and bundle.
- **Writing to cwd**. Users run `npx` from random directories; nothing should land there.

## 3. Cross-platform

The `install.sh` bash script is the chokepoint. Options:

- **Option A (recommended): POSIX-first, Windows = WSL.** Detect `process.platform === 'win32'` and refuse with a one-line message: "IJFW requires WSL on Windows — run from inside your WSL shell." This is what Homebrew, asdf, and mise do. It's honest and low-maintenance.
- **Option B: ship both.** Node installer with an `install.ps1` sibling for Windows. Doubles surface area; not worth it for Phase 3.
- **Option C: rewrite install logic in Node.** Eliminates bash entirely, works everywhere. Highest effort, but the cleanest long-term answer. Defer.

Shell detection pitfall: on Windows, `spawn('bash', …)` may resolve to `C:\Windows\System32\bash.exe` (WSL bash), which does not see Windows-side `node`. Safer: explicitly check `process.env.WSL_DISTRO_NAME` or exit on `win32`.

Path handling: use `os.homedir()` and `path.join()` everywhere. Never string-concat `~`. Shell out via `spawn('bash', [installSh], { cwd: repoDir, stdio: 'inherit' })` — prefer argv-form spawn over shell-string APIs (buffer limits + injection risk).

## 4. Claude Code marketplace registration

There is currently **no non-interactive CLI** for `/plugin marketplace add` (tracked in anthropics/claude-code issue #12999). Two supported programmatic paths:

1. **Write `~/.claude/settings.json`** with `extraKnownMarketplaces`:
```json
{
  "extraKnownMarketplaces": {
    "ijfw": {
      "source": { "source": "github", "repo": "seandonahoe/ijfw" }
    }
  },
  "enabledPlugins": {
    "ijfw-core@ijfw": true
  }
}
```
On next `claude` launch the user is prompted to trust/install. This is the documented blessed path and what org admins use.

2. **Seed `~/.claude/plugins/` directly** via `CLAUDE_CODE_PLUGIN_SEED_DIR`. Heavier, intended for container images — skip.

Our repo already has `claude/.claude-plugin/marketplace.json`. The installer should merge (not overwrite) `~/.claude/settings.json` using a JSON parse + deep-merge with key-level precedence preserving the user's existing entries. Verify with `claude --version && ls ~/.claude/plugins/known_marketplaces.json` after first launch.

## 5. Update strategy

Best-in-class (create-next-app, shadcn, biome): rerunning the command is **safe and idempotent** but does **not** auto-update unless the user pinned `@latest`. Because `npx @ijfw/install` resolves to the latest tag by default, rerunning already pulls the newest installer — the installer itself should then `git -C ~/.ijfw pull --ff-only` (or clone fresh if absent) and re-run `install.sh`. Detect existing `~/.ijfw` → print "IJFW already installed (v0.3.0). Updating…" → fast-forward pull → re-merge configs. Abort on merge conflicts with a clear message pointing at `~/.ijfw` for manual resolution. Never force-push over user-modified files inside `~/.ijfw`.

## 6. Uninstall

Ship `npx @ijfw/uninstall` as a separate bin entry in the same package (two `bin` entries, one tarball). It should: remove `~/.ijfw`, remove the marketplace entry from `~/.claude/settings.json`, remove the MCP server registration from each detected platform config (reverse of install), and print a one-line summary. Do **not** delete user memory (`~/.ijfw/memory/` if present) without `--purge`.

---

## Recommendations for IJFW

**package.json**
```json
{
  "name": "@ijfw/install",
  "version": "0.3.0",
  "type": "module",
  "bin": {
    "ijfw-install": "./dist/install.js",
    "ijfw-uninstall": "./dist/uninstall.js"
  },
  "files": ["dist", "README.md"],
  "dependencies": {},
  "devDependencies": { "esbuild": "^0.23" },
  "scripts": { "build": "esbuild src/install.js src/uninstall.js --bundle --platform=node --target=node18 --outdir=dist --format=esm" },
  "engines": { "node": ">=18" }
}
```
Zero runtime deps. Single compiled file each. Tarball < 100 KB.

**installer flow (`src/install.js`)**
1. Parse flags (`--yes`, `--dir`, `--no-marketplace`, `--branch`).
2. Preflight: check Node ≥ 18, `git` on PATH, `bash` on PATH, not Windows (unless WSL). Fail fast with actionable messages.
3. Register `SIGINT` handler that removes any partial target dir (via `fs.rm` with `recursive: true`).
4. Resolve target: `process.env.IJFW_HOME || path.join(os.homedir(), '.ijfw')`.
5. If exists: `git -C <dir> pull --ff-only`. Else: `git clone --depth 1 https://github.com/seandonahoe/ijfw <dir>`. Use `spawn` with argv array, never shell-string.
6. `spawn('bash', ['scripts/install.sh'], { cwd: dir, stdio: 'inherit', env: { ...process.env, IJFW_NONINTERACTIVE: isCI ? '1' : '' } })`. Exit on non-zero.
7. Merge-register marketplace: read `~/.claude/settings.json` (create if missing), deep-merge `extraKnownMarketplaces.ijfw` and `enabledPlugins["ijfw-core@ijfw"]`, write atomically (`fs.writeFileSync` to `.tmp` + `rename`).
8. Print positive-framed summary (per IJFW rule): "IJFW installed — 6 agents configured, marketplace registered. Launch any agent to see it work."
9. Exit 0.

**Error handling:** every `spawn`/`fs` call wrapped; on failure print the command that failed, its stderr tail, and the recovery hint. Never stack-trace at users.

**Cross-platform stance:** POSIX-first. Windows users get a one-line "run from WSL" message. Revisit in a later phase if demand materializes.

**Marketplace approach:** JSON-merge into `~/.claude/settings.json`. Verify with `claude plugin list` (once Anthropic ships the non-interactive CLI tracked in #12999, switch to it — until then, settings.json is the supported path).

**Update + uninstall stance:** Rerun is safe + idempotent, does fast-forward git pull. Separate `ijfw-uninstall` bin reverses config changes and removes `~/.ijfw`; keeps `memory/` unless `--purge`.

---

Sources:
- [create-next-app — npm](https://www.npmjs.com/package/create-next-app)
- [shadcn CLI docs](https://ui.shadcn.com/docs/cli)
- [shadcn CLI codebase analysis — dev.to](https://dev.to/ramunarasinga/shadcn-uiui-codebase-analysis-how-does-shadcn-ui-cli-work-part-30-1564)
- [Create and distribute a plugin marketplace — code.claude.com](https://code.claude.com/docs/en/plugin-marketplaces)
- [Add CLI subcommands for programmatic plugin management — anthropics/claude-code#12999](https://github.com/anthropics/claude-code/issues/12999)
- [Node.js dependency sprawl — Vectorlane, Medium 2026](https://medium.com/@jickpatel611/node-dependency-sprawl-9-rules-for-safer-installs-209dac4327f0)
- [ShellJS — npm](https://www.npmjs.com/package/shelljs)
- [pnpm/WSL bash resolution bug — openclaw#26065](https://github.com/openclaw/openclaw/issues/26065)
- [create-react-app uninstall guidance — facebook/create-react-app#8097](https://github.com/facebook/create-react-app/issues/8097)
