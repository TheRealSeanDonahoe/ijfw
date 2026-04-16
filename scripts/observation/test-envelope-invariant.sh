#!/usr/bin/env bash
# test-envelope-invariant.sh
# Asserts that the PostToolUse trim envelope is the FINAL stdout line,
# even after the async observation capture is dispatched.
#
# Acceptance: exit 0 if invariant holds, exit 1 if violated.

set -euo pipefail

REPO_ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
POST_TOOL_USE="$REPO_ROOT/claude/hooks/scripts/post-tool-use.sh"

if [ ! -f "$POST_TOOL_USE" ]; then
  echo "FAIL: post-tool-use.sh not found at $POST_TOOL_USE" >&2
  exit 1
fi

# Minimal PostToolUse payload that produces a non-empty envelope.
PAYLOAD='{"tool_name":"Bash","tool_input":{"command":"echo hello"},"tool_response":{"output":"hello world"}}'

# Run post-tool-use.sh with the payload, capture stdout.
OUTPUT=$(printf '%s' "$PAYLOAD" | bash "$POST_TOOL_USE" 2>/dev/null)

if [ -z "$OUTPUT" ]; then
  echo "FAIL: post-tool-use.sh produced no stdout" >&2
  exit 1
fi

# The final line must be valid JSON with hookSpecificOutput key.
FINAL_LINE=$(printf '%s\n' "$OUTPUT" | tail -1)

if ! printf '%s' "$FINAL_LINE" | node -e '
  let d = "";
  process.stdin.on("data", c => d += c);
  process.stdin.on("end", () => {
    try {
      const o = JSON.parse(d.trim());
      if (o && o.hookSpecificOutput && o.hookSpecificOutput.hookEventName === "PostToolUse") {
        process.exit(0);
      }
    } catch {}
    process.exit(1);
  });
' 2>/dev/null; then
  echo "FAIL: final stdout line is not a valid PostToolUse hookSpecificOutput envelope" >&2
  printf 'Final line was: %s\n' "$FINAL_LINE" >&2
  exit 1
fi

echo "PASS: PostToolUse envelope is the terminal stdout line"
exit 0
