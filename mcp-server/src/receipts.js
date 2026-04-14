// receipts.js — atomic append/read for cross-run JSONL receipts.
// ESM, zero deps, synchronous fs.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function RECEIPTS_FILE(projectDir) {
  return path.join(projectDir, '.ijfw', 'receipts', 'cross-runs.jsonl');
}

// Atomic append: write to .tmp then rename to avoid partial-line corruption.
export function writeReceipt(projectDir, record) {
  const dest = RECEIPTS_FILE(projectDir);
  const dir = path.dirname(dest);
  fs.mkdirSync(dir, { recursive: true });

  const line = JSON.stringify(record) + '\n';

  // Read existing content (may not exist yet), append line, write atomically.
  let existing = '';
  if (fs.existsSync(dest)) {
    existing = fs.readFileSync(dest, 'utf8');
  }

  const tmp = dest + '.tmp.' + process.pid + '.' + Date.now();
  fs.writeFileSync(tmp, existing + line, 'utf8');
  fs.renameSync(tmp, dest);
}

// Read and parse all lines; skip corrupt lines; return array.
export function readReceipts(projectDir) {
  const file = RECEIPTS_FILE(projectDir);
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, 'utf8');
  const results = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      results.push(JSON.parse(line));
    } catch {
      // skip malformed line
    }
  }
  return results;
}
