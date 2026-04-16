#!/usr/bin/env bash
# test-envelope-invariant-gemini.sh
# Asserts that the Gemini AfterTool decision envelope is the FINAL stdout line,
# even after the async observation capture is dispatched.
# Also asserts decision is always "allow" (never "deny").
#
# Acceptance: exit 0 if invariant holds, exit 1 if violated.

set -euo pipefail

REPO_ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AFTER_TOOL="$REPO_ROOT/gemini/extensions/ijfw/hooks/after-tool.sh"

if [ ! -f "$AFTER_TOOL" ]; then
  printf 'FAIL: after-tool.sh not found at %s\n' "$AFTER_TOOL" >&2
  exit 1
fi

# Minimal AfterTool payload.
PAYLOAD='{"event":"AfterTool","tool_name":"ReadFile","tool_input":{"path":"README.md"},"tool_response":{"output":"# IJFW\n"},"session_id":"test-gemini-001","timestamp":"2026-04-16T00:00:00Z"}'

# Run after-tool.sh with the payload, capture stdout.
OUTPUT=$(printf '%s' "$PAYLOAD" | bash "$AFTER_TOOL" 2>/dev/null)

if [ -z "$OUTPUT" ]; then
  printf 'FAIL: after-tool.sh produced no stdout\n' >&2
  exit 1
fi

# The final line must be valid JSON with decision:"allow" (never "deny").
FINAL_LINE=$(printf '%s\n' "$OUTPUT" | tail -1)

if ! printf '%s' "$FINAL_LINE" | node -e '
  let d = "";
  process.stdin.on("data", c => d += c);
  process.stdin.on("end", () => {
    try {
      const o = JSON.parse(d.trim());
      if (o && o.decision === "allow") process.exit(0);
      if (o && o.decision === "deny") {
        process.stderr.write("INVARIANT VIOLATED: decision is deny\n");
        process.exit(1);
      }
    } catch {}
    process.exit(1);
  });
' 2>/dev/null; then
  printf 'FAIL: final stdout line is not a valid Gemini decision:allow envelope\n' >&2
  printf 'Final line was: %s\n' "$FINAL_LINE" >&2
  exit 1
fi

printf 'PASS: Gemini AfterTool envelope is the terminal stdout line with decision:allow\n'
exit 0
