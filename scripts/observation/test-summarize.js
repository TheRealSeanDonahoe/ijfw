import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from './summarize.js';

const SID = 'test-summarize-session';

function makeObs(type, title, files = []) {
  return { id: 1, ts: new Date().toISOString(), type, title, files, session_id: SID, platform: 'claude-code', project: 'ijfw' };
}

test('returns null for fewer than 2 observations', () => {
  assert.equal(summarize(SID, [makeObs('change', 'One thing')]), null);
  assert.equal(summarize(SID, []), null);
});

test('returns summary string for >= 2 observations', () => {
  const obs = [
    makeObs('change', 'Updated install.sh'),
    makeObs('discovery', 'Read post-tool-use.sh'),
  ];
  const s = summarize(SID, obs);
  assert.ok(typeof s === 'string');
  assert.ok(s.includes('## Session summary'));
});

test('completed section present when bugfix obs exist', () => {
  const obs = [
    makeObs('bugfix', 'Fixed null pointer in capture.js'),
    makeObs('change',  'Updated tests'),
  ];
  const s = summarize(SID, obs);
  assert.ok(s.includes('**Completed**'));
  assert.ok(s.includes('Fixed:'));
});

test('investigated section present when discovery obs exist', () => {
  const obs = [
    makeObs('discovery', 'Read server.js'),
    makeObs('discovery', 'Searched codebase'),
  ];
  const s = summarize(SID, obs);
  assert.ok(s.includes('**Investigated**'));
});

test('decided section present when decision obs exist', () => {
  const obs = [
    makeObs('decision', 'Chose mkdir-lock strategy'),
    makeObs('change',   'Updated PLAN.md'),
  ];
  const s = summarize(SID, obs);
  assert.ok(s.includes('**Decided**'));
});

test('files section lists touched paths', () => {
  const obs = [
    makeObs('change', 'Updated capture.js', ['scripts/observation/capture.js']),
    makeObs('change', 'Updated ledger.js',  ['scripts/observation/ledger.js']),
  ];
  const s = summarize(SID, obs);
  assert.ok(s.includes('**Files**'));
  assert.ok(s.includes('capture.js'));
});

test('observation count shown in header', () => {
  const obs = [
    makeObs('change', 'a'), makeObs('change', 'b'), makeObs('change', 'c'),
  ];
  const s = summarize(SID, obs);
  assert.ok(s.includes('3 observations'));
});
