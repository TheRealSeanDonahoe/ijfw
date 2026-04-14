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

# Resolve detector + intent-router modules.
DETECTOR=""
ROUTER=""
for base in \
    "$CLAUDE_PLUGIN_ROOT/../mcp-server/src" \
    "$HOME/.ijfw/mcp-server/src" \
    "$(pwd)/mcp-server/src"; do
  if [ -f "$base/prompt-check.js" ]; then
    DETECTOR="$base/prompt-check.js"
    [ -f "$base/intent-router.js" ] && ROUTER="$base/intent-router.js"
    break
  fi
done
[ -z "$DETECTOR" ] && exit 0

# Single node invocation: intent router first (W2.1), then vague-prompt
# detector. Emits combined additionalContext. Stays under ~100ms.
ROUTER_IMPORT=""
ROUTER_CALL=""
ROUTER_STATE="null"
if [ -n "$ROUTER" ]; then
  ROUTER_IMPORT="import { detectIntent } from '$ROUTER';"
  ROUTER_CALL="const intent = detectIntent(prompt); if (intent) contextParts.push('<ijfw-intent>\\n' + intent.nudge + '\\n(Detected intent: ' + intent.intent + ' → ' + intent.skill + ')\\n</ijfw-intent>');"
  ROUTER_STATE="intent ? intent.intent : null"
fi

RESULT=$(node --input-type=module -e "
import { checkPrompt } from '$DETECTOR';
$ROUTER_IMPORT
import { writeFileSync, mkdirSync } from 'fs';
let payload = {};
try { payload = JSON.parse(process.argv[1] || '{}'); } catch {}
const prompt = payload.prompt || '';

const contextParts = [];
let intent = null;
$ROUTER_CALL

const r = checkPrompt(prompt);
try {
  mkdirSync('.ijfw', { recursive: true });
  writeFileSync('.ijfw/.prompt-check-state', JSON.stringify({
    fired: r.vague === true,
    signals: r.signals || [],
    intent: $ROUTER_STATE
  }));
} catch {}
if (r.vague) {
  contextParts.push('<ijfw-prompt-check>\\n' + r.suggestion + '\\nSignals: ' + r.signals.join(', ') + '. Override with leading * or \"ijfw off\".\\n</ijfw-prompt-check>');
}

if (contextParts.length > 0) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: contextParts.join('\\n\\n')
    }
  }));
}
" "$HOOK_STDIN" 2>/dev/null)

if [ -n "$RESULT" ]; then
  printf '%s' "$RESULT"
fi

exit 0
