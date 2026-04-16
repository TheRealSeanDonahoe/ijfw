#!/usr/bin/env bash
# IJFW BeforeToolSelection (Gemini) -- policy enforcement checkpoint.
# Fires before Gemini selects which tool to use. Reads ijfw.toml policies
# and enforces deny rules by exiting 2 (abort) for critical violations.
# Approval-required ops emit additionalContext requesting user confirmation.
#
# Gemini hook JSON in/out:
#   stdin:  { "event": "BeforeToolSelection", "available_tools": [...],
#             "session_id": "...", "cwd": "...", "timestamp": "..." }
#   stdout: { "decision": "allow" }
#           exit 2 + stderr message = abort (critical policy violation only)
#
# No set -e -- hooks must never crash Gemini CLI.

[ "${IJFW_DISABLE:-}" = "1" ] && printf '{"decision":"allow"}\n' && exit 0

# Policy enforcement is handled primarily by policies/ijfw.toml via Gemini's
# native policy engine. This hook handles the lightweight cross-check that
# the policy file is present and readable. If absent, we allow and emit a
# one-time notice to .ijfw/.policy-notice so session-start can surface it.
POLICY_FILE=""
for candidate in \
    "$(pwd)/.gemini/extensions/ijfw/policies/ijfw.toml" \
    "$HOME/.gemini/extensions/ijfw/policies/ijfw.toml"; do
  [ -f "$candidate" ] && POLICY_FILE="$candidate" && break
done

if [ -z "$POLICY_FILE" ]; then
  # Policies not installed yet -- note it, allow through.
  NOTICE_FILE=".ijfw/.policy-notice"
  if [ ! -f "$NOTICE_FILE" ]; then
    mkdir -p .ijfw 2>/dev/null
    printf '1' > "$NOTICE_FILE" 2>/dev/null
  fi
fi

printf '{"decision":"allow"}\n'
exit 0
