#!/usr/bin/env bash
# IJFW BeforeModel (Gemini BONUS) -- first-turn memory injection.
# Fires before every model call. On turn 1, injects full project context
# from ijfw_memory_prelude directly into the model prompt via additionalContext.
# More granular than Claude's CLAUDE.md approach -- context arrives precisely
# when the model needs it, not pre-loaded at session init.
#
# Gemini hook JSON in/out:
#   stdin:  { "event": "BeforeModel", "session_id": "...", "turn": <n>, "cwd": "...", "timestamp": "..." }
#   stdout: { "decision": "allow" }  OR  { "decision": "allow", "additionalContext": "..." }
#
# No set -e -- hooks must never crash Gemini CLI.

[ "${IJFW_DISABLE:-}" = "1" ] && printf '{"decision":"allow"}\n' && exit 0

IJFW_DIR=".ijfw"
TURN_FILE="$IJFW_DIR/.turn-count"

HOOK_STDIN=""
if [ ! -t 0 ]; then
  HOOK_STDIN=$(head -c 65536 2>/dev/null || true)
fi

# Increment turn counter.
TURN_COUNT=0
if [ -f "$TURN_FILE" ]; then
  TURN_COUNT=$(cat "$TURN_FILE" 2>/dev/null || printf '0')
  TURN_COUNT=$(( ${TURN_COUNT:-0} + 1 ))
else
  TURN_COUNT=1
fi
printf '%s' "$TURN_COUNT" > "$TURN_FILE" 2>/dev/null

# Also check the turn field from the payload (Gemini provides it natively).
PAYLOAD_TURN=0
if command -v node >/dev/null 2>&1 && [ -n "$HOOK_STDIN" ]; then
  PAYLOAD_TURN=$(node -e '
    try {
      const p = JSON.parse(process.argv[1] || "{}");
      process.stdout.write(String(p.turn || 0));
    } catch { process.stdout.write("0"); }
  ' "$HOOK_STDIN" 2>/dev/null || printf '0')
fi

# Only inject on the first turn of a session.
IS_FIRST_TURN="false"
[ "$TURN_COUNT" -eq 1 ] && IS_FIRST_TURN="true"
[ "$PAYLOAD_TURN" -eq 0 ] && IS_FIRST_TURN="true"

if [ "$IS_FIRST_TURN" != "true" ]; then
  printf '{"decision":"allow"}\n'
  exit 0
fi

# Build memory context from local files (no MCP call in hooks -- deterministic only).
KB_FILE="$IJFW_DIR/memory/knowledge.md"
HANDOFF_FILE="$IJFW_DIR/memory/handoff.md"
JOURNAL_FILE="$IJFW_DIR/memory/project-journal.md"

MEM_CONTEXT=""
if [ -s "$KB_FILE" ] || [ -s "$HANDOFF_FILE" ] || [ -s "$JOURNAL_FILE" ]; then
  MEM_CONTEXT="<ijfw-first-turn-context>
Project memory loaded. Key context for this session:
"
  if [ -s "$HANDOFF_FILE" ]; then
    HANDOFF_PREVIEW=$(grep -v '^<!--' "$HANDOFF_FILE" | head -8 | sed 's/^/  /')
    [ -n "$HANDOFF_PREVIEW" ] && MEM_CONTEXT="$MEM_CONTEXT
Last handoff:
$HANDOFF_PREVIEW
"
  fi
  if [ -s "$KB_FILE" ]; then
    KB_PREVIEW=$(grep '^\*\*' "$KB_FILE" | tail -3 | sed 's/^/  /')
    [ -n "$KB_PREVIEW" ] && MEM_CONTEXT="$MEM_CONTEXT
Recent decisions:
$KB_PREVIEW
"
  fi
  MEM_CONTEXT="$MEM_CONTEXT
For full context, call \`ijfw_memory_prelude\`.
</ijfw-first-turn-context>"
fi

[ -z "$MEM_CONTEXT" ] && printf '{"decision":"allow"}\n' && exit 0

command -v node >/dev/null 2>&1 || { printf '{"decision":"allow"}\n'; exit 0; }
node -e '
  const ctx = process.argv[1] || "";
  process.stdout.write(JSON.stringify({ decision: "allow", additionalContext: ctx }) + "\n");
' "$MEM_CONTEXT" 2>/dev/null || printf '{"decision":"allow"}\n'

exit 0
