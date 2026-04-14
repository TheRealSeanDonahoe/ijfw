import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runViaApi } from './src/api-client.js';

// Helper: build a minimal pick object matching ROSTER shape.
function makePick(provider, authEnv, model = 'test-model') {
  return {
    id: provider === 'openai' ? 'codex' : provider === 'google' ? 'gemini' : 'claude',
    invoke: provider,
    apiFallback: {
      provider,
      model,
      authEnv,
      endpoint: provider === 'google'
        ? 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
        : null,
    },
  };
}

// Capture the last fetch call without actually hitting the network.
function mockFetch(status, body) {
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
  return calls;
}

function restoreFetch() {
  delete globalThis.fetch;
}

// --- OpenAI ---

test('openai: sets Bearer auth header and correct body shape', async () => {
  const calls = mockFetch(200, {
    choices: [{ message: { content: 'found issues' } }],
  });

  const pick = makePick('openai', 'OPENAI_API_KEY');
  const env = { OPENAI_API_KEY: 'sk-test' };
  const result = await runViaApi(pick, 'audit', 'general', 'function foo(){}', env);

  assert.equal(result.status, 'ok');
  assert.equal(result.raw, 'found issues');
  assert.equal(calls.length, 1);

  const { opts } = calls[0];
  assert.equal(opts.headers['Authorization'], 'Bearer sk-test');
  assert.equal(opts.headers['Content-Type'], 'application/json');

  const body = JSON.parse(opts.body);
  assert.ok(Array.isArray(body.messages));
  assert.equal(body.messages[0].role, 'system');
  assert.equal(body.messages[1].role, 'user');

  restoreFetch();
});

// --- Gemini ---

test('gemini: uses x-goog-api-key header and systemInstruction shape', async () => {
  const calls = mockFetch(200, {
    candidates: [{ content: { parts: [{ text: 'gemini response' }] } }],
  });

  const pick = makePick('google', 'GEMINI_API_KEY');
  const env = { GEMINI_API_KEY: 'gk-test' };
  const result = await runViaApi(pick, 'audit', 'general', 'some target', env);

  assert.equal(result.status, 'ok');
  assert.equal(result.raw, 'gemini response');

  const { opts } = calls[0];
  assert.equal(opts.headers['x-goog-api-key'], 'gk-test');

  const body = JSON.parse(opts.body);
  assert.ok(body.systemInstruction, 'systemInstruction field must exist');
  assert.ok(Array.isArray(body.systemInstruction.parts));
  assert.ok(Array.isArray(body.contents));
  assert.equal(body.contents[0].role, 'user');

  restoreFetch();
});

// --- Anthropic ---

test('anthropic: uses x-api-key header and top-level system key', async () => {
  const calls = mockFetch(200, {
    content: [{ type: 'text', text: 'anthropic response' }],
  });

  const pick = makePick('anthropic', 'ANTHROPIC_API_KEY');
  const env = { ANTHROPIC_API_KEY: 'ak-test' };
  const result = await runViaApi(pick, 'audit', 'general', 'some target', env);

  assert.equal(result.status, 'ok');
  assert.equal(result.raw, 'anthropic response');

  const { opts } = calls[0];
  assert.equal(opts.headers['x-api-key'], 'ak-test');
  assert.equal(opts.headers['anthropic-version'], '2023-06-01');

  const body = JSON.parse(opts.body);
  assert.equal(typeof body.system, 'string', 'top-level system key must be a string');
  assert.ok(Array.isArray(body.messages));
  assert.equal(body.messages[0].role, 'user');

  restoreFetch();
});

// --- Non-2xx ---

test('non-2xx response returns status: failed', async () => {
  mockFetch(429, { error: { message: 'rate limited' } });

  const pick = makePick('openai', 'OPENAI_API_KEY');
  const env = { OPENAI_API_KEY: 'sk-test' };
  const result = await runViaApi(pick, 'audit', 'general', 'target', env);

  assert.equal(result.status, 'failed');
  assert.ok(result.error.includes('429'));

  restoreFetch();
});

// --- Missing env key ---

test('missing auth env key returns status: failed without network call', async () => {
  const calls = mockFetch(200, {});

  const pick = makePick('openai', 'OPENAI_API_KEY');
  const result = await runViaApi(pick, 'audit', 'general', 'target', {});

  assert.equal(result.status, 'failed');
  assert.equal(calls.length, 0, 'should not call fetch when key is missing');

  restoreFetch();
});

// --- No apiFallback ---

test('pick with null apiFallback returns status: failed', async () => {
  const pick = { id: 'opencode', invoke: 'opencode', apiFallback: null };
  const result = await runViaApi(pick, 'audit', 'general', 'target', {});
  assert.equal(result.status, 'failed');
});

// --- AbortSignal timeout fires ---

test('network timeout returns status: failed with timeout error', async () => {
  // Simulate fetch throwing AbortError (what AbortSignal.timeout does).
  globalThis.fetch = async () => {
    const err = new DOMException('The operation was aborted.', 'AbortError');
    throw err;
  };

  const pick = makePick('openai', 'OPENAI_API_KEY');
  const env = { OPENAI_API_KEY: 'sk-test' };
  const result = await runViaApi(pick, 'audit', 'general', 'target', env, 1);

  assert.equal(result.status, 'failed');
  assert.ok(result.error.length > 0);

  restoreFetch();
});
