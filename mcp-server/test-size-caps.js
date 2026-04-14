import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sandbox = mkdtempSync(join(tmpdir(), 'ijfw-caps-'));
process.env.IJFW_PROJECT_DIR = sandbox;
const { CAP_CONTENT, CAP_WHY, CAP_HOW, CAP_SUMMARY, applyCaps } = await import('./src/caps.js');

test('CAP_CONTENT is 4096', () => assert.equal(CAP_CONTENT, 4096));
test('CAP_WHY is 1024', () => assert.equal(CAP_WHY, 1024));
test('CAP_HOW is 1024', () => assert.equal(CAP_HOW, 1024));
test('CAP_SUMMARY is 120', () => assert.equal(CAP_SUMMARY, 120));

test('content cap truncates with marker', () => {
  const capped = applyCaps({ content: 'a'.repeat(10_000) });
  assert.ok(capped.content.length <= CAP_CONTENT);
  assert.ok(capped.content.endsWith('…[truncated]'));
});

test('why cap truncates at 1024', () => {
  const capped = applyCaps({ content: 'ok', why: 'b'.repeat(5_000) });
  assert.ok(capped.why.length <= CAP_WHY);
  assert.ok(capped.why.endsWith('…[truncated]'));
});

test('how_to_apply cap truncates at 1024', () => {
  const capped = applyCaps({ content: 'ok', how_to_apply: 'c'.repeat(5_000) });
  assert.ok(capped.how_to_apply.length <= CAP_HOW);
});

test('summary cap truncates at 120', () => {
  const capped = applyCaps({ content: 'ok', summary: 'd'.repeat(500) });
  assert.ok(capped.summary.length <= CAP_SUMMARY);
});

test('under-cap values pass through untouched', () => {
  const r = applyCaps({ content: 'small', why: 'w', how_to_apply: 'h', summary: 's' });
  assert.equal(r.content, 'small');
  assert.equal(r.why, 'w');
  assert.equal(r.how_to_apply, 'h');
  assert.equal(r.summary, 's');
});

test('missing fields become empty strings', () => {
  const r = applyCaps({});
  assert.equal(r.content, '');
  assert.equal(r.why, '');
  assert.equal(r.how_to_apply, '');
  assert.equal(r.summary, '');
});

test('non-string inputs become empty', () => {
  const r = applyCaps({ content: 42, why: null, how_to_apply: {}, summary: undefined });
  assert.equal(r.content, '');
  assert.equal(r.why, '');
  assert.equal(r.how_to_apply, '');
  assert.equal(r.summary, '');
});
