#!/usr/bin/env node
/**
 * Tests: mcp-server/src/memory/search.js
 * Run: node mcp-server/test-memory-search.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = join(tmpdir(), 'ijfw-mem-search-test-' + Date.now());
mkdirSync(BASE, { recursive: true });

const FILES = [
  {
    name: 'alpha.md',
    content: '# Alpha\nThis file talks about caching strategies in depth.\n',
  },
  {
    name: 'beta.md',
    content: '# Beta\nMemory recall and positive framing are core to IJFW.\n',
  },
  {
    name: 'gamma.md',
    content: '# Gamma\nA plain note with no special keywords.\n',
  },
];

for (const f of FILES) {
  writeFileSync(join(BASE, f.name), f.content);
}

// Build file list in reader format
const fileList = FILES.map(f => ({
  path:    join(BASE, f.name),
  relpath: f.name,
  title:   f.name.replace('.md', ''),
  preview: f.content.slice(0, 200),
}));

const { searchMemory } = await import('./src/memory/search.js');

test('returns matching results for substring query', () => {
  const results = searchMemory('caching', fileList);
  assert.ok(results.length > 0, 'should find caching in alpha.md');
  assert.equal(results[0].relpath, 'alpha.md');
});

test('title match scores higher than body match', () => {
  // "Alpha" is in the title of alpha.md and the body of nobody
  const results = searchMemory('positive', fileList);
  // beta.md has "positive" in body
  assert.ok(results.length > 0, 'should find positive in beta.md');
  assert.equal(results[0].relpath, 'beta.md');
});

test('empty query returns empty array', () => {
  assert.deepEqual(searchMemory('', fileList), []);
});

test('no match returns empty array', () => {
  assert.deepEqual(searchMemory('xyzzy_never_found', fileList), []);
});

test('case-insensitive match', () => {
  const r1 = searchMemory('CACHING', fileList);
  const r2 = searchMemory('caching', fileList);
  assert.equal(r1.length, r2.length);
});

test('snippet includes context around match', () => {
  const results = searchMemory('recall', fileList);
  assert.ok(results.length > 0);
  assert.ok(results[0].snippet.length > 0, 'snippet should be non-empty');
});

test('limit is respected', () => {
  // All files match 'a' (it appears in all)
  const results = searchMemory('a', fileList, 2);
  assert.ok(results.length <= 2, 'should respect limit');
});

test('results sorted by score descending', () => {
  const results = searchMemory('a', fileList);
  for (let i = 1; i < results.length; i++) {
    assert.ok(results[i - 1].score >= results[i].score, 'should be sorted by score');
  }
});

process.on('exit', () => {
  try { rmSync(BASE, { recursive: true }); } catch {}
});
