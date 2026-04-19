#!/usr/bin/env bash
# E4 -- universal disable switch.
[ "${IJFW_DISABLE:-}" = "1" ] && exit 0
# IJFW PreToolUse -- scans the about-to-run command for destructive patterns
# BEFORE execution and injects a verification reminder. The agent sees it
# next turn and can abort or refine.
#
# Corrected in Phase-6 audit: semantically this is the right place for
# warnings (pre-execution) and hook input here is `tool_input` only (no
# `tool_response` yet). Output trimming moved to post-tool-use.sh.
#
# Positive framing: phrases actions as "confirm X" not "Warning: Y".
# Never blocks execution -- only augments context.

IJFW_DIR=".ijfw"
INPUT=$(head -c 1048576)
[ -z "$INPUT" ] && exit 0

# Detection patterns match against the command string embedded in the
# PreToolUse JSON payload (tool_input.command for Bash; tool_input fields
# for other tools carry paths/queries which are also safe to grep).
DETECTED=""

# Destructive filesystem
if echo "$INPUT" | grep -Eiq '\brm[[:space:]]+(-[rRf]+[[:space:]]+)+(/|\$|~)' 2>/dev/null; then
  DETECTED="$DETECTED- Recursive delete at a top-level path. Verify target before confirming.\n"
fi
if echo "$INPUT" | grep -Eiq '\brm[[:space:]]+-rf[[:space:]]+\*' 2>/dev/null; then
  DETECTED="$DETECTED- Glob-wildcard recursive delete. Confirm scope.\n"
fi

# Git dangers
if echo "$INPUT" | grep -Eiq '\bgit[[:space:]]+push[[:space:]]+(-[a-zA-Z]*f|--force|-f[[:space:]])' 2>/dev/null; then
  DETECTED="$DETECTED- Force push detected. Confirm branch and remote before proceeding.\n"
fi
if echo "$INPUT" | grep -Eiq '\bgit[[:space:]]+reset[[:space:]]+--hard' 2>/dev/null; then
  DETECTED="$DETECTED- Hard reset will discard uncommitted changes. Confirm HEAD target.\n"
fi
if echo "$INPUT" | grep -Eiq '\bgit[[:space:]]+clean[[:space:]]+-[a-zA-Z]*[fdx]' 2>/dev/null; then
  DETECTED="$DETECTED- git clean removes untracked files permanently. Confirm list first with -n.\n"
fi

# Database dangers
if echo "$INPUT" | grep -Eiq '\b(drop|truncate)[[:space:]]+(table|database|schema)\b' 2>/dev/null; then
  DETECTED="$DETECTED- Destructive DB operation (DROP/TRUNCATE). Confirm target + backup.\n"
fi
if echo "$INPUT" | grep -Eiq '\bdelete[[:space:]]+from[[:space:]]+[a-z_]+[[:space:]]*(;|$)' 2>/dev/null; then
  DETECTED="$DETECTED- DELETE without WHERE clause. Confirm this is intended.\n"
fi

# Shell dangers
if echo "$INPUT" | grep -Eiq ':\(\)\{.*;:\|:&\};:' 2>/dev/null; then
  DETECTED="$DETECTED- Fork bomb pattern. Do not execute.\n"
fi
if echo "$INPUT" | grep -Eiq '\bchmod[[:space:]]+-R[[:space:]]+777' 2>/dev/null; then
  DETECTED="$DETECTED- chmod -R 777 grants world write. Use tighter permissions.\n"
fi

# Package/dependency danger
if echo "$INPUT" | grep -Eiq '\bnpm[[:space:]]+publish\b' 2>/dev/null; then
  DETECTED="$DETECTED- npm publish goes to the registry. Confirm version bump + scope.\n"
fi

if [ -n "$DETECTED" ]; then
  cat <<EOF
<ijfw-verify>
Before proceeding, confirm:
$(printf '%b' "$DETECTED")
Proceed only if all lines above are intended.
</ijfw-verify>
EOF
fi

exit 0
