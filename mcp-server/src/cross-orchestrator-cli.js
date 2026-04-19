// cross-orchestrator-cli.js -- thin CLI for `ijfw cross <mode> <target>`.
//
// Commands:
//   ijfw cross <mode> <target> [--confirm] [--with <id>] [--expand]
//   ijfw status
//   ijfw --help
//
// Zero external deps. Parse argv manually.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname, basename, isAbsolute, resolve } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { runCrossOp } from './cross-orchestrator.js';
import { readReceipts, purgeReceipts } from './receipts.js';
import { renderHeroLine } from './hero-line.js';
import { ROSTER, isInstalled, isReachable } from './audit-roster.js';
import { aggregatePortfolioFindings } from './cross-project-search.js';
import { runImport, runImportAll, listImporters } from './importers/cli.js';

// ---------------------------------------------------------------------------
// Findings printer
// ---------------------------------------------------------------------------
function printFindings(mode, merged) {
  if (mode === 'audit') {
    const items = Array.isArray(merged) ? merged : [];
    if (items.length === 0) {
      console.log('  Auditors returned no findings -- your target looks solid.');
      console.log('  Run `ijfw cross audit <another-file>` to audit a different target.');
      return;
    }
    console.log('');
    items.forEach((item, i) => {
      const sev = item.severity ? ` [${item.severity}]` : '';
      const loc = item.location ? ` | ${item.location}` : '';
      const issue = String(item.issue || '');
      console.log(`  Step 1.${i + 1} --${sev}${loc} -- ${issue}`);
    });
    return;
  }

  if (mode === 'research') {
    const { consensus = [], contested = [], synthesisPending } = merged || {};
    console.log('');
    console.log(`  Consensus: ${consensus.length}  |  Contested: ${contested.length}`);
    if (synthesisPending) console.log('  Note: synthesis pass pending -- lexical match only.');
    consensus.slice(0, 5).forEach((item, i) => {
      console.log(`  Step 1.${i + 1} -- [consensus] ${String(item.claim || '')}`);
    });
    contested.slice(0, 3).forEach((item, i) => {
      console.log(`  Step 2.${i + 1} -- [contested] ${String(item.claim || '')}`);
    });
    return;
  }

  if (mode === 'critique') {
    const items = Array.isArray(merged) ? merged : [];
    if (items.length === 0) {
      console.log('  No counter-arguments surfaced -- argument appears well-supported.');
      console.log('  Run `ijfw cross critique <another-target>` to challenge a different position.');
      return;
    }
    console.log('');
    items.forEach((item, i) => {
      const sev = item.severity ? ` [${item.severity}]` : '';
      const arg = String(item.counterArg || '');
      console.log(`  Step 1.${i + 1} --${sev} ${arg}`);
    });
  }
}

// ---------------------------------------------------------------------------
// Arg parser
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = argv.slice(2); // strip node + script path

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    return { cmd: 'help' };
  }

  if (args[0] === 'status') {
    return { cmd: 'status' };
  }

  if (args[0] === 'demo') {
    return { cmd: 'demo' };
  }

  if (args[0] === 'doctor') {
    return { cmd: 'doctor' };
  }

  if (args[0] === 'update') {
    return { cmd: 'update' };
  }

  if (args[0] === 'install') {
    return { cmd: 'install' };
  }

  if (args[0] === 'uninstall' || (args[0] === 'off' && args.length === 1)) {
    return { cmd: 'uninstall' };
  }

  if (args[0] === 'preflight') {
    return { cmd: 'preflight' };
  }

  if (args[0] === 'dashboard') {
    return { cmd: 'dashboard', sub: args[1] || 'status' };
  }

  if (args[0] === 'receipt') {
    return { cmd: 'receipt', sub: args[1] || 'last' };
  }

  if (args[0] === '--purge-receipts') {
    return { cmd: 'purge-receipts' };
  }

  if (args[0] === 'import') {
    const tool = args[1];
    let dryRun = false, force = false, includeMetrics = false, customPath = null, allMode = false;
    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--dry-run') dryRun = true;
      else if (args[i] === '--force') force = true;
      else if (args[i] === '--all') allMode = true;
      else if (args[i] === '--include-metrics') includeMetrics = true;
      else if (args[i] === '--path' && args[i + 1]) customPath = args[++i];
    }
    return { cmd: 'import', tool, dryRun, force, includeMetrics, customPath, allMode };
  }

  if (args[0] === 'cross') {
    const mode = args[1];

    if (mode === 'project-audit') {
      const rule = args[2];
      let dryRun = false;
      for (let i = 3; i < args.length; i++) {
        if (args[i] === '--dry-run') dryRun = true;
      }
      return { cmd: 'cross-project-audit', rule, dryRun };
    }

    const target = args[2];
    let only = null;
    let confirm = false;
    let expand = false;

    for (let i = 3; i < args.length; i++) {
      if (args[i] === '--confirm') { confirm = true; }
      else if (args[i] === '--expand') { expand = true; }
      else if (args[i] === '--with' && args[i + 1]) { only = args[++i]; }
    }

    return { cmd: 'cross', mode, target, only, confirm, expand };
  }

  return { cmd: 'unknown', raw: args[0] };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function printUsage() {
  console.log(`
ijfw -- It Just Fucking Works CLI
Fire 2-4 AIs at any target. Receipts logged. Cache hits tracked. Memory follows you.

Usage:
  ijfw install
  ijfw uninstall
  ijfw preflight
  ijfw dashboard [start|stop|status]
  ijfw cross <mode> <target> [options]
  ijfw cross project-audit <rule-file> [--dry-run]
  ijfw import <tool> [--all] [--dry-run] [--force] [--path <p>]
  ijfw status
  ijfw doctor
  ijfw update
  ijfw receipt last
  ijfw --purge-receipts
  ijfw --help

Commands:
  install           Install IJFW into your AI coding agents.
  uninstall         Remove IJFW and revert AI-agent configs. Same as: ijfw off
  preflight         Run the 11-gate quality pipeline (blocking + advisory).
  dashboard         Control the dashboard server (start, stop, status).
  cross             Fire external auditors at a target. Try: ijfw cross audit README.md
  import            Pull memory in from another tool. Try: ijfw import claude-mem --all
  status            Show recent cross-audit activity. Try: ijfw status
  doctor            Probe which CLIs and API keys are reachable. Try: ijfw doctor
  update            Pull latest IJFW + reinstall merge-safely. Try: ijfw update
  receipt last      Print a redacted, shareable block from the last Trident run.
  --purge-receipts  Clear the cross-runs receipt log. Try: ijfw --purge-receipts

Modes (for ijfw cross):
  audit           Adversarial review of a file, module, or path
  research        Multi-source research on a topic
  critique        Structured counter-argument generation
  project-audit   Run the same audit across every registered IJFW project
                  Usage: ijfw cross project-audit <rule-file> [--dry-run]

Options for ijfw cross:
  --with <id>   Force a specific auditor (comma-separated for multiple)
  --confirm     Prompt for confirmation before firing
  --expand      Include extended swarm when available

Environment:
  IJFW_AUDIT_BUDGET_USD   Session spend cap (default $2.00). First call is always
                          allowed (no cap). Cap enforced from the 2nd call on.

Examples:
  ijfw demo
  ijfw cross audit README.md
  ijfw cross research "vector search approaches"
  ijfw cross critique HEAD~3..HEAD
  ijfw cross audit CLAUDE.md --with codex,gemini
  ijfw status
  ijfw doctor
`.trim());
}

async function cmdStatus(projectDir) {
  const receipts = readReceipts(projectDir);
  if (receipts.length === 0) {
    console.log('No cross-audit runs recorded yet.');
    console.log('Recommended next: `ijfw cross audit <file>` to run your first Trident audit.');
    return;
  }
  const hero = renderHeroLine(receipts);
  const last = receipts[receipts.length - 1];
  const mode = last?.mode || 'cross';
  const ts = last?.timestamp ? last.timestamp.slice(0, 10) : '';
  console.log(`Trident -- run ${receipts.length} -- ${mode}${ts ? ' (' + ts + ')' : ''}`);
  console.log('--');
  console.log(hero);
  console.log('--');
  console.log(`${receipts.length} Trident run${receipts.length === 1 ? '' : 's'} on record.`);
  console.log('Recommended next: `ijfw cross audit <file>`. Say no/alt to override.');
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

// Pre-flight: return true if any auditor is reachable via CLI or API key.
function _anyAuditorReachable() {
  for (const entry of ROSTER) {
    try {
      if (isReachable(entry.id, process.env).any) return true;
    } catch {
      if (isInstalled(entry.id)) return true;
    }
  }
  return false;
}

function _printDemoFindings(picks, auditorResults) {
  const attributed = [];

  for (let i = 0; i < picks.length; i++) {
    const { status, parsed } = auditorResults[i];
    const id = picks[i].id;
    const capitalized = id.charAt(0).toUpperCase() + id.slice(1);
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const hasFindings = (status === 'ok' || status === 'fallback-used') && items.length > 0;
    if (!hasFindings) {
      console.log(`  ${capitalized}: no findings returned (status: ${status})`);
      continue;
    }
    for (const item of items) {
      const issue = String(item.issue || '').slice(0, 80);
      const sev = item.severity ? ` [${item.severity}]` : '';
      console.log(`  ${capitalized} found:${sev} ${issue}`);
      attributed.push({ id, item });
    }
  }
  return attributed;
}

async function cmdDemo() {
  const reachable = _anyAuditorReachable();
  if (!reachable) {
    console.log('No auditors reachable yet.');
    console.log('Install codex or gemini, or set OPENAI_API_KEY / GEMINI_API_KEY, then run `ijfw demo`.');
    console.log('Run `ijfw doctor` to see the full roster status.');
    process.exit(0);
  }

  console.log('IJFW demo -- 30-second tour of the Trident');
  console.log('');

  const fixturePath = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/demo-target.js');
  if (!existsSync(fixturePath)) {
    console.log('Demo fixture not found -- run `npm pack` or reinstall @ijfw/memory-server.');
    process.exit(0);
  }

  const target = readFileSync(fixturePath, 'utf8');

  let result;
  try {
    // TODO post-merge: perAuditorTimeoutSec, minResponses, quiet are added by Item 2 agent.
    // Passed through here; current orchestrator silently ignores unknown params.
    result = await runCrossOp({
      mode: 'audit',
      target,
      projectDir: process.cwd(),
      perAuditorTimeoutSec: 30,
      minResponses: 2,
      quiet: true,
    });
  } catch (err) {
    console.log(`Demo run encountered an issue: ${err.message}`);
    process.exit(0);
  }

  const { picks, auditorResults } = result;

  if (!picks || picks.length === 0) {
    console.log('No auditors responded this run.');
    console.log('Install codex or gemini, or set OPENAI_API_KEY / GEMINI_API_KEY, then run `ijfw demo`.');
    console.log('');
    console.log('Run `ijfw cross audit <your-file>` when an auditor is reachable.');
    return;
  }

  console.log('Findings:');
  console.log('');

  let _attributed = [];
  if (auditorResults && auditorResults.length === picks.length) {
    // Per-auditor attribution (U11: read auditorResults pre-merge)
    _attributed = _printDemoFindings(picks, auditorResults);
  } else {
    // Graceful fallback to merged listing when auditorResults unavailable
    const items = Array.isArray(result.merged) ? result.merged : [];
    if (items.length === 0) {
      console.log('  No findings returned.');
    } else {
      console.log('  Note: per-auditor attribution unavailable; showing merged findings.');
      for (const item of items) {
        const sev = item.severity ? ` [${item.severity}]` : '';
        console.log(`  ${sev} ${String(item.issue || '').slice(0, 80)}`);
      }
    }
  }

  const allItems = Array.isArray(result.merged) ? result.merged : [];
  const consensusCritical = allItems.filter(i => i.severity === 'critical' || i.severity === 'high').length;
  console.log('');
  console.log(`That was ${picks.length} AIs, one command. ${allItems.length} findings surfaced${consensusCritical > 0 ? `, ${consensusCritical} consensus-critical` : ''}.`);
  console.log('Try `ijfw cross audit <your-file>` next.');
}

// ---------------------------------------------------------------------------
// Doctor
// ---------------------------------------------------------------------------

// One-line install hints per auditor id. Used by cmdDoctor to tell the user
// the literal command, not just the dependency name.
const INSTALL_HINT = {
  codex:    'npm install -g @openai/codex',
  gemini:   'npm install -g @google/generative-ai-cli',
  claude:   'npm install -g @anthropic-ai/claude-code',
  copilot:  'gh extension install github/gh-copilot',
  opencode: 'npm install -g opencode',
  aider:    'pipx install aider-chat',
};

// Integration depth definitions per platform.
// depth: list of detected capabilities that constitute "native" integration.
const INTEGRATION_DEPTH = {
  claude: {
    label: 'Claude Code',
    checks: [
      { name: 'native plugin',  detect: () => existsSync(join(homedir(), '.claude', 'plugins', 'ijfw')) || existsSync(join(homedir(), '.claude', 'settings.json')) },
      { name: 'skills',         detect: () => existsSync(join(homedir(), '.claude', 'plugins', 'ijfw', 'skills')) },
      { name: 'hooks',          detect: () => existsSync(join(homedir(), '.claude', 'plugins', 'ijfw', 'hooks')) },
      { name: 'agents',         detect: () => existsSync(join(homedir(), '.claude', 'plugins', 'ijfw', 'agents')) },
      { name: 'commands',       detect: () => existsSync(join(homedir(), '.claude', 'plugins', 'ijfw', 'commands')) },
      { name: 'MCP',            detect: () => { try { const s = JSON.parse(readFileSync(join(homedir(), '.claude', 'settings.json'), 'utf8')); return Boolean(s.mcpServers?.['ijfw-memory'] || s.enabledPlugins?.['ijfw-core@ijfw']); } catch { return false; } } },
    ],
  },
  codex: {
    label: 'Codex',
    checks: [
      { name: 'native skills',  detect: () => existsSync(join(homedir(), '.codex', 'skills')) },
      { name: 'hooks',          detect: () => existsSync(join(homedir(), '.codex', 'hooks.json')) },
      { name: 'context file',   detect: () => existsSync(join(homedir(), '.codex', 'IJFW.md')) },
      { name: 'MCP',            detect: () => { try { const t = readFileSync(join(homedir(), '.codex', 'config.toml'), 'utf8'); return t.includes('ijfw-memory'); } catch { return false; } } },
    ],
  },
  gemini: {
    label: 'Gemini',
    checks: [
      { name: 'native extension', detect: () => existsSync(join(homedir(), '.gemini', 'extensions', 'ijfw', 'gemini-extension.json')) },
      { name: 'skills',           detect: () => existsSync(join(homedir(), '.gemini', 'extensions', 'ijfw', 'skills')) },
      { name: 'hooks',            detect: () => existsSync(join(homedir(), '.gemini', 'extensions', 'ijfw', 'hooks', 'hooks.json')) },
      { name: 'commands',         detect: () => existsSync(join(homedir(), '.gemini', 'extensions', 'ijfw', 'commands')) },
      { name: 'policy',           detect: () => existsSync(join(homedir(), '.gemini', 'extensions', 'ijfw', 'policies', 'ijfw.toml')) },
      { name: 'MCP',              detect: () => { try { const s = JSON.parse(readFileSync(join(homedir(), '.gemini', 'settings.json'), 'utf8')); return Boolean(s.mcpServers?.['ijfw-memory']); } catch { return false; } } },
    ],
  },
  cursor: {
    label: 'Cursor',
    checks: [
      { name: 'rules',  detect: () => existsSync(join(process.cwd(), '.cursor', 'rules', 'ijfw.mdc')) },
      { name: 'MCP',    detect: () => { try { const s = JSON.parse(readFileSync(join(process.cwd(), '.cursor', 'mcp.json'), 'utf8')); return Boolean(s.mcpServers?.['ijfw-memory']); } catch { return false; } } },
    ],
  },
  windsurf: {
    label: 'Windsurf',
    checks: [
      { name: 'rules',  detect: () => existsSync(join(process.cwd(), '.windsurfrules')) },
      { name: 'MCP',    detect: () => { try { const s = JSON.parse(readFileSync(join(homedir(), '.codeium', 'windsurf', 'mcp_config.json'), 'utf8')); return Boolean(s.mcpServers?.['ijfw-memory']); } catch { return false; } } },
    ],
  },
  copilot: {
    label: 'Copilot',
    checks: [
      { name: 'instructions',  detect: () => existsSync(join(process.cwd(), '.github', 'copilot-instructions.md')) },
      { name: 'MCP',           detect: () => { try { const s = JSON.parse(readFileSync(join(process.cwd(), '.vscode', 'mcp.json'), 'utf8')); return Boolean(s.mcpServers?.['ijfw-memory']); } catch { return false; } } },
    ],
  },
};

function cmdDoctor() {
  console.log('ijfw doctor -- roster + key probe');
  console.log('');

  const rows = [];
  for (const entry of ROSTER) {
    const _reach = isReachable(entry.id, process.env);
    const cli = isInstalled(entry.id);
    const apiKey = entry.apiFallback ? process.env[entry.apiFallback.authEnv] : null;
    const apiOk = Boolean(apiKey);

    if (cli) {
      rows.push(`  [ ok ] ${entry.id} CLI -- ${entry.name} ready`);
    } else {
      const cmd = INSTALL_HINT[entry.id] || `npm install -g ${entry.invoke.split(' ')[0]}`;
      rows.push(`  [ .. ] ${entry.id} CLI -- standing by`);
      rows.push(`         fix: ${cmd}`);
    }

    if (entry.apiFallback) {
      if (apiOk) {
        rows.push(`  [ ok ] ${entry.apiFallback.authEnv} -- set`);
      } else {
        rows.push(`  [ .. ] ${entry.apiFallback.authEnv} -- standing by`);
        rows.push(`         fix: export ${entry.apiFallback.authEnv}=<your-key> (or add to ~/.ijfw/env)`);
      }
    }
  }

  for (const row of rows) console.log(row);
  console.log('');

  const anyReachable = ROSTER.some(e => isReachable(e.id, process.env).any);
  if (anyReachable) {
    console.log('At least one auditor is reachable. Run `ijfw cross audit <file>` to start.');
  } else {
    console.log('IJFW has the Trident ready -- install codex or gemini (or set OPENAI_API_KEY / GEMINI_API_KEY), then run `ijfw demo`.');
  }

  // Integration depth: per-platform capability report (positive-framed, detected only).
  console.log('');
  console.log('Integration depth:');
  let anyDepth = false;
  for (const [_id, def] of Object.entries(INTEGRATION_DEPTH)) {
    const detected = def.checks.filter(c => { try { return c.detect(); } catch { return false; } });
    if (detected.length === 0) continue;
    anyDepth = true;
    console.log(`  ${def.label}: ${detected.map(c => c.name).join(' + ')}`);
  }
  if (!anyDepth) {
    console.log('  Run `bash scripts/install.sh` in your IJFW repo to activate platform bundles.');
  }
}

// ---------------------------------------------------------------------------
// Purge receipts
// ---------------------------------------------------------------------------

function cmdPurgeReceipts(projectDir) {
  const count = purgeReceipts(projectDir);
  if (count === 0) {
    console.log('Receipt log is already empty. Run `ijfw cross audit <file>` to generate entries.');
  } else {
    console.log(`Receipt log cleared -- ${count} entr${count === 1 ? 'y' : 'ies'} removed.`);
    console.log('Run `ijfw cross audit <file>` to start fresh.');
  }
}

async function cmdCross({ mode, target, only, confirm, expand }) {
  const VALID_MODES = ['audit', 'research', 'critique'];
  if (!mode || !VALID_MODES.includes(mode)) {
    console.error(`ijfw cross requires a mode: ${VALID_MODES.join(', ')}. Example: ijfw cross audit <file>`);
    process.exit(1);
  }
  if (!target) {
    console.error('ijfw cross needs a target -- pass a file path, git range, or topic. Example: ijfw cross audit CLAUDE.md');
    process.exit(1);
  }

  // Polish 6: pre-flight reachability check. If no auditor is wired, give a
  // positive recovery hint instead of bombing through to a runCrossOp error.
  if (!_anyAuditorReachable()) {
    console.log('');
    console.log('Trident is standing by -- no auditors reachable yet.');
    console.log('Wire one in 30 seconds: run `ijfw doctor` for the exact install commands.');
    console.log('Tip: any one of codex / gemini / claude / copilot is enough to start.');
    process.exit(0);
  }

  const projectDir = process.cwd();
  const runStamp = new Date().toISOString();

  console.log(`\nijfw cross ${mode} -- target: ${target}`);
  console.log('Probing roster...');

  let result;
  try {
    result = await runCrossOp({ mode, target, projectDir, runStamp, only, confirm, expand });
  } catch (err) {
    console.log('');
    console.log(`Run didn't complete: ${err.message}`);
    console.log('Try `ijfw doctor` to see what to wire next.');
    process.exit(1);
  }

  const { merged, picks, note } = result;

  if (picks.length === 0) {
    console.log('\nIJFW has the Trident ready -- install codex or gemini (or set OPENAI_API_KEY / GEMINI_API_KEY), then run `ijfw demo`.');
    console.log('Run `ijfw doctor` to see which auditors are available on this machine.');
    return;
  }

  console.log(`Fired: ${picks.map(p => p.id).join(', ')}`);

  if (note) {
    console.log(`\nNote: ${note}`);
  }

  console.log('\nFindings:');
  printFindings(mode, merged);

  console.log('\nReceipt logged -- run `ijfw status` to see it.');
}

// ---------------------------------------------------------------------------
// Portfolio audit -- `ijfw cross project-audit <rule-file>`
// ---------------------------------------------------------------------------

// Read the registry (same format as server.js: path|hash|iso lines). Lives
// here as a narrow duplicate so the CLI does not depend on server.js bootstrap.
function readProjectRegistry() {
  const file = join(homedir(), '.ijfw', 'registry.md');
  if (!existsSync(file)) return [];
  const body = readFileSync(file, 'utf8');
  const out = [];
  for (const line of body.split('\n')) {
    const parts = line.split('|').map(s => s.trim());
    if (parts.length < 3) continue;
    const [path, hash, iso] = parts;
    if (!path || !isAbsolute(path)) continue;
    out.push({ path, hash, iso });
  }
  return out;
}

async function cmdCrossProjectAudit({ rule, dryRun }) {
  if (!rule) {
    console.error('Usage: ijfw cross project-audit <rule-file> [--dry-run]');
    process.exit(1);
  }

  const resolvedRule = isAbsolute(rule) ? rule : resolve(process.cwd(), rule);
  if (!existsSync(resolvedRule)) {
    console.error(`Rule file not found: ${resolvedRule}`);
    process.exit(1);
  }

  const projects = readProjectRegistry();
  if (projects.length === 0) {
    console.log('No other IJFW projects registered yet.');
    console.log('The registry auto-populates the first time you run any IJFW command in a project:');
    console.log('  cd /path/to/another/project && ijfw status');
    console.log('Then re-run: ijfw cross project-audit ' + rule);
    return;
  }

  console.log(`Phase 12 / Wave 12B -- portfolio audit -- ${projects.length} project${projects.length === 1 ? '' : 's'}.`);

  if (dryRun) {
    for (const p of projects) console.log(`  - ${basename(p.path)}  (${p.path})`);
    console.log('\n--dry-run: no audits dispatched. Drop the flag to fire.');
    return;
  }

  const startedAt = new Date().toISOString();
  const results = [];
  for (const p of projects) {
    const tag = basename(p.path);
    console.log(`  [${tag}] running cross audit ...`);
    const r = spawnSync('ijfw', ['cross', 'audit', resolvedRule], {
      cwd: p.path,
      encoding: 'utf8',
      timeout: 5 * 60 * 1000,
    });
    if (r.error) {
      results.push({ project: tag, path: p.path, status: 'failed', findings: '', error: r.error.message });
    } else if (r.status !== 0) {
      results.push({ project: tag, path: p.path, status: 'failed', findings: r.stdout || '', error: (r.stderr || '').trim().split('\n')[0] || `exit ${r.status}` });
    } else {
      results.push({ project: tag, path: p.path, status: 'ok', findings: r.stdout || '' });
    }
  }
  const finishedAt = new Date().toISOString();

  const body = aggregatePortfolioFindings(results, { rule: basename(resolvedRule), startedAt, finishedAt });
  const outDir = join(process.cwd(), '.ijfw', 'memory');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `portfolio-audit-${finishedAt.replace(/[:.]/g, '-')}.md`);
  writeFileSync(outFile, body, 'utf8');
  console.log(`\nPortfolio findings written: ${outFile}`);
}

// ---------------------------------------------------------------------------
// Import -- `ijfw import <tool> [--dry-run] [--force] [--path <p>]`
// ---------------------------------------------------------------------------

async function cmdImport(parsed) {
  const tool = parsed.tool;
  if (!tool) {
    console.error(`Usage: ijfw import <tool> [--all] [--dry-run] [--force] [--path <p>]`);
    console.error(`Tools: ${listImporters().join(', ')}`);
    console.error(`  --all       Discover all projects and import each to its own .ijfw/memory/`);
    process.exit(1);
  }

  if (parsed.allMode) {
    return cmdImportAll(parsed);
  }

  const result = await runImport({
    tool,
    dryRun: parsed.dryRun,
    force: parsed.force,
    includeMetrics: parsed.includeMetrics,
    path: parsed.customPath,
  });
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
  console.log(result.summary);
  if (result.dryRun && result.samples && result.samples.length > 0) {
    console.log('\nSample entries (dry-run):');
    for (const s of result.samples) console.log(`  - [${s.type}] ${s.summary || '(no title)'}`);
    console.log('\nRe-run without --dry-run to write them to .ijfw/memory/.');
  }
}

async function cmdImportAll(parsed) {
  // Phase 1: always do a dry-run preview first, regardless of user's --dry-run flag.
  const preview = await runImportAll({
    tool: parsed.tool,
    dryRun: true,
    force: parsed.force,
    path: parsed.customPath,
  });
  if (!preview.ok) {
    console.error(preview.error);
    process.exit(1);
  }

  const plan = preview.plan;
  console.log(`\nDiscovered ${plan.matched.length + plan.ambiguous.length + plan.unmatched.length} projects in ${parsed.tool} (${plan.totalEntries} total entries).\n`);

  if (plan.matched.length > 0) {
    console.log(`Auto-matched (${plan.matched.length}):`);
    for (const m of plan.matched) {
      console.log(`  [${m.entryCount.toString().padStart(5)}]  ${m.project.padEnd(30)} -> ${m.path}`);
    }
    console.log('');
  }

  if (plan.ambiguous.length > 0) {
    console.log(`Ambiguous (${plan.ambiguous.length}) -- will go to global archive:`);
    for (const a of plan.ambiguous) {
      const paths = a.candidates.slice(0, 3).map((c) => c.path).join(' OR ');
      console.log(`  [${a.entryCount.toString().padStart(5)}]  ${a.project.padEnd(30)} -> ${paths}`);
    }
    console.log('');
  }

  if (plan.unmatched.length > 0) {
    console.log(`No local match (${plan.unmatched.length}) -- will go to global archive:`);
    for (const u of plan.unmatched) {
      console.log(`  [${u.entryCount.toString().padStart(5)}]  ${u.project}`);
    }
    console.log('');
  }

  if (parsed.dryRun) {
    console.log('Dry run only. Re-run without --dry-run to execute.');
    return;
  }

  // Phase 2: execute.
  console.log('Importing...\n');
  const result = await runImportAll({
    tool: parsed.tool,
    dryRun: false,
    force: parsed.force,
    path: parsed.customPath,
  });

  if (!result.ok) {
    console.error('Some imports failed. See per-project results below.');
  }

  // Stats categories from common.js emptyStats(): decisions, patterns,
  // observations, handoffs, preferences, skipped, failed, total.
  const WRITTEN_KEYS = ['decisions', 'patterns', 'observations', 'handoffs', 'preferences'];
  const sumWritten = (s) => s ? WRITTEN_KEYS.reduce((n, k) => n + (s[k] || 0), 0) : 0;

  let totalWritten = 0, totalSkipped = 0, totalFailed = 0;
  for (const r of result.results) {
    if (r.stats) {
      totalWritten += sumWritten(r.stats);
      totalSkipped += (r.stats.skipped || 0);
      totalFailed  += (r.stats.failed  || 0);
    }
    const status = r.ok === false ? 'FAILED' : 'OK';
    const written = sumWritten(r.stats);
    const skipped = r.stats ? (r.stats.skipped || 0) : 0;
    console.log(`  [${status}] ${r.project.padEnd(30)} -> ${r.path}  (${written} written, ${skipped} skipped)`);
  }

  if (result.orphanResult) {
    console.log(`\nGlobal archive (~/.ijfw/memory/global-archive/):`);
    for (const p of result.orphanResult.projects) {
      const written = sumWritten(p.stats);
      const skipped = p.stats ? (p.stats.skipped || 0) : 0;
      totalWritten += written;
      totalSkipped += skipped;
      console.log(`  ${p.ok !== false ? '[OK]' : '[FAILED]'} ${p.project}  (${written} written, ${skipped} skipped)`);
    }
  }

  console.log(`\nTotal: ${totalWritten} written, ${totalSkipped} skipped (already present), ${totalFailed} failed.`);
  console.log('Done.');
}

// ---------------------------------------------------------------------------
// Update -- `ijfw update`  (polish 5)
// ---------------------------------------------------------------------------
//
// Walks up from the launcher to the IJFW source repo, runs git pull, and
// reruns scripts/install.sh in merge-safe mode. Designed for users who
// installed via git clone (the canonical path). For users on
// `npm install -g @ijfw/install`, hints them at the npm command instead.

function cmdUpdate() {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, '..', '..');
  const installSh = join(repoRoot, 'scripts', 'install.sh');

  if (!existsSync(installSh)) {
    console.log('IJFW update path not found in this checkout.');
    console.log('If you installed via npm: `npm install -g @ijfw/install@latest && ijfw-install`.');
    console.log('If you installed via git: `cd <ijfw-repo> && git pull && bash scripts/install.sh`.');
    return;
  }

  console.log('ijfw update -- pulling latest + reinstalling...');
  console.log('');

  const pull = spawnSync('git', ['-C', repoRoot, 'pull', '--ff-only'], { stdio: 'inherit' });
  if (pull.status !== 0) {
    console.log('');
    console.log('git pull didn\'t complete cleanly. Resolve any conflicts in', repoRoot, 'and rerun `ijfw update`.');
    process.exit(1);
  }

  const install = spawnSync('bash', [installSh], { stdio: 'inherit', cwd: process.cwd() });
  if (install.status !== 0) {
    console.log('');
    console.log('Reinstall didn\'t complete. Run `bash', installSh, '` directly to see the full output.');
    process.exit(1);
  }

  console.log('');
  console.log('IJFW updated. Run `ijfw status` to confirm.');
}

// ---------------------------------------------------------------------------
// Receipt -- `ijfw receipt last`  (polish 8)
// ---------------------------------------------------------------------------
//
// Prints a redacted, shareable block from the most recent Trident run.
// Strips absolute paths + project basenames so the user can paste it in
// PR comments / Slack without leaking environment detail.

function cmdReceipt(sub = 'last') {
  if (sub !== 'last') {
    console.log('Usage: ijfw receipt last');
    process.exit(1);
  }
  const receipts = readReceipts(process.cwd());
  if (receipts.length === 0) {
    console.log('No Trident runs on record yet. Try `ijfw cross audit <file>` first.');
    return;
  }
  const last = receipts[receipts.length - 1];
  // Receipts schema: { findings: { items: [...] } }. Earlier draft read
  // merged.findings -- caught by Trident audit on the polish pass.
  const findings = Array.isArray(last.findings?.items) ? last.findings.items : [];
  const auditors = Array.isArray(last.auditors)
    ? last.auditors.map(a => a.id).filter(Boolean)
    : [];

  const lines = [];
  lines.push('```');
  lines.push(`Trident -- ${last.mode || 'audit'} -- ${(last.timestamp || '').slice(0, 10)}`);
  lines.push(`Auditors: ${auditors.join(', ') || 'n/a'}`);
  lines.push(`Findings: ${findings.length}`);
  for (const f of findings.slice(0, 5)) {
    const sev = f.severity ? `[${String(f.severity).toLowerCase()}] ` : '';
    const claim = redact(String(f.claim || f.issue || ''));
    if (claim) lines.push(`  ${sev}${claim.slice(0, 140)}`);
  }
  if (findings.length > 5) lines.push(`  ... ${findings.length - 5} more.`);
  lines.push(`Receipt: ijfw status`);
  lines.push('```');
  console.log(lines.join('\n'));
}

// Redact absolute paths + git directories so the receipt is safe to paste.
function redact(s) {
  return s
    .replace(/\/Users\/[^/\s]+/g, '~')
    .replace(/\/home\/[^/\s]+/g, '~')
    .replace(/[A-Z]:\\Users\\[^\\\s]+/g, '%USERPROFILE%');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const parsed = parseArgs(process.argv);

if (parsed.cmd === 'help') {
  printUsage();
  process.exit(0);
}

if (parsed.cmd === 'status') {
  cmdStatus(process.cwd()).catch(err => { console.error(err.message); process.exit(1); });
} else if (parsed.cmd === 'demo') {
  cmdDemo().catch(err => { console.error(err.message); process.exit(1); });
} else if (parsed.cmd === 'cross') {
  cmdCross(parsed).catch(err => { console.error(err.message); process.exit(1); });
} else if (parsed.cmd === 'cross-project-audit') {
  cmdCrossProjectAudit(parsed).catch(err => { console.error(err.message); process.exit(1); });
} else if (parsed.cmd === 'import') {
  cmdImport(parsed).catch(err => { console.error(err.message); process.exit(1); });
} else if (parsed.cmd === 'doctor') {
  cmdDoctor();
} else if (parsed.cmd === 'update') {
  cmdUpdate();
} else if (parsed.cmd === 'receipt') {
  cmdReceipt(parsed.sub);
} else if (parsed.cmd === 'purge-receipts') {
  cmdPurgeReceipts(process.cwd());
} else if (parsed.cmd === 'install') {
  cmdInstall();
} else if (parsed.cmd === 'uninstall') {
  cmdUninstall();
} else if (parsed.cmd === 'preflight') {
  cmdPreflight();
} else if (parsed.cmd === 'dashboard') {
  cmdDashboard(parsed.sub);
} else {
  console.error(`Unknown command: ${parsed.raw}`);
  printUsage();
  process.exit(1);
}

// --- install / uninstall / preflight / dashboard ---
// These shell out to the existing scripts/installer modules so there is one
// CLI entry point that covers every command named in the README, regardless
// of how the user installed (git clone + install.sh OR npm @ijfw/install).
function repoRootFromCli() {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', '..');
}
function cmdInstall() {
  const root = repoRootFromCli();
  const script = join(root, 'scripts', 'install.sh');
  if (!existsSync(script)) {
    console.error('install.sh not found. Re-clone the IJFW repo and retry.');
    process.exit(1);
  }
  const res = spawnSync('bash', [script, ...process.argv.slice(3)], { stdio: 'inherit' });
  process.exit(res.status ?? 1);
}
function cmdUninstall() {
  const root = repoRootFromCli();
  const script = join(root, 'installer', 'src', 'uninstall.js');
  if (!existsSync(script)) {
    console.error('uninstall.js not found. Remove ~/.ijfw manually and strip ijfw keys from ~/.claude/settings.json.');
    process.exit(1);
  }
  const res = spawnSync(process.execPath, [script, ...process.argv.slice(3)], { stdio: 'inherit' });
  process.exit(res.status ?? 1);
}
function cmdPreflight() {
  const root = repoRootFromCli();
  const script = join(root, 'scripts', 'check-all.sh');
  if (!existsSync(script)) {
    console.error('check-all.sh not found. Re-clone the IJFW repo and retry.');
    process.exit(1);
  }
  const res = spawnSync('bash', [script, ...process.argv.slice(3)], { stdio: 'inherit' });
  process.exit(res.status ?? 1);
}
function cmdDashboard(sub) {
  const root = repoRootFromCli();
  const script = join(root, 'scripts', 'dashboard', 'bin.js');
  if (!existsSync(script)) {
    console.error('dashboard/bin.js not found. Re-clone the IJFW repo and retry.');
    process.exit(1);
  }
  const res = spawnSync(process.execPath, [script, sub], { stdio: 'inherit' });
  process.exit(res.status ?? 1);
}
