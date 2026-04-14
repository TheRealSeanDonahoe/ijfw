import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recoverIfCorrupt, SCHEMA_HEADER } from './src/schema.js';

test('empty file returns ok (no recovery needed)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-corrupt-'));
  const p = join(dir, 'm.md');
  writeFileSync(p, '');
  assert.equal(recoverIfCorrupt(p), 'ok');
  rmSync(dir, { recursive: true, force: true });
});

test('schema-headered file returns ok', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-corrupt-'));
  const p = join(dir, 'm.md');
  writeFileSync(p, SCHEMA_HEADER + '\n\ncontent');
  assert.equal(recoverIfCorrupt(p), 'ok');
  rmSync(dir, { recursive: true, force: true });
});

test('legacy-headered file returns ok', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-corrupt-'));
  const p = join(dir, 'm.md');
  writeFileSync(p, '<!-- ijfw schema:1 -->\n\nold stuff');
  assert.equal(recoverIfCorrupt(p), 'ok');
  rmSync(dir, { recursive: true, force: true });
});

test('plain markdown with heading returns ok', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-corrupt-'));
  const p = join(dir, 'm.md');
  writeFileSync(p, '# My Notes\n\n- item 1\n- item 2\n');
  assert.equal(recoverIfCorrupt(p), 'ok');
  rmSync(dir, { recursive: true, force: true });
});

test('binary content is quarantined + fresh file seeded', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-corrupt-'));
  const p = join(dir, 'm.md');
  // Write 100 bytes of binary-ish content (NUL + low-control chars).
  const binary = Buffer.from(new Array(200).fill(0).map((_, i) => i % 256));
  writeFileSync(p, binary);
  const r = recoverIfCorrupt(p);
  assert.equal(r, 'recovered');
  // Quarantine file exists.
  const entries = readdirSync(dir);
  const quarantined = entries.find(n => n.endsWith('.corrupt.' + (entries.find(x => /\.corrupt\.\d+$/.test(x))?.match(/\d+$/)?.[0] || '')));
  assert.ok(entries.some(n => /\.corrupt\.\d+$/.test(n)), 'quarantine file created');
  // Main file is now a fresh header-only file.
  const fresh = readFileSync(p, 'utf8');
  assert.ok(fresh.startsWith(SCHEMA_HEADER));
  rmSync(dir, { recursive: true, force: true });
});

test('unheaded plain text is preserved (not quarantined)', () => {
  // Conservative policy: preserve user's plain-text content.
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-corrupt-'));
  const p = join(dir, 'm.md');
  writeFileSync(p, 'just a note, no header or heading');
  assert.equal(recoverIfCorrupt(p), 'ok');
  rmSync(dir, { recursive: true, force: true });
});

test('missing file returns ok without throwing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-corrupt-'));
  const p = join(dir, 'does-not-exist.md');
  assert.equal(recoverIfCorrupt(p), 'ok');
  rmSync(dir, { recursive: true, force: true });
});
