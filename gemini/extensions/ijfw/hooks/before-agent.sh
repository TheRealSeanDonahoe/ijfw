#!/usr/bin/env bash
# IJFW BeforeAgent (Gemini) -- maps Claude's UserPromptSubmit / pre-prompt.sh.
# Deterministic vague-prompt detector. Injects sharpening context when prompt
# signals are weak.
#
# Gemini hook JSON in/out:
#   stdin:  { "event": "BeforeAgent", "session_id": "...", "prompt": "...", "cwd": "...", "timestamp": "..." }
#   stdout: { "decision": "allow" }  OR  { "decision": "allow", "additionalContext": "..." }
#
# No set -e -- hooks must never crash Gemini CLI.

[ "${IJFW_DISABLE:-}" = "1" ] && printf '{"decision":"allow"}\n' && exit 0

# Read config.
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
[ "$PROMPT_CHECK_MODE" = "off" ] && printf '{"decision":"allow"}\n' && exit 0

HOOK_STDIN=""
if [ ! -t 0 ]; then
  HOOK_STDIN=$(head -c 1048576 2>/dev/null || true)
fi
[ -z "$HOOK_STDIN" ] && printf '{"decision":"allow"}\n' && exit 0

command -v node >/dev/null 2>&1 || { printf '{"decision":"allow"}\n'; exit 0; }

# Resolve prompt-check module.
DETECTOR=""
for base in \
    "$HOME/.ijfw/mcp-server/src" \
    "$(pwd)/mcp-server/src"; do
  [ -f "$base/prompt-check.js" ] && DETECTOR="$base/prompt-check.js" && break
done
[ -z "$DETECTOR" ] && printf '{"decision":"allow"}\n' && exit 0

RESULT=$(node --input-type=module -e "
import { checkPrompt } from '$DETECTOR';
import { writeFileSync, mkdirSync } from 'fs';
let payload = {};
try { payload = JSON.parse(process.argv[1] || '{}'); } catch {}
const prompt = payload.prompt || '';
// Skip bypass prefixes.
if (/^[*\/#]/.test(prompt) || /ijfw off/i.test(prompt)) { process.exit(0); }
const r = checkPrompt(prompt);
try {
  mkdirSync('.ijfw', { recursive: true });
  writeFileSync('.ijfw/.prompt-check-state', JSON.stringify({ fired: r.vague === true, signals: r.signals || [] }));
} catch {}
if (r.vague) {
  let block = '<ijfw-prompt-check>\n' + r.suggestion;
  if (Array.isArray(r.rewrite) && r.rewrite.length) {
    block += '\n\nAsk back:';
    for (const q of r.rewrite) block += '\n  - ' + q;
  }
  block += '\nOverride: start prompt with * to skip.\nSignals: ' + r.signals.join(', ') + '.\n</ijfw-prompt-check>';
  process.stdout.write(JSON.stringify({ decision: 'allow', additionalContext: block }) + '\n');
}
" "$HOOK_STDIN" 2>/dev/null)

if [ -n "$RESULT" ]; then
  printf '%s' "$RESULT"
else
  printf '{"decision":"allow"}\n'
fi

exit 0
