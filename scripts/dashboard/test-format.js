#!/usr/bin/env node
/**
 * Tests for scripts/dashboard/format.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iconForType, colorForType, formatTime, formatDate, dateKey, truncateTitle } from './format.js';

test('iconForType returns correct icons', () => {
  assert.equal(iconForType('bugfix'),          'x');
  assert.equal(iconForType('feature'),         '+');
  assert.equal(iconForType('refactor'),        '~');
  assert.equal(iconForType('change'),          '.');
  assert.equal(iconForType('discovery'),       '?');
  assert.equal(iconForType('decision'),        '!');
  assert.equal(iconForType('session-request'), '?');
  assert.equal(iconForType('unknown'),         '.');
});

test('colorForType returns string (may be empty if NO_COLOR)', () => {
  assert.equal(typeof colorForType('bugfix'), 'string');
  assert.equal(typeof colorForType('feature'), 'string');
  assert.equal(typeof colorForType('unknown'), 'string');
});

test('formatTime converts ISO to h:mm AM/PM', () => {
  // 09:58 UTC should render as a time string
  const result = formatTime('2026-04-16T09:58:22.000Z');
  assert.match(result, /\d+:\d{2} (AM|PM)/);
});

test('formatTime handles invalid input gracefully', () => {
  const result = formatTime('not-a-date');
  assert.equal(typeof result, 'string');
});

test('formatDate converts ISO to readable date', () => {
  const result = formatDate('2026-04-16T09:58:22.000Z');
  assert.match(result, /Apr 16, 2026/);
});

test('dateKey extracts YYYY-MM-DD', () => {
  assert.equal(dateKey('2026-04-16T09:58:22.000Z'), '2026-04-16');
  assert.equal(dateKey(''), '');
  assert.equal(dateKey(undefined), '');
});

test('truncateTitle returns title unchanged when short', () => {
  assert.equal(truncateTitle('Hello', 20), 'Hello');
});

test('truncateTitle truncates and appends ellipsis', () => {
  const result = truncateTitle('This is a very long title that should be cut', 20);
  assert.equal(result.length, 20);
  assert.ok(result.endsWith('...'));
});

test('truncateTitle handles empty input', () => {
  assert.equal(truncateTitle('', 20), '');
  assert.equal(truncateTitle(null, 20), '');
  assert.equal(truncateTitle(undefined, 20), '');
});
