#!/usr/bin/env bash
# IJFW SessionEnd (Stop hook) — save session state, write metrics, manage journal
set -euo pipefail

IJFW_DIR=".ijfw"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
ISO_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$IJFW_DIR/sessions" "$IJFW_DIR/memory" "$IJFW_DIR/metrics"

# ============================================================
# WRITE SESSION METRICS
# ============================================================
METRICS_FILE="$IJFW_DIR/metrics/sessions.jsonl"

# Read mode from startup flags or default
MODE="${IJFW_MODE:-smart}"
EFFORT="${CLAUDE_CODE_EFFORT_LEVEL:-high}"

# Detect routing (same logic as session-start, but cached)
ROUTING="native"
[ -n "${OPENROUTER_API_KEY:-}" ] && ROUTING="OpenRouter"
[ -f "$HOME/.claude-code-router/config.json" ] && ROUTING="smart-routing"

# Count memory operations from journal (rough proxy)
MEMORY_STORES=0
if [ -f "$IJFW_DIR/memory/project-journal.md" ]; then
  MEMORY_STORES=$(grep -c "^\- \*\*" "$IJFW_DIR/memory/project-journal.md" 2>/dev/null || echo "0")
fi

# Count session files to determine session number
SESSION_COUNT=$(ls "$IJFW_DIR/sessions/" 2>/dev/null | wc -l | tr -d ' ')
SESSION_NUM=$((SESSION_COUNT + 1))

# Check if handoff was generated
HAS_HANDOFF="false"
[ -f "$IJFW_DIR/memory/handoff.md" ] && HAS_HANDOFF="true"

# Write metrics line (JSONL — one JSON object per line)
cat >> "$METRICS_FILE" << METRICS_EOF
{"timestamp":"$ISO_TIMESTAMP","session":"$SESSION_NUM","mode":"$MODE","effort":"$EFFORT","routing":"$ROUTING","memory_stores":$MEMORY_STORES,"handoff":$HAS_HANDOFF}
METRICS_EOF

# ============================================================
# SAVE SESSION MARKER
# ============================================================

# Write a session file for this session
cat > "$IJFW_DIR/sessions/session_$TIMESTAMP.md" << EOF
# Session: $TIMESTAMP
Mode: $MODE | Effort: $EFFORT | Routing: $ROUTING
Memory stores this session: $MEMORY_STORES
Handoff generated: $HAS_HANDOFF
EOF

# ============================================================
# UPDATE JOURNAL
# ============================================================
if [ -f "$IJFW_DIR/memory/project-journal.md" ]; then
  echo "" >> "$IJFW_DIR/memory/project-journal.md"
  echo "---" >> "$IJFW_DIR/memory/project-journal.md"
  echo "## Session End: $TIMESTAMP" >> "$IJFW_DIR/memory/project-journal.md"
  echo "- Mode: $MODE | Effort: $EFFORT | Session #$SESSION_NUM" >> "$IJFW_DIR/memory/project-journal.md"
else
  cat > "$IJFW_DIR/memory/project-journal.md" << EOF
# IJFW Project Journal

## Session End: $TIMESTAMP
- First tracked session. Mode: $MODE | Effort: $EFFORT
EOF
fi

# ============================================================
# ENSURE HANDOFF EXISTS
# ============================================================
if [ ! -f "$IJFW_DIR/memory/handoff.md" ]; then
  cat > "$IJFW_DIR/memory/handoff.md" << EOF
## Handoff: $TIMESTAMP

### Status
Session ended. No structured handoff captured.

### Next Steps
Review recent changes and continue.
EOF
fi

# ============================================================
# DREAM CYCLE TRIGGER
# ============================================================
if [ "$SESSION_NUM" -gt 0 ] && [ $(( SESSION_NUM % 5 )) -eq 0 ]; then
  echo "IJFW_NEEDS_CONSOLIDATE=1" > "$IJFW_DIR/.startup-flags" 2>/dev/null || true
fi

echo "IJFW: Session #$SESSION_NUM saved."
