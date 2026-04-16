#!/usr/bin/env bash
# IJFW AfterAgent (Codex) -- post-agent cleanup, flush signal files.
#
# Codex hook JSON in/out:
#   stdin:  { "event": "AfterAgent", "session_id": "...", "cwd": "..." }
#   stdout: { "continue": true }  (or nothing)
#
# No set -e -- hooks must never crash Codex.

[ "${IJFW_DISABLE:-}" = "1" ] && exit 0

IJFW_DIR=".ijfw"

# Read stdin (best-effort, not required for this hook).
if [ ! -t 0 ]; then
  cat > /dev/null 2>/dev/null || true
fi

# Flush session signal files so next agent dispatch starts clean.
if [ -f "$IJFW_DIR/.session-signals.jsonl" ]; then
  SIGNAL_COUNT=$(wc -l < "$IJFW_DIR/.session-signals.jsonl" 2>/dev/null | tr -d ' ')
  if [ "${SIGNAL_COUNT:-0}" -gt 0 ]; then
    # Archive signals to dated file before clearing.
    ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || TZ=UTC date +%Y-%m-%dT%H:%M:%SZ)
    mkdir -p "$IJFW_DIR/archive" 2>/dev/null
    cp "$IJFW_DIR/.session-signals.jsonl" "$IJFW_DIR/archive/signals-$ISO.jsonl" 2>/dev/null
    : > "$IJFW_DIR/.session-signals.jsonl"
  fi
fi

printf '{"continue":true}\n'
exit 0
