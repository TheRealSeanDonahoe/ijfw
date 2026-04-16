#!/usr/bin/env bash
# IJFW session-start-dashboard.sh (Codex) -- renders the observation dashboard
# at session start. Called from session-start.sh before the Codex envelope is emitted.
# Output goes to stderr so it does not interfere with Codex's stdout JSON envelope.
# Never blocks; falls back silently on any failure.

[ "${IJFW_DISABLE:-}" = "1" ] && exit 0
command -v node >/dev/null 2>&1 || exit 0

REPO_ROOT="${IJFW_PLUGIN_ROOT:-$(cd "$(dirname "$0")/../../.." && pwd)}"
BIN_JS="$REPO_ROOT/scripts/dashboard/bin.js"
[ -f "$BIN_JS" ] || exit 0

# Render last 50 observations across all platforms to stderr.
(
  node "$BIN_JS" --last 50 --platform all 2>/dev/null
) &
DASH_PID=$!
for _ in 1 2 3; do
  sleep 1
  kill -0 "$DASH_PID" 2>/dev/null || { wait "$DASH_PID"; exit 0; }
done
kill "$DASH_PID" 2>/dev/null

exit 0
