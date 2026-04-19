// tests/test-reasoning.js -- reasoning.csv coverage and matching tests
// Run: node --test shared/skills/ijfw-design/tests/test-reasoning.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

function loadCSV(filename) {
  const lines = readFileSync(join(DATA_DIR, filename), 'utf8').trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || '').trim().replace(/^"|"$/g, ''); });
    return obj;
  });
}

const STOPWORDS = new Set(['a','an','the','is','in','for','of','and','or','to',
  'with','on','as','its','at','by','from','not','no','be','are','was','use']);

function tokenize(str) {
  return String(str).toLowerCase().split(/[^a-z0-9]+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

function scoreRow(row, queryTokens) {
  const rowText = Object.values(row).join(' ').toLowerCase();
  const category = (row.product_keywords || '').toLowerCase();
  const source = (row.source || '').toLowerCase();
  let score = 0;
  for (const t of queryTokens) {
    if (category.includes(t)) score += 3;
    if (source.includes(t))   score += 2;
    if (rowText.includes(t))  score += 0.5;
  }
  return score;
}

function matchReason(query, rows) {
  const tokens = tokenize(query);
  return rows
    .map(r => ({ r, score: scoreRow(r, tokens) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.r);
}

test('reasoning.csv has 25+ rules', () => {
  const rows = loadCSV('reasoning.csv');
  assert.ok(rows.length >= 25, `Got ${rows.length}`);
});

test('every reasoning row has source populated', () => {
  const rows = loadCSV('reasoning.csv');
  const missing = rows.filter(r => !r.source || r.source.length < 3);
  assert.equal(missing.length, 0);
});

test('every reasoning row has confidence column', () => {
  const rows = loadCSV('reasoning.csv');
  const missing = rows.filter(r => !r.confidence);
  assert.equal(missing.length, 0);
});

test('every reasoning row has rationale column', () => {
  const rows = loadCSV('reasoning.csv');
  const missing = rows.filter(r => !r.rationale || r.rationale.length < 10);
  assert.equal(missing.length, 0);
});

test('developer dashboard matches a rule', () => {
  const rows = loadCSV('reasoning.csv');
  const matches = matchReason('developer dashboard', rows);
  assert.ok(matches.length > 0, 'No rule matched for developer dashboard');
});

test('healthcare medical matches healthcare rule', () => {
  const rows = loadCSV('reasoning.csv');
  const matches = matchReason('healthcare medical app', rows);
  assert.ok(matches.length > 0, 'No match for healthcare medical');
  const keywords = matches[0].product_keywords.toLowerCase();
  assert.ok(keywords.includes('health') || keywords.includes('medical'), `Match: ${keywords}`);
});

test('ecommerce shop matches e-commerce rule', () => {
  const rows = loadCSV('reasoning.csv');
  const matches = matchReason('ecommerce shop product grid', rows);
  assert.ok(matches.length > 0, 'No match for ecommerce');
});

test('IJFW multi-agent matches IJFW-specific rule', () => {
  const rows = loadCSV('reasoning.csv');
  const matches = matchReason('IJFW multi-agent multi-cli platform', rows);
  assert.ok(matches.length > 0, 'No match for IJFW multi-agent');
});

test('AI assistant matches AI-specific rule', () => {
  const rows = loadCSV('reasoning.csv');
  const matches = matchReason('AI assistant LLM chatbot interface', rows);
  assert.ok(matches.length > 0, 'No match for AI assistant');
});

test('all reasoning rows have style_match populated', () => {
  const rows = loadCSV('reasoning.csv');
  const missing = rows.filter(r => !r.style_match || r.style_match.length < 3);
  assert.equal(missing.length, 0);
});

test('all reasoning rows have palette_match populated', () => {
  const rows = loadCSV('reasoning.csv');
  const missing = rows.filter(r => !r.palette_match || r.palette_match.length < 3);
  assert.equal(missing.length, 0);
});
