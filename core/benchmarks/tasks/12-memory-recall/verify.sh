#!/usr/bin/env bash
set -euo pipefail
out="${AGENT_OUTPUT:-}"
[ -n "$out" ] && [ -f "$out" ] || { echo "AGENT_OUTPUT required" >&2; exit 2; }
grep -qE '^CANARY:\s*heliotrope-42\s*$' "$out"
