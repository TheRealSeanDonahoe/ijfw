// --- RTK importer (scaffold) ---
//
// RTK is a third-party Claude Code context-trimming / memory plugin
// (referenced in prior IJFW handoffs alongside claude-mem). The exact npm
// name + on-disk layout are pinned in .planning/phase12/IMPORTER-SCHEMAS.md
// after Phase 12 schema-research. This scaffold parses the two plausible
// layouts (single JSON doc and per-file dir) so fixture-based tests run
// green while the real format is nailed down.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { homedir } from 'node:os';
import { makeEntry } from './common.js';

export const NAME = 'rtk';

export function detect({ home = homedir(), path = null } = {}) {
  const candidates = path ? [path] : [
    join(home, '.rtk'),
    join(home, '.claude', 'rtk'),
    join(home, '.config', 'rtk'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      const stats = statSync(p);
      return { found: true, path: p, isDir: stats.isDirectory() };
    }
  }
  return { found: false, path: null };
}

export function* readSource(path) {
  if (!path || !existsSync(path)) return;

  const stat = statSync(path);
  if (stat.isFile() && path.endsWith('.json')) {
    try {
      const doc = JSON.parse(readFileSync(path, 'utf8'));
      yield* flattenRtk(doc);
    } catch { /* skip malformed root doc */ }
    return;
  }

  if (stat.isDirectory()) {
    const index = join(path, 'index.json');
    if (existsSync(index)) {
      try {
        const doc = JSON.parse(readFileSync(index, 'utf8'));
        yield* flattenRtk(doc);
      } catch { /* skip */ }
      return;
    }
    for (const name of readdirSync(path)) {
      if (extname(name) !== '.json') continue;
      try {
        const doc = JSON.parse(readFileSync(join(path, name), 'utf8'));
        yield* flattenRtk(doc);
      } catch { /* skip */ }
    }
  }
}

// RTK docs often wrap entries under `entries`, `memories`, or `contexts`.
function* flattenRtk(doc) {
  if (!doc) return;
  if (Array.isArray(doc)) { for (const r of doc) yield r; return; }
  if (typeof doc !== 'object') return;
  for (const key of ['entries', 'memories', 'contexts', 'items']) {
    if (Array.isArray(doc[key])) { for (const r of doc[key]) yield r; return; }
  }
  yield doc;
}

export function normalize(record) {
  if (!record || typeof record !== 'object') return null;

  const content =
    record.content ||
    record.text ||
    record.body ||
    record.context ||
    '';
  if (!content) return null;

  const rawType = record.type || record.category || record.kind || 'observation';
  const mapped = mapType(rawType);
  if (!mapped) return null;

  return makeEntry({
    type: mapped,
    content,
    summary: record.title || record.label || record.summary || null,
    why: record.rationale || record.why || null,
    how_to_apply: record.guidance || record.how_to_apply || null,
    tags: Array.isArray(record.tags) ? record.tags.map(String) : [],
    source: NAME,
  });
}

function mapType(raw) {
  const t = String(raw).toLowerCase();
  if (t.includes('decision'))   return 'decision';
  if (t.includes('pattern'))    return 'pattern';
  if (t.includes('preference')) return 'preference';
  if (t.includes('handoff'))    return 'handoff';
  return 'observation';
}
