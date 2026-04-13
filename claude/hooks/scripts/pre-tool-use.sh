#!/usr/bin/env bash
# IJFW PreToolUse — strip noise from tool outputs before context injection
# Deterministic only — regex/pattern matching, no LLM calls, zero cost
# Defers to RTK or context-mode if they're handling this already
set -euo pipefail

IJFW_DIR=".ijfw"
FLAGS_FILE="$IJFW_DIR/.startup-flags"

# If RTK or context-mode is active, they handle stripping — we skip
if [ -f "$FLAGS_FILE" ]; then
  grep -q "IJFW_RTK_ACTIVE=1" "$FLAGS_FILE" 2>/dev/null && exit 0
  grep -q "IJFW_CONTEXT_MODE_ACTIVE=1" "$FLAGS_FILE" 2>/dev/null && exit 0
fi

# Read tool output from stdin (limit to 1MB to prevent memory exhaustion)
INPUT=$(head -c 1048576)
TRUNCATED=""
if [ ${#INPUT} -ge 1048576 ]; then
  TRUNCATED="1"
fi

# Strip ANSI escape codes
CLEANED=$(echo "$INPUT" | sed 's/\x1b\[[0-9;]*[mGKHF]//g' 2>/dev/null || echo "$INPUT")

# Collapse consecutive blank lines
CLEANED=$(echo "$CLEANED" | cat -s)

# Strip trailing whitespace
CLEANED=$(echo "$CLEANED" | sed 's/[[:space:]]*$//')

# --- Pattern-based output collapsing ---

# Jest/Vitest: remove individual passing test lines, keep failures and summary
CLEANED=$(echo "$CLEANED" | sed '/^[[:space:]]*✓\|^[[:space:]]*√\|^[[:space:]]*PASS /d')

# pytest: remove individual passing dots and collecting lines
CLEANED=$(echo "$CLEANED" | sed '/^[[:space:]]*\.\.\.\.*/d; /^collecting/d')

# npm/yarn install: strip progress and "already satisfied" noise
CLEANED=$(echo "$CLEANED" | sed '/^[[:space:]]*npm warn/d; /^[[:space:]]*npm notice/d')
CLEANED=$(echo "$CLEANED" | sed '/^added [0-9]* packages/d')

# pip install: strip "already satisfied"
CLEANED=$(echo "$CLEANED" | sed '/^Requirement already satisfied/d')
CLEANED=$(echo "$CLEANED" | sed '/^Downloading /d; /^Installing collected/d')

# Docker build: strip layer hashes and intermediate steps
CLEANED=$(echo "$CLEANED" | sed '/^[[:space:]]*--->/d; /^Removing intermediate container/d')
CLEANED=$(echo "$CLEANED" | sed '/^[[:space:]]*\[internal\]/d')

# Webpack/Vite/esbuild: strip chunk hashes and asset lines
CLEANED=$(echo "$CLEANED" | sed '/^chunk {/d; /^asset [a-f0-9]/d')

# cargo build: strip "Compiling" lines, keep errors/warnings
CLEANED=$(echo "$CLEANED" | sed '/^[[:space:]]*Compiling /d; /^[[:space:]]*Downloading /d')
CLEANED=$(echo "$CLEANED" | sed '/^[[:space:]]*Fresh /d')

# git: strip diff stat bars (the +++ --- lines in large diffs)
# Keep the file names and summary

# General: truncate if output exceeds 500 lines
LINE_COUNT=$(echo "$CLEANED" | wc -l | tr -d ' ')
if [ "$LINE_COUNT" -gt 500 ]; then
  CLEANED=$(echo "$CLEANED" | head -250)
  echo ""
  echo "... [truncated: $LINE_COUNT lines, showing first 250] ..."
  echo ""
  CLEANED="$CLEANED
$(echo "$INPUT" | tail -50)"
fi

echo "$CLEANED"
