import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RECEIPTS_FILE, writeReceipt, readReceipts } from './src/receipts.js';
import { renderHeroLine } from './src/hero-line.js';

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ijfw-receipts-test-'));
}

function makeReceipt(overrides = {}) {
  return {
    v: 1,
    timestamp: new Date().toISOString(),
    run_stamp: 'test-stamp-001',
    mode: 'audit',
    auditors: [
      { id: 'codex', family: 'openai', model: '' },
      { id: 'gemini', family: 'google', model: '' },
    ],
    findings: { consensus: 2, contested: 1, unique: 3 },
    duration_ms: 47000,
    input_tokens: 12000,
    cost_usd: 0.05,
    model: null,
    ...overrides,
  };
}

function makeSession(overrides = {}) {
  return {
    v: 3,
    timestamp: new Date().toISOString(),
    input_tokens: 30000,
    output_tokens: 8000,
    model: 'claude-sonnet-4-6',
    ...overrides,
  };
}

// --- TASK-6-1 tests ---

test('writeReceipt creates file and parent dirs', () => {
  const dir = tmpDir();
  try {
    writeReceipt(dir, makeReceipt());
    const file = RECEIPTS_FILE(dir);
    assert.ok(fs.existsSync(file), 'cross-runs.jsonl should exist');
    assert.ok(fs.existsSync(path.dirname(file)), 'receipts dir should exist');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('two sequential writes produce two lines', () => {
  const dir = tmpDir();
  try {
    writeReceipt(dir, makeReceipt({ run_stamp: 'a' }));
    writeReceipt(dir, makeReceipt({ run_stamp: 'b' }));
    const raw = fs.readFileSync(RECEIPTS_FILE(dir), 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    assert.equal(lines.length, 2);
    assert.equal(JSON.parse(lines[0]).run_stamp, 'a');
    assert.equal(JSON.parse(lines[1]).run_stamp, 'b');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readReceipts skips malformed lines', () => {
  const dir = tmpDir();
  try {
    writeReceipt(dir, makeReceipt({ run_stamp: 'good' }));
    // Inject a malformed line directly.
    fs.appendFileSync(RECEIPTS_FILE(dir), 'NOT_JSON\n');
    writeReceipt(dir, makeReceipt({ run_stamp: 'also-good' }));
    const records = readReceipts(dir);
    assert.equal(records.length, 2);
    assert.equal(records[0].run_stamp, 'good');
    assert.equal(records[1].run_stamp, 'also-good');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readReceipts returns [] when file does not exist', () => {
  const dir = tmpDir();
  try {
    const records = readReceipts(dir);
    assert.deepEqual(records, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// --- TASK-6-2 tests ---

test('renderHeroLine([]) returns safe empty-state string', () => {
  const out = renderHeroLine([]);
  assert.equal(out, 'No cross-audit runs yet');
});

test('renderHeroLine with real receipt and no sessions omits delta', () => {
  const out = renderHeroLine([makeReceipt()], []);
  assert.ok(out.includes('findings'), 'should include findings count');
  assert.ok(!out.includes('measured'), 'should NOT include measured Δ');
  assert.ok(!out.includes('%'), 'should NOT include a percentage');
});

test('renderHeroLine with real receipt and sufficient sessions includes measured Δ', () => {
  const receipt = makeReceipt({ input_tokens: 12000 });
  const sessions = [
    makeSession({ input_tokens: 30000 }),
    makeSession({ input_tokens: 28000 }),
    makeSession({ input_tokens: 32000 }),
  ];
  const out = renderHeroLine([receipt], sessions);
  assert.ok(out.includes('measured'), `expected measured Δ in: ${out}`);
  assert.ok(out.includes('%'), `expected % in: ${out}`);
  assert.ok(out.includes('3×'), `expected sample count in: ${out}`);
});

test('renderHeroLine with only 1 session (insufficient) omits delta', () => {
  const receipt = makeReceipt({ input_tokens: 12000 });
  const sessions = [makeSession({ input_tokens: 30000 })];
  const out = renderHeroLine([receipt], sessions);
  assert.ok(!out.includes('measured'), 'single sample must not produce delta');
});

test('renderHeroLine with null input_tokens on receipt omits delta', () => {
  const receipt = makeReceipt({ input_tokens: null });
  const sessions = [
    makeSession({ input_tokens: 30000 }),
    makeSession({ input_tokens: 28000 }),
    makeSession({ input_tokens: 32000 }),
  ];
  const out = renderHeroLine([receipt], sessions);
  assert.ok(!out.includes('measured'), 'null receipt tokens must not produce delta');
});

test('renderHeroLine aggregates auditor count and findings across multiple receipts', () => {
  const r1 = makeReceipt({ auditors: [{ id: 'codex', family: 'openai', model: '' }], findings: { consensus: 1, contested: 0, unique: 1 } });
  const r2 = makeReceipt({ auditors: [{ id: 'gemini', family: 'google', model: '' }], findings: { consensus: 1, contested: 1, unique: 2 } });
  const out = renderHeroLine([r1, r2], []);
  // 2 unique auditors
  assert.ok(out.startsWith('2 AIs'), `expected '2 AIs', got: ${out}`);
  // total findings = 1+0+1 + 1+1+2 = 6
  assert.ok(out.includes('6 findings'), `expected 6 findings, got: ${out}`);
  // consensus = 1+1 = 2
  assert.ok(out.includes('2 consensus-critical'), `expected 2 consensus-critical, got: ${out}`);
});

test('renderHeroLine duration <1000ms uses ms unit', () => {
  const r = makeReceipt({ duration_ms: 850 });
  const out = renderHeroLine([r], []);
  assert.ok(out.includes('850ms'), `expected ms unit, got: ${out}`);
});

test('renderHeroLine duration ≥1000ms uses seconds unit', () => {
  const r = makeReceipt({ duration_ms: 47000 });
  const out = renderHeroLine([r], []);
  assert.ok(out.includes('47s'), `expected s unit, got: ${out}`);
});
