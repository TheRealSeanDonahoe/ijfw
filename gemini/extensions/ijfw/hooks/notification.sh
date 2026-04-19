#!/usr/bin/env bash
# IJFW Notification (Gemini) -- relay notifications to IJFW journal.
# Captures Gemini's native notification events for audit trail.
#
# Gemini hook JSON in/out:
#   stdin:  { "event": "Notification", "message": "...", "level": "...",
#             "session_id": "...", "cwd": "...", "timestamp": "..." }
#   stdout: { "decision": "allow" }
#
# No set -e -- hooks must never crash Gemini CLI.

[ "${IJFW_DISABLE:-}" = "1" ] && printf '{"decision":"allow"}\n' && exit 0

HOOK_STDIN=$(head -c 16384 2>/dev/null)
[ -z "$HOOK_STDIN" ] && printf '{"decision":"allow"}\n' && exit 0

command -v node >/dev/null 2>&1 || { printf '{"decision":"allow"}\n'; exit 0; }

node -e '
  const fs = require("fs");
  let payload = {};
  try { payload = JSON.parse(process.argv[1] || "{}"); } catch {}
  const msg = payload.message || "";
  const level = payload.level || "info";
  if (!msg) { process.exit(0); }
  try {
    fs.mkdirSync(".ijfw", { recursive: true });
    const ts = new Date().toISOString();
    fs.appendFileSync(".ijfw/.notifications.jsonl",
      JSON.stringify({ ts, level, message: msg.slice(0, 500) }) + "\n");
  } catch {}
' "$HOOK_STDIN" 2>/dev/null

printf '{"decision":"allow"}\n'
exit 0
