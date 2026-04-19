#!/usr/bin/env node
/**
 * Tests: mcp-server/src/memory/recall-counter.js
 * Run: node mcp-server/test-recall-counter.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { buildRecallCounts, mergeRecallCounts, topRecalled } = await import('./src/memory/recall-counter.js');

const LEDGER = join(tmpdir(), 'ijfw-recall-test-' + Date.now() + '.jsonl');

function makeObs(overrides) {
  return JSON.stringify({
    type:      'memory-recall',
    ts:        new Date().toISOString(),
    tool_name: 'ijfw_memory_recall',
    file_path: '/memory/file-a.md',
    platform:  'mcp',
    ...overrides,
  });
}

// Two recalls for file-a this week, one for file-b last week
const lastWeekTs = new Date(Date.now() - 8 * 86400000).toISOString();
const lines = [
  makeObs({ file_path: '/memory/file-a.md' }),
  makeObs({ file_path: '/memory/file-a.md' }),
  makeObs({ file_path: '/memory/file-b.md', ts: lastWeekTs }),
  '{ bad json }',  // should be skipped
  '',              // blank line
];
writeFileSync(LEDGER, lines.join('\n') + '\n');

test('counts all-time recalls per file', () => {
  const { counts } = buildRecallCounts(LEDGER);
  assert.equal(counts.get('/memory/file-a.md'), 2);
  assert.equal(counts.get('/memory/file-b.md'), 1);
});

test('week counts exclude old entries', () => {
  const { weekCounts } = buildRecallCounts(LEDGER);
  assert.equal(weekCounts.get('/memory/file-a.md'), 2);
  assert.equal(weekCounts.get('/memory/file-b.md'), undefined);
});

test('totalThisWeek counts only this week', () => {
  const { totalThisWeek } = buildRecallCounts(LEDGER);
  assert.equal(totalThisWeek, 2);
});

test('mergeRecallCounts attaches counts to file list', () => {
  const { counts, weekCounts } = buildRecallCounts(LEDGER);
  const files = [
    { path: '/memory/file-a.md', title: 'A' },
    { path: '/memory/file-c.md', title: 'C' },
  ];
  const merged = mergeRecallCounts(files, counts, weekCounts);
  assert.equal(merged[0].recall_count, 2);
  assert.equal(merged[0].recall_count_week, 2);
  assert.equal(merged[1].recall_count, 0);
  assert.equal(merged[1].recall_count_week, 0);
});

test('topRecalled returns sorted top N', () => {
  const files = [
    { path: '/memory/file-a.md', relpath: 'file-a.md', title: 'A', recall_count: 5 },
    { path: '/memory/file-b.md', relpath: 'file-b.md', title: 'B', recall_count: 10 },
    { path: '/memory/file-c.md', relpath: 'file-c.md', title: 'C', recall_count: 0 },
  ];
  const top = topRecalled(files, 2);
  assert.equal(top.length, 2);
  assert.equal(top[0].count, 10);
  assert.equal(top[1].count, 5);
});

test('handles non-existent ledger gracefully', () => {
  const { counts, totalThisWeek } = buildRecallCounts('/nonexistent/observations.jsonl');
  assert.equal(counts.size, 0);
  assert.equal(totalThisWeek, 0);
});

process.on('exit', () => {
  try { rmSync(LEDGER); } catch {}
});
