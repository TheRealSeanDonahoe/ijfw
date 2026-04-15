// @ijfw/install -- one-command IJFW installer.
// Flow: preflight → resolve target → clone/pull → scripts/install.sh → merge marketplace → summary.

import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, mkdirSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir, platform } from 'node:os';
import { fileURLToPath } from 'node:url';
import { mergeMarketplace, claudeSettingsPath } from './marketplace.js';

const DEFAULT_REPO = 'https://github.com/SeanDonahoe/ijfw.git';
const DEFAULT_BRANCH = 'main';

function parseArgs(argv) {
  const out = { yes: false, dir: null, noMarketplace: false, branch: DEFAULT_BRANCH, branchExplicit: false, purge: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--yes' || a === '-y') out.yes = true;
    else if (a === '--dir') out.dir = argv[++i];
    else if (a === '--no-marketplace') out.noMarketplace = true;
    else if (a === '--branch') { out.branch = argv[++i]; out.branchExplicit = true; }
    else if (a === '--purge') out.purge = true;
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
  }
  return out;
}

function latestTagFromGithub() {
  try {
    const res = spawnSync('git', ['ls-remote', '--tags', '--refs', '--sort=-v:refname', DEFAULT_REPO], {
      encoding: 'utf8', timeout: 10_000,
    });
    if (res.status !== 0) return null;
    const first = (res.stdout || '').split('\n')[0] || '';
    const m = first.match(/refs\/tags\/(v[0-9][^\s]*)$/);
    return m ? m[1] : null;
  } catch { return null; }
}

// Pinning to latest tag is the default (audit R2); --branch escape hatch
// stays available for bleeding-edge users and CI. Any lookup failure
// (network down, no tags yet, ls-remote rate-limited) falls back silently
// to the branch/DEFAULT_BRANCH rather than exploding the install.
export function resolveBranchOrTag({ branch, branchExplicit, _tagLookup } = {}) {
  if (branchExplicit) return branch;
  const lookup = _tagLookup || latestTagFromGithub;
  let tag = null;
  try { tag = lookup(); } catch { tag = null; }
  return tag || branch || DEFAULT_BRANCH;
}

function printHelp() {
  console.log(`ijfw-install -- IJFW installer
Usage: npx @ijfw/install [--dir <path>] [--branch <name>] [--no-marketplace] [--yes]
  --dir             install location (default: $IJFW_HOME or ~/.ijfw)
  --branch          git branch or tag (default: latest released tag)
  --no-marketplace  skip merging ~/.claude/settings.json
  --yes             non-interactive
`);
}

function preflight() {
  const issues = [];
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 18) issues.push(`IJFW needs Node >=18 -- current: ${process.versions.node}. Upgrade Node, then retry.`);
  if (!hasBin('git')) issues.push('IJFW needs git on PATH -- install git, then retry.');
  if (!hasBin('bash')) issues.push('IJFW needs bash on PATH -- install bash, then retry.');
  if (platform() === 'win32') issues.push('Native Windows detected -- please run from WSL for the best IJFW experience.');
  return issues;
}

function hasBin(bin) {
  const res = spawnSync(bin, ['--version'], { stdio: 'ignore' });
  return res.status === 0 || res.status === null ? (res.error ? false : true) : false;
}

function resolveTarget(opt) {
  if (opt.dir) return resolve(opt.dir);
  if (process.env.IJFW_HOME) return resolve(process.env.IJFW_HOME);
  return join(homedir(), '.ijfw');
}

function cloneOrPull(dir, branch) {
  if (existsSync(join(dir, '.git'))) {
    const r = spawnSync('git', ['-C', dir, 'pull', '--ff-only', 'origin', branch], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error(`IJFW update step did not complete (exit ${r.status}) -- run ijfw doctor to check prerequisites.`);
    return 'updated';
  }
  mkdirSync(dir, { recursive: true });
  const r = spawnSync('git', ['clone', '--depth', '1', '--branch', branch, DEFAULT_REPO, dir], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`IJFW repo fetch did not complete (exit ${r.status}) -- check network access and retry.`);
  return 'cloned';
}

function runInstallScript(dir) {
  const script = join(dir, 'scripts', 'install.sh');
  if (!existsSync(script)) throw new Error(`IJFW install script not found at ${script} -- re-run the installer to restore it.`);
  const env = { ...process.env, IJFW_NONINTERACTIVE: process.env.CI ? '1' : (process.env.IJFW_NONINTERACTIVE ?? '') };
  const r = spawnSync('bash', ['scripts/install.sh'], { cwd: dir, stdio: 'inherit', env });
  if (r.status !== 0) throw new Error(`IJFW platform config step did not complete (exit ${r.status}) -- run ijfw doctor to see what to fix.`);
}

async function main() {
  const opts = parseArgs(process.argv);
  const issues = preflight();
  if (issues.length) {
    console.error('IJFW needs a couple of things first -- fix these and re-run:');
    for (const i of issues) console.error('  - ' + i);
    process.exit(1);
  }

  const target = resolveTarget(opts);
  const createdThisRun = !existsSync(target);

  const sigint = () => {
    if (createdThisRun && existsSync(target)) {
      try { rmSync(target, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
    process.exit(130);
  };
  process.on('SIGINT', sigint);

  const ref = resolveBranchOrTag({ branch: opts.branch, branchExplicit: opts.branchExplicit });
  console.log(`IJFW install target: ${target}`);
  console.log(`  version: ${ref}`);
  const action = cloneOrPull(target, ref);
  console.log(`  repo ${action}`);

  runInstallScript(target);
  console.log('  platform configs applied');

  if (!opts.noMarketplace) {
    const settingsPath = claudeSettingsPath();
    mergeMarketplace(settingsPath);
    console.log(`  marketplace registered in ${settingsPath}`);
  }

  console.log('');
  console.log('IJFW now active across 7 platforms -- one memory layer, all your AIs, zero config.');
  console.log('  Run `ijfw demo` to see the Trident in action.');
  console.log('  Run `ijfw doctor` to confirm which auditors are reachable.');
  console.log('  Privacy: everything stays local. See NO_TELEMETRY.md.');
  process.exit(0);
}

function isDirectRun() {
  try {
    const entry = process.argv[1] && realpathSync(process.argv[1]);
    const self = fileURLToPath(import.meta.url);
    return entry === self;
  } catch { return false; }
}

if (isDirectRun()) {
  main().catch((e) => { console.error(e.message || String(e)); process.exit(1); });
}
