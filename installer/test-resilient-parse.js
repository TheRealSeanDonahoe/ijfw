import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeMarketplace, tolerantJsonParse } from './src/marketplace.js';

test('parses settings.json with trailing comma gracefully', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-resilient-'));
  const path = join(dir, 'settings.json');
  writeFileSync(path, '{\n  "theme": "dark",\n  "custom": {"keep": "me"},\n}\n');
  mergeMarketplace(path);
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(parsed.theme, 'dark');
  assert.equal(parsed.custom.keep, 'me');
  assert.ok(parsed.extraKnownMarketplaces.ijfw);
  rmSync(dir, { recursive: true, force: true });
});

test('parses settings.json with // comments gracefully', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-resilient-'));
  const path = join(dir, 'settings.json');
  writeFileSync(path, '// user comment\n{\n  "theme": "dark" // inline\n}\n');
  mergeMarketplace(path);
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(parsed.theme, 'dark');
  assert.ok(parsed.extraKnownMarketplaces.ijfw);
  rmSync(dir, { recursive: true, force: true });
});

test('parses settings.json with block comments gracefully', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-resilient-'));
  const path = join(dir, 'settings.json');
  writeFileSync(path, '/* top */\n{\n  "theme": "dark" /* inline */,\n  "x": 1\n}\n');
  mergeMarketplace(path);
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(parsed.theme, 'dark');
  assert.equal(parsed.x, 1);
  rmSync(dir, { recursive: true, force: true });
});

test('truly malformed JSON aborts with clear error and leaves file unchanged', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-resilient-'));
  const path = join(dir, 'settings.json');
  const original = '{broken not recoverable';
  writeFileSync(path, original);
  let err;
  try { mergeMarketplace(path); } catch (e) { err = e; }
  assert.ok(err, 'must throw on unrecoverable JSON');
  assert.match(err.message, /settings\.json/);
  assert.equal(readFileSync(path, 'utf8'), original, 'file on disk unchanged');
  rmSync(dir, { recursive: true, force: true });
});

test('tolerantJsonParse handles all three cases', () => {
  assert.deepEqual(tolerantJsonParse('{"a":1}', 'x'), { a: 1 });
  assert.deepEqual(tolerantJsonParse('{"a":1,}', 'x'), { a: 1 });
  assert.deepEqual(tolerantJsonParse('// c\n{"a":1}', 'x'), { a: 1 });
});
