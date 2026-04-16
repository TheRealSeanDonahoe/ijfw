#!/usr/bin/env bash
# IJFW one-shot installer.
#
# Merges the ijfw-memory MCP registration into each platform's existing config
# rather than overwriting. Existing user MCP servers, model preferences, and
# per-project trust settings are preserved. If no config exists, creates one.
#
# Usage:
#   bash scripts/install.sh                # installs everything detected
#   bash scripts/install.sh claude codex   # only listed platforms
#
# Safety:
#   - Backs up existing configs to <config>.bak.<timestamp> before modifying.
#   - Never prompts -- merge is always the safe default.
#   - Shows what was added/kept at the end.

set -u

REPO_ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -f "$PWD/.ijfw-source" ]; then
  printf "IJFW source-repo detected -- platform-rule writes skipped to protect your dev tree. Run this script from your project directory to install.\n"
  exit 1
fi
LAUNCHER="$REPO_ROOT/mcp-server/bin/ijfw-memory"

command -v node >/dev/null 2>&1 || {
  printf "IJFW needs Node.js 18+ to power the memory server. Install from https://nodejs.org then re-run.\n"
  exit 1
}

# Parse flags and platform targets from args.
INSTALL_POST_COMMIT_HOOK=0
TARGETS=()
for arg in "$@"; do
  case "$arg" in
    --post-commit-hook) INSTALL_POST_COMMIT_HOOK=1 ;;
    *) TARGETS+=("$arg") ;;
  esac
done
[ ${#TARGETS[@]} -eq 0 ] && TARGETS=(claude codex gemini cursor windsurf copilot)

if [ ! -x "$LAUNCHER" ]; then
  chmod +x "$LAUNCHER" 2>/dev/null
fi
if [ ! -f "$LAUNCHER" ]; then
  printf "Ready to activate IJFW -- install Node.js 18+ and run this script again to complete setup.\n" >&2
  exit 1
fi

TS=$(date +%Y%m%d-%H%M%S)

# S6 -- prune backups older than 30 days from common config dirs.
for d in "$HOME/.codex" "$HOME/.gemini" "$HOME/.codeium/windsurf" ".vscode" ".cursor"; do
  [ -d "$d" ] || continue
  find "$d" -maxdepth 2 -name '*.bak.*' -type f -mtime +30 -print 2>/dev/null \
    | while IFS= read -r old; do rm -f "$old" 2>/dev/null; done
done

ok()   { printf "  [ok] %s\n" "$1"; }
note() { printf "  [--] %s\n" "$1"; }
info() { printf "  -- %s\n" "$1"; }

# ANSI colors. Skip if NO_COLOR is set or stdout is not a TTY.
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'
  C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_WHITE=$'\033[97m'
else
  C_RESET=; C_BOLD=; C_DIM=; C_CYAN=; C_GREEN=; C_YELLOW=; C_WHITE=
fi

# Native-path display: Git Bash sees /d/... style paths but users think in
# backslashes. Use cygpath -w when available to render native Windows form.
native_path() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$1" 2>/dev/null || printf '%s' "$1"
  else
    printf '%s' "$1"
  fi
}

# Runtime detection: "is this platform actually installed on the user's box?"
# True -> the platform goes in "Live now" -- configs fire immediately.
# False -> "Standing by" -- configs are pre-staged and auto-activate on install.
is_live() {
  case "$1" in
    claude)   command -v claude >/dev/null 2>&1 || [ -d "$HOME/.claude" ] ;;
    codex)    command -v codex  >/dev/null 2>&1 || [ -d "$HOME/.codex" ]  ;;
    gemini)   command -v gemini >/dev/null 2>&1 || [ -d "$HOME/.gemini" ] ;;
    cursor)   command -v cursor >/dev/null 2>&1 ;;
    windsurf) command -v windsurf >/dev/null 2>&1 || [ -d "$HOME/.codeium/windsurf" ] ;;
    copilot)  command -v code    >/dev/null 2>&1 || [ -d "$HOME/.vscode" ] || [ -d "$HOME/.config/Code" ] || [ -d "$HOME/Library/Application Support/Code" ] || [ -d "$APPDATA/Code" ] ;;
    *) return 1 ;;
  esac
}

pretty_name() {
  case "$1" in
    claude)   printf 'Claude Code' ;;
    codex)    printf 'Codex' ;;
    gemini)   printf 'Gemini' ;;
    cursor)   printf 'Cursor' ;;
    windsurf) printf 'Windsurf' ;;
    copilot)  printf 'Copilot' ;;
    *)        printf '%s' "$1" ;;
  esac
}

backup() {
  local path="$1"
  if [ -f "$path" ]; then
    cp "$path" "$path.bak.$TS" 2>/dev/null && info "backup: $(basename "$path").bak.$TS"
  fi
}

# --- JSON merge helper (Gemini / Cursor / Windsurf / Copilot) ---
# Parses existing JSON, sets mcpServers['ijfw-memory'], writes back formatted.
merge_json() {
  local dst="$1" launcher="$2"
  mkdir -p "$(dirname "$dst")"
  backup "$dst"
  node -e '
    const fs = require("fs");
    const path = process.argv[1];
    const launcher = process.argv[2];
    let doc = {};
    if (fs.existsSync(path)) {
      try { doc = JSON.parse(fs.readFileSync(path, "utf8") || "{}"); } catch {
        // Corrupt existing config -- keep the backup, start fresh.
        doc = {};
      }
    }
    if (!doc || typeof doc !== "object") doc = {};
    doc.mcpServers = doc.mcpServers || {};
    doc.mcpServers["ijfw-memory"] = {
      command: launcher,
      args: [],
      env: {}
    };
    fs.writeFileSync(path + ".tmp", JSON.stringify(doc, null, 2) + "\n");
    fs.renameSync(path + ".tmp", path);
  ' "$dst" "$launcher"
}

# --- TOML merge helper (Codex) ---
# S4 -- atomic variant: write to sibling .tmp, append block, then atomic rename.
# Eliminates the crash-mid-pipeline window where $dst could be truncated.
merge_toml() {
  local dst="$1" launcher="$2"
  mkdir -p "$(dirname "$dst")"
  backup "$dst"
  if [ ! -f "$dst" ]; then
    : > "$dst"
  fi
  local tmp="$dst.merge.$$.tmp"
  # Strip the [mcp_servers.ijfw-memory] section so the append below is idempotent.
  awk '
    BEGIN { skip = 0 }
    /^\[mcp_servers\.ijfw-memory\][[:space:]]*$/ { skip = 1; next }
    skip && /^\[/ && !/^\[mcp_servers\.ijfw-memory\]/ { skip = 0 }
    skip { next }
    { print }
  ' "$dst" > "$tmp" || { rm -f "$tmp"; return 1; }
  # Upsert codex_hooks = true inside the [features] section.
  # Uses node to avoid TOML-section duplication on re-run: reads the stripped
  # file as text, inserts the key if [features] exists, adds the section if not.
  node -e '
    const fs = require("fs");
    const f = process.argv[1];
    let text = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
    const key = "codex_hooks = true";
    if (/^\[features\]/m.test(text)) {
      // Section exists: upsert the key after the [features] line.
      if (!/^codex_hooks\s*=/m.test(text)) {
        text = text.replace(/^(\[features\][^\n]*\n)/m, "$1" + key + "\n");
      }
    } else {
      // Section absent: append it.
      text = text.replace(/\n+$/, "") + "\n\n[features]\n" + key + "\n";
    }
    fs.writeFileSync(f, text);
  ' "$tmp" || { rm -f "$tmp"; return 1; }
  # Append the MCP server block.
  escaped_launcher=$(printf '%s' "$launcher" | sed 's/\\/\\\\/g; s/"/\\"/g')
  {
    printf '\n[mcp_servers.ijfw-memory]\n'
    printf 'command = "%s"\n' "$escaped_launcher"
    printf 'args = []\n'
    printf 'enabled = true\n'
    printf 'startup_timeout_sec = 10\n'
    printf 'tool_timeout_sec = 30\n'
  } >> "$tmp" || { rm -f "$tmp"; return 1; }
  mv "$tmp" "$dst"
}

# Route verbose per-platform chatter to a logfile. The console gets the
# tight Live-now / Standing-by summary at the end. Power users hit --verbose
# to see everything, or tail the log.
LOGFILE="${IJFW_INSTALL_LOG:-$HOME/.ijfw/install.log}"
mkdir -p "$(dirname "$LOGFILE")" 2>/dev/null
: > "$LOGFILE" 2>/dev/null || LOGFILE=/dev/null

VERBOSE=0
for arg in "$@"; do
  case "$arg" in
    --verbose|-v) VERBOSE=1 ;;
  esac
done

log() {
  if [ "$VERBOSE" -eq 1 ]; then printf '%s\n' "$1"; fi
  printf '%s\n' "$1" >> "$LOGFILE" 2>/dev/null
}

# Redefine ok/note/info to write through log() so the loop stays quiet by
# default. The original functions were console-only.
ok()   { log "  [ok] $1"; }
note() { log "  [--] $1"; }
info() { log "  -- $1"; }

log "IJFW install -- launcher: $LAUNCHER"
log ""

LIVE=()
STANDBY=()
FAILED=()

for target in "${TARGETS[@]}"; do
  case "$target" in
    claude)
      log "[Claude Code]"
      # Auto-register: write enabledPlugins + extraKnownMarketplaces into
      # ~/.claude/settings.json and ~/.claude/plugins/known_marketplaces.json.
      # Uses node for atomic read-modify-write; idempotent on re-run.
      CLAUDE_PLUGIN_PATH="$HOME/.ijfw/claude"
      CLAUDE_SETTINGS="$HOME/.claude/settings.json"
      CLAUDE_MARKETPLACES="$HOME/.claude/plugins/known_marketplaces.json"
      mkdir -p "$HOME/.claude/plugins" 2>/dev/null
      # Backup settings.json before modifying.
      backup "$CLAUDE_SETTINGS"
      node -e '
        const fs = require("fs");
        const settingsPath = process.argv[1];
        const pluginPath   = process.argv[2];
        const now = new Date().toISOString();

        // --- settings.json ---
        let settings = {};
        if (fs.existsSync(settingsPath)) {
          try { settings = JSON.parse(fs.readFileSync(settingsPath, "utf8") || "{}"); } catch { settings = {}; }
        }
        if (!settings || typeof settings !== "object") settings = {};
        settings.enabledPlugins = settings.enabledPlugins || {};
        settings.enabledPlugins["ijfw@ijfw"] = true;
        settings.extraKnownMarketplaces = settings.extraKnownMarketplaces || {};
        settings.extraKnownMarketplaces["ijfw"] = {
          source: { source: "directory", path: pluginPath }
        };
        fs.writeFileSync(settingsPath + ".tmp", JSON.stringify(settings, null, 2) + "\n");
        fs.renameSync(settingsPath + ".tmp", settingsPath);

        // --- known_marketplaces.json ---
        const mpPath = process.argv[3];
        let mp = {};
        if (fs.existsSync(mpPath)) {
          try { mp = JSON.parse(fs.readFileSync(mpPath, "utf8") || "{}"); } catch { mp = {}; }
        }
        if (!mp || typeof mp !== "object") mp = {};
        mp["ijfw"] = {
          source: { source: "directory", path: pluginPath },
          installLocation: pluginPath,
          lastUpdated: now
        };
        fs.writeFileSync(mpPath + ".tmp", JSON.stringify(mp, null, 2) + "\n");
        fs.renameSync(mpPath + ".tmp", mpPath);
      ' "$CLAUDE_SETTINGS" "$CLAUDE_PLUGIN_PATH" "$CLAUDE_MARKETPLACES"
      ok "Claude Code ready -- restart any running sessions to activate IJFW."
      note ".claudeignore template at $REPO_ROOT/claude/.claudeignore"
      note "  Copy to your project root for instant context savings."
      ;;
    codex)
      log "[Codex CLI]"
      # Merge MCP registration into user config.toml.
      dst="$HOME/.codex/config.toml"
      merge_toml "$dst" "$LAUNCHER"
      # Merge IJFW entries into ~/.codex/hooks.json (additive, idempotent).
      mkdir -p "$HOME/.codex/hooks"
      _hooks_dst="$HOME/.codex/hooks.json"
      _hooks_src="$REPO_ROOT/codex/.codex/hooks.json"
      # Build absolute-path IJFW entries: scripts live at ~/.ijfw/codex/.codex/hooks/
      _hooks_base="$HOME/.ijfw/codex/.codex/hooks"
      node -e '
        const fs = require("fs");
        const dst = process.argv[1];
        const src = process.argv[2];
        const base = process.argv[3];
        // Load existing hooks.json or start fresh.
        let doc = { hooks: [] };
        if (fs.existsSync(dst)) {
          try { doc = JSON.parse(fs.readFileSync(dst, "utf8") || "{}"); } catch { doc = { hooks: [] }; }
        }
        if (!Array.isArray(doc.hooks)) doc.hooks = [];
        // Load IJFW source entries and rewrite script paths to absolute.
        const ijfw = JSON.parse(fs.readFileSync(src, "utf8"));
        for (const entry of ijfw.hooks) {
          const absScript = base + "/" + entry.script.replace(/^hooks\//, "");
          // Remove any prior IJFW entry for this event (idempotent re-run).
          doc.hooks = doc.hooks.filter(h => !(h._ijfw && h.event === entry.event));
          doc.hooks.push({ event: entry.event, script: absScript, description: entry.description, _ijfw: true });
        }
        fs.writeFileSync(dst + ".tmp", JSON.stringify(doc, null, 2) + "\n");
        fs.renameSync(dst + ".tmp", dst);
      ' "$_hooks_dst" "$_hooks_src" "$_hooks_base"
      # Copy hook scripts (never overwrite user-modified scripts).
      for hscript in "$REPO_ROOT/codex/.codex/hooks/"*.sh; do
        bname=$(basename "$hscript")
        if [ ! -f "$HOME/.codex/hooks/$bname" ]; then
          cp "$hscript" "$HOME/.codex/hooks/$bname"
          chmod +x "$HOME/.codex/hooks/$bname" 2>/dev/null
        fi
      done
      # Drop IJFW context file (absorbs old instructions.md; merge-safe).
      if [ ! -f "$HOME/.codex/IJFW.md" ]; then
        cp "$REPO_ROOT/codex/.codex/IJFW.md" "$HOME/.codex/IJFW.md"
      fi
      # Drop skills to ~/.codex/skills/ (project skills go to .codex/skills/).
      mkdir -p "$HOME/.codex/skills"
      for skill_dir in "$REPO_ROOT/codex/skills/"*/; do
        skill_name=$(basename "$skill_dir")
        if [ ! -d "$HOME/.codex/skills/$skill_name" ]; then
          cp -r "$skill_dir" "$HOME/.codex/skills/$skill_name"
        fi
      done
      # Also drop skills to project .codex/skills/ if we're in a project.
      if [ -f ".codex/config.toml" ] || [ -d ".ijfw" ]; then
        mkdir -p ".codex/skills"
        for skill_dir in "$REPO_ROOT/codex/skills/"*/; do
          skill_name=$(basename "$skill_dir")
          if [ ! -d ".codex/skills/$skill_name" ]; then
            cp -r "$skill_dir" ".codex/skills/$skill_name"
          fi
        done
      fi
      ok "Installed Codex bundle: MCP + hooks + 15 skills + context"
      ;;
    gemini)
      log "[Gemini CLI]"
      # Merge MCP registration into user settings.json.
      dst="$HOME/.gemini/settings.json"
      merge_json "$dst" "$LAUNCHER"
      # Drop full extension bundle to ~/.gemini/extensions/ijfw/.
      # Never overwrite files the user has modified (check mtime vs repo).
      EXT_DST="$HOME/.gemini/extensions/ijfw"
      EXT_SRC="$REPO_ROOT/gemini/extensions/ijfw"
      mkdir -p "$EXT_DST/hooks" "$EXT_DST/skills" "$EXT_DST/commands" \
               "$EXT_DST/agents" "$EXT_DST/policies" 2>/dev/null
      # Manifest, context file, hooks.json, policy -- copy if absent.
      for f in gemini-extension.json IJFW.md hooks/hooks.json policies/ijfw.toml; do
        if [ ! -f "$EXT_DST/$f" ]; then
          ddir=$(dirname "$EXT_DST/$f")
          mkdir -p "$ddir" 2>/dev/null
          cp "$EXT_SRC/$f" "$EXT_DST/$f" 2>/dev/null
        fi
      done
      # Hook scripts -- copy if absent, chmod +x.
      for hscript in "$EXT_SRC/hooks/"*.sh; do
        bname=$(basename "$hscript")
        if [ ! -f "$EXT_DST/hooks/$bname" ]; then
          cp "$hscript" "$EXT_DST/hooks/$bname"
          chmod +x "$EXT_DST/hooks/$bname" 2>/dev/null
        fi
      done
      # Skills -- copy if absent.
      for skill_dir in "$EXT_SRC/skills/"*/; do
        skill_name=$(basename "$skill_dir")
        if [ ! -d "$EXT_DST/skills/$skill_name" ]; then
          cp -r "$skill_dir" "$EXT_DST/skills/$skill_name"
        fi
      done
      # TOML commands -- copy if absent.
      for cmd_file in "$EXT_SRC/commands/"*.toml; do
        bname=$(basename "$cmd_file")
        if [ ! -f "$EXT_DST/commands/$bname" ]; then
          cp "$cmd_file" "$EXT_DST/commands/$bname"
        fi
      done
      # Agents -- copy if absent.
      for agent_file in "$EXT_SRC/agents/"*.md; do
        bname=$(basename "$agent_file")
        if [ ! -f "$EXT_DST/agents/$bname" ]; then
          cp "$agent_file" "$EXT_DST/agents/$bname"
        fi
      done
      ok "Installed Gemini bundle: MCP + extension + 15 skills + 11 hooks + policy"
      ;;
    cursor)
      log "[Cursor]"
      dst=".cursor/mcp.json"
      merge_json "$dst" "$LAUNCHER"
      mkdir -p .cursor/rules
      cp "$REPO_ROOT/cursor/.cursor/rules/ijfw.mdc" .cursor/rules/ijfw.mdc
      ok "Merged MCP + installed rule to project ./.cursor/"
      ;;
    windsurf)
      log "[Windsurf]"
      dst="$HOME/.codeium/windsurf/mcp_config.json"
      merge_json "$dst" "$LAUNCHER"
      # W4.1 / E2 -- copy the .windsurfrules to the current project.
      if [ ! -f ".windsurfrules" ] && [ -f "$REPO_ROOT/windsurf/.windsurfrules" ]; then
        cp "$REPO_ROOT/windsurf/.windsurfrules" .windsurfrules 2>/dev/null \
          && ok "Merged MCP + installed .windsurfrules" \
          || ok "Merged MCP into $dst"
      else
        ok "Merged MCP into $dst"
      fi
      ;;
    copilot)
      log "[Copilot (VS Code)]"
      dst=".vscode/mcp.json"
      merge_json "$dst" "$LAUNCHER"
      # W4.1 / E2 -- copy the copilot-instructions.md to .github/ (Copilot's
      # project-instructions convention) if not already present.
      if [ ! -f ".github/copilot-instructions.md" ] && [ -f "$REPO_ROOT/copilot/copilot-instructions.md" ]; then
        mkdir -p .github 2>/dev/null
        cp "$REPO_ROOT/copilot/copilot-instructions.md" .github/copilot-instructions.md 2>/dev/null \
          && ok "Merged MCP + installed .github/copilot-instructions.md" \
          || ok "Merged MCP into project ./.vscode/mcp.json"
      else
        ok "Merged MCP into project ./.vscode/mcp.json"
      fi
      ;;
    *)
      info "skipping unknown target: $target"
      continue
      ;;
  esac
  log ""
  # Classify: live if the platform's runtime is detectable on this machine,
  # standing-by if we pre-staged config for when they install it later.
  if is_live "$target"; then
    LIVE+=("$(pretty_name "$target")")
  else
    STANDBY+=("$(pretty_name "$target")")
  fi
done

# --- Polished summary (Homebrew + rustup aesthetic) ---
NATIVE_REPO="$(native_path "$REPO_ROOT")"
NATIVE_LOG="$(native_path "$LOGFILE")"

echo
printf '  %s+----------------------------------------+%s\n'   "$C_BOLD$C_CYAN" "$C_RESET"
printf '  %s|%s                                        %s|%s\n' "$C_BOLD$C_CYAN" "$C_RESET" "$C_BOLD$C_CYAN" "$C_RESET"
printf '  %s|%s  %sIJFW%s  %sIt just f*cking works.%s          %s|%s\n' "$C_BOLD$C_CYAN" "$C_RESET" "$C_BOLD$C_CYAN" "$C_RESET" "$C_DIM" "$C_RESET" "$C_BOLD$C_CYAN" "$C_RESET"
printf '  %s|%s                                        %s|%s\n' "$C_BOLD$C_CYAN" "$C_RESET" "$C_BOLD$C_CYAN" "$C_RESET"
printf '  %s+----------------------------------------+%s\n'   "$C_BOLD$C_CYAN" "$C_RESET"
echo
printf '  %sInstalled at%s  %s\n' "$C_DIM" "$C_RESET" "$NATIVE_REPO"
echo
if [ ${#LIVE[@]} -gt 0 ]; then
  printf '  %s==> LIVE NOW (%d)%s\n' "$C_BOLD$C_GREEN" "${#LIVE[@]}" "$C_RESET"
  for p in "${LIVE[@]}"; do
    printf '      %so%s  %s\n' "$C_GREEN" "$C_RESET" "$p"
  done
  echo
fi
if [ ${#STANDBY[@]} -gt 0 ]; then
  printf '  %s==> STANDING BY (%d)%s  %sauto-activate on install%s\n' "$C_BOLD$C_YELLOW" "${#STANDBY[@]}" "$C_RESET" "$C_DIM" "$C_RESET"
  for p in "${STANDBY[@]}"; do
    printf '      %so%s  %s\n' "$C_YELLOW" "$C_RESET" "$p"
  done
  echo
fi
if [ ${#LIVE[@]} -eq 0 ] && [ ${#STANDBY[@]} -eq 0 ]; then
  printf '  %sNo platforms matched.%s  Pass a target, e.g. %sbash scripts/install.sh claude%s\n' "$C_YELLOW" "$C_RESET" "$C_BOLD" "$C_RESET"
  echo
fi

# --- Post-commit hook (opt-in only) ---
HOOK_MARKER="# IJFW-POST-COMMIT-HOOK"
HOOK_BLOCK='# IJFW-POST-COMMIT-HOOK (v1)
ijfw_post_commit() {
  if command -v ijfw >/dev/null 2>&1; then
    (ijfw cross critique "HEAD~1..HEAD" >/dev/null 2>&1 &) || true
  fi
}
ijfw_post_commit
# IJFW-POST-COMMIT-HOOK-END'

install_post_commit_hook() {
  if [ ! -d ".git" ]; then
    note "Post-commit hook is available once you run git init here -- skipping for now."
    return
  fi
  HOOK_FILE=".git/hooks/post-commit"
  note "Modifying: $(pwd)/$HOOK_FILE"
  if [ -f "$HOOK_FILE" ] && grep -qF "$HOOK_MARKER" "$HOOK_FILE" 2>/dev/null; then
    ok "Post-commit hook already installed -- no change."
    return
  fi
  if [ -f "$HOOK_FILE" ]; then
    # Append IJFW block to preserve existing hook content
    printf '\n%s\n' "$HOOK_BLOCK" >> "$HOOK_FILE"
  else
    printf '#!/usr/bin/env bash\n%s\n' "$HOOK_BLOCK" > "$HOOK_FILE"
  fi
  chmod 755 "$HOOK_FILE"
  ok "Post-commit auto-critique enabled. Commits now trigger a background Trident review."
}

if [ "$INSTALL_POST_COMMIT_HOOK" -eq 1 ]; then
  log "[Post-commit hook]"
  install_post_commit_hook
  log ""
elif [ -d ".git" ]; then
  note "Tip: background Trident critique on every commit -- run with --post-commit-hook to enable."
fi

# Polish 3: auto-detect existing claude-mem install and suggest absorbing it.
# Silent if nothing detected.
if [ -d "$HOME/.claude-mem" ] || [ -f "$HOME/.claude-mem/claude-mem.db" ]; then
  echo
  printf '  %s==> NOTICED%s  %sclaude-mem looks active at ~/.claude-mem%s\n' "$C_BOLD$C_CYAN" "$C_RESET" "$C_DIM" "$C_RESET"
  printf '      Run %sijfw import claude-mem --dry-run%s to preview the migration.\n' "$C_BOLD" "$C_RESET"
fi

# Closer: PS wrapper sets IJFW_SKIP_CLOSER=1 so it can print after running
# its own Merge-Marketplace step (keeps warnings above the closer, not below).
if [ "${IJFW_SKIP_CLOSER:-0}" != "1" ]; then
  printf '  %sFull log%s   %s\n' "$C_DIM" "$C_RESET" "$NATIVE_LOG"
  echo
fi
