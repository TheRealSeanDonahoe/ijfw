#!/usr/bin/env bash
# IJFW SessionEnd (Stop hook) — save session state, write metrics, manage journal.
# NOTE: no `set -e` — hooks must NEVER crash Claude Code.
#
# Hardened against:
#   - JSONL corruption from unescaped env vars (uses node -e to encode JSON)
#   - local-time timestamps masquerading as UTC (TZ=UTC fallback)
#   - clobbering session-start's startup flags (always >>)
#   - schema drift (every record carries "v":1)

IJFW_DIR=".ijfw"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
# UTC ISO timestamp with TZ=UTC fallback for hardened containers where `date -u` fails.
ISO_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || TZ=UTC date +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$IJFW_DIR/sessions" "$IJFW_DIR/memory" "$IJFW_DIR/metrics" 2>/dev/null

METRICS_FILE="$IJFW_DIR/metrics/sessions.jsonl"

MODE="${IJFW_MODE:-smart}"
EFFORT="${CLAUDE_CODE_EFFORT_LEVEL:-high}"

ROUTING="native"
case "${OPENROUTER_API_KEY:-}" in ?*) ROUTING="OpenRouter" ;; esac
[ -f "$HOME/.claude-code-router/config.json" ] && ROUTING="smart-routing"

MEMORY_STORES=0
if [ -f "$IJFW_DIR/memory/project-journal.md" ]; then
  MEMORY_STORES=$(grep -c '^- \[' "$IJFW_DIR/memory/project-journal.md" 2>/dev/null)
  [ -z "$MEMORY_STORES" ] && MEMORY_STORES=0
fi

SESSION_COUNT=$(ls "$IJFW_DIR/sessions/" 2>/dev/null | wc -l | tr -d ' ')
[ -z "$SESSION_COUNT" ] && SESSION_COUNT=0
SESSION_NUM=$((SESSION_COUNT + 1))

HAS_HANDOFF="false"
[ -f "$IJFW_DIR/memory/handoff.md" ] && HAS_HANDOFF="true"

# Write JSONL via node -e — guarantees valid JSON regardless of env-var content.
# Schema version baked in for forward compatibility.
if command -v node >/dev/null 2>&1; then
  JSONLINE=$(node -e '
    const o = {
      v: 1,
      timestamp: process.argv[1],
      session: Number(process.argv[2]),
      mode: process.argv[3],
      effort: process.argv[4],
      routing: process.argv[5],
      memory_stores: Number(process.argv[6]),
      handoff: process.argv[7] === "true"
    };
    process.stdout.write(JSON.stringify(o));
  ' "$ISO_TIMESTAMP" "$SESSION_NUM" "$MODE" "$EFFORT" "$ROUTING" "$MEMORY_STORES" "$HAS_HANDOFF" 2>/dev/null)
  if [ -n "$JSONLINE" ]; then
    printf '%s\n' "$JSONLINE" >> "$METRICS_FILE" 2>/dev/null
  fi
fi

# Session marker — fixed-format, no user input interpolated.
{
  echo "<!-- ijfw schema:1 -->"
  echo "# Session: $TIMESTAMP"
  echo "Session #$SESSION_NUM"
  echo "Memory updates this session: $MEMORY_STORES"
  echo "Handoff present: $HAS_HANDOFF"
} > "$IJFW_DIR/sessions/session_$TIMESTAMP.md" 2>/dev/null

# Append schema-versioned journal entry.
JOURNAL="$IJFW_DIR/memory/project-journal.md"
if [ ! -f "$JOURNAL" ]; then
  {
    echo "<!-- ijfw schema:1 -->"
    echo "# IJFW Project Journal"
  } > "$JOURNAL" 2>/dev/null
fi
printf -- '- [%s] session-end: #%s\n' "$ISO_TIMESTAMP" "$SESSION_NUM" >> "$JOURNAL" 2>/dev/null

# Dream cycle trigger — APPEND, never clobber.
if [ "$SESSION_NUM" -gt 0 ] && [ $(( SESSION_NUM % 5 )) -eq 0 ]; then
  echo "IJFW_NEEDS_CONSOLIDATE=1" >> "$IJFW_DIR/.startup-flags" 2>/dev/null
fi

# Positive-framed status — no jargon, no negatives, no paths.
echo "Session #$SESSION_NUM saved."

exit 0
