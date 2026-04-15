#!/usr/bin/env bash
# IJFW PreCompact — preserve key decisions before context compression.
# NOTE: no `set -e` — hooks must NEVER crash Claude Code.
[ "${IJFW_DISABLE:-}" = "1" ] && exit 0

IJFW_DIR=".ijfw"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
SESSION_FILE="$IJFW_DIR/sessions/session_$TIMESTAMP.md"

mkdir -p "$IJFW_DIR/sessions"

# W4.3 / B5 — auto-preserve last 3 user/assistant turns via a hint.
# Also instructs the compaction to retain feedback/signal files verbatim
# since auto-memorize needs them intact at session end.
cat << 'EOF'
[ijfw] Saving session state before compression.

Preserve in compacted context:
- Current task state and progress
- Key decisions made (with rationale)
- File modifications and their purpose
- Active blockers or open questions
- Established patterns for current work
- Last 3 user/assistant turns verbatim (don't compress the near horizon)

Drop from compacted context:
- Resolved debugging sessions (keep conclusion, drop investigation)
- Abandoned approaches (keep "tried X, didn't work because Y")
- Verbose error logs (keep error type + fix applied)
- Intermediate discussion that led to a final decision
- Full file contents already committed

Protected (do not touch — auto-memorize reads these at session end):
- .ijfw/.session-signals.jsonl
- .ijfw/.session-feedback.jsonl
- .ijfw/.prompt-check-state

After compaction, IJFW core skill and active skills will be re-attached.
EOF
