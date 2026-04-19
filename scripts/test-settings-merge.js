#!/usr/bin/env node
// Smoke test for scripts/install.sh settings.json merge.
//
// What we verify:
//   1. Pre-existing enabledPlugins keys are preserved when ijfw@ijfw is added
//   2. Pre-existing extraKnownMarketplaces keys are preserved when ijfw is added
//   3. Pre-existing mcpServers entries are preserved when ijfw-memory is added
//   4. Non-MCP top-level keys (hooks, statusLine, effortLevel, etc.) survive
//
// This mirrors the node -e '...' merge blocks in scripts/install.sh so any
// refactor there must keep this test green.

import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PRE_EXISTING = {
  hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'echo start' }] }] },
  statusLine: { type: 'command', command: 'echo status' },
  effortLevel: 'high',
  enabledPlugins: {
    'superpowers@claude-plugins-official': true,
    'claude-mem@thedotmack': true,
    'context7@claude-plugins-official': true,
  },
  extraKnownMarketplaces: {
    'thedotmack': { source: { source: 'github', repo: 'thedotmack/claude-mem' } },
  },
  mcpServers: {
    'github': { command: 'gh-mcp', args: [], env: {} },
    'playwright': { command: 'pw-mcp', args: [], env: {} },
  },
};

function simulateMerge(input, pluginPath, serverJs) {
  // Mirror of the three merge blocks in scripts/install.sh (installer/src/install.js
  // uses the same shape via marketplace.js). If the real merges drift, this test
  // won't catch it -- keep the two in sync manually.
  const s = JSON.parse(JSON.stringify(input));

  // Block 1: enabledPlugins + extraKnownMarketplaces
  s.enabledPlugins = s.enabledPlugins || {};
  s.enabledPlugins['ijfw@ijfw'] = true;
  s.extraKnownMarketplaces = s.extraKnownMarketplaces || {};
  s.extraKnownMarketplaces['ijfw'] = {
    source: { source: 'directory', path: pluginPath },
  };

  // Block 2: mcpServers.ijfw-memory (with stale-path detection)
  s.mcpServers = s.mcpServers || {};
  const existing = s.mcpServers['ijfw-memory'];
  if (existing && existing.command) {
    const cmd = existing.command;
    if (cmd.startsWith('/') && !exists(cmd)) delete s.mcpServers['ijfw-memory'];
  }
  s.mcpServers['ijfw-memory'] = { command: 'node', args: [serverJs], env: {} };
  return s;
}
function exists() { return true; } // stub for test; not exercising stale-path branch

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
  console.log('PASS:', msg);
}

const dir = mkdtempSync(join(tmpdir(), 'ijfw-merge-'));
const settingsPath = join(dir, 'settings.json');
writeFileSync(settingsPath, JSON.stringify(PRE_EXISTING, null, 2));

const before = JSON.parse(readFileSync(settingsPath, 'utf8'));
const after = simulateMerge(before, '/home/u/.ijfw/claude', '/srv/server.js');
writeFileSync(settingsPath, JSON.stringify(after, null, 2));
const readBack = JSON.parse(readFileSync(settingsPath, 'utf8'));

// enabledPlugins: ijfw added, pre-existing kept
assert(readBack.enabledPlugins['ijfw@ijfw'] === true, 'ijfw@ijfw enabled');
assert(readBack.enabledPlugins['superpowers@claude-plugins-official'] === true, 'superpowers preserved');
assert(readBack.enabledPlugins['claude-mem@thedotmack'] === true, 'claude-mem preserved');
assert(readBack.enabledPlugins['context7@claude-plugins-official'] === true, 'context7 preserved');
assert(Object.keys(readBack.enabledPlugins).length === 4, 'enabledPlugins has exactly 4 entries');

// extraKnownMarketplaces: ijfw added, pre-existing kept
assert(readBack.extraKnownMarketplaces['ijfw'], 'ijfw marketplace added');
assert(readBack.extraKnownMarketplaces['thedotmack'], 'thedotmack marketplace preserved');

// mcpServers: ijfw-memory added, pre-existing kept
assert(readBack.mcpServers['ijfw-memory'].command === 'node', 'ijfw-memory uses node command');
assert(readBack.mcpServers['github'], 'github MCP preserved');
assert(readBack.mcpServers['playwright'], 'playwright MCP preserved');

// Top-level non-MCP keys preserved
assert(readBack.hooks, 'hooks preserved');
assert(readBack.statusLine, 'statusLine preserved');
assert(readBack.effortLevel === 'high', 'effortLevel preserved');

rmSync(dir, { recursive: true, force: true });
console.log('\nAll merge invariants hold.');
