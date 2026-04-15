// cross-orchestrator-cli.js — thin CLI for `ijfw cross <mode> <target>`.
//
// Commands:
//   ijfw cross <mode> <target> [--confirm] [--with <id>] [--expand]
//   ijfw status
//   ijfw --help
//
// Zero external deps. Parse argv manually.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { runCrossOp } from './cross-orchestrator.js';
import { readReceipts } from './receipts.js';
import { renderHeroLine } from './hero-line.js';
import { ROSTER, isInstalled, isReachable } from './audit-roster.js';

// ---------------------------------------------------------------------------
// Findings printer
// ---------------------------------------------------------------------------
function printFindings(mode, merged) {
  if (mode === 'audit') {
    const items = Array.isArray(merged) ? merged : [];
    if (items.length === 0) {
      console.log('  No findings returned.');
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
      console.log('  No counter-arguments returned.');
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

  if (args[0] === 'cross') {
    const mode = args[1];
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
ijfw — It Just Fucking Works CLI

Usage:
  ijfw demo
  ijfw cross <mode> <target> [options]
  ijfw status
  ijfw --help

Commands:
  demo      30-second tour of the Trident — audits a built-in fixture and shows per-auditor findings

Modes (for ijfw cross):
  audit     Adversarial review of a file, module, or path
  research  Multi-source research on a topic
  critique  Structured counter-argument generation

Options:
  --with <id>   Force a specific auditor (comma-separated for multiple)
  --confirm     Prompt for confirmation before firing (useful with partial roster)
  --expand      Include extended swarm when available

Examples:
  ijfw demo
  ijfw cross audit README.md
  ijfw cross research "vector search approaches"
  ijfw cross critique HEAD~3..HEAD
  ijfw cross audit CLAUDE.md --with codex,gemini
  ijfw status
`.trim());
}

async function cmdStatus(projectDir) {
  const receipts = readReceipts(projectDir);
  if (receipts.length === 0) {
    console.log('Phase 10 / Wave 10A -- Step 1.1 -- Ready');
    console.log('Recommended next: `ijfw cross audit <file>`. Say no/alt to override.');
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
  console.log(`Total runs: ${receipts.length}`);
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
    console.log('Install codex or gemini (or set OPENAI_API_KEY / GEMINI_API_KEY) — then retry `ijfw demo`.');
    process.exit(0);
  }

  console.log('IJFW demo — 30-second tour of the Trident');
  console.log('');

  const fixturePath = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/demo-target.js');
  if (!existsSync(fixturePath)) {
    console.log('Demo fixture not found — run `npm pack` or reinstall @ijfw/memory-server.');
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
    console.log('No auditors responded. Install codex or gemini — then retry `ijfw demo`.');
    console.log('');
    console.log('Try `ijfw cross audit <your-file>` next.');
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

  console.log('');
  console.log('Try `ijfw cross audit <your-file>` next.');
}

async function cmdCross({ mode, target, only, confirm, expand }) {
  const VALID_MODES = ['audit', 'research', 'critique'];
  if (!mode || !VALID_MODES.includes(mode)) {
    console.error(`Error: mode must be one of: ${VALID_MODES.join(', ')}`);
    process.exit(1);
  }
  if (!target) {
    console.error('Error: target is required (file path, git range, or topic).');
    process.exit(1);
  }

  const projectDir = process.cwd();
  const runStamp = new Date().toISOString();

  console.log(`\nijfw cross ${mode} — target: ${target}`);
  console.log('Probing roster...');

  let result;
  try {
    result = await runCrossOp({ mode, target, projectDir, runStamp, only, confirm, expand });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  const { merged, picks, missing, note } = result;

  if (picks.length === 0) {
    console.log('\n' + (note || 'No external auditors installed. Install codex, gemini, opencode, aider, or copilot.'));
    console.log('\nReceipt: .ijfw/receipts/cross-runs.jsonl');
    return;
  }

  console.log(`Fired: ${picks.map(p => p.id).join(', ')}`);

  if (note) {
    console.log(`\nNote: ${note}`);
  }

  console.log('\nFindings:');
  printFindings(mode, merged);

  console.log('\nReceipt: .ijfw/receipts/cross-runs.jsonl');
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
} else {
  console.error(`Unknown command: ${parsed.raw}`);
  printUsage();
  process.exit(1);
}
