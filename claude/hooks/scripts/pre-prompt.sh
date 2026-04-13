#!/usr/bin/env bash
# IJFW UserPromptSubmit — deterministic vague-prompt detector.
#
# Receives Claude Code's UserPromptSubmit JSON on stdin:
#   { "session_id": "...", "prompt": "..." }
#
# Writes:
#   - hookSpecificOutput.additionalContext (positive-framed hint, if vague)
#   - .ijfw/.prompt-check-state (JSON consumed by session-end metrics)
#
# Bypass conditions:
#   - severity1 prompt-improver plugin installed → defer entirely (no double prompt)
#   - .ijfw/config.json {"promptCheck": "off"} → skip
#   - prompt starts with `*`, `/`, or `#`; or contains "ijfw off" → skip
#
# NOTE: never crash Claude Code. Every step guards itself.

# Detect severity1 plugin and defer.
if [ -d "$HOME/.claude/plugins/cache/severity1-marketplace/prompt-improver" ]; then
  exit 0
fi

# Read user config (best-effort).
PROMPT_CHECK_MODE="signals"
if [ -f ".ijfw/config.json" ]; then
  cfg_mode=$(node -e '
    try {
      const c = JSON.parse(require("fs").readFileSync(".ijfw/config.json","utf8"));
      process.stdout.write(String(c.promptCheck || ""));
    } catch {}
  ' 2>/dev/null)
  case "$cfg_mode" in
    off|signals|interrupt) PROMPT_CHECK_MODE="$cfg_mode" ;;
  esac
fi
[ "$PROMPT_CHECK_MODE" = "off" ] && exit 0

# Read stdin payload.
HOOK_STDIN=""
if [ ! -t 0 ]; then
  HOOK_STDIN=$(cat 2>/dev/null || true)
fi
[ -z "$HOOK_STDIN" ] && exit 0

# Resolve prompt-check.js — works whether plugin is cached, dev repo, or HOME-installed.
DETECTOR=""
for candidate in \
    "$CLAUDE_PLUGIN_ROOT/../mcp-server/src/prompt-check.js" \
    "$HOME/.ijfw/mcp-server/src/prompt-check.js" \
    "$(pwd)/mcp-server/src/prompt-check.js"; do
  if [ -f "$candidate" ]; then DETECTOR="$candidate"; break; fi
done
[ -z "$DETECTOR" ] && exit 0

# Run detection. Single node invocation — parses stdin JSON, imports detector,
# emits structured result. Hook stays under typical 100ms.
RESULT=$(node --input-type=module -e "
import { checkPrompt } from '$DETECTOR';
import { writeFileSync, mkdirSync } from 'fs';
let payload = {};
try { payload = JSON.parse(process.argv[1] || '{}'); } catch {}
const prompt = payload.prompt || '';
const r = checkPrompt(prompt);
// Persist state for session-end metrics rollup.
try {
  mkdirSync('.ijfw', { recursive: true });
  writeFileSync('.ijfw/.prompt-check-state', JSON.stringify({
    fired: r.vague === true,
    signals: r.signals || []
  }));
} catch {}
if (r.vague) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: '<ijfw-prompt-check>\\n' + r.suggestion + '\\nSignals: ' + r.signals.join(', ') + '. Override with leading * or \"ijfw off\".\\n</ijfw-prompt-check>'
    }
  }));
}
" "$HOOK_STDIN" 2>/dev/null)

if [ -n "$RESULT" ]; then
  printf '%s' "$RESULT"
fi

exit 0
