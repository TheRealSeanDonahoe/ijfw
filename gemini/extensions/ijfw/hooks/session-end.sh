#!/usr/bin/env bash
# IJFW SessionEnd (Gemini) -- save session state, write metrics, emit savings receipt.
# Gemini hook JSON in/out:
#   stdin:  { "event": "SessionEnd", "session_id": "...", "cwd": "...", "timestamp": "..." }
#   stdout: { "decision": "allow" }
#
# No set -e -- hooks must never crash Gemini CLI.

[ "${IJFW_DISABLE:-}" = "1" ] && printf '{"decision":"allow"}\n' && exit 0

IJFW_DIR=".ijfw"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
ISO_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || TZ=UTC date +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$IJFW_DIR/sessions" "$IJFW_DIR/memory" "$IJFW_DIR/metrics" 2>/dev/null

METRICS_FILE="$IJFW_DIR/metrics/sessions.jsonl"
MODE="${IJFW_MODE:-smart}"

MEMORY_STORES=0
if [ -f "$IJFW_DIR/memory/project-journal.md" ]; then
  MEMORY_STORES=$(grep -c '^- \[' "$IJFW_DIR/memory/project-journal.md" 2>/dev/null || true)
  [ -z "$MEMORY_STORES" ] && MEMORY_STORES=0
fi

LOCK="$IJFW_DIR/.session-counter.lock"
COUNTER="$IJFW_DIR/.session-counter"
SESSION_NUM=""
for i in 1 2 3 4 5; do
  if mkdir "$LOCK" 2>/dev/null; then
    trap 'rmdir "$LOCK" 2>/dev/null' EXIT
    CURRENT=$(cat "$COUNTER" 2>/dev/null || echo 0)
    SESSION_NUM=$((CURRENT + 1))
    echo "$SESSION_NUM" > "$COUNTER"
    rmdir "$LOCK" 2>/dev/null
    trap - EXIT
    break
  fi
  sleep 0.1
done
SESSION_NUM="${SESSION_NUM:-$(date +%s%N 2>/dev/null | tail -c 8 || date +%s)}"

HAS_HANDOFF="false"
[ -f "$IJFW_DIR/memory/handoff.md" ] && HAS_HANDOFF="true"

HOOK_STDIN=""
if [ ! -t 0 ]; then
  HOOK_STDIN=$(cat 2>/dev/null || true)
fi

# Write metrics record.
if command -v node >/dev/null 2>&1; then
  node -e '
    const fs = require("fs");
    const rec = {
      v: 1,
      ts: process.argv[1],
      session_num: parseInt(process.argv[2], 10),
      mode: process.argv[3],
      memory_stores: parseInt(process.argv[4], 10),
      has_handoff: process.argv[5] === "true",
      platform: "gemini"
    };
    try {
      fs.mkdirSync(".ijfw/metrics", { recursive: true });
      fs.appendFileSync(".ijfw/metrics/sessions.jsonl", JSON.stringify(rec) + "\n");
    } catch {}
  ' "$ISO_TIMESTAMP" "$SESSION_NUM" "$MODE" "$MEMORY_STORES" "$HAS_HANDOFF" 2>/dev/null
fi

# Write session file.
SESSION_FILE="$IJFW_DIR/sessions/session_$TIMESTAMP.md"
{
  printf '# Session %s\n' "$SESSION_NUM"
  printf 'timestamp: %s\n' "$ISO_TIMESTAMP"
  printf 'mode: %s\n' "$MODE"
  printf 'platform: gemini\n'
  printf 'memory_stores: %s\n' "$MEMORY_STORES"
} > "$SESSION_FILE" 2>/dev/null

# Clean up turn counter.
rm -f "$IJFW_DIR/.turn-count" 2>/dev/null

# Emit receipt.
RECEIPT="[ijfw] Session $SESSION_NUM complete ($MEMORY_STORES memory entries)."
command -v node >/dev/null 2>&1 || { printf '{"decision":"allow"}\n'; exit 0; }
node -e '
  const receipt = process.argv[1] || "";
  const out = { decision: "allow" };
  if (receipt) out.systemMessage = receipt;
  process.stdout.write(JSON.stringify(out) + "\n");
' "$RECEIPT" 2>/dev/null || printf '{"decision":"allow"}\n'

exit 0
