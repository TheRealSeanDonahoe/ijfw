import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redactSecrets } from './src/redactor.js';

test('redacts OpenAI-style sk- keys', () => {
  const out = redactSecrets('token is sk-proj-ABC123DEF456GHI789JKL012MNO345PQR678');
  assert.match(out, /\[REDACTED:openai\]/);
  assert.doesNotMatch(out, /ABC123DEF456/);
});

test('redacts GitHub ghp_ tokens', () => {
  const out = redactSecrets('GH ghp_abcdefghijklmnopqrstuvwxyz0123456789');
  assert.match(out, /\[REDACTED:github\]/);
});

test('redacts GitHub fine-grained PATs', () => {
  const out = redactSecrets('token: github_pat_11ABCDEFGHIJKLMNO_abcdefghijklmn');
  assert.match(out, /\[REDACTED:github\]/);
});

test('redacts AWS access key IDs', () => {
  const out = redactSecrets('AWS AKIAIOSFODNN7EXAMPLE now');
  assert.match(out, /\[REDACTED:aws\]/);
});

test('redacts Bearer tokens in Authorization headers', () => {
  const out = redactSecrets('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig');
  assert.match(out, /\[REDACTED:bearer\]/);
});

test('redacts Slack xoxb-/xoxp- tokens', () => {
  const out = redactSecrets('slack=xoxb-1234567890-abcdefghij');
  assert.match(out, /\[REDACTED:slack\]/);
});

test('redacts inline password=/token=/key=/secret= assignments', () => {
  const out = redactSecrets('db password=hunter2 api_token=xyz12345 api_key=abc secret=shh');
  assert.match(out, /password=\[REDACTED\]/);
  assert.match(out, /api_token=\[REDACTED\]/);
  assert.match(out, /api_key=\[REDACTED\]/);
  assert.match(out, /secret=\[REDACTED\]/);
});

test('leaves ordinary prose alone', () => {
  const p = 'The user clicked submit. No secrets here.';
  assert.equal(redactSecrets(p), p);
});

test('preserves short code-like strings that aren\'t secrets', () => {
  const p = 'function foo(bar) { return bar + 1; }';
  assert.equal(redactSecrets(p), p);
});

test('handles empty and non-string input', () => {
  assert.equal(redactSecrets(''), '');
  assert.equal(redactSecrets(null), '');
  assert.equal(redactSecrets(undefined), '');
  assert.equal(redactSecrets(42), '');
});
