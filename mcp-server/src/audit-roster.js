// --- Cross-audit roster (P5 followup) ---
//
// Who can we ask for a second opinion? This module knows the roster of
// audit-capable CLI tools, fingerprints the currently-running caller via
// env vars, and offers the "first non-self" as the default auditor.
//
// Detection is conservative: we'd rather show all options than silently
// exclude a valid one. If we genuinely can't tell who's calling, nothing
// gets filtered.

export const ROSTER = [
  {
    id: 'codex',
    name: 'Codex CLI',
    invoke: 'codex exec',
    note: 'Different training lineage; fast on review tasks.',
    detect: (env) => Boolean(env.CODEX_SESSION_ID || env.CODEX_HOME) || /codex/i.test(env._ || ''),
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    invoke: 'gemini',
    note: 'Strong on security + architectural patterns.',
    detect: (env) => Boolean(env.GEMINI_CLI || env.GOOGLE_CLOUD_PROJECT_GEMINI) || /gemini-cli/i.test(env._ || ''),
  },
  {
    id: 'opencode',
    name: 'opencode',
    invoke: 'opencode',
    note: 'OSS / local-friendly; good when privacy matters.',
    detect: (env) => Boolean(env.OPENCODE_SESSION || env.OPENCODE_HOME),
  },
  {
    id: 'aider',
    name: 'Aider',
    invoke: 'aider --message',
    note: 'Code-focused peer; terse + diff-aware.',
    detect: (env) => Boolean(env.AIDER_SESSION) || /aider/i.test(env._ || ''),
  },
  {
    id: 'copilot',
    name: 'Copilot CLI',
    invoke: 'gh copilot suggest',
    note: 'Convenient if gh CLI is already authenticated.',
    detect: (env) => Boolean(env.GH_COPILOT_TOKEN || env.COPILOT_CLI_SESSION),
  },
  {
    id: 'claude',
    name: 'Claude Code',
    invoke: 'claude -p',
    note: 'Anthropic; useful when you want a second Claude pass in a fresh session.',
    detect: (env) => Boolean(env.CLAUDECODE || env.CLAUDE_CODE_ENTRYPOINT || env.CLAUDE_PLUGIN_ROOT),
  },
];

// Returns the id of the current caller, or null if unknown.
export function detectSelf(env = process.env) {
  for (const entry of ROSTER) {
    try { if (entry.detect(env)) return entry.id; } catch { /* ignore */ }
  }
  return null;
}

// Returns roster entries, marking self and filtering when requested.
//   { excludeSelf: bool, only: string | null }
export function rosterFor({ excludeSelf = true, only = null, env = process.env } = {}) {
  const self = detectSelf(env);
  let list = ROSTER.map(e => ({ ...e, isSelf: e.id === self }));
  if (only) {
    const match = list.find(e => e.id === only.toLowerCase());
    return match ? [match] : [];
  }
  if (excludeSelf && self) list = list.filter(e => !e.isSelf);
  return list;
}

// Pick the top default auditor (first non-self).
export function defaultAuditor(env = process.env) {
  const list = rosterFor({ excludeSelf: true, env });
  return list[0] || null;
}

// Pretty-print the roster for user consumption.
export function formatRoster(env = process.env) {
  const self = detectSelf(env);
  const lines = [];
  for (const e of ROSTER) {
    const mark = e.id === self ? 'self' : 'available';
    lines.push(`  ${e.id.padEnd(9)} ${mark.padEnd(9)} — ${e.name} (${e.invoke}) — ${e.note}`);
  }
  const header = self
    ? `Detected caller: ${self}. Other auditors available:`
    : `Caller unknown — full roster:`;
  return header + '\n' + lines.join('\n');
}
