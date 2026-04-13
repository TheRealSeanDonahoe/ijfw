#!/usr/bin/env bash
# IJFW SessionEnd (Stop hook) — save session state, write metrics, manage journal.
# NOTE: no `set -e` — hooks must NEVER crash Claude Code.
#
# Hardened against:
#   - JSONL corruption from unescaped env vars (uses node -e to encode JSON)
#   - local-time timestamps masquerading as UTC (TZ=UTC fallback)
#   - clobbering session-start's startup flags (always >>)
#   - schema drift (every record carries "v":1)

IJFW_DIR=".ijfw"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
# UTC ISO timestamp with TZ=UTC fallback for hardened containers where `date -u` fails.
ISO_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || TZ=UTC date +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$IJFW_DIR/sessions" "$IJFW_DIR/memory" "$IJFW_DIR/metrics" 2>/dev/null

METRICS_FILE="$IJFW_DIR/metrics/sessions.jsonl"

MODE="${IJFW_MODE:-smart}"
EFFORT="${CLAUDE_CODE_EFFORT_LEVEL:-high}"

ROUTING="native"
case "${OPENROUTER_API_KEY:-}" in ?*) ROUTING="OpenRouter" ;; esac
[ -f "$HOME/.claude-code-router/config.json" ] && ROUTING="smart-routing"

MEMORY_STORES=0
if [ -f "$IJFW_DIR/memory/project-journal.md" ]; then
  MEMORY_STORES=$(grep -c '^- \[' "$IJFW_DIR/memory/project-journal.md" 2>/dev/null)
  [ -z "$MEMORY_STORES" ] && MEMORY_STORES=0
fi

SESSION_COUNT=$(ls "$IJFW_DIR/sessions/" 2>/dev/null | wc -l | tr -d ' ')
[ -z "$SESSION_COUNT" ] && SESSION_COUNT=0
SESSION_NUM=$((SESSION_COUNT + 1))

HAS_HANDOFF="false"
[ -f "$IJFW_DIR/memory/handoff.md" ] && HAS_HANDOFF="true"

# Read Claude Code Stop hook payload from stdin (best-effort).
# Payload includes transcript_path; we parse the transcript for usage tokens.
HOOK_STDIN=""
if [ ! -t 0 ]; then
  HOOK_STDIN=$(cat 2>/dev/null || true)
fi

# Schema v2 (Phase 3 #6 + #2): adds input/output/cache tokens, cost_usd, model,
# and reserved prompt_check_* fields. v1 readers tolerate missing fields; v2
# readers tolerate v1 lines (token fields default to 0). Single bump avoids
# the coordination bug flagged in AUDIT.md.
if command -v node >/dev/null 2>&1; then
  JSONLINE=$(node -e '
    const fs = require("fs");
    let usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
    let model = null;

    // Parse Stop hook stdin (JSON) for transcript_path; sum usage across turns.
    try {
      const stdin = process.argv[8] || "";
      if (stdin.trim()) {
        const payload = JSON.parse(stdin);
        const tp = payload && payload.transcript_path;
        if (tp && fs.existsSync(tp)) {
          const lines = fs.readFileSync(tp, "utf8").split("\n");
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const m = JSON.parse(line);
              const u = m && m.message && m.message.usage;
              if (u) {
                usage.input_tokens += u.input_tokens || 0;
                usage.output_tokens += u.output_tokens || 0;
                usage.cache_read_input_tokens += u.cache_read_input_tokens || 0;
                usage.cache_creation_input_tokens += u.cache_creation_input_tokens || 0;
              }
              if (m && m.message && m.message.model && !model) model = m.message.model;
            } catch {}
          }
        }
      }
    } catch {}

    // Pricing table (USD per million tokens). Conservative — unknown model = 0.
    // Hardcoded by design (no proxy/no network rule); update on Anthropic SKU changes.
    const PRICES = {
      "claude-opus-4-6":     { in: 15.0, out: 75.0, cr: 1.50, cc: 18.75 },
      "claude-sonnet-4-6":   { in:  3.0, out: 15.0, cr: 0.30, cc:  3.75 },
      "claude-haiku-4-5":    { in:  0.8, out:  4.0, cr: 0.08, cc:  1.00 }
    };
    function cost() {
      if (!model) return 0;
      const key = String(model).replace(/-\d{8}.*$/, "").replace(/\[.*?\]$/, "");
      const p = PRICES[key];
      if (!p) return 0;
      const c = (usage.input_tokens * p.in + usage.output_tokens * p.out
              + usage.cache_read_input_tokens * p.cr + usage.cache_creation_input_tokens * p.cc) / 1e6;
      return Math.round(c * 10000) / 10000;
    }

    const o = {
      v: 2,
      timestamp: process.argv[1],
      session: Number(process.argv[2]),
      mode: process.argv[3],
      effort: process.argv[4],
      routing: process.argv[5],
      memory_stores: Number(process.argv[6]),
      handoff: process.argv[7] === "true",
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_read_tokens: usage.cache_read_input_tokens,
      cache_creation_tokens: usage.cache_creation_input_tokens,
      cost_usd: cost(),
      model: model,
      // Reserved for Phase 3 #2 — populated by pre-prompt hook via .ijfw/.prompt-check-state.
      prompt_check_fired: false,
      prompt_check_signals: []
    };

    // Merge prompt-check state file if present (set by #2 pre-prompt hook).
    try {
      const pcs = ".ijfw/.prompt-check-state";
      if (fs.existsSync(pcs)) {
        const st = JSON.parse(fs.readFileSync(pcs, "utf8"));
        if (st && typeof st === "object") {
          o.prompt_check_fired = !!st.fired;
          o.prompt_check_signals = Array.isArray(st.signals) ? st.signals : [];
        }
        try { fs.unlinkSync(pcs); } catch {}
      }
    } catch {}

    process.stdout.write(JSON.stringify(o));
  ' "$ISO_TIMESTAMP" "$SESSION_NUM" "$MODE" "$EFFORT" "$ROUTING" "$MEMORY_STORES" "$HAS_HANDOFF" "$HOOK_STDIN" 2>/dev/null)
  if [ -n "$JSONLINE" ]; then
    printf '%s\n' "$JSONLINE" >> "$METRICS_FILE" 2>/dev/null
  fi
fi

# Session marker — fixed-format, no user input interpolated.
{
  echo "<!-- ijfw schema:1 -->"
  echo "# Session: $TIMESTAMP"
  echo "Session #$SESSION_NUM"
  echo "Memory updates this session: $MEMORY_STORES"
  echo "Handoff present: $HAS_HANDOFF"
} > "$IJFW_DIR/sessions/session_$TIMESTAMP.md" 2>/dev/null

# Append schema-versioned journal entry.
JOURNAL="$IJFW_DIR/memory/project-journal.md"
if [ ! -f "$JOURNAL" ]; then
  {
    echo "<!-- ijfw schema:1 -->"
    echo "# IJFW Project Journal"
  } > "$JOURNAL" 2>/dev/null
fi
printf -- '- [%s] session-end: #%s\n' "$ISO_TIMESTAMP" "$SESSION_NUM" >> "$JOURNAL" 2>/dev/null

# Dream cycle trigger — APPEND, never clobber.
if [ "$SESSION_NUM" -gt 0 ] && [ $(( SESSION_NUM % 5 )) -eq 0 ]; then
  echo "IJFW_NEEDS_CONSOLIDATE=1" >> "$IJFW_DIR/.startup-flags" 2>/dev/null
fi

# Positive-framed status — no jargon, no negatives, no paths.
echo "Session #$SESSION_NUM saved."

exit 0
