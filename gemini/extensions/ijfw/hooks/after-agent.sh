#!/usr/bin/env bash
# IJFW AfterAgent (Gemini) -- post-agent cleanup.
# Flushes signal files, updates session state after a subagent completes.
#
# Gemini hook JSON in/out:
#   stdin:  { "event": "AfterAgent", "session_id": "...", "cwd": "...", "timestamp": "..." }
#   stdout: { "decision": "allow" }
#
# No set -e -- hooks must never crash Gemini CLI.

[ "${IJFW_DISABLE:-}" = "1" ] && printf '{"decision":"allow"}\n' && exit 0

IJFW_DIR=".ijfw"

# Flush any pending signal files from the subagent's run.
# These accumulate during execution and are consumed by session-end.
# Nothing to actively flush -- files are append-only; just ensure dirs exist.
mkdir -p "$IJFW_DIR/sessions" "$IJFW_DIR/memory" 2>/dev/null

printf '{"decision":"allow"}\n'
exit 0
