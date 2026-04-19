#!/usr/bin/env bash
# IJFW user-prompt-submit-capture.sh (Gemini) -- captures session-request observations
# from BeforeAgent hook events (Gemini's equivalent of UserPromptSubmit).
# Reads hook JSON from stdin, fires capture.js async.
# Never blocks. Never writes to stdout (Gemini reads stdout for decision JSON).

[ "${IJFW_DISABLE:-}" = "1" ] && exit 0
command -v node >/dev/null 2>&1 || exit 0

REPO_ROOT="${IJFW_PLUGIN_ROOT:-$(cd "$(dirname "$0")/../../../.." && pwd)}"
CAPTURE="$REPO_ROOT/scripts/observation/capture.js"
[ -f "$CAPTURE" ] || exit 0

INPUT=$(head -c 65536 2>/dev/null)
[ -z "$INPUT" ] && exit 0

mkdir -p "$HOME/.ijfw/logs" 2>/dev/null
( export IJFW_PLATFORM=gemini; printf '%s' "$INPUT" | \
  node "$CAPTURE" 2>>"$HOME/.ijfw/logs/obs-capture.log" ) &
disown $! 2>/dev/null || true

exit 0
