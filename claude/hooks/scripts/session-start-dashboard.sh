#!/usr/bin/env bash
# IJFW dashboard banner -- called from session-start.sh.
# Renders recent observations via the Node dashboard renderer.
# Never blocks; falls back to a one-line "Ready" on any failure.
# Respects $NO_COLOR.

[ "${IJFW_DISABLE:-}" = "1" ] && exit 0

# Locate the repo/plugin root.
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$PLUGIN_ROOT" ]; then
  # Running from dev repo -- walk up to find scripts/dashboard/bin.js.
  SCRIPT_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
fi

BIN_JS="$PLUGIN_ROOT/scripts/dashboard/bin.js"

if [ ! -f "$BIN_JS" ]; then
  # Dashboard not yet installed -- silent skip (positive framing: no error).
  exit 0
fi

# Render dashboard (last 50 obs, current platform = claude).
# Timeout guard: node call must complete in 3s or we skip.
if command -v node >/dev/null 2>&1; then
  (
    node "$BIN_JS" --last 50 --platform claude 2>/dev/null
  ) &
  DASH_PID=$!
  # Wait up to 3s; kill if still running.
  for _ in 1 2 3; do
    sleep 1
    kill -0 "$DASH_PID" 2>/dev/null || { wait "$DASH_PID"; exit 0; }
  done
  kill "$DASH_PID" 2>/dev/null
  printf '[ijfw] Ready.\n'
fi
