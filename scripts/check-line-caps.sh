#!/usr/bin/env bash
# IJFW line-cap CI guard.
# Hard-cap enforcement for files that MUST stay small (always-on context cost).
# Exits non-zero if any cap is exceeded.
#
# Run: bash scripts/check-line-caps.sh

set -u
cd "$(dirname "$0")/.."

# Format: <file>:<max-lines>:<reason>
CAPS=(
  "claude/skills/ijfw-core/SKILL.md:55:always-on per-turn token cost"
  "universal/ijfw-rules.md:20:paste-anywhere brevity"
)

VIOLATIONS=0
for entry in "${CAPS[@]}"; do
  FILE="${entry%%:*}"
  REST="${entry#*:}"
  MAX="${REST%%:*}"
  REASON="${REST#*:}"
  if [ ! -f "$FILE" ]; then
    echo "  MISSING: $FILE" >&2
    VIOLATIONS=$((VIOLATIONS + 1))
    continue
  fi
  LINES=$(wc -l < "$FILE" | tr -d ' ')
  if [ "$LINES" -gt "$MAX" ]; then
    printf '  %s: %s lines > cap of %s (%s)\n' "$FILE" "$LINES" "$MAX" "$REASON" >&2
    VIOLATIONS=$((VIOLATIONS + 1))
  else
    printf '  OK %s: %s/%s lines\n' "$FILE" "$LINES" "$MAX"
  fi
done

if [ $VIOLATIONS -gt 0 ]; then
  echo "" >&2
  echo "FAIL: $VIOLATIONS line-cap violation(s)." >&2
  exit 1
fi
exit 0
