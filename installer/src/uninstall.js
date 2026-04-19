// @ijfw/install -- reverse install. Preserves ~/.ijfw/memory/ unless --purge.

import { existsSync, rmSync, cpSync, mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { unmergeMarketplace, claudeSettingsPath } from './marketplace.js';

function parseArgs(argv) {
  const out = { dir: null, purge: false, noMarketplace: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') out.dir = argv[++i];
    else if (a === '--purge') out.purge = true;
    else if (a === '--no-marketplace') out.noMarketplace = true;
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
  }
  return out;
}

function printHelp() {
  console.log(`ijfw-uninstall -- reverse IJFW install
Usage: ijfw-uninstall [--dir <path>] [--purge] [--no-marketplace]
  --purge           also remove memory/ (destructive)
  --no-marketplace  skip ~/.claude/settings.json edits
`);
}

const HOME = homedir();
const TS = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);

function backupFile(p) {
  if (existsSync(p)) {
    const bak = p + '.bak.' + TS;
    cpSync(p, bak);
    return bak;
  }
  return null;
}

// Remove [mcp_servers.ijfw-memory] section from a TOML file.
function removeTomlSection(p) {
  if (!existsSync(p)) return false;
  backupFile(p);
  const lines = readFileSync(p, 'utf8').split('\n');
  const out = [];
  let skip = false;
  for (const line of lines) {
    if (/^\[mcp_servers\.ijfw-memory\]\s*$/.test(line)) { skip = true; continue; }
    if (skip && line.startsWith('[') && !line.startsWith('[mcp_servers.ijfw-memory]')) skip = false;
    if (!skip) out.push(line);
  }
  writeFileSync(p, out.join('\n'));
  return true;
}

// Remove ijfw-memory key from a JSON mcpServers object.
function removeJsonMcpEntry(p) {
  if (!existsSync(p)) return false;
  let doc;
  try { doc = JSON.parse(readFileSync(p, 'utf8')); } catch { return false; }
  if (!doc || typeof doc !== 'object') return false;
  let changed = false;
  if (doc.mcpServers && doc.mcpServers['ijfw-memory']) {
    backupFile(p);
    delete doc.mcpServers['ijfw-memory'];
    writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
    changed = true;
  }
  return changed;
}

// Remove all _ijfw:true entries from ~/.codex/hooks.json.
function removeCodexHooks(p) {
  if (!existsSync(p)) return false;
  let doc;
  try { doc = JSON.parse(readFileSync(p, 'utf8')); } catch { return false; }
  if (!Array.isArray(doc.hooks)) return false;
  const before = doc.hooks.length;
  doc.hooks = doc.hooks.filter(h => !h._ijfw);
  if (doc.hooks.length === before) return false;
  backupFile(p);
  writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
  return true;
}

// Remove all ijfw-* skill dirs from a directory.
function removeIjfwSkills(dir) {
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith('ijfw-')) {
      rmSync(join(dir, entry.name), { recursive: true, force: true });
      count++;
    }
  }
  return count;
}

function cleanPlatforms() {
  const removed = [];

  // Codex: config.toml MCP section
  if (removeTomlSection(join(HOME, '.codex', 'config.toml'))) {
    removed.push('~/.codex/config.toml  (removed [mcp_servers.ijfw-memory])');
  }
  // Codex: hooks.json IJFW entries
  if (removeCodexHooks(join(HOME, '.codex', 'hooks.json'))) {
    removed.push('~/.codex/hooks.json  (removed IJFW hook entries)');
  }
  // Codex: skill dirs
  const codexSkills = removeIjfwSkills(join(HOME, '.codex', 'skills'));
  if (codexSkills > 0) removed.push(`~/.codex/skills/ijfw-*  (removed ${codexSkills} skill dirs)`);
  // Codex: IJFW.md context file
  const codexMd = join(HOME, '.codex', 'IJFW.md');
  if (existsSync(codexMd)) { rmSync(codexMd, { force: true }); removed.push('~/.codex/IJFW.md'); }

  // Gemini: settings.json MCP entry
  if (removeJsonMcpEntry(join(HOME, '.gemini', 'settings.json'))) {
    removed.push('~/.gemini/settings.json  (removed ijfw-memory)');
  }
  // Gemini: extension dir
  const geminiExt = join(HOME, '.gemini', 'extensions', 'ijfw');
  if (existsSync(geminiExt)) {
    rmSync(geminiExt, { recursive: true, force: true });
    removed.push('~/.gemini/extensions/ijfw/');
  }

  // Cursor: project .cursor/mcp.json
  const cursorMcp = join('.cursor', 'mcp.json');
  if (removeJsonMcpEntry(cursorMcp)) removed.push('.cursor/mcp.json  (removed ijfw-memory)');

  // Windsurf: global mcp_config.json
  if (removeJsonMcpEntry(join(HOME, '.codeium', 'windsurf', 'mcp_config.json'))) {
    removed.push('~/.codeium/windsurf/mcp_config.json  (removed ijfw-memory)');
  }

  // Copilot / VS Code: project .vscode/mcp.json
  const vscodeMcp = join('.vscode', 'mcp.json');
  if (removeJsonMcpEntry(vscodeMcp)) removed.push('.vscode/mcp.json  (removed ijfw-memory)');

  return removed;
}

function resolveTarget(opt) {
  if (opt.dir) return resolve(opt.dir);
  if (process.env.IJFW_HOME) return resolve(process.env.IJFW_HOME);
  return join(homedir(), '.ijfw');
}

async function main() {
  const opts = parseArgs(process.argv);
  const target = resolveTarget(opts);

  console.log('This will remove IJFW configuration. Your memory at ~/.ijfw/memory/ will be preserved. Delete manually if desired.');
  console.log('');

  if (!existsSync(target)) {
    console.log(`IJFW directory absent (${target}); platform cleanup only.`);
  } else if (opts.purge) {
    rmSync(target, { recursive: true, force: true });
    console.log(`  removed ${target} (purged).`);
  } else {
    const memDir = join(target, 'memory');
    let stash = null;
    if (existsSync(memDir)) {
      stash = mkdtempSync(join(tmpdir(), 'ijfw-memory-'));
      cpSync(memDir, stash, { recursive: true });
    }
    rmSync(target, { recursive: true, force: true });
    if (stash) {
      cpSync(stash, memDir, { recursive: true });
      rmSync(stash, { recursive: true, force: true });
      console.log(`  memory/ preserved at ${memDir}`);
    } else {
      console.log('  memory/ was not present; nothing to preserve');
    }
  }

  if (!opts.noMarketplace) {
    const settingsPath = claudeSettingsPath();
    if (existsSync(settingsPath)) {
      unmergeMarketplace(settingsPath);
      console.log(`  marketplace removed from ${settingsPath}`);
    }
  }

  // Clean up platform configs across all 6 platforms.
  const cleaned = cleanPlatforms();
  if (cleaned.length > 0) {
    console.log('  platform configs cleaned:');
    for (const line of cleaned) console.log(`    ${line}`);
  }

  console.log('\nIJFW uninstalled. Thanks for trying it.');
  process.exit(0);
}

main().catch((e) => { console.error(e.message || String(e)); process.exit(1); });
