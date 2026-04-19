// tests/test-search.js -- node:test suite for search.js
// Run: node --test shared/skills/ijfw-design/tests/test-search.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEARCH_JS = join(__dirname, '..', 'scripts', 'search.js');
const DATA_DIR  = join(__dirname, '..', 'data');

function run(argsArr) {
  return execFileSync(process.execPath, [SEARCH_JS, ...argsArr], {
    encoding: 'utf8',
    timeout: 15000,
  });
}

// ---------------------------------------------------------------------------
// Data existence
// ---------------------------------------------------------------------------
test('all CSV data files exist', () => {
  const required = ['styles.csv','palettes.csv','typography.csv','ux-guidelines.csv',
    'charts.csv','patterns.csv','reasoning.csv','google-fonts.csv'];
  for (const f of required) {
    assert.ok(existsSync(join(DATA_DIR, f)), `Missing: ${f}`);
  }
});

// ---------------------------------------------------------------------------
// Row counts
// ---------------------------------------------------------------------------
function countRows(filename) {
  return readFileSync(join(DATA_DIR, filename), 'utf8').trim().split('\n').length - 1;
}

test('styles.csv has 50+ rows', () => {
  const c = countRows('styles.csv');
  assert.ok(c >= 50, `Got ${c}`);
});

test('palettes.csv has 60+ rows', () => {
  const c = countRows('palettes.csv');
  assert.ok(c >= 60, `Got ${c}`);
});

test('typography.csv has 28+ rows', () => {
  const c = countRows('typography.csv');
  assert.ok(c >= 28, `Got ${c}`);
});

test('ux-guidelines.csv has 100+ rows', () => {
  const c = countRows('ux-guidelines.csv');
  assert.ok(c >= 100, `Got ${c}`);
});

test('charts.csv has 15+ rows', () => {
  const c = countRows('charts.csv');
  assert.ok(c >= 15, `Got ${c}`);
});

test('patterns.csv has 30+ rows', () => {
  const c = countRows('patterns.csv');
  assert.ok(c >= 30, `Got ${c}`);
});

// ---------------------------------------------------------------------------
// Source attribution
// ---------------------------------------------------------------------------
function loadRows(filename) {
  const lines = readFileSync(join(DATA_DIR, filename), 'utf8').trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || '').trim(); });
    return obj;
  });
}

test('all styles.csv rows have source', () => {
  const missing = loadRows('styles.csv').filter(r => !r.source || r.source.length < 3);
  assert.equal(missing.length, 0, `${missing.length} rows missing source`);
});

test('all palettes.csv rows have source', () => {
  const missing = loadRows('palettes.csv').filter(r => !r.source || r.source.length < 3);
  assert.equal(missing.length, 0);
});

test('all ux-guidelines.csv rows have source', () => {
  const missing = loadRows('ux-guidelines.csv').filter(r => !r.source || r.source.length < 3);
  assert.equal(missing.length, 0);
});

// ---------------------------------------------------------------------------
// --design-system core sections
// ---------------------------------------------------------------------------
test('--design-system returns PALETTE section', () => {
  const out = run(['developer dashboard data-dense', '--design-system', '-p', 'IJFW']);
  assert.ok(out.includes('PALETTE'), 'Missing PALETTE');
});

test('--design-system returns STYLE section', () => {
  const out = run(['developer dashboard data-dense', '--design-system']);
  assert.ok(out.includes('STYLE'), 'Missing STYLE');
});

test('--design-system returns TYPOGRAPHY section', () => {
  const out = run(['developer dashboard data-dense', '--design-system']);
  assert.ok(out.includes('TYPOGRAPHY'), 'Missing TYPOGRAPHY');
});

test('--design-system returns UX GUIDELINES section', () => {
  const out = run(['developer dashboard data-dense', '--design-system']);
  assert.ok(out.includes('UX GUIDELINES'), 'Missing UX GUIDELINES');
});

test('--design-system returns Sources line', () => {
  const out = run(['developer dashboard', '--design-system']);
  assert.ok(out.includes('Sources:'), 'Missing Sources');
});

test('--design-system -p includes project name in header', () => {
  const out = run(['dashboard', '--design-system', '-p', 'IJFW']);
  assert.ok(out.includes('IJFW'), 'Missing project name');
});

// ---------------------------------------------------------------------------
// --domain searches
// ---------------------------------------------------------------------------
test('--domain ux returns 15+ rules', () => {
  const out = run(['', '--domain', 'ux', '-n', '20']);
  const count = (out.match(/^\d+\./gm) || []).length;
  assert.ok(count >= 15, `Got ${count}`);
});

test('--domain color returns 60+ palettes', () => {
  const out = run(['', '--domain', 'color', '-n', '70']);
  const count = (out.match(/^\d+\./gm) || []).length;
  assert.ok(count >= 60, `Got ${count}`);
});

test('--domain style returns 50+ styles', () => {
  const out = run(['', '--domain', 'style', '-n', '60']);
  const count = (out.match(/^\d+\./gm) || []).length;
  assert.ok(count >= 50, `Got ${count}`);
});

test('--domain ux accessibility returns WCAG-cited rules', () => {
  const out = run(['accessibility', '--domain', 'ux', '-n', '10']);
  assert.ok(out.includes('WCAG'), 'Expected WCAG citation');
});

test('--domain charts returns chart names', () => {
  const out = run(['trend', '--domain', 'charts', '-n', '5']);
  assert.ok(out.toLowerCase().includes('chart') || out.toLowerCase().includes('line'), 'Expected chart results');
});

// ---------------------------------------------------------------------------
// --explain
// ---------------------------------------------------------------------------
test('--explain adds REASONING TRACE', () => {
  const out = run(['developer dashboard', '--design-system', '--explain']);
  assert.ok(out.includes('REASONING TRACE'), 'Missing REASONING TRACE');
});

// ---------------------------------------------------------------------------
// IJFW invariants
// ---------------------------------------------------------------------------
test('output contains IJFW INVARIANTS block', () => {
  const out = run(['marketing landing', '--design-system']);
  assert.ok(out.includes('IJFW INVARIANTS'), 'Missing IJFW INVARIANTS');
});

test('IJFW INVARIANTS mentions zero runtime deps', () => {
  const out = run(['saas', '--design-system']);
  assert.ok(out.toLowerCase().includes('zero runtime'), 'Missing zero runtime');
});

test('IJFW INVARIANTS mentions positive framing', () => {
  const out = run(['saas', '--design-system']);
  assert.ok(out.toLowerCase().includes('positive framing'), 'Missing positive framing');
});

// ---------------------------------------------------------------------------
// WCAG AA verified palettes
// ---------------------------------------------------------------------------
test('palettes.csv -- all rows have wcag_level AA or AAA', () => {
  const invalid = loadRows('palettes.csv').filter(r => !r.wcag_level || (!r.wcag_level.includes('AA') && !r.wcag_level.includes('AAA')));
  assert.equal(invalid.length, 0, `${invalid.length} palettes missing WCAG level`);
});

// ---------------------------------------------------------------------------
// No banned unicode
// ---------------------------------------------------------------------------
test('output contains no banned unicode', () => {
  const out = run(['dashboard', '--design-system']);
  assert.ok(!/[\u2014\u00A7\u2501\u2713\u2714\u00B7\u2212]/.test(out),
    'Output contains banned unicode');
});
