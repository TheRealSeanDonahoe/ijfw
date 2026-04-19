#!/usr/bin/env node
/**
 * IJFW Dashboard CLI entry point.
 * Usage: node scripts/dashboard/bin.js [--last N] [--platform <name>|all]
 * Reads ~/.ijfw/observations.jsonl + ~/.ijfw/session_summaries.jsonl.
 * Zero deps. Never crashes -- falls back to one-line "Ready" on error.
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { render } from './render.js';

const IJFW_GLOBAL = join(homedir(), '.ijfw');
const OBS_PATH    = join(IJFW_GLOBAL, 'observations.jsonl');
const SUM_PATH    = join(IJFW_GLOBAL, 'session_summaries.jsonl');

// Parse argv
let lastN    = 50;
let platform = 'all';
const args   = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--last' && args[i + 1]) {
    lastN = parseInt(args[i + 1], 10) || 50;
    i++;
  } else if (args[i] === '--platform' && args[i + 1]) {
    platform = args[i + 1];
    i++;
  }
}

function readJsonl(path) {
  try {
    if (!existsSync(path)) return [];
    return readFileSync(path, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function main() {
  try {
    let obs = readJsonl(OBS_PATH);

    // Filter by platform if requested
    if (platform !== 'all') {
      // Normalize: "claude" matches "claude-code"
      const pNorm = platform.replace(/-code$/, '');
      obs = obs.filter(o => {
        const op = (o.platform || 'claude-code').replace(/-code$/, '');
        return op === pNorm;
      });
    }

    // Take last N
    obs = obs.slice(-lastN);

    // Latest session summary
    const summaries = readJsonl(SUM_PATH);
    const lastSummary = summaries.length > 0 ? summaries[summaries.length - 1] : null;

    const output = render(obs, lastSummary);
    process.stdout.write(output + '\n');
    process.exit(0);
  } catch (err) {
    process.stdout.write('[ijfw] Ready.\n');
    process.stderr.write(`[ijfw] dashboard render error: ${err.message}\n`);
    process.exit(0);
  }
}

main();
