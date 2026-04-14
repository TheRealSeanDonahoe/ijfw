// --- Memory schema versioning (audit R1) ---
// Changes to memory file structure bump this constant. Readers auto-migrate
// legacy files on next touch (prepend-only, no data loss). Gives us room
// to evolve the on-disk format in future waves without silent corruption.

import { existsSync, readFileSync, writeFileSync, renameSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

export const MEMORY_SCHEMA = 'v1';
export const SCHEMA_HEADER = `<!-- ijfw-schema: ${MEMORY_SCHEMA} -->`;
export const LEGACY_HEADER_RE = /^<!-- ijfw[- ]schema[:\s][^>]*-->/;

export function ensureSchemaHeader(filepath) {
  if (!existsSync(filepath)) {
    writeFileSync(filepath, SCHEMA_HEADER + '\n\n');
    return 'created';
  }
  const cur = readFileSync(filepath, 'utf-8');
  if (cur.startsWith(SCHEMA_HEADER)) return 'current';
  writeFileSync(filepath, SCHEMA_HEADER + '\n\n' + cur);
  return 'migrated';
}

// W3.2 / ST4 — corruption recovery.
// If a memory file is non-zero but fails a structure sanity check,
// quarantine it to <name>.corrupt.<ts> and seed a fresh file. Returns
// 'ok' | 'recovered' | 'created'. Called before any read that treats
// the file as canonical (knowledge.md, handoff.md, project-journal.md).
//
// Sanity: file must parse as UTF-8 and either (a) start with an ijfw
// schema header or (b) be plain markdown with a leading `#` heading.
// Otherwise we treat it as corrupt and recover. Conservative by design:
// false positives cost a rename, not data.
export function recoverIfCorrupt(filepath) {
  if (!existsSync(filepath)) return 'ok';
  let cur;
  try {
    cur = readFileSync(filepath, 'utf-8');
  } catch (e) {
    return quarantine(filepath, cur, `read-failed:${e.code || e.message}`);
  }
  if (!cur) return 'ok'; // empty file is fine
  // Well-formed: schema header OR legacy header OR markdown heading.
  if (cur.startsWith(SCHEMA_HEADER)) return 'ok';
  if (LEGACY_HEADER_RE.test(cur)) return 'ok';
  if (/^\s*#/.test(cur)) return 'ok';
  // Binary-ish? Look for high ratio of non-printable bytes.
  const sample = cur.slice(0, 2048);
  const bad = (sample.match(/[\u0000-\u0008\u000E-\u001F]/g) || []).length;
  if (bad / Math.max(1, sample.length) > 0.02) {
    return quarantine(filepath, cur, 'binary-content');
  }
  // Default: treat as ok — preserve user's plain-text content even without
  // structure markers. We only recover on true corruption.
  return 'ok';
}

function quarantine(filepath, content, reason) {
  try {
    const ts = Date.now();
    const quarantinePath = join(dirname(filepath), `${basename(filepath)}.corrupt.${ts}`);
    if (content != null) {
      writeFileSync(quarantinePath, `<!-- ijfw-quarantine reason=${reason} at=${new Date(ts).toISOString()} -->\n\n${content}`);
    } else {
      try { renameSync(filepath, quarantinePath); } catch { /* file missing? */ }
    }
    writeFileSync(filepath, SCHEMA_HEADER + '\n\n');
    return 'recovered';
  } catch {
    return 'ok'; // never block a caller over recovery failure
  }
}
