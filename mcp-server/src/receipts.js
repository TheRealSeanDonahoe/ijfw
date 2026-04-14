// receipts.js — atomic append/read for cross-run JSONL receipts.
// ESM, zero deps, synchronous fs.

import fs from 'node:fs';
import path from 'node:path';

export function RECEIPTS_FILE(projectDir) {
  return path.join(projectDir, '.ijfw', 'receipts', 'cross-runs.jsonl');
}

// Atomic append: O_APPEND is atomic for writes ≤ PIPE_BUF (≥4KB on POSIX).
// One JSON line is well under that limit, so appendFileSync is safe for
// concurrent writers without a lock or rename dance.
export function writeReceipt(projectDir, record) {
  const dest = RECEIPTS_FILE(projectDir);
  const dir = path.dirname(dest);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(dest, JSON.stringify(record) + '\n');
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
