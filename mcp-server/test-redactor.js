import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redactSecrets } from './src/redactor.js';

test('redacts OpenAI sk-proj- keys', () => {
  const out = redactSecrets('key is sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdef');
  assert.match(out, /\[REDACTED:openai\]/);
  assert.doesNotMatch(out, /ABCDEFGHIJKLMN/);
});

test('redacts OpenAI sk- keys (non-proj, ≥32 char floor)', () => {
  const out = redactSecrets('legacy sk-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
  assert.match(out, /\[REDACTED:openai\]/);
});

test('does NOT redact short sk- prose like "sk-learn"', () => {
  const out = redactSecrets('use sk-learn for ML, also sk-image is fine');
  assert.equal(out, 'use sk-learn for ML, also sk-image is fine');
});

test('redacts Anthropic sk-ant- keys', () => {
  const out = redactSecrets('claude sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  assert.match(out, /\[REDACTED:anthropic\]/);
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

test('redacts Stripe live + test secret keys', () => {
  const live = redactSecrets('sk_live_abcdefghijklmnopqrstuvwxyz123456');
  const testk = redactSecrets('sk_test_abcdefghijklmnopqrstuvwxyz123456');
  assert.match(live, /\[REDACTED:stripe\]/);
  assert.match(testk, /\[REDACTED:stripe\]/);
});

test('redacts npm access tokens', () => {
  const out = redactSecrets('npm set //registry.npmjs.org/:_authToken=npm_abcdefghijklmnopqrstuvwxyz0123456789AB');
  assert.match(out, /\[REDACTED:npm\]/);
});

test('redacts HuggingFace tokens', () => {
  const out = redactSecrets('export HF_TOKEN=hf_abcdefghijklmnopqrstuvwxyz01234567AB');
  assert.match(out, /\[REDACTED:huggingface\]/);
});

test('redacts Azure storage AccountKey', () => {
  // 88 chars base64 with padding
  const key = 'A'.repeat(86) + '==';
  const out = redactSecrets(`DefaultEndpointsProtocol=https;AccountKey=${key};EndpointSuffix=core.windows.net`);
  assert.match(out, /\[REDACTED:azure\]/);
});

test('redacts GCP PEM private key blocks', () => {
  const pem = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----';
  const out = redactSecrets(`config: { "private_key": "${pem.replace(/\n/g, '\\n')}" }`);
  // The replacement target is the BEGIN..END block; literal \n still splits
  // only in the prose copy above. For the regex to match the actual PEM
  // string we need a real multiline case.
  const out2 = redactSecrets(pem);
  assert.match(out2, /\[REDACTED:gcp\]/);
});

test('redacts inline password=/token=/key=/secret= assignments', () => {
  const out = redactSecrets('db password=hunter2 api_token=xyz12345 api_key=abc secret=shh client_secret=ZZZ');
  assert.match(out, /password=\[REDACTED\]/);
  assert.match(out, /api_token=\[REDACTED\]/);
  assert.match(out, /api_key=\[REDACTED\]/);
  assert.match(out, /secret=\[REDACTED\]/);
  assert.match(out, /client_secret=\[REDACTED\]/);
});

test('redacts JSON-style "clientSecret": "..." values', () => {
  const out = redactSecrets('{"clientSecret": "super-secret-value-xyz", "other": "ok"}');
  assert.match(out, /"clientSecret":\s*"\[REDACTED\]"/);
  assert.doesNotMatch(out, /super-secret-value/);
  assert.match(out, /"other":\s*"ok"/);
});

test('leaves ordinary prose alone', () => {
  const p = 'The user clicked submit. No secrets here.';
  assert.equal(redactSecrets(p), p);
});

test('preserves code-like strings that aren\'t secrets', () => {
  const p = 'function foo(bar) { return bar + 1; }';
  assert.equal(redactSecrets(p), p);
});

test('redacts GitHub OAuth/App/User/Refresh tokens', () => {
  for (const prefix of ['gho_', 'ghu_', 'ghs_', 'ghr_']) {
    const out = redactSecrets(`token=${prefix}ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ab`);
    assert.match(out, /\[REDACTED:github\]/, `prefix ${prefix} not redacted`);
  }
});

test('redacts AWS temporary (ASIA) access keys', () => {
  const out = redactSecrets('temp: ASIAIOSFODNN7EXAMPLE');
  assert.match(out, /\[REDACTED:aws\]/);
});

test('redacts Google/GCP API keys (AIza...)', () => {
  const out = redactSecrets('env: GOOGLE_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz01234567');
  assert.match(out, /\[REDACTED:gcp\]/);
  assert.doesNotMatch(out, /AIzaSyAb/);
});

test('redacts Sentry DSNs', () => {
  const out = redactSecrets('dsn=https://abc123def456abc123def456abc123de@o12345.ingest.sentry.io/678901');
  assert.match(out, /\[REDACTED:sentry\]/);
});

test('redacts Cloudflare API tokens when contextualized', () => {
  const out = redactSecrets('CF_API_TOKEN=abcdefghijklmnopqrstuvwxyz0123456789ABCD');
  assert.match(out, /\[REDACTED:cloudflare\]/);
});

test('does NOT redact bare 40-char hex (commit SHAs) without cloudflare context', () => {
  const out = redactSecrets('commit abc123def456abc123def456abc123def456abc1');
  assert.doesNotMatch(out, /REDACTED:cloudflare/);
});

test('redacts Slack / Discord / Teams webhook URLs', () => {
  const slack  = redactSecrets('https://hooks.slack.com/services/T01ABCDEF/B02GHIJKL/abcDEFghiJKL1234567890ab');
  const disco  = redactSecrets('https://discord.com/api/webhooks/1234567890/abcdefghijklmnop_qrstuvwxyz-1234567890');
  const teams  = redactSecrets('https://tenant.webhook.office.com/webhookb2/abc@def/IncomingWebhook/xyz/token');
  assert.match(slack, /\[REDACTED:webhook\]/);
  assert.match(disco, /\[REDACTED:webhook\]/);
  assert.match(teams, /\[REDACTED:webhook\]/);
});

test('handles empty and non-string input', () => {
  assert.equal(redactSecrets(''), '');
  assert.equal(redactSecrets(null), '');
  assert.equal(redactSecrets(undefined), '');
  assert.equal(redactSecrets(42), '');
});
