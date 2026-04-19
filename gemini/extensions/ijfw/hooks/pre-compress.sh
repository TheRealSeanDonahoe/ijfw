#!/usr/bin/env bash
# IJFW PreCompress (Gemini) -- direct match for Claude's PreCompact.
# Preserves key decisions before context compression. Instructs compaction
# to retain near-horizon turns and protected signal files.
#
# Gemini hook JSON in/out:
#   stdin:  { "event": "PreCompress", "session_id": "...", "cwd": "...", "timestamp": "..." }
#   stdout: { "decision": "allow", "additionalContext": "..." }
#
# No set -e -- hooks must never crash Gemini CLI.

[ "${IJFW_DISABLE:-}" = "1" ] && printf '{"decision":"allow"}\n' && exit 0

IJFW_DIR=".ijfw"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

mkdir -p "$IJFW_DIR/sessions" 2>/dev/null

INSTRUCTIONS="[ijfw] Saving session state before compression.

Preserve in compacted context:
- Current task state and progress
- Key decisions made (with rationale)
- File modifications and their purpose
- Active blockers or open questions
- Established patterns for current work
- Last 3 user/assistant turns verbatim (do not compress the near horizon)

Drop from compacted context:
- Resolved debugging sessions (keep conclusion, drop investigation)
- Abandoned approaches (keep \"tried X, did not work because Y\")
- Verbose error logs (keep error type and fix applied)
- Intermediate discussion that led to a final decision
- Full file contents already committed

Protected (do not touch -- auto-memorize reads these at session end):
- .ijfw/.session-signals.jsonl
- .ijfw/.session-feedback.jsonl
- .ijfw/.prompt-check-state

After compression, IJFW core skill and active skills will be re-attached."

command -v node >/dev/null 2>&1 || { printf '{"decision":"allow"}\n'; exit 0; }
node -e '
  const ctx = process.argv[1] || "";
  process.stdout.write(JSON.stringify({ decision: "allow", additionalContext: ctx }) + "\n");
' "$INSTRUCTIONS" 2>/dev/null || printf '{"decision":"allow"}\n'

exit 0
