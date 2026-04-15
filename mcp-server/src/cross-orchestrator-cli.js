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

  if (args[0] === '--purge-receipts') {
    return { cmd: 'purge-receipts' };
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
  ijfw demo
  ijfw cross <mode> <target> [options]
  ijfw status
  ijfw doctor
  ijfw --purge-receipts
  ijfw --help

Commands:
  demo              Run a 30-second Trident tour. Try: ijfw demo
  cross             Fire external auditors at a target. Try: ijfw cross audit README.md
  status            Show recent cross-audit activity. Try: ijfw status
  doctor            Probe which CLIs and API keys are reachable. Try: ijfw doctor
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
  console.log(`Phase 10 / Wave 10A -- Step 1.${receipts.length} -- ${mode}${ts ? ' (' + ts + ')' : ''}`);
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

  let attributed = [];
  if (auditorResults && auditorResults.length === picks.length) {
    // Per-auditor attribution (U11: read auditorResults pre-merge)
    attributed = _printDemoFindings(picks, auditorResults);
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

function cmdDoctor() {
  console.log('ijfw doctor -- roster + key probe');
  console.log('');

  const rows = [];
  for (const entry of ROSTER) {
    const reach = isReachable(entry.id, process.env);
    const cli = isInstalled(entry.id);
    const apiKey = entry.apiFallback ? process.env[entry.apiFallback.authEnv] : null;
    const apiOk = Boolean(apiKey);

    if (cli) {
      rows.push(`  [ ok ] ${entry.id} CLI -- ${entry.name} installed`);
    } else {
      const hint = entry.apiFallback
        ? `install ${entry.invoke.split(' ')[0]} or set ${entry.apiFallback.authEnv}`
        : `install ${entry.invoke.split(' ')[0]}`;
      rows.push(`  [ .. ] ${entry.id} CLI -- install to unlock -- ${hint}`);
    }

    if (entry.apiFallback) {
      if (apiOk) {
        rows.push(`  [ ok ] ${entry.apiFallback.authEnv} -- set`);
      } else {
        rows.push(`  [ .. ] ${entry.apiFallback.authEnv} -- set to enable ${entry.id} API fallback`);
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

  const projectDir = process.cwd();
  const runStamp = new Date().toISOString();

  console.log(`\nijfw cross ${mode} -- target: ${target}`);
  console.log('Probing roster...');

  let result;
  try {
    result = await runCrossOp({ mode, target, projectDir, runStamp, only, confirm, expand });
  } catch (err) {
    console.error(`${err.message} -- run ijfw doctor to see what to fix.`);
    process.exit(1);
  }

  const { merged, picks, missing, note } = result;

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
    console.log('No other IJFW projects registered yet. Open a second project to populate the registry.');
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
} else if (parsed.cmd === 'doctor') {
  cmdDoctor();
} else if (parsed.cmd === 'purge-receipts') {
  cmdPurgeReceipts(process.cwd());
} else {
  console.error(`Unknown command: ${parsed.raw}`);
  printUsage();
  process.exit(1);
}
