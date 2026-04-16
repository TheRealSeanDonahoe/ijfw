#!/usr/bin/env node
/**
 * Snapshot-style tests for scripts/dashboard/render.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './render.js';

const FIXTURE_OBS = [
  {
    id: 42, ts: '2026-04-16T09:58:00.000Z', type: 'bugfix',
    title: 'Fixed APPDATA unbound variable crash',
    files: ['scripts/install.sh'],
    platform: 'claude-code', session_id: 'sess-1',
  },
  {
    id: 43, ts: '2026-04-16T10:02:00.000Z', type: 'decision',
    title: 'Locked: single ijfw bin',
    files: ['scripts/install.sh'],
    platform: 'codex', session_id: 'sess-1',
  },
  {
    id: 44, ts: '2026-04-16T11:00:00.000Z', type: 'feature',
    title: 'Added observation ledger with atomic writes',
    files: ['scripts/observation/ledger.js'],
    platform: 'claude-code', session_id: 'sess-2',
  },
];

const FIXTURE_SUMMARY = {
  session_id: 'sess-2',
  request: 'Build the observation ledger',
  investigated: 'Existing file lock patterns in session-end.sh',
  learned: 'mkdir-lock is portable across macOS and Linux',
  completed: 'Ledger append with rotation at 10MB',
  next_steps: 'Wire to PostToolUse hook',
};

test('render returns a non-empty string', () => {
  const out = render(FIXTURE_OBS, FIXTURE_SUMMARY);
  assert.ok(typeof out === 'string');
  assert.ok(out.length > 0);
});

test('render includes legend labels', () => {
  const out = render(FIXTURE_OBS, null);
  assert.ok(out.includes('Legend:'));
  assert.ok(out.includes('bugfix'));
  assert.ok(out.includes('decision'));
});

test('render includes Context Economics block', () => {
  const out = render(FIXTURE_OBS, null);
  assert.ok(out.includes('Context Economics'));
  assert.ok(out.includes('observations'));
  assert.ok(out.includes('savings'));
});

test('render includes date heading', () => {
  const out = render(FIXTURE_OBS, null);
  assert.ok(out.includes('Apr 16, 2026'));
});

test('render includes file grouping', () => {
  const out = render(FIXTURE_OBS, null);
  assert.ok(out.includes('scripts/install.sh'));
  assert.ok(out.includes('scripts/observation/ledger.js'));
});

test('render includes observation ids', () => {
  const out = render(FIXTURE_OBS, null);
  assert.ok(out.includes('#42'));
  assert.ok(out.includes('#43'));
  assert.ok(out.includes('#44'));
});

test('render includes platform badges', () => {
  const out = render(FIXTURE_OBS, null);
  assert.ok(out.includes('[claude]'));
  assert.ok(out.includes('[codex]'));
});

test('render includes session summary fields', () => {
  const out = render(FIXTURE_OBS, FIXTURE_SUMMARY);
  assert.ok(out.includes('Investigated:'));
  assert.ok(out.includes('Completed:'));
  assert.ok(out.includes('Next Steps:'));
});

test('render shows welcome message when observations empty', () => {
  const out = render([], null);
  assert.ok(out.includes('Welcome to IJFW'));
  assert.ok(out.includes('compound'));
});

test('render does not crash on undefined inputs', () => {
  const out = render(undefined, undefined);
  assert.ok(typeof out === 'string');
  assert.ok(out.length > 0);
});

test('observation titles are included in output', () => {
  const out = render(FIXTURE_OBS, null);
  assert.ok(out.includes('Fixed APPDATA unbound variable crash'));
  assert.ok(out.includes('Locked: single ijfw bin'));
});
