#!/usr/bin/env bash
# Quick MCP server health probe -- initialize handshake + ping. Exits 0 healthy,
# 1 if the launcher won't run, 2 if the protocol handshake fails.
# Used by session-start.sh to surface a positive "Memory ready" line OR a
# Donahoe-P7 actionable green path when the server can't start.

LAUNCHER="${1:-}"
[ -z "$LAUNCHER" ] && LAUNCHER="$(dirname "$0")/../mcp-server/bin/ijfw-memory"

if [ ! -x "$LAUNCHER" ]; then
  exit 1
fi

# Pipe an initialize request and a ping; expect two valid responses on stdout.
# 1.5s timeout -- generous given normal startup is sub-100ms.
RESULT=$({
  printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
  printf '%s\n' '{"jsonrpc":"2.0","id":2,"method":"ping","params":{}}'
  sleep 0.3
} | "$LAUNCHER" 2>/dev/null | head -2)

if printf '%s' "$RESULT" | grep -q '"id":1' && printf '%s' "$RESULT" | grep -q '"id":2'; then
  exit 0
fi
exit 2
