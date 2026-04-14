import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectIntent } from './src/intent-router.js';

test('brainstorm → ijfw-workflow', () => {
  assert.equal(detectIntent('brainstorm a new API').skill, 'ijfw-workflow');
  assert.equal(detectIntent("let's design the auth flow").skill, 'ijfw-workflow');
  assert.equal(detectIntent('help me build a todo app').skill, 'ijfw-workflow');
  assert.equal(detectIntent('starting a new project tonight').skill, 'ijfw-workflow');
});

test('ship → ijfw-commit', () => {
  assert.equal(detectIntent('ship it').skill, 'ijfw-commit');
  assert.equal(detectIntent('ready to commit this').skill, 'ijfw-commit');
  assert.equal(detectIntent('create a PR for main').skill, 'ijfw-commit');
});

test('review → ijfw-review', () => {
  assert.equal(detectIntent('code review please').skill, 'ijfw-review');
  assert.equal(detectIntent('review the diff').skill, 'ijfw-review');
});

test('remember → ijfw_memory_store', () => {
  assert.equal(detectIntent('remember this: auth uses RS256').skill, 'ijfw_memory_store');
  assert.equal(detectIntent("that's important to remember").skill, 'ijfw_memory_store');
  assert.equal(detectIntent('note to self: never use ISO-8601 in DB').skill, 'ijfw_memory_store');
});

test('recall → ijfw_memory_recall', () => {
  assert.equal(detectIntent('what did we decide about auth?').skill, 'ijfw_memory_recall');
  assert.equal(detectIntent('do you remember the pagination fix?').skill, 'ijfw_memory_recall');
});

test('critique → ijfw-critique', () => {
  assert.equal(detectIntent('should I use websockets for this?').skill, 'ijfw-critique');
  assert.equal(detectIntent('give me a second opinion').skill, 'ijfw-critique');
  assert.equal(detectIntent("play devil's advocate").skill, 'ijfw-critique');
});

test('handoff → ijfw-handoff', () => {
  assert.equal(detectIntent('session handoff please').skill, 'ijfw-handoff');
  assert.equal(detectIntent('context is getting full, wrap up').skill, 'ijfw-handoff');
});

test('brutal mode → ijfw-core', () => {
  assert.equal(detectIntent('brutal mode').skill, 'ijfw-core');
  assert.equal(detectIntent('be brutal').skill, 'ijfw-core');
});

test('leading asterisk bypasses routing', () => {
  assert.equal(detectIntent('* brainstorm a new API'), null);
});

test('"ijfw off" bypasses routing', () => {
  assert.equal(detectIntent('ijfw off; brainstorm a new API'), null);
});

test('ordinary prose returns null', () => {
  assert.equal(detectIntent('fix the paginator bug in paginate.py'), null);
  assert.equal(detectIntent('add a unit test for the new function'), null);
});

test('empty/invalid input returns null', () => {
  assert.equal(detectIntent(''), null);
  assert.equal(detectIntent(null), null);
  assert.equal(detectIntent(undefined), null);
  assert.equal(detectIntent(42), null);
});

test('first match wins (ordering matters)', () => {
  // "remember to brainstorm" contains both — brainstorm fires first
  // because INTENTS iteration is stable in declared order.
  const r = detectIntent('remember to brainstorm the auth redesign');
  assert.ok(r);
  assert.equal(r.skill, 'ijfw-workflow');
});
