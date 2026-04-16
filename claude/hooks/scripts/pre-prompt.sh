#!/usr/bin/env bash
# IJFW UserPromptSubmit -- deterministic vague-prompt detector.
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

# E4 -- universal disable switch.
[ "${IJFW_DISABLE:-}" = "1" ] && exit 0

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

# Resolve detector + intent-router + feedback-detector modules.
DETECTOR=""
ROUTER=""
FEEDBACK=""
for base in \
    "$CLAUDE_PLUGIN_ROOT/../mcp-server/src" \
    "$HOME/.ijfw/mcp-server/src" \
    "$(pwd)/mcp-server/src"; do
  if [ -f "$base/prompt-check.js" ]; then
    DETECTOR="$base/prompt-check.js"
    [ -f "$base/intent-router.js" ] && ROUTER="$base/intent-router.js"
    [ -f "$base/feedback-detector.js" ] && FEEDBACK="$base/feedback-detector.js"
    break
  fi
done
[ -z "$DETECTOR" ] && exit 0

# Single node invocation: intent router first (W2.1), then vague-prompt
# detector. Emits combined additionalContext. Stays under ~100ms.
ROUTER_ARG=""
ROUTER_CALL=""
ROUTER_STATE="null"
if [ -n "$ROUTER" ]; then
  ROUTER_ARG="$ROUTER"
  ROUTER_CALL="const routerMod = await import(process.argv[3]); const { detectIntent } = routerMod; const intent = detectIntent(prompt); if (intent) contextParts.push('<ijfw-intent>\\n' + intent.nudge + '\\n(Detected intent: ' + intent.intent + ' → ' + intent.skill + ')\\n</ijfw-intent>');"
  ROUTER_STATE="intent ? intent.intent : null"
fi
FEEDBACK_ARG=""
FEEDBACK_CALL="const feedback = [];"
if [ -n "$FEEDBACK" ]; then
  FEEDBACK_ARG="$FEEDBACK"
  FEEDBACK_CALL="const feedbackMod = await import(process.argv[4]); const { detectFeedback } = feedbackMod; const feedback = detectFeedback(prompt);"
fi

RESULT=$(node --input-type=module -e "
const { checkPrompt } = await import(process.argv[2]);
import { writeFileSync, mkdirSync, appendFileSync } from 'fs';
let payload = {};
try { payload = JSON.parse(process.argv[1] || '{}'); } catch {}
const prompt = payload.prompt || '';

const contextParts = [];
$ROUTER_CALL
$FEEDBACK_CALL

// Persist feedback signals so session-end auto-memorize can synthesize.
if (feedback && feedback.length) {
  try {
    mkdirSync('.ijfw', { recursive: true });
    for (const f of feedback) {
      appendFileSync('.ijfw/.session-feedback.jsonl',
        JSON.stringify({ ts: new Date().toISOString(), ...f }) + '\\n');
    }
  } catch {}
}

const r = checkPrompt(prompt);
try {
  mkdirSync('.ijfw', { recursive: true });
  writeFileSync('.ijfw/.prompt-check-state', JSON.stringify({
    fired: r.vague === true,
    signals: r.signals || [],
    intent: $ROUTER_STATE,
    feedback_kinds: feedback.map(f => f.kind)
  }));
} catch {}
if (r.vague) {
  let block = '<ijfw-prompt-check>\\n' + r.suggestion;
  if (Array.isArray(r.rewrite) && r.rewrite.length) {
    block += '\\n\\nAsk back:';
    for (const q of r.rewrite) block += '\\n  • ' + q;
  }
  block += '\\nOverride: start prompt with * to skip, or say \"ijfw off\" to disable.\\nSignals: ' + r.signals.join(', ') + '.\\n</ijfw-prompt-check>';
  contextParts.push(block);
}

if (contextParts.length > 0) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: contextParts.join('\\n\\n')
    }
  }));
}
" "$HOOK_STDIN" "$DETECTOR" "$ROUTER_ARG" "$FEEDBACK_ARG" 2>/dev/null)

if [ -n "$RESULT" ]; then
  printf '%s' "$RESULT"
fi

exit 0
