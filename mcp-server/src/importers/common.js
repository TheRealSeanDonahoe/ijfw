// --- importer contract + shared helpers ---
//
// Every importer exposes:
//   export const NAME = 'claude-mem';
//   export function detect({ home, platform })  -> { found: bool, path, details }
//   export function readSource(path)            -> async iterable of raw records
//   export function normalize(record)           -> IJFW memory entry | null
//
// The CLI dispatcher (cli.js) composes these into: detect -> read -> normalize
// -> write (dry-run prints, --force overwrites, default skips on collision).
//
// Pure functions where possible. Filesystem IO is isolated to readSource and
// to the writer in cli.js so importers are unit-testable with fixtures.

// IJFW memory entry shape -- mirrors mcp-server/src/server.js handleStore.
//   type:    one of VALID_MEMORY_TYPES (decision | pattern | observation | handoff | preference)
//   content: sanitized body (caller enforces the 5000-char cap downstream)
//   summary: optional 1-line ≤80 chars (frontmatter name)
//   why:     optional
//   how_to_apply: optional
//   tags:    optional string[]
//   source:  provenance string ('claude-mem' | 'rtk' | ...)
//   importedAt: ISO timestamp (set by writer)
export function makeEntry({
  type,
  content,
  summary = null,
  why = null,
  how_to_apply = null,
  tags = [],
  source = 'unknown',
}) {
  if (!type || typeof content !== 'string' || content.length === 0) return null;
  return {
    type,
    content: content.trim(),
    summary: summary ? String(summary).slice(0, 80) : null,
    why: why ? String(why) : null,
    how_to_apply: how_to_apply ? String(how_to_apply) : null,
    tags: Array.isArray(tags) ? tags.slice(0, 20) : [],
    source,
  };
}

// Aggregate per-importer statistics for the CLI summary.
// Accepts { imported, skipped, failed } keys per category.
export function emptyStats() {
  return {
    decisions: 0,
    patterns: 0,
    observations: 0,
    handoffs: 0,
    preferences: 0,
    skipped: 0,
    failed: 0,
    total: 0,
  };
}

export function bumpStat(stats, entry, outcome) {
  if (outcome === 'skipped') stats.skipped += 1;
  else if (outcome === 'failed') stats.failed += 1;
  else if (entry && entry.type) {
    const key = `${entry.type}s`;
    if (stats[key] != null) stats[key] += 1;
  }
  stats.total += 1;
  return stats;
}

// Positive-framed summary line -- "Imported 47 sessions from claude-mem..."
export function renderSummary(source, stats) {
  const parts = [];
  if (stats.decisions)    parts.push(`${stats.decisions} decisions`);
  if (stats.patterns)     parts.push(`${stats.patterns} patterns`);
  if (stats.observations) parts.push(`${stats.observations} observations`);
  if (stats.handoffs)     parts.push(`${stats.handoffs} handoffs`);
  if (stats.preferences)  parts.push(`${stats.preferences} preferences`);
  const body = parts.length > 0 ? parts.join(' + ') : '0 entries';
  const tail = [];
  if (stats.skipped) tail.push(`${stats.skipped} skipped (already present; pass --force to overwrite)`);
  if (stats.failed)  tail.push(`${stats.failed} failed (see log)`);
  return `Imported ${body} from ${source}.` + (tail.length ? '  ' + tail.join('; ') + '.' : '');
}
