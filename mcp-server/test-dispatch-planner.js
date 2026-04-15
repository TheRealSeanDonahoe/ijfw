import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePlan,
  computeOverlaps,
  buildManifest,
  manifestSummary,
  mergeOrder,
} from './src/dispatch-planner.js';

// --- parsePlan ---------------------------------------------------------------

test('parsePlan extracts wave + sub + files from standard plan', () => {
  const md = [
    '# Phase 12',
    '',
    '### Wave 12A -- dispatcher',
    '',
    '- **12A-core**: helper module.',
    '  Files: mcp-server/src/dispatch-planner.js, mcp-server/test-dispatch-planner.js',
    '',
    '### Wave 12A-cmd',
    '  Files: claude/commands/foo.md',
    '',
    '### Wave 12B -- next',
    '  Files: `mcp-server/src/server.js`',
  ].join('\n');

  const parsed = parsePlan(md);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].wave, '12A');
  assert.deepEqual(parsed[0].files, [
    'mcp-server/src/dispatch-planner.js',
    'mcp-server/test-dispatch-planner.js',
  ]);
  assert.equal(parsed[1].sub, '12A-cmd');
  assert.deepEqual(parsed[2].files, ['mcp-server/src/server.js']);
});

test('parsePlan returns empty files array when Files: line is missing', () => {
  const md = '### Wave 13A -- no files here\nJust prose.\n';
  const parsed = parsePlan(md);
  assert.equal(parsed.length, 1);
  assert.deepEqual(parsed[0].files, []);
});

// --- computeOverlaps ---------------------------------------------------------

test('computeOverlaps flags intersecting sub-waves within the same wave', () => {
  const subs = [
    { wave: '12A', sub: '12A-a', files: ['x.js', 'y.js'] },
    { wave: '12A', sub: '12A-b', files: ['y.js'] },
    { wave: '12A', sub: '12A-c', files: ['z.js'] },
  ];
  const overlaps = computeOverlaps(subs);
  assert.deepEqual(overlaps.get('12A-a'), ['12A-b']);
  assert.deepEqual(overlaps.get('12A-b'), ['12A-a']);
  assert.deepEqual(overlaps.get('12A-c'), []);
});

test('computeOverlaps does not cross wave boundaries', () => {
  const subs = [
    { wave: '12A', sub: '12A-a', files: ['x.js'] },
    { wave: '12B', sub: '12B-a', files: ['x.js'] },
  ];
  const overlaps = computeOverlaps(subs);
  assert.deepEqual(overlaps.get('12A-a'), []);
  assert.deepEqual(overlaps.get('12B-a'), []);
});

// --- buildManifest -----------------------------------------------------------

test('buildManifest -- disjoint sub-waves go shared', () => {
  const subs = [
    { wave: '12A', sub: '12A-a', files: ['a.js'] },
    { wave: '12A', sub: '12A-b', files: ['b.js'] },
  ];
  const m = buildManifest(subs);
  assert.equal(m[0].mode, 'shared');
  assert.equal(m[1].mode, 'shared');
  assert.equal(m[0].reason, 'disjoint');
});

test('buildManifest -- overlapping sub-waves go worktree', () => {
  const subs = [
    { wave: '12A', sub: '12A-a', files: ['x.js'] },
    { wave: '12A', sub: '12A-b', files: ['x.js'] },
  ];
  const m = buildManifest(subs);
  assert.equal(m[0].mode, 'worktree');
  assert.equal(m[1].mode, 'worktree');
  assert.match(m[0].reason, /^overlap:/);
  assert.deepEqual(m[0].overlaps_with, ['12A-b']);
});

test('buildManifest -- missing Files: declaration defaults to worktree', () => {
  const subs = [{ wave: '12A', sub: '12A-a', files: [] }];
  const m = buildManifest(subs);
  assert.equal(m[0].mode, 'worktree');
  assert.equal(m[0].reason, 'no-files-declared');
});

test('buildManifest -- override all-worktree forces worktree even when disjoint', () => {
  const subs = [
    { wave: '12A', sub: '12A-a', files: ['a.js'] },
    { wave: '12A', sub: '12A-b', files: ['b.js'] },
  ];
  const m = buildManifest(subs, { override: 'all-worktree' });
  assert.ok(m.every((e) => e.mode === 'worktree'));
  assert.ok(m.every((e) => e.reason === 'override:all-worktree'));
});

test('buildManifest -- override all-shared forces shared even on overlap', () => {
  const subs = [
    { wave: '12A', sub: '12A-a', files: ['x.js'] },
    { wave: '12A', sub: '12A-b', files: ['x.js'] },
  ];
  const m = buildManifest(subs, { override: 'all-shared' });
  assert.ok(m.every((e) => e.mode === 'shared'));
  assert.ok(m.every((e) => e.reason === 'override:all-shared'));
});

// --- manifestSummary + mergeOrder -------------------------------------------

test('manifestSummary produces a readable one-liner with overlap pairs', () => {
  const subs = [
    { wave: '12A', sub: '12A-a', files: ['x.js'] },
    { wave: '12A', sub: '12A-b', files: ['x.js'] },
    { wave: '12A', sub: '12A-c', files: ['z.js'] },
  ];
  const summary = manifestSummary(buildManifest(subs));
  assert.match(summary, /Wave 12A: 1 shared \+ 2 worktree/);
  assert.match(summary, /12A-a <-> 12A-b/);
});

test('mergeOrder returns worktree sub-waves in declaration order', () => {
  const subs = [
    { wave: '12A', sub: '12A-a', files: ['x.js'] },
    { wave: '12A', sub: '12A-b', files: ['y.js'] },
    { wave: '12A', sub: '12A-c', files: ['x.js'] },
  ];
  const order = mergeOrder(buildManifest(subs));
  assert.deepEqual(order, ['12A-a', '12A-c']);
});

// --- HIGH fixes from Trident audit ----------------------------------------

test('parsePlan recognizes bullet sub-waves -- **11A-mcp**: form', () => {
  const md = [
    '### Wave 11A -- sweep',
    '',
    '- **11A-mcp**: MCP server cluster.',
    '  Files: mcp-server/src/server.js',
    '- **11A-cmd**: commands cluster.',
    '  Files: claude/commands/status.md',
  ].join('\n');
  const parsed = parsePlan(md);
  const subs = parsed.filter((s) => s.sub);
  assert.equal(subs.length, 2);
  assert.deepEqual(subs.map((s) => s.sub).sort(), ['11A-cmd', '11A-mcp']);
  assert.deepEqual(subs.find((s) => s.sub === '11A-mcp').files, ['mcp-server/src/server.js']);
});

test('parsePlan accumulates multiple Files: lines instead of overwriting', () => {
  const md = [
    '### Wave 12Z',
    '  Files: a.js',
    '  Files: b.js, c.js',
  ].join('\n');
  const parsed = parsePlan(md);
  assert.deepEqual(parsed[0].files.sort(), ['a.js', 'b.js', 'c.js']);
});

test('buildManifest -- glob overlaps with literal path go worktree', () => {
  const subs = [
    { wave: '12A', sub: '12A-glob',    files: ['claude/commands/*.md'] },
    { wave: '12A', sub: '12A-literal', files: ['claude/commands/status.md'] },
  ];
  const m = buildManifest(subs);
  assert.equal(m[0].mode, 'worktree');
  assert.equal(m[1].mode, 'worktree');
});

test('buildManifest -- disjoint globs stay shared', () => {
  const subs = [
    { wave: '12A', sub: '12A-a', files: ['claude/commands/*.md'] },
    { wave: '12A', sub: '12A-b', files: ['mcp-server/src/*.js'] },
  ];
  const m = buildManifest(subs);
  assert.equal(m[0].mode, 'shared');
  assert.equal(m[1].mode, 'shared');
});

test('buildManifest -- ** glob matches nested literal', () => {
  const subs = [
    { wave: '12A', sub: '12A-deep', files: ['src/**/*.js'] },
    { wave: '12A', sub: '12A-nest', files: ['src/a/b/c.js'] },
  ];
  const m = buildManifest(subs);
  assert.equal(m[0].mode, 'worktree');
  assert.equal(m[1].mode, 'worktree');
});
