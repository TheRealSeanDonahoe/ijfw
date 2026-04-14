// hero-line.js — one-line summary renderer for cross-run receipts.
// Codex U1 caveat: delta is NEVER fabricated. If real data is insufficient,
// the delta suffix is omitted entirely.

// Format duration in whole seconds (or ms if <1000ms total).
function fmtDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${Math.round(ms / 1000)}s`;
}

// renderHeroLine(receipts, sessions?)
//   receipts — array of cross-runs.jsonl records
//   sessions — array of sessions.jsonl v3 records (optional, default [])
//
// Returns a one-line string. Delta is only appended when:
//   - receipts have real input_tokens (sum > 0)
//   - sessions has ≥3 entries with non-null input_tokens (Claude baseline)
//   - baseline sum > 0
export function renderHeroLine(receipts, sessions = []) {
  if (!receipts || receipts.length === 0) {
    return 'No cross-audit runs yet';
  }

  // Aggregate auditor IDs (unique across all receipts).
  const auditorIds = new Set();
  let totalMs = 0;
  let consensus = 0;
  let contested = 0;
  let unique = 0;
  let receiptsInputTokens = 0;
  let hasReceiptsTokens = true;

  for (const r of receipts) {
    if (Array.isArray(r.auditors)) {
      for (const a of r.auditors) {
        if (a && a.id) auditorIds.add(a.id);
      }
    }
    totalMs += (typeof r.duration_ms === 'number') ? r.duration_ms : 0;
    if (r.findings && typeof r.findings === 'object') {
      consensus += r.findings.consensus || 0;
      contested += r.findings.contested || 0;
      unique += r.findings.unique || 0;
    }
    if (r.input_tokens == null) {
      hasReceiptsTokens = false;
    } else {
      receiptsInputTokens += r.input_tokens;
    }
  }

  const totalFindings = consensus + contested + unique;
  const baseline = `${auditorIds.size} AIs · ${fmtDuration(totalMs)} · ${totalFindings} findings, ${consensus} consensus-critical`;

  // Codex U1: only compute delta when all guards pass.
  if (!hasReceiptsTokens || receiptsInputTokens <= 0) {
    return baseline;
  }

  // Filter sessions: must be Claude-only entries with real input_tokens.
  const claudeSessions = (sessions || []).filter(
    s => s && s.input_tokens != null && s.input_tokens > 0
  );

  const MIN_SAMPLES = 3;
  if (claudeSessions.length < MIN_SAMPLES) {
    return baseline;
  }

  const sessionBaseline = claudeSessions.reduce((sum, s) => sum + s.input_tokens, 0);
  if (sessionBaseline <= 0) {
    return baseline;
  }

  const delta = 1 - (receiptsInputTokens / sessionBaseline);
  const pct = Math.round(Math.abs(delta) * 100);
  const sign = delta >= 0 ? '\u2212' : '+';
  const n = claudeSessions.length;

  return `${baseline} · measured \u0394: ${sign}${pct}% tokens vs solo Claude ${n}\u00D7`;
}
