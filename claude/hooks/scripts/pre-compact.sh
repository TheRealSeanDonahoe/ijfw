#!/usr/bin/env bash
# IJFW PreCompact — preserve key decisions before context compression
# NOTE: no `set -e` — hooks must NEVER crash Claude Code.

IJFW_DIR=".ijfw"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
SESSION_FILE="$IJFW_DIR/sessions/session_$TIMESTAMP.md"

mkdir -p "$IJFW_DIR/sessions"

# Generate compaction guidance for the agent
cat << 'EOF'
IJFW PreCompact: Saving session state before compression.

Preserve in compacted context:
- Current task state and progress
- Key decisions made (with rationale)
- File modifications and their purpose
- Active blockers or open questions
- Established patterns for current work

Drop from compacted context:
- Resolved debugging sessions (keep conclusion, drop investigation)
- Abandoned approaches (keep "tried X, didn't work because Y")
- Verbose error logs (keep error type + fix applied)
- Intermediate discussion that led to a final decision
- Full file contents already committed

After compaction, IJFW core skill and active skills will be re-attached.
EOF
