#!/usr/bin/env bash
# IJFW PreToolUse — strip noise from tool outputs before context injection.
# Deterministic: regex/pattern matching only. No LLM calls. Zero cost.
# Defers to RTK or context-mode if they're handling this already.
# NOTE: no `set -e` — hooks must NEVER crash Claude Code.

IJFW_DIR=".ijfw"
FLAGS_FILE="$IJFW_DIR/.startup-flags"

# If RTK or context-mode is active, they handle stripping — we skip.
if [ -f "$FLAGS_FILE" ]; then
  if grep -q "IJFW_RTK_ACTIVE=1" "$FLAGS_FILE" 2>/dev/null; then exit 0; fi
  if grep -q "IJFW_CONTEXT_MODE_ACTIVE=1" "$FLAGS_FILE" 2>/dev/null; then exit 0; fi
fi

# Read tool output from stdin (cap at 1MB to prevent memory exhaustion).
INPUT=$(head -c 1048576)
[ -z "$INPUT" ] && exit 0

# Chain transformations through a single pipeline.
# Portable across macOS (BSD sed/awk) and Linux (GNU sed/awk) — no cat -s.
CLEANED=$(printf '%s' "$INPUT" | sed -E '
  # Strip ANSI escape codes (BSD-compatible; no \x1b)
  s/'"$(printf '\033')"'\[[0-9;]*[a-zA-Z]//g
  # Strip trailing whitespace
  s/[[:space:]]+$//
' | awk '
  # Collapse consecutive blank lines (replacement for cat -s)
  /^$/ { if (blank) next; blank=1; print; next }
  { blank=0; print }
' | sed -E '
  # Jest/Vitest: drop individual passing lines
  /^[[:space:]]*(✓|√|PASS )/d
  # pytest: drop passing dots and collecting lines
  /^[[:space:]]*\.\.\.\./d
  /^collecting/d
  # npm/yarn noise
  /^[[:space:]]*npm (warn|notice)/d
  /^added [0-9]+ packages/d
  # pip noise
  /^Requirement already satisfied/d
  /^Downloading /d
  /^Installing collected/d
  # Docker build noise
  /^[[:space:]]*--->/d
  /^Removing intermediate container/d
  /^[[:space:]]*\[internal\]/d
  # Webpack/Vite/esbuild chunk hashes
  /^chunk \{/d
  /^asset [a-f0-9]/d
  # cargo noise
  /^[[:space:]]*(Compiling|Downloading|Fresh) /d
')

# Truncate if output exceeds 500 lines (W2.5/B3 — context-mode-style trim).
# Policy: large log-like output → extract ERROR/WARN/Traceback lines with
# 1 line context, keep first 100 + last 30 as scaffolding. Structured JSON
# outputs and generic large outputs fall back to the head+tail clamp.
LINE_COUNT=$(printf '%s\n' "$CLEANED" | wc -l | tr -d ' ')
if [ "${LINE_COUNT:-0}" -gt 500 ]; then
  # Does the output look log-like (has ERROR/WARN/FAIL/Traceback markers)?
  if printf '%s' "$CLEANED" | grep -Eq '^(ERROR|WARN|FAIL|CRITICAL|FATAL|Traceback|[[:space:]]*at [A-Z])' \
     || printf '%s' "$CLEANED" | grep -Eqi '\berror\b|\bwarn(ing)?\b|\bfailed\b'; then
    HEAD_PART=$(printf '%s\n' "$CLEANED" | head -100)
    TAIL_PART=$(printf '%s\n' "$CLEANED" | tail -30)
    # Extract error/warn lines with 1-line context (GNU + BSD grep both support -A/-B).
    ERRORS=$(printf '%s\n' "$CLEANED" | grep -En -B1 -A1 -iE '\b(error|warn(ing)?|failed|traceback|fatal|critical)\b' 2>/dev/null | head -120)
    printf '%s\n\n... [trimmed: %s lines → head 100 + key signals + tail 30] ...\n\n%s\n\n... tail ...\n\n%s\n' \
      "$HEAD_PART" "$LINE_COUNT" "$ERRORS" "$TAIL_PART"
  else
    HEAD_PART=$(printf '%s\n' "$CLEANED" | head -250)
    TAIL_PART=$(printf '%s\n' "$CLEANED" | tail -50)
    printf '%s\n\n... [truncated: %s lines — showing first 250 + last 50] ...\n\n%s\n' \
      "$HEAD_PART" "$LINE_COUNT" "$TAIL_PART"
  fi
else
  printf '%s\n' "$CLEANED"
fi

exit 0
