// --- Storage caps (audit S1) ---
// Prevents a single rogue call from bloating knowledge files to MB-scale
// which would poison every future session-start read. Truncation uses a
// visible marker so callers (and users inspecting memory) can tell data
// was cut.

export const CAP_CONTENT = 4096;
export const CAP_WHY     = 1024;
export const CAP_HOW     = 1024;
export const CAP_SUMMARY = 120;

const MARKER = '…[truncated]';

function cap(s, limit) {
  if (typeof s !== 'string' || !s) return '';
  if (s.length <= limit) return s;
  return s.slice(0, limit - MARKER.length) + MARKER;
}

export function applyCaps({ content, summary, why, how_to_apply } = {}) {
  return {
    content:      cap(content, CAP_CONTENT),
    summary:      cap(summary, CAP_SUMMARY),
    why:          cap(why, CAP_WHY),
    how_to_apply: cap(how_to_apply, CAP_HOW),
  };
}
