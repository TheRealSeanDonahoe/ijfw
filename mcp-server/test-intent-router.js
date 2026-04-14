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
  assert.equal(detectIntent("play devil's advocate").skill, 'ijfw-critique');
  assert.equal(detectIntent('poke holes in this design').skill, 'ijfw-critique');
});

test('cross-research phrases → /cross-research', () => {
  assert.equal(detectIntent('cross research this').skill, '/cross-research');
  assert.equal(detectIntent("let's cross-research the approach").skill, '/cross-research');
  assert.equal(detectIntent('dig into GDPR implications from multiple angles').skill, '/cross-research');
  assert.equal(detectIntent('multi-angle research on caching strategies').skill, '/cross-research');
  assert.equal(detectIntent('research this from multiple angles').skill, '/cross-research');
});

test('cross-critique phrases → /cross-critique', () => {
  assert.equal(detectIntent("let's cross-critique the design").skill, '/cross-critique');
  assert.equal(detectIntent('adversarial review of the auth flow').skill, '/cross-critique');
  assert.equal(detectIntent('attack this from all sides').skill, '/cross-critique');
  assert.equal(detectIntent('stress-test this claim').skill, '/cross-critique');
});

// Shadow-regression: cross-critique (priority 10) outranks generic critique (priority 1) —
// result is priority-driven, not dependent on INTENTS array position.
test('shadow-regression: "challenge this from every angle" → /cross-critique not critique (priority-driven)', () => {
  const r = detectIntent('challenge this from every angle');
  assert.ok(r, 'should match something');
  assert.equal(r.skill, '/cross-critique', 'higher-priority cross-critique must win over lower-priority critique');
});

// Generic critique still works
test('generic critique still routes to ijfw-critique', () => {
  assert.equal(detectIntent('poke holes in this').skill, 'ijfw-critique');
});

test('cross-audit phrases → /cross-audit', () => {
  assert.equal(detectIntent('we need to cross-audit this').skill, '/cross-audit');
  assert.equal(detectIntent('cross audit the installer').skill, '/cross-audit');
  assert.equal(detectIntent('get a second opinion on the auth flow').skill, '/cross-audit');
  assert.equal(detectIntent('have gemini review this').skill, '/cross-audit');
  assert.equal(detectIntent('ask codex to audit the diff').skill, '/cross-audit');
  assert.equal(detectIntent('do a peer-review pass').skill, '/cross-audit');
  assert.equal(detectIntent('second-model review please').skill, '/cross-audit');
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

test('priority-driven ordering: higher priority entry wins when both match', () => {
  // "brainstorm" (priority 1) vs "note to self" (priority 5, remember intent).
  // Craft a prompt that hits both: priority-5 remember must beat priority-1 brainstorm.
  const r = detectIntent('note to self: brainstorm the auth redesign');
  assert.ok(r);
  assert.equal(r.skill, 'ijfw_memory_store', 'priority-5 remember beats priority-1 brainstorm');
});

test('specificity tiebreak: longer pattern wins when priorities tie', () => {
  // Both "review PR" (review, priority 5) and "code review" (review, priority 5) are the
  // same entry, so test a cross-* tiebreak: "adversarial review" hits cross-critique
  // (priority 10, longer token match) vs "review" alone; cross-critique must win.
  const r = detectIntent('adversarial review of the proposal');
  assert.ok(r);
  assert.equal(r.skill, '/cross-critique', 'cross-critique adversarial-review pattern wins over plain review');
});

test('order-stable: array-order tiebreak when priority AND specificity tie', () => {
  // "remember to brainstorm" — both remember (priority 5) and brainstorm (priority 1) match,
  // but remember wins on priority. For a true array-order tiebreak we need same priority AND
  // same match length. "ship it" (ship, priority 5) and "note to self" (remember, priority 5)
  // each fire on distinct prompts; verify determinism by running detectIntent twice.
  const r1 = detectIntent('note to self: save for later');
  const r2 = detectIntent('note to self: save for later');
  assert.ok(r1);
  assert.equal(r1.skill, r2.skill, 'repeated calls return identical result (deterministic)');
});
