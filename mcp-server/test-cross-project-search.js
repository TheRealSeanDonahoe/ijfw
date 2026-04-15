import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCorpus, crossProjectSearch, aggregatePortfolioFindings } from './src/cross-project-search.js';

const PROJECTS = [
  { path: '/home/me/dev/alpha', hash: 'aaaaaaaaaaaa', iso: '2026-01-01T00:00:00Z' },
  { path: '/home/me/dev/beta',  hash: 'bbbbbbbbbbbb', iso: '2026-02-01T00:00:00Z' },
];

function fakeReader(map) {
  return (path) => map[path] || { knowledge: '', journal: '', handoff: '' };
}

test('buildCorpus produces one doc per non-empty line, tagged with project', () => {
  const reader = fakeReader({
    '/home/me/dev/alpha': { knowledge: 'alpha decision about caching\nsecond line', journal: '', handoff: '' },
    '/home/me/dev/beta':  { knowledge: '', journal: 'beta journaling prompt caching', handoff: '' },
  });
  const docs = buildCorpus(PROJECTS, reader);
  assert.equal(docs.length, 3);
  assert.equal(docs[0].meta.project, 'alpha');
  assert.equal(docs[0].meta.source, 'knowledge');
  assert.equal(docs[0].meta.lineNo, 1);
  assert.equal(docs[2].meta.project, 'beta');
  assert.equal(docs[2].meta.source, 'journal');
});

test('buildCorpus skips empty/whitespace-only lines', () => {
  const reader = fakeReader({
    '/home/me/dev/alpha': { knowledge: 'real line\n\n   \nmore content', journal: '', handoff: '' },
    '/home/me/dev/beta':  { knowledge: '', journal: '', handoff: '' },
  });
  const docs = buildCorpus(PROJECTS, reader);
  assert.equal(docs.length, 2);
});

test('crossProjectSearch ranks matching project first', () => {
  const reader = fakeReader({
    '/home/me/dev/alpha': { knowledge: 'unrelated content about widgets', journal: '', handoff: '' },
    '/home/me/dev/beta':  { knowledge: 'prompt caching halves API spend', journal: '', handoff: '' },
  });
  const results = crossProjectSearch('prompt caching', PROJECTS, reader);
  assert.ok(results.length > 0);
  assert.equal(results[0].project, 'beta');
  assert.match(results[0].content, /^\[project:beta\]/);
  assert.ok(results[0].score > 0);
});

test('crossProjectSearch respects limit option', () => {
  const bigText = Array.from({ length: 20 }, (_, i) => `line ${i} matches caching`).join('\n');
  const reader = fakeReader({
    '/home/me/dev/alpha': { knowledge: bigText, journal: '', handoff: '' },
    '/home/me/dev/beta':  { knowledge: '', journal: '', handoff: '' },
  });
  const results = crossProjectSearch('caching', PROJECTS, reader, { limit: 5 });
  assert.equal(results.length, 5);
});

test('crossProjectSearch returns [] on empty query or empty registry', () => {
  const reader = fakeReader({});
  assert.deepEqual(crossProjectSearch('', PROJECTS, reader), []);
  assert.deepEqual(crossProjectSearch('caching', [], reader), []);
});

test('aggregatePortfolioFindings renders summary table + per-project sections', () => {
  const md = aggregatePortfolioFindings([
    { project: 'alpha', path: '/a', status: 'ok',      findings: 'HIGH: null deref in parser.js:42\nMED: unused import' },
    { project: 'beta',  path: '/b', status: 'failed',  findings: '', error: 'ijfw not installed' },
    { project: 'gamma', path: '/g', status: 'skipped', findings: '',  error: 'no audit rule match' },
  ], { rule: 'README.md', startedAt: '2026-04-15T03:00:00Z', finishedAt: '2026-04-15T03:02:00Z' });
  assert.match(md, /# Portfolio audit -- README\.md/);
  assert.match(md, /Projects audited: 1 \/ 3/);
  assert.match(md, /\| alpha \| ok \| HIGH: null deref/);
  assert.match(md, /\| beta \| failed \| ijfw not installed \|/);
  assert.match(md, /### alpha  \(\/a\)/);
  assert.match(md, /\*\*Error:\*\* ijfw not installed/);
});

test('aggregatePortfolioFindings handles empty results array', () => {
  const md = aggregatePortfolioFindings([], { rule: 'foo' });
  assert.match(md, /Projects audited: 0 \/ 0/);
  assert.match(md, /## Per-project findings/);
});

test('crossProjectSearch attaches line number and source to each hit', () => {
  const reader = fakeReader({
    '/home/me/dev/alpha': {
      knowledge: 'irrelevant\nthe answer is 42 about caching',
      journal: '',
      handoff: '',
    },
    '/home/me/dev/beta':  { knowledge: '', journal: '', handoff: '' },
  });
  const results = crossProjectSearch('caching 42', PROJECTS, reader);
  assert.ok(results.length > 0);
  assert.equal(results[0].line, 2);
  assert.equal(results[0].source, 'knowledge@alpha');
});
