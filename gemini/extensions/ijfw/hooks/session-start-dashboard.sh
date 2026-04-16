#!/usr/bin/env bash
# IJFW session-start-dashboard.sh (Gemini) -- renders the observation dashboard
# at session start. Called from session-start.sh before emitting the decision envelope.
# Output appended to systemMessage via caller; this script writes to stdout for capture.
# Never blocks; falls back silently on any failure.

[ "${IJFW_DISABLE:-}" = "1" ] && exit 0
command -v node >/dev/null 2>&1 || exit 0

REPO_ROOT="${IJFW_PLUGIN_ROOT:-$(cd "$(dirname "$0")/../../../.." && pwd)}"
BIN_JS="$REPO_ROOT/scripts/dashboard/bin.js"
[ -f "$BIN_JS" ] || exit 0

# Capture dashboard output with a 3s timeout guard.
DASH_OUT=""
DASH_OUT=$(
  (
    node "$BIN_JS" --last 50 --platform all 2>/dev/null
  ) &
  DASH_PID=$!
  for _ in 1 2 3; do
    sleep 1
    kill -0 "$DASH_PID" 2>/dev/null || { wait "$DASH_PID"; exit 0; }
  done
  kill "$DASH_PID" 2>/dev/null
) 2>/dev/null

if [ -n "$DASH_OUT" ]; then
  printf '%s\n' "$DASH_OUT"
fi

exit 0
