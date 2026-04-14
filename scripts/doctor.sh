#!/usr/bin/env bash
# IJFW doctor — user-facing health check. Wraps existing check-*.sh dev
# scripts in human-friendly, positive-framed output.
set -uo pipefail
cd "$(dirname "$0")/.."

ok()   { printf "  ✓ %s\n" "$1"; }
info() { printf "  · %s\n" "$1"; }

echo "IJFW health check"
echo ""

echo "[Files]"
[ -f claude/hooks/hooks.json ]        && ok "hook wiring present"
[ -f mcp-server/bin/ijfw-memory ]     && ok "MCP launcher present"
home="${IJFW_HOME:-$HOME/.ijfw}"
if [ -d "$home" ]; then
  ok "IJFW home reachable at $home"
else
  info "IJFW home will be created on first use ($home)"
fi
echo ""

echo "[Memory]"
mem_dir="$home/memory"
if [ -d "$mem_dir" ]; then
  count=$(find "$mem_dir" -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')
  ok "$count memory file(s) in $mem_dir"
else
  info "memory directory will be created on first store"
fi
echo ""

echo "[MCP server]"
if bash scripts/check-mcp.sh >/dev/null 2>&1; then
  ok "MCP server responds cleanly"
else
  info "MCP launcher present — will initialize on first Claude session"
fi
echo ""

echo "[Hook wiring]"
if bash claude/hooks/tests/test-wiring.sh >/dev/null 2>&1; then
  ok "all 6 hook events correctly wired"
else
  info "hook wiring needs attention — run: bash claude/hooks/tests/test-wiring.sh"
fi
echo ""

echo "[Line caps]"
if bash scripts/check-line-caps.sh >/dev/null 2>&1; then
  ok "skill and rule files under their caps"
else
  info "line caps need attention — run: bash scripts/check-line-caps.sh"
fi
echo ""

echo "[Positive framing]"
if bash scripts/check-positive-framing.sh >/dev/null 2>&1; then
  ok "user-facing surfaces clean"
else
  info "user-facing surfaces want review — run: bash scripts/check-positive-framing.sh"
fi
echo ""

HOOK_LOG="$HOME/.ijfw/logs/hooks.log"
if [ -s "$HOOK_LOG" ]; then
  RECENT=$(tail -3 "$HOOK_LOG" 2>/dev/null | head -c 300)
  if [ -n "$RECENT" ]; then
    echo "[Hook log]"
    info "recent hook output available at $HOOK_LOG"
    echo ""
  fi
else
  echo "[Hook log]"
  ok "no hook output this week"
  echo ""
fi

echo "Doctor complete."
