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

if [ -f "$REPO_ROOT/.ijfw-source" ]; then
  printf "IJFW source-repo detected -- platform-rule writes skipped to protect your dev tree. Run this script from your project directory to install.\n"
  exit 1
fi
LAUNCHER="$REPO_ROOT/mcp-server/bin/ijfw-memory"

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
  printf "IJFW launcher not found at %s -- reinstall @ijfw/install to restore it.\n" "$LAUNCHER" >&2
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
  awk '
    BEGIN { skip = 0 }
    /^\[mcp_servers\.ijfw-memory\][[:space:]]*$/ { skip = 1; next }
    skip && /^\[/ && !/^\[mcp_servers\.ijfw-memory\]/ { skip = 0 }
    !skip { print }
  ' "$dst" > "$tmp" || { rm -f "$tmp"; return 1; }
  {
    printf '\n[mcp_servers.ijfw-memory]\n'
    printf 'command = "%s"\n' "$launcher"
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
      note "Inside Claude Code, run:"
      note "  /plugin marketplace add $REPO_ROOT/claude"
      note "  /plugin install ijfw"
      note "Plugin auto-registers the MCP server -- no extra step needed."
      note ".claudeignore template at $REPO_ROOT/claude/.claudeignore"
      note "  Copy to your project root for instant context savings."
      ;;
    codex)
      log "[Codex CLI]"
      dst="$HOME/.codex/config.toml"
      merge_toml "$dst" "$LAUNCHER"
      # Instructions append-only: only write if user doesn't have one.
      if [ ! -f "$HOME/.codex/instructions.md" ]; then
        cp "$REPO_ROOT/codex/.codex/instructions.md" "$HOME/.codex/instructions.md"
        ok "Installed Codex config + instructions"
      else
        ok "Merged MCP into existing Codex config (instructions.md left as-is)"
      fi
      ;;
    gemini)
      log "[Gemini CLI]"
      dst="$HOME/.gemini/settings.json"
      merge_json "$dst" "$LAUNCHER"
      # W4.1 / E2 -- platform parity: copy the GEMINI.md rules file.
      if [ ! -f "$HOME/.gemini/GEMINI.md" ]; then
        mkdir -p "$HOME/.gemini"
        cp "$REPO_ROOT/gemini/GEMINI.md" "$HOME/.gemini/GEMINI.md" 2>/dev/null \
          && ok "Installed Gemini config + rules" \
          || ok "Merged MCP into $dst"
      else
        ok "Merged MCP into $dst (GEMINI.md left as-is)"
      fi
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
for t in "${TARGETS[@]}"; do
  if [ "$t" = "claude" ]; then
    printf '  %s==> ONE MORE STEP%s  %sinside Claude Code%s\n' "$C_BOLD$C_WHITE" "$C_RESET" "$C_DIM" "$C_RESET"
    printf '      %s/plugin marketplace add%s %s\n' "$C_BOLD" "$C_RESET" "$NATIVE_REPO${NATIVE_REPO:+\\}claude"
    printf '      %s/plugin install ijfw%s\n' "$C_BOLD" "$C_RESET"
    echo
    break
  fi
done

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

# Closer: PS wrapper sets IJFW_SKIP_CLOSER=1 so it can print after running
# its own Merge-Marketplace step (keeps warnings above the closer, not below).
if [ "${IJFW_SKIP_CLOSER:-0}" != "1" ]; then
  printf '  %sFull log%s   %s\n' "$C_DIM" "$C_RESET" "$NATIVE_LOG"
  echo
fi
