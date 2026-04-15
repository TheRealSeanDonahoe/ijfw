// --- claude-mem importer ---
//
// Reads claude-mem's SQLite store (~/.claude-mem/claude-mem.db), normalizes
// `observations` rows into IJFW entries, and (via cli.js) writes them to the
// local project's .ijfw/memory/.
//
// Schema: see .planning/phase12/IMPORTER-SCHEMAS.md.
//
// SQLite access uses Node 22.5+'s built-in `node:sqlite`. On older Node, the
// importer surfaces a positive-framed upgrade message via detect().

import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { makeEntry } from './common.js';

export const NAME = 'claude-mem';

const DEFAULT_CANDIDATES = (home) => [
  join(home, '.claude-mem', 'claude-mem.db'),
  join(home, '.config', 'claude-mem', 'claude-mem.db'),
];

export function detect({ home = homedir(), path = null } = {}) {
  const candidates = path ? [path] : DEFAULT_CANDIDATES(home);
  for (const p of candidates) {
    if (existsSync(p) && statSync(p).isFile()) {
      return { found: true, path: p };
    }
  }
  return { found: false, path: null };
}

// Async so we can `await import('node:sqlite')` and surface a useful error
// on Node <22.5 without crashing the CLI.
export async function* readSource(path) {
  if (!path || !existsSync(path)) return;

  let sqliteMod;
  try {
    sqliteMod = await import('node:sqlite');
  } catch {
    throw new Error(
      'claude-mem importer needs Node 22.5+ for built-in SQLite. ' +
      'Upgrade Node then retry: https://nodejs.org/en/download'
    );
  }

  const { DatabaseSync } = sqliteMod;
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const rows = db
      .prepare('SELECT title, subtitle, type, narrative, facts, concepts, files_modified, project, session_id, created_at FROM observations ORDER BY created_at_epoch ASC')
      .all();
    for (const r of rows) yield r;
  } finally {
    db.close();
  }
}

// Normalize one row. Returns null if the row is too empty to preserve.
export function normalize(row) {
  if (!row || typeof row !== 'object') return null;

  const narrative = String(row.narrative || '').trim();
  const title     = String(row.title     || '').trim();
  if (!narrative && !title) return null;

  const type = mapType(row.type);
  const tags = parseJsonArray(row.concepts).slice(0, 20).map(String);
  const facts = parseJsonArray(row.facts).map(String);
  const filesModified = parseJsonArray(row.files_modified).map(String);

  // Compose content: narrative + optional facts bullets + files-modified trailer
  // + provenance line. Keeps the original claim intact while making it
  // recall-friendly in IJFW's BM25 layer.
  const parts = [narrative || title];
  if (facts.length > 0) {
    parts.push('', 'Facts:', ...facts.map((f) => `- ${f}`));
  }
  if (filesModified.length > 0) {
    parts.push('', `Files touched: ${filesModified.join(', ')}`);
  }
  const projectTag = row.project ? basename(String(row.project)) : null;
  if (projectTag || row.session_id) {
    parts.push('', `_Imported from claude-mem${projectTag ? ` -- project ${projectTag}` : ''}${row.session_id ? ` -- session ${row.session_id}` : ''}_`);
  }

  return makeEntry({
    type,
    content: parts.join('\n'),
    summary: title || narrative.slice(0, 80),
    tags,
    source: NAME,
  });
}

function mapType(raw) {
  const t = String(raw || '').toLowerCase();
  if (t === 'decision')   return 'decision';
  if (t === 'discovery')  return 'observation';
  if (t === 'feature' || t === 'refactor' || t === 'change' || t === 'bugfix') return 'pattern';
  return 'observation';
}

function parseJsonArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function basename(p) {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return idx >= 0 ? p.slice(idx + 1) : p;
}
