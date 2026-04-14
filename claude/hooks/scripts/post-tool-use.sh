#!/usr/bin/env bash
# E4 — universal disable switch.
[ "${IJFW_DISABLE:-}" = "1" ] && exit 0
# IJFW PostToolUse — parses the Claude Code hook JSON payload, extracts
# tool_response text, trims noise, captures ERROR/FAIL signals into
# .session-signals.jsonl, and emits a hookSpecificOutput envelope with
# additionalContext so the cleaned output flows back into the agent.
#
# Round-2 audit fixes:
#   R2-A (critical) — previously piped raw JSON envelope through sed/awk.
#     Now extracts tool_response via node JSON parse; trimmer sees only
#     the actual output string.
#   R2-A (sub) — signal regex scoped to tool_response only, so a user
#     prompt containing "Error in foo.js" doesn't trigger a false
#     recurring-error memory.

IJFW_DIR=".ijfw"
FLAGS_FILE="$IJFW_DIR/.startup-flags"

# If RTK or context-mode is active, they handle stripping — we skip.
if [ -f "$FLAGS_FILE" ]; then
  if grep -q "IJFW_RTK_ACTIVE=1" "$FLAGS_FILE" 2>/dev/null; then exit 0; fi
  if grep -q "IJFW_CONTEXT_MODE_ACTIVE=1" "$FLAGS_FILE" 2>/dev/null; then exit 0; fi
fi

# Read PostToolUse payload from stdin (cap at 1MB to prevent memory exhaustion).
INPUT=$(head -c 1048576)
[ -z "$INPUT" ] && exit 0

# Require node for JSON parsing. If unavailable, fail open (exit 0) rather
# than fall back to the round-1 broken line-oriented pipeline.
command -v node >/dev/null 2>&1 || exit 0

# Extract tool_response text via node. Claude Code's PostToolUse payload
# has tool_response as either a string or an object with fields like
# output/stdout/stderr/text/content depending on the tool type.
RESPONSE_TEXT=$(node -e '
  try {
    const p = JSON.parse(process.argv[1] || "{}");
    const r = p && p.tool_response;
    if (!r) { process.stdout.write(""); process.exit(0); }
    if (typeof r === "string") { process.stdout.write(r); process.exit(0); }
    const parts = [];
    for (const k of ["output", "stdout", "stderr", "text", "content", "result"]) {
      if (r[k] == null) continue;
      parts.push(typeof r[k] === "string" ? r[k] : JSON.stringify(r[k]));
    }
    process.stdout.write(parts.join("\n"));
  } catch { process.stdout.write(""); }
' "$INPUT")
[ -z "$RESPONSE_TEXT" ] && exit 0

# Signal capture (W3.6 / H2, scoped per R2-A). Only scan tool_response,
# never the tool_input, so user prompts containing "error" don't pollute
# the recurring-error signal file.
mkdir -p .ijfw 2>/dev/null
FIRST_ERR=$(printf '%s' "$RESPONSE_TEXT" | grep -iE '^(ERROR|FATAL|CRITICAL)|(^|[[:space:]])(Error|Exception|Traceback)[[:space:]:]' 2>/dev/null | head -1 | cut -c1-200)
FIRST_FAIL=$(printf '%s' "$RESPONSE_TEXT" | grep -iE '\b(test(s)? failed|failed with|assertion (failed|error))\b' 2>/dev/null | head -1 | cut -c1-200)
if [ -n "$FIRST_ERR" ] || [ -n "$FIRST_FAIL" ]; then
  TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || TZ=UTC date +"%Y-%m-%dT%H:%M:%SZ")
  node -e '
    const fs = require("fs");
    const rec = { ts: process.argv[1], error: process.argv[2] || null, fail: process.argv[3] || null };
    try { fs.appendFileSync(".ijfw/.session-signals.jsonl", JSON.stringify(rec) + "\n"); } catch {}
  ' "$TS" "$FIRST_ERR" "$FIRST_FAIL" 2>/dev/null
fi

# Trim noise on tool_response only.
CLEANED=$(printf '%s' "$RESPONSE_TEXT" | sed -E '
  # Strip ANSI escape codes
  s/'"$(printf '\033')"'\[[0-9;]*[a-zA-Z]//g
  # Strip trailing whitespace
  s/[[:space:]]+$//
' | awk '
  # Collapse consecutive blank lines
  /^$/ { if (blank) next; blank=1; print; next }
  { blank=0; print }
' | sed -E '
  /^[[:space:]]*(✓|√|PASS )/d
  /^[[:space:]]*\.\.\.\./d
  /^collecting/d
  /^[[:space:]]*npm (warn|notice)/d
  /^added [0-9]+ packages/d
  /^Requirement already satisfied/d
  /^Downloading /d
  /^Installing collected/d
  /^[[:space:]]*--->/d
  /^Removing intermediate container/d
  /^[[:space:]]*\[internal\]/d
  /^chunk \{/d
  /^asset [a-f0-9]/d
  /^[[:space:]]*(Compiling|Downloading|Fresh) /d
')

# Truncate if output exceeds 500 lines. Log-aware: keep first 100 + key
# signals + last 30 when there are ERROR/WARN markers; else head+tail.
LINE_COUNT=$(printf '%s\n' "$CLEANED" | wc -l | tr -d ' ')
if [ "${LINE_COUNT:-0}" -gt 500 ]; then
  if printf '%s' "$CLEANED" | grep -Eq '^(ERROR|WARN|FAIL|CRITICAL|FATAL|Traceback|[[:space:]]*at [A-Z])' \
     || printf '%s' "$CLEANED" | grep -Eqi '\berror\b|\bwarn(ing)?\b|\bfailed\b'; then
    HEAD_PART=$(printf '%s\n' "$CLEANED" | head -100)
    TAIL_PART=$(printf '%s\n' "$CLEANED" | tail -30)
    ERRORS=$(printf '%s\n' "$CLEANED" | grep -En -B1 -A1 -iE '\b(error|warn(ing)?|failed|traceback|fatal|critical)\b' 2>/dev/null | head -120)
    OUT=$(printf '%s\n\n... [trimmed: %s lines → head 100 + key signals + tail 30] ...\n\n%s\n\n... tail ...\n\n%s\n' \
      "$HEAD_PART" "$LINE_COUNT" "$ERRORS" "$TAIL_PART")
  else
    HEAD_PART=$(printf '%s\n' "$CLEANED" | head -250)
    TAIL_PART=$(printf '%s\n' "$CLEANED" | tail -50)
    OUT=$(printf '%s\n\n... [truncated: %s lines — showing first 250 + last 50] ...\n\n%s\n' \
      "$HEAD_PART" "$LINE_COUNT" "$TAIL_PART")
  fi
else
  OUT="$CLEANED"
fi

# Emit as hookSpecificOutput envelope so the trimmed content flows back
# into agent context via Claude Code's additionalContext mechanism. Using
# node -e to guarantee valid JSON regardless of special chars in OUT.
node -e '
  const out = process.argv[1] || "";
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: out
    }
  }));
' "$OUT" 2>/dev/null

exit 0
