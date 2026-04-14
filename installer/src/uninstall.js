// @ijfw/install — reverse install. Preserves ~/.ijfw/memory/ unless --purge.

import { existsSync, rmSync, cpSync, mkdtempSync } from 'node:fs';
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
  console.log(`ijfw-uninstall — reverse IJFW install
Usage: ijfw-uninstall [--dir <path>] [--purge] [--no-marketplace]
  --purge           also remove memory/ (destructive)
  --no-marketplace  skip ~/.claude/settings.json edits
`);
}

function resolveTarget(opt) {
  if (opt.dir) return resolve(opt.dir);
  if (process.env.IJFW_HOME) return resolve(process.env.IJFW_HOME);
  return join(homedir(), '.ijfw');
}

async function main() {
  const opts = parseArgs(process.argv);
  const target = resolveTarget(opts);

  if (!existsSync(target)) {
    console.log(`IJFW directory absent (${target}); marketplace cleanup only.`);
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

  console.log('\nIJFW uninstalled. Thanks for trying it.');
  process.exit(0);
}

main().catch((e) => { console.error(e.message || String(e)); process.exit(1); });
