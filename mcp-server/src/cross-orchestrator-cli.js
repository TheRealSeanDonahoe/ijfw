// cross-orchestrator-cli.js — thin CLI for `ijfw cross <mode> <target>`.
//
// Commands:
//   ijfw cross <mode> <target> [--confirm] [--with <id>] [--expand]
//   ijfw status
//   ijfw --help
//
// Zero external deps. Parse argv manually.

import { runCrossOp } from './cross-orchestrator.js';
import { readReceipts } from './receipts.js';
import { renderHeroLine } from './hero-line.js';

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
    // Table header
    console.log(`\n  ${'Sev'.padEnd(8)} ${'Location'.padEnd(20)} Issue`);
    console.log(`  ${'-'.repeat(70)}`);
    for (const item of items) {
      const sev = String(item.severity || '').padEnd(8);
      const loc = String(item.location || '').padEnd(20).slice(0, 20);
      const issue = String(item.issue || '').slice(0, 50);
      console.log(`  ${sev} ${loc} ${issue}`);
    }
    return;
  }

  if (mode === 'research') {
    const { consensus = [], contested = [], unique = {}, synthesisPending } = merged || {};
    console.log(`\n  Consensus (${consensus.length}), Contested (${contested.length}), Unique per auditor`);
    if (synthesisPending) console.log('  Note: synthesis pass pending — lexical match only.');
    for (const item of consensus.slice(0, 5)) {
      console.log(`  [consensus] ${String(item.claim || '').slice(0, 80)}`);
    }
    for (const item of contested.slice(0, 3)) {
      console.log(`  [contested] ${String(item.claim || '').slice(0, 80)}`);
    }
    return;
  }

  if (mode === 'critique') {
    const items = Array.isArray(merged) ? merged : [];
    if (items.length === 0) {
      console.log('  No counter-arguments returned.');
      return;
    }
    console.log(`\n  ${'Sev'.padEnd(8)} Counter-argument`);
    console.log(`  ${'-'.repeat(70)}`);
    for (const item of items) {
      const sev = String(item.severity || '').padEnd(8);
      const arg = String(item.counterArg || '').slice(0, 60);
      console.log(`  ${sev} ${arg}`);
    }
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
  ijfw cross <mode> <target> [options]
  ijfw status
  ijfw --help

Modes:
  audit     Adversarial review of a file, module, or path
  research  Multi-source research on a topic
  critique  Structured counter-argument generation

Options:
  --with <id>   Force a specific auditor (comma-separated for multiple)
  --confirm     Prompt for confirmation before firing (useful with partial roster)
  --expand      Include extended swarm when available

Examples:
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
    console.log("Ready. Run `ijfw cross` to see your first hero line.");
    return;
  }
  const hero = renderHeroLine(receipts);
  console.log(hero);
  console.log(`\nTotal runs: ${receipts.length}`);
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
} else if (parsed.cmd === 'cross') {
  cmdCross(parsed).catch(err => { console.error(err.message); process.exit(1); });
} else {
  console.error(`Unknown command: ${parsed.raw}`);
  printUsage();
  process.exit(1);
}
