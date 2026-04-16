#!/usr/bin/env node
/**
 * Tests for scripts/dashboard/economics.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeEconomics } from './economics.js';

test('empty observations returns zeros and 0% savings', () => {
  const r = computeEconomics([]);
  assert.equal(r.loadCost, 0);
  assert.equal(r.workInvestment, 0);
  assert.equal(r.savingsPct, 0);
});

test('null/undefined returns zeros', () => {
  const r = computeEconomics(null);
  assert.equal(r.loadCost, 0);
  assert.equal(r.workInvestment, 0);
  assert.equal(r.savingsPct, 0);
});

test('load cost is 40 tokens per observation', () => {
  const obs = Array.from({ length: 10 }, () => ({}));
  const r = computeEconomics(obs);
  assert.equal(r.loadCost, 400);
});

test('work investment uses token_cost when available', () => {
  const obs = [{ token_cost: 1000, work_tokens: 500 }];
  const r = computeEconomics(obs);
  assert.equal(r.workInvestment, 1500);
});

test('work investment falls back to heuristic 800 per obs', () => {
  const obs = [{}];
  const r = computeEconomics(obs);
  assert.equal(r.workInvestment, 800);
});

test('savings percent is clamped to minimum 0', () => {
  // If load cost exceeds work investment, savings should not go negative
  const obs = Array.from({ length: 1 }, () => ({ token_cost: 1, work_tokens: 0 }));
  const r = computeEconomics(obs);
  assert.ok(r.savingsPct >= 0);
});

test('savings percent is high for large work investment', () => {
  const obs = Array.from({ length: 50 }, () => ({ token_cost: 5000, work_tokens: 2000 }));
  const r = computeEconomics(obs);
  // Load cost = 50 * 40 = 2000, work = 50 * 7000 = 350000 -> ~99% savings
  assert.ok(r.savingsPct > 90);
});
