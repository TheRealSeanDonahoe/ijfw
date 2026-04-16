#!/usr/bin/env bash
# IJFW BeforeTool (Gemini) -- maps Claude's PreToolUse / pre-tool-use.sh.
# Scans about-to-run commands for destructive patterns. Injects confirmation
# reminders. Never denies -- only adds context.
#
# Gemini hook JSON in/out:
#   stdin:  { "event": "BeforeTool", "tool_name": "...", "tool_input": {...}, "session_id": "...", "timestamp": "..." }
#   stdout: { "decision": "allow" }  OR  { "decision": "allow", "additionalContext": "..." }
#           exit 2 = abort the tool call (reserved for critical blocks only)
#
# No set -e -- hooks must never crash Gemini CLI.

[ "${IJFW_DISABLE:-}" = "1" ] && printf '{"decision":"allow"}\n' && exit 0

INPUT=$(head -c 1048576 2>/dev/null)
[ -z "$INPUT" ] && printf '{"decision":"allow"}\n' && exit 0

DETECTED=""

# Destructive filesystem.
if echo "$INPUT" | grep -Eiq '\brm[[:space:]]+(-[rRf]+[[:space:]]+)+(/|\$|~)' 2>/dev/null; then
  DETECTED="$DETECTED- Recursive delete at a top-level path. Verify target before confirming.\n"
fi
if echo "$INPUT" | grep -Eiq '\brm[[:space:]]+-rf[[:space:]]+\*' 2>/dev/null; then
  DETECTED="$DETECTED- Glob-wildcard recursive delete. Confirm scope.\n"
fi

# Git dangers.
if echo "$INPUT" | grep -Eiq '\bgit[[:space:]]+push[[:space:]]+(-[a-zA-Z]*f|--force|-f[[:space:]])' 2>/dev/null; then
  DETECTED="$DETECTED- Force push detected. Confirm branch and remote before proceeding.\n"
fi
if echo "$INPUT" | grep -Eiq '\bgit[[:space:]]+reset[[:space:]]+--hard' 2>/dev/null; then
  DETECTED="$DETECTED- Hard reset will discard uncommitted changes. Confirm HEAD target.\n"
fi
if echo "$INPUT" | grep -Eiq '\bgit[[:space:]]+clean[[:space:]]+-[a-zA-Z]*[fdx]' 2>/dev/null; then
  DETECTED="$DETECTED- git clean removes untracked files permanently. Confirm list first with -n.\n"
fi

# Database dangers.
if echo "$INPUT" | grep -Eiq '\b(drop|truncate)[[:space:]]+(table|database|schema)\b' 2>/dev/null; then
  DETECTED="$DETECTED- Destructive DB operation (DROP/TRUNCATE). Confirm target and backup.\n"
fi
if echo "$INPUT" | grep -Eiq '\bdelete[[:space:]]+from[[:space:]]+[a-z_]+[[:space:]]*(;|$)' 2>/dev/null; then
  DETECTED="$DETECTED- DELETE without WHERE clause. Confirm this is intended.\n"
fi

# Shell dangers.
if echo "$INPUT" | grep -Eiq ':\(\)\{.*;:\|:&\};:' 2>/dev/null; then
  DETECTED="$DETECTED- Fork bomb pattern. Do not execute.\n"
fi
if echo "$INPUT" | grep -Eiq '\bchmod[[:space:]]+-R[[:space:]]+777' 2>/dev/null; then
  DETECTED="$DETECTED- chmod -R 777 grants world write. Use tighter permissions.\n"
fi

# Package danger.
if echo "$INPUT" | grep -Eiq '\bnpm[[:space:]]+publish\b' 2>/dev/null; then
  DETECTED="$DETECTED- npm publish goes to the registry. Confirm version bump and scope.\n"
fi

if [ -n "$DETECTED" ]; then
  CONTEXT="<ijfw-verify>
Before proceeding, confirm:
$(printf '%b' "$DETECTED")
Proceed only if all lines above are intended.
</ijfw-verify>"
  command -v node >/dev/null 2>&1 || { printf '{"decision":"allow"}\n'; exit 0; }
  node -e '
    const ctx = process.argv[1] || "";
    process.stdout.write(JSON.stringify({ decision: "allow", additionalContext: ctx }) + "\n");
  ' "$CONTEXT" 2>/dev/null || printf '{"decision":"allow"}\n'
else
  printf '{"decision":"allow"}\n'
fi

exit 0
