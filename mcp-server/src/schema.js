// --- Memory schema versioning (audit R1) ---
// Changes to memory file structure bump this constant. Readers auto-migrate
// legacy files on next touch (prepend-only, no data loss). Gives us room
// to evolve the on-disk format in future waves without silent corruption.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export const MEMORY_SCHEMA = 'v1';
export const SCHEMA_HEADER = `<!-- ijfw-schema: ${MEMORY_SCHEMA} -->`;

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
