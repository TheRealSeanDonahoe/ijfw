#!/usr/bin/env bash
# IJFW SessionStart (Codex) -- initialize state, emit banner, register project.
# Codex hook JSON in/out: reads JSON payload on stdin, writes JSON response on stdout.
# Payload: { "event": "SessionStart", "session_id": "...", "cwd": "..." }
# Response: { "continue": true, "systemMessage": "..." }  (optional)
#
# No set -e -- hooks must never crash Codex.

[ "${IJFW_DISABLE:-}" = "1" ] && exit 0

IJFW_DIR=".ijfw"
IJFW_GLOBAL="$HOME/.ijfw"

# Read stdin payload (best-effort).
HOOK_STDIN=""
if [ ! -t 0 ]; then
  HOOK_STDIN=$(cat 2>/dev/null || true)
fi

# Pre-flight: .ijfw must be a directory if it exists.
if [ -e "$IJFW_DIR" ] && [ ! -d "$IJFW_DIR" ]; then
  printf '{"continue":true,"systemMessage":"[ijfw] .ijfw is a file here -- IJFW needs it as a directory. Rename or remove it, then start a new session."}\n'
  exit 0
fi

mkdir -p "$IJFW_DIR/memory" "$IJFW_DIR/sessions" "$IJFW_DIR/index" 2>/dev/null
mkdir -p "$IJFW_GLOBAL/memory" 2>/dev/null

# Project registry -- append on first sight.
REGISTRY_FILE="$IJFW_GLOBAL/registry.md"
PROJECT_PATH=$(pwd -P 2>/dev/null)
if [ -n "$PROJECT_PATH" ]; then
  if [ ! -f "$REGISTRY_FILE" ] || ! grep -qF "$PROJECT_PATH |" "$REGISTRY_FILE" 2>/dev/null; then
    REG_HASH=$(printf '%s' "$PROJECT_PATH" | shasum 2>/dev/null | cut -c1-12)
    REG_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || TZ=UTC date +%Y-%m-%dT%H:%M:%SZ)
    if [ -n "$REG_HASH" ] && [ -n "$REG_ISO" ]; then
      printf '%s | %s | %s\n' "$PROJECT_PATH" "$REG_HASH" "$REG_ISO" >> "$REGISTRY_FILE" 2>/dev/null
    fi
  fi
fi

# Reset session-scoped state.
: > "$IJFW_DIR/.startup-flags" 2>/dev/null
: > "$IJFW_DIR/.migration-msgs" 2>/dev/null
: > "$IJFW_DIR/.detection" 2>/dev/null

MODE="${IJFW_MODE:-smart}"

# Routing detection (env vars + file checks only, no network).
ROUTING=""
case "${OPENROUTER_API_KEY:-}" in ?*) ROUTING="multi-model routing" ;; esac
if [ -f "$HOME/.codex/auth.json" ] && [ -z "$ROUTING" ]; then
  ROUTING="native"
fi
[ -z "$ROUTING" ] && ROUTING="native"

# Count memory entries for banner.
MEMORY_COUNT=0
if [ -f "$IJFW_DIR/memory/project-journal.md" ]; then
  MEMORY_COUNT=$(grep -c '^- \[' "$IJFW_DIR/memory/project-journal.md" 2>/dev/null || true)
  [ -z "$MEMORY_COUNT" ] && MEMORY_COUNT=0
fi

# Startup flags (for use by other hooks this session).
printf 'IJFW_MODE=%s\nIJFW_ROUTING=%s\n' "$MODE" "$ROUTING" >> "$IJFW_DIR/.startup-flags" 2>/dev/null

# Check for startup flags from prior session (consolidate trigger, etc.).
CONSOLIDATE_HINT=""
if grep -q "IJFW_NEEDS_CONSOLIDATE=1" "$IJFW_DIR/.startup-flags" 2>/dev/null; then
  CONSOLIDATE_HINT=" | Run: ijfw consolidate"
fi

BANNER="[ijfw] Ready -- mode: $MODE | routing: $ROUTING | memory: $MEMORY_COUNT entries$CONSOLIDATE_HINT"

# Render dashboard async (does not block or affect stdout envelope).
_DASH_SCRIPT="$(dirname "$0")/session-start-dashboard.sh"
if [ -f "$_DASH_SCRIPT" ]; then
  bash "$_DASH_SCRIPT" >>"$HOME/.ijfw/logs/obs-capture.log" 2>&1 &
  disown $! 2>/dev/null || true
fi

# Emit Codex-format JSON response.
if command -v node >/dev/null 2>&1; then
  node -e '
    const banner = process.argv[1] || "[ijfw] Ready";
    process.stdout.write(JSON.stringify({ "continue": true, "systemMessage": banner }) + "\n");
  ' "$BANNER" 2>/dev/null
else
  printf '{"continue":true,"systemMessage":"%s"}\n' "$BANNER"
fi

exit 0
