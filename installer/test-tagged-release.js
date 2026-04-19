import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBranchOrTag } from './src/install.js';

test('explicit --branch always wins', () => {
  assert.equal(
    resolveBranchOrTag({ branch: 'main', branchExplicit: true, _tagLookup: () => 'v999.0.0' }),
    'main',
  );
});

test('defaults to latest tag when not explicit', () => {
  assert.equal(
    resolveBranchOrTag({ branch: 'main', branchExplicit: false, _tagLookup: () => 'v0.4.0-rc.1' }),
    'v0.4.0-rc.1',
  );
});

test('falls back to branch when tag lookup returns null', () => {
  assert.equal(
    resolveBranchOrTag({ branch: 'main', branchExplicit: false, _tagLookup: () => null }),
    'main',
  );
});

test('falls back to DEFAULT_BRANCH when both missing', () => {
  const got = resolveBranchOrTag({ branchExplicit: false, _tagLookup: () => null });
  assert.ok(got && typeof got === 'string');
});

test('falls back to main when tag lookup throws (network failure)', () => {
  const got = resolveBranchOrTag({
    branch: 'main',
    branchExplicit: false,
    _tagLookup: () => { throw new Error('ENOTFOUND github.com'); },
  });
  assert.equal(got, 'main');
});
