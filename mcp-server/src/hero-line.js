// hero-line.js — one-line summary renderer for cross-run receipts.
// Codex U1 caveat: delta is NEVER fabricated. If real data is insufficient,
// the delta suffix is omitted entirely.

// Format duration in whole seconds (or ms if <1000ms total).
function fmtDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${Math.round(ms / 1000)}s`;
}

// Normalize receipt findings into { total, consensus } counts regardless of
// whether the receipt came from audit/critique (findings.items), research
// (findings.consensus / findings.contested / findings.unique as arrays), or
// a legacy numeric shape ({ consensus: N, contested: N, unique: N }).
function countFindings(f) {
  if (!f) return { total: 0, consensus: 0 };
  if (Array.isArray(f.items)) return { total: f.items.length, consensus: 0 };
  // Array-shape (research output)
  if (Array.isArray(f.consensus)) {
    const consensus = f.consensus.length;
    const contested = Array.isArray(f.contested) ? f.contested.length : 0;
    const unique = Object.values(f.unique || {}).reduce((a, b) => a + (Array.isArray(b) ? b.length : 0), 0);
    return { total: consensus + contested + unique, consensus };
  }
  // Legacy numeric shape
  const consensus = typeof f.consensus === 'number' ? f.consensus : 0;
  const contested = typeof f.contested === 'number' ? f.contested : 0;
  const unique    = typeof f.unique    === 'number' ? f.unique    : 0;
  return { total: consensus + contested + unique, consensus };
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
  let totalFindings = 0;
  let totalConsensus = 0;
  let receiptsInputTokens = 0;
  let hasReceiptsTokens = true;

  for (const r of receipts) {
    if (Array.isArray(r.auditors)) {
      for (const a of r.auditors) {
        if (a && a.id) auditorIds.add(a.id);
      }
    }
    totalMs += (typeof r.duration_ms === 'number') ? r.duration_ms : 0;
    const counts = countFindings(r.findings);
    totalFindings += counts.total;
    totalConsensus += counts.consensus;
    if (r.input_tokens == null) {
      hasReceiptsTokens = false;
    } else {
      receiptsInputTokens += r.input_tokens;
    }
  }

  // Value statement (Sutherland lens): what was delivered, not what was done.
  const baseline = `${auditorIds.size} AIs surfaced ${totalFindings} findings (${totalConsensus} consensus-critical) in ${fmtDuration(totalMs)}`;

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
