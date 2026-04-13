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
#   - Never prompts — merge is always the safe default.
#   - Shows what was added/kept at the end.

set -u

REPO_ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAUNCHER="$REPO_ROOT/mcp-server/bin/ijfw-memory"
TARGETS=("$@")
[ ${#TARGETS[@]} -eq 0 ] && TARGETS=(claude codex gemini cursor windsurf copilot)

if [ ! -x "$LAUNCHER" ]; then
  chmod +x "$LAUNCHER" 2>/dev/null
fi
if [ ! -f "$LAUNCHER" ]; then
  printf "Launcher missing at %s — aborting.\n" "$LAUNCHER" >&2
  exit 1
fi

TS=$(date +%Y%m%d-%H%M%S)

ok()   { printf "  ✓ %s\n" "$1"; }
note() { printf "  → %s\n" "$1"; }
info() { printf "  · %s\n" "$1"; }

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
        // Corrupt existing config — keep the backup, start fresh.
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
# Zero-dep TOML merge: we only need to ensure [mcp_servers.ijfw-memory] block
# with our keys exists and is correct. Everything else is preserved verbatim.
# Strategy: strip any existing [mcp_servers.ijfw-memory] section (it's a
# plain bracketed section) then append a fresh one.
merge_toml() {
  local dst="$1" launcher="$2"
  mkdir -p "$(dirname "$dst")"
  backup "$dst"
  if [ ! -f "$dst" ]; then
    : > "$dst"
  fi
  # Delete the [mcp_servers.ijfw-memory] block if present. awk is portable.
  awk '
    BEGIN { skip = 0 }
    /^\[mcp_servers\.ijfw-memory\][[:space:]]*$/ { skip = 1; next }
    skip && /^\[/ && !/^\[mcp_servers\.ijfw-memory\]/ { skip = 0 }
    !skip { print }
  ' "$dst" > "$dst.tmp" && mv "$dst.tmp" "$dst"
  # Append our block.
  {
    printf '\n[mcp_servers.ijfw-memory]\n'
    printf 'command = "%s"\n' "$launcher"
    printf 'args = []\n'
    printf 'enabled = true\n'
    printf 'startup_timeout_sec = 10\n'
    printf 'tool_timeout_sec = 30\n'
  } >> "$dst"
}

echo "IJFW install — launcher: $LAUNCHER"
echo

for target in "${TARGETS[@]}"; do
  case "$target" in
    claude)
      echo "[Claude Code]"
      note "Inside Claude Code, run:"
      note "  /plugin marketplace add $REPO_ROOT/claude"
      note "  /plugin install ijfw"
      note "Plugin auto-registers the MCP server — no extra step needed."
      ;;
    codex)
      echo "[Codex CLI]"
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
      echo "[Gemini CLI]"
      dst="$HOME/.gemini/settings.json"
      merge_json "$dst" "$LAUNCHER"
      ok "Merged MCP into $dst"
      ;;
    cursor)
      echo "[Cursor]"
      dst=".cursor/mcp.json"
      merge_json "$dst" "$LAUNCHER"
      mkdir -p .cursor/rules
      cp "$REPO_ROOT/cursor/.cursor/rules/ijfw.mdc" .cursor/rules/ijfw.mdc
      ok "Merged MCP + installed rule to project ./.cursor/"
      ;;
    windsurf)
      echo "[Windsurf]"
      dst="$HOME/.codeium/windsurf/mcp_config.json"
      merge_json "$dst" "$LAUNCHER"
      ok "Merged MCP into $dst"
      ;;
    copilot)
      echo "[Copilot (VS Code)]"
      dst=".vscode/mcp.json"
      merge_json "$dst" "$LAUNCHER"
      ok "Merged MCP into project ./.vscode/mcp.json"
      ;;
    *)
      info "skipping unknown target: $target"
      ;;
  esac
  echo
done

echo "Done. Backups (if any): <config>.bak.$TS"
echo "Verify with: node $REPO_ROOT/mcp-server/test.js"
