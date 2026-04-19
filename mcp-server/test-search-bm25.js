import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchCorpus, tokenize } from './src/search-bm25.js';

const corpus = [
  { id: 'd1', text: 'Pagination off-by-one bug in paginator returns wrong page count on exact multiples' },
  { id: 'd2', text: 'Auth refactor to RS256 JWTs; rotate signing keys quarterly; impact on refresh flow' },
  { id: 'd3', text: 'Rate limiter uses token bucket with burst capacity 100, refill 10/s' },
  { id: 'd4', text: 'Database migration for adding not-null column requires backfill with shadow write' },
  { id: 'd5', text: 'UI dropdown menu state desync on route change; fix via React key on SelectMenu' },
];

test('keyword match returns most-relevant first', () => {
  const r = searchCorpus('pagination bug', corpus);
  assert.ok(r.length > 0);
  assert.equal(r[0].id, 'd1');
});

test('ranks by BM25 score descending', () => {
  const r = searchCorpus('auth JWT', corpus);
  assert.equal(r[0].id, 'd2');
  for (let i = 1; i < r.length; i++) assert.ok(r[i-1].score >= r[i].score);
});

test('phrase query ("...") filters out docs lacking the phrase', () => {
  const r = searchCorpus('"token bucket"', corpus);
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'd3');
});

test('phrase and keyword together', () => {
  const r = searchCorpus('limiter "token bucket"', corpus);
  assert.equal(r[0].id, 'd3');
});

test('stopwords are ignored', () => {
  assert.deepEqual(tokenize('the bug is in the paginator'), ['bug', 'paginator']);
});

test('short tokens (<2 chars) are dropped', () => {
  assert.deepEqual(tokenize('a b cd ef'), ['cd', 'ef']);
});

test('limit caps result count', () => {
  const big = Array.from({length: 50}, (_, i) => ({ id: `d${i}`, text: 'bug fix' }));
  const r = searchCorpus('bug', big, { limit: 5 });
  assert.equal(r.length, 5);
});

test('empty query returns empty', () => {
  assert.deepEqual(searchCorpus('', corpus), []);
  assert.deepEqual(searchCorpus('the a an', corpus), []);
});

test('empty corpus returns empty', () => {
  assert.deepEqual(searchCorpus('anything', []), []);
});

test('no matches returns empty', () => {
  assert.deepEqual(searchCorpus('kubernetes helm chart', corpus), []);
});

test('snippets contain the matched term', () => {
  const r = searchCorpus('paginator', corpus);
  assert.ok(r[0].snippet.toLowerCase().includes('paginator'));
});

test('identifier-like terms (snake_case, kebab-case) survive tokenization', () => {
  const docs = [{ id: 'x', text: 'session_id is the request_id for trace-context lookup' }];
  const r = searchCorpus('session_id', docs);
  assert.equal(r.length, 1);
});

test('case-insensitive matching', () => {
  const r = searchCorpus('PAGINATION', corpus);
  assert.equal(r[0].id, 'd1');
});

test('performance: 1000-doc corpus searches in <50ms', () => {
  const big = Array.from({length: 1000}, (_, i) => ({
    id: `d${i}`,
    text: `entry ${i} covering topic ${i % 50} with bug and fix keywords scattered across`,
  }));
  const start = Date.now();
  const r = searchCorpus('bug fix topic', big, { limit: 10 });
  const elapsed = Date.now() - start;
  assert.ok(r.length === 10);
  assert.ok(elapsed < 50, `BM25 over 1000 docs took ${elapsed}ms (budget 50ms)`);
});
