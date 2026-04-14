#!/usr/bin/env bash
# Run all IJFW CI guards. Used before commit / release.
# Exits non-zero on any failure.

set -u
cd "$(dirname "$0")/.."

FAILED=0
run() {
  printf '\n=== %s ===\n' "$1"
  if ! eval "$2"; then FAILED=$((FAILED + 1)); fi
}

run "MCP server tests"         "node mcp-server/test.js"
run "Size caps"                "node --test mcp-server/test-size-caps.js"
run "Schema version"           "node --test mcp-server/test-schema-version.js"
run "Secret redactor"          "node --test mcp-server/test-redactor.js"
run "Metrics JSONL v3"         "node --test mcp-server/test-metrics-v3.js"
run "Intent router"            "node --test mcp-server/test-intent-router.js"
run "Prompt rewrite"           "node --test mcp-server/test-prompt-rewrite.js"
run "BM25 search"              "node --test mcp-server/test-search-bm25.js"
run "Corruption recovery"      "node --test mcp-server/test-corruption-recovery.js"
run "Feedback detector"        "node --test mcp-server/test-feedback-detector.js"
run "Vectors module"           "node --test mcp-server/test-vectors.js"
run "Audit roster"             "node --test mcp-server/test-audit-roster.js"
run "Cross dispatcher"         "node --test mcp-server/test-cross-dispatcher.js"
run "Sanitizer"                "node --test mcp-server/test-sanitizer.js"
run "Hook syntax (bash -n)"    "for f in claude/hooks/scripts/*.sh; do bash -n \"\$f\" || exit 1; done && echo OK"
run "Hook wiring"              "bash claude/hooks/tests/test-wiring.sh"
run "JSON validity"            "for f in claude/.claude-plugin/plugin.json claude/hooks/hooks.json gemini/.gemini/settings.json cursor/.cursor/mcp.json windsurf/mcp_config.json copilot/.vscode/mcp.json; do node -e \"JSON.parse(require('fs').readFileSync('\$f'))\" || exit 1; done && echo OK"
run "Line caps"                "bash scripts/check-line-caps.sh"
run "Positive framing"         "bash scripts/check-positive-framing.sh"
run "MCP launcher health"      "bash scripts/check-mcp.sh"
run "Doctor runs cleanly"      "bash scripts/doctor.sh >/dev/null"

echo ""
if [ $FAILED -gt 0 ]; then
  echo "FAIL: $FAILED check(s) failed."
  exit 1
fi
echo "All checks passed."
exit 0
