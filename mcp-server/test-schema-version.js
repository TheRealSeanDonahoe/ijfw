import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureSchemaHeader, MEMORY_SCHEMA, SCHEMA_HEADER } from './src/schema.js';

test('MEMORY_SCHEMA is a v-prefixed version string', () => {
  assert.match(MEMORY_SCHEMA, /^v\d+$/);
});

test('SCHEMA_HEADER is HTML comment with version', () => {
  assert.equal(SCHEMA_HEADER, `<!-- ijfw-schema: ${MEMORY_SCHEMA} -->`);
});

test('ensureSchemaHeader creates missing file with header', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-schema-'));
  const p = join(dir, 'm.md');
  const result = ensureSchemaHeader(p);
  assert.equal(result, 'created');
  assert.ok(existsSync(p));
  const txt = readFileSync(p, 'utf8');
  assert.ok(txt.startsWith(SCHEMA_HEADER));
  rmSync(dir, { recursive: true, force: true });
});

test('ensureSchemaHeader leaves correctly-versioned file alone', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-schema-'));
  const p = join(dir, 'm.md');
  const original = `${SCHEMA_HEADER}\n\n- [2026-04-14] existing entry\n`;
  writeFileSync(p, original);
  const result = ensureSchemaHeader(p);
  assert.equal(result, 'current');
  assert.equal(readFileSync(p, 'utf8'), original);
  rmSync(dir, { recursive: true, force: true });
});

test('ensureSchemaHeader migrates legacy file without losing content', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-schema-'));
  const p = join(dir, 'm.md');
  const legacy = '- [2026-01-01] old entry\n- [2026-01-02] another\n';
  writeFileSync(p, legacy);
  const result = ensureSchemaHeader(p);
  assert.equal(result, 'migrated');
  const txt = readFileSync(p, 'utf8');
  assert.ok(txt.startsWith(SCHEMA_HEADER));
  assert.ok(txt.includes('old entry'));
  assert.ok(txt.includes('another'));
  rmSync(dir, { recursive: true, force: true });
});
