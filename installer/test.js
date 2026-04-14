// Smoke tests for @ijfw/install (node --test).
// Do NOT spawn real network clones; use a local --branch=HEAD + local repo
// override where needed. These tests exercise flag parsing, marketplace
// merge/unmerge, memory preservation logic, and package layout.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

// --- Test 1: package layout ---
test('package.json declares both bin entries', () => {
  const pkg = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
  assert.equal(pkg.bin['ijfw-install'], './dist/install.js');
  assert.equal(pkg.bin['ijfw-uninstall'], './dist/uninstall.js');
  assert.deepEqual(pkg.dependencies, {});
  assert.ok(pkg.engines.node.startsWith('>='));
});

// --- Test 2: marketplace merge + unmerge is non-destructive ---
test('marketplace merge preserves unrelated keys and unmerge reverses', async () => {
  const { mergeMarketplace, unmergeMarketplace } = await import('./src/marketplace.js');
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-settings-'));
  const settingsPath = join(dir, 'settings.json');
  const original = {
    theme: 'dark',
    extraKnownMarketplaces: { other: { source: { source: 'github', repo: 'x/y' } } },
    enabledPlugins: { 'other@other': true },
    custom: { keep: 'me' },
  };
  writeFileSync(settingsPath, JSON.stringify(original));

  const merged = mergeMarketplace(settingsPath);
  assert.equal(merged.theme, 'dark');
  assert.equal(merged.custom.keep, 'me');
  assert.ok(merged.extraKnownMarketplaces.other, 'unrelated marketplace preserved');
  assert.ok(merged.extraKnownMarketplaces.ijfw, 'ijfw marketplace added');
  assert.equal(merged.enabledPlugins['ijfw-core@ijfw'], true);
  assert.equal(merged.enabledPlugins['other@other'], true);

  const unmerged = unmergeMarketplace(settingsPath);
  assert.equal(unmerged.extraKnownMarketplaces.ijfw, undefined);
  assert.equal(unmerged.enabledPlugins['ijfw-core@ijfw'], undefined);
  assert.ok(unmerged.extraKnownMarketplaces.other, 'other marketplace still there after unmerge');
  assert.equal(unmerged.custom.keep, 'me');

  rmSync(dir, { recursive: true, force: true });
});

// --- Test 3: marketplace merge creates file if missing ---
test('marketplace merge creates settings.json when absent', async () => {
  const { mergeMarketplace } = await import('./src/marketplace.js');
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-settings-'));
  const settingsPath = join(dir, 'nested', 'settings.json');
  mergeMarketplace(settingsPath);
  assert.ok(existsSync(settingsPath));
  const s = JSON.parse(readFileSync(settingsPath, 'utf8'));
  assert.ok(s.extraKnownMarketplaces.ijfw);
  rmSync(dir, { recursive: true, force: true });
});

// --- Test 4: install.js --help exits 0 ---
test('install.js --help prints usage and exits 0', () => {
  const res = spawnSync(process.execPath, [join(HERE, 'src', 'install.js'), '--help'], { encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /ijfw-install/);
  assert.match(res.stdout, /--no-marketplace/);
});

// --- Test 5: uninstall preserves memory dir (logic test via direct invocation) ---
test('uninstall preserves memory/ without --purge', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-home-'));
  mkdirSync(join(dir, 'memory'), { recursive: true });
  writeFileSync(join(dir, 'memory', 'canary.md'), 'keep-me');
  mkdirSync(join(dir, 'claude'), { recursive: true });
  writeFileSync(join(dir, 'claude', 'fake.txt'), 'remove-me');

  // Point HOME elsewhere so we don't touch the real settings.json.
  const tmpHome = mkdtempSync(join(tmpdir(), 'ijfw-fakehome-'));
  const res = spawnSync(process.execPath, [
    join(HERE, 'src', 'uninstall.js'), '--dir', dir, '--no-marketplace',
  ], { encoding: 'utf8', env: { ...process.env, HOME: tmpHome } });
  assert.equal(res.status, 0, res.stderr);
  assert.ok(existsSync(join(dir, 'memory', 'canary.md')), 'memory preserved');
  assert.ok(!existsSync(join(dir, 'claude', 'fake.txt')), 'other files removed');

  rmSync(dir, { recursive: true, force: true });
  rmSync(tmpHome, { recursive: true, force: true });
});

// --- Test 6: uninstall --purge removes memory ---
test('uninstall --purge removes memory/', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-home-'));
  mkdirSync(join(dir, 'memory'), { recursive: true });
  writeFileSync(join(dir, 'memory', 'canary.md'), 'bye');

  const tmpHome = mkdtempSync(join(tmpdir(), 'ijfw-fakehome-'));
  const res = spawnSync(process.execPath, [
    join(HERE, 'src', 'uninstall.js'), '--dir', dir, '--purge', '--no-marketplace',
  ], { encoding: 'utf8', env: { ...process.env, HOME: tmpHome } });
  assert.equal(res.status, 0, res.stderr);
  assert.ok(!existsSync(dir), 'dir fully removed');

  rmSync(tmpHome, { recursive: true, force: true });
});
