#!/usr/bin/env bash
# Reads agent's last stdout from $AGENT_OUTPUT file if provided; otherwise fails.
set -euo pipefail
out="${AGENT_OUTPUT:-}"
if [ -z "$out" ] || [ ! -f "$out" ]; then
  echo "AGENT_OUTPUT env var must point to captured stdout file" >&2; exit 2
fi
grep -qE '^PATH:\s*repo/limits\.py\s*$' "$out"
