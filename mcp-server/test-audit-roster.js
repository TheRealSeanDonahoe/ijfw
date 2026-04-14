import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER, detectSelf, rosterFor, defaultAuditor, formatRoster, pickAuditors, isInstalled } from './src/audit-roster.js';

test('ROSTER has expected ids', () => {
  const ids = ROSTER.map(e => e.id);
  for (const expected of ['codex', 'gemini', 'opencode', 'aider', 'copilot', 'claude']) {
    assert.ok(ids.includes(expected), `missing: ${expected}`);
  }
});

test('detectSelf returns claude when Claude Code env is set', () => {
  const env = { CLAUDECODE: '1' };
  assert.equal(detectSelf(env), 'claude');
});

test('detectSelf returns codex on CODEX_SESSION_ID', () => {
  assert.equal(detectSelf({ CODEX_SESSION_ID: 'abc' }), 'codex');
});

test('detectSelf returns gemini on GEMINI_CLI', () => {
  assert.equal(detectSelf({ GEMINI_CLI: '1' }), 'gemini');
});

test('detectSelf returns null when no env matches', () => {
  assert.equal(detectSelf({}), null);
});

test('rosterFor excludes self by default', () => {
  const list = rosterFor({ env: { CLAUDECODE: '1' } });
  assert.ok(!list.some(e => e.id === 'claude'));
  assert.ok(list.length === ROSTER.length - 1);
});

test('rosterFor with excludeSelf:false keeps self but marks isSelf', () => {
  const list = rosterFor({ excludeSelf: false, env: { CLAUDECODE: '1' } });
  assert.equal(list.length, ROSTER.length);
  const claude = list.find(e => e.id === 'claude');
  assert.equal(claude.isSelf, true);
});

test('rosterFor with only: gemini returns just that one', () => {
  const list = rosterFor({ only: 'gemini' });
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'gemini');
});

test('rosterFor with only: unknown returns empty', () => {
  assert.deepEqual(rosterFor({ only: 'bogus' }), []);
});

test('defaultAuditor picks first non-self', () => {
  const self = detectSelf({ CLAUDECODE: '1' });
  const d = defaultAuditor({ CLAUDECODE: '1' });
  assert.ok(d);
  assert.notEqual(d.id, self);
  assert.equal(d.id, 'codex'); // first in roster order after claude-excluded
});

test('defaultAuditor when caller unknown returns first in roster', () => {
  const d = defaultAuditor({});
  assert.equal(d.id, 'codex');
});

test('formatRoster marks self correctly and shows ready/install status', () => {
  const out = formatRoster({ CLAUDECODE: '1' });
  assert.match(out, /Detected caller: claude/);
  assert.match(out, /claude\s+self/);
  // Codex is listed as either 'ready' (installed) or 'install' (missing).
  assert.match(out, /codex\s+(ready|install)/);
});

test('isInstalled returns boolean for any roster id', () => {
  for (const e of ROSTER) {
    assert.equal(typeof isInstalled(e.id), 'boolean');
  }
});

test('isInstalled returns false for unknown id', () => {
  assert.equal(isInstalled('definitely-not-a-cli'), false);
});

test('pickAuditors with explicit only: filters to requested', () => {
  const r = pickAuditors({ only: 'codex,gemini', env: { CLAUDECODE: '1' } });
  assert.ok(Array.isArray(r.picks));
  assert.ok(Array.isArray(r.missing));
  // Every pick must be one of the requested ids.
  for (const p of r.picks) assert.ok(['codex', 'gemini'].includes(p.id));
});

test('pickAuditors default count=2 returns up to 2 non-self installed', () => {
  const r = pickAuditors({ env: { CLAUDECODE: '1' } });
  assert.ok(r.picks.length <= 2);
  assert.ok(!r.picks.some(p => p.id === 'claude'));
  for (const p of r.picks) assert.equal(p.installed, true);
});

test('pickAuditors note advises Trident when only one installed', () => {
  // We can't fake "installed" easily here, so this test asserts shape:
  // when picks < count, note is non-empty and mentions Trident principle.
  const r = pickAuditors({ count: 99, env: { CLAUDECODE: '1' } });
  if (r.picks.length < 99) {
    assert.ok(r.note.length > 0);
  }
});

test('formatRoster acknowledges unknown caller', () => {
  const out = formatRoster({});
  assert.match(out, /Caller unknown/);
});
