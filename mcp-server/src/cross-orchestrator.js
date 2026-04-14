// cross-orchestrator.js — Trident execution flow.
//
// runCrossOp: probe roster → diversity pick → swarm resolve →
//             parallel fire → merge → receipt write → return.
//
// Stamp note (U7): buildRequest stamps internally with new Date() per call.
// The orchestrator's runStamp is used exclusively in the receipt and as the
// archive identity for this run. We don't patch buildRequest to accept an
// override — simpler, and the receipt is the authoritative record.
//
// Specialist swarm (U6): isInstalled is cached per-process in audit-roster;
// pickAuditors already calls it. We do not re-probe here.
//
// ESM, zero external deps.

import { spawn } from 'node:child_process';
import * as readline from 'node:readline';
import { pickAuditors } from './audit-roster.js';
import { loadSwarmConfig } from './swarm-config.js';
import { buildRequest, parseResponse, mergeResponses } from './cross-dispatcher.js';
import { writeReceipt } from './receipts.js';

// Read one line from stdin. Resolves with trimmed string.
function readLine(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    rl.question(prompt, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

// Emit pre-fire UX string to stderr; handle --confirm interactive gate.
// Returns true to proceed, false to cancel.
async function uxGate(picks, missing, confirm) {
  const ids = picks.map(p => p.id).join(', ');
  const missingFamilies = [...new Set(
    (missing || [])
      .map(m => m.family || m.id)
      .filter(Boolean)
  )];

  if (confirm) {
    process.stderr.write(`Confirm combo: ${ids}? [y/N] `);
    const answer = await readLine('');
    if (answer.toLowerCase() !== 'y') {
      process.stderr.write('Cancelled.\n');
      return false;
    }
    return true;
  }

  if (missingFamilies.length > 0) {
    const missing_label = missingFamilies.join(', ');
    const hint = missingFamilies.map(f => `${f}-family`).join(' or ');
    process.stderr.write(
      `Partial roster: running ${ids}; missing ${missing_label}. Install a ${hint} CLI for full Trident diversity.\n`
    );
  } else {
    process.stderr.write(
      `Auto-proceeding with ${ids}. Pass --confirm to override on next turn.\n`
    );
  }
  return true;
}

// Angle assignments per mode per auditor family/id.
const AUDIT_ANGLE = () => 'general';

const RESEARCH_ANGLE = (id) => {
  if (id === 'codex' || id === 'opencode' || id === 'aider') return 'benchmarks';
  if (id === 'claude') return 'synthesis';
  return 'citations'; // gemini, copilot, default
};

const CRITIQUE_ANGLE = (id) => {
  if (id === 'codex' || id === 'opencode' || id === 'aider') return 'technical';
  if (id === 'gemini' || id === 'copilot') return 'strategic';
  return 'ux'; // claude, default
};

function angleFor(mode, id) {
  if (mode === 'audit')    return AUDIT_ANGLE(id);
  if (mode === 'research') return RESEARCH_ANGLE(id);
  if (mode === 'critique') return CRITIQUE_ANGLE(id);
  throw new Error(`Unknown mode: ${mode}`);
}

// Spawn a single external auditor. Returns { stdout, stderr, exitCode } or null on spawn error.
function fireExternal(pick, request, timeoutMs = 600_000) {
  return new Promise((resolve) => {
    const parts = pick.invoke.trim().split(/\s+/);
    const bin = parts[0];
    const args = parts.slice(1);

    const ac = new AbortController();
    const timer = setTimeout(() => { ac.abort(); resolve({ stdout: '', stderr: 'timeout', exitCode: null }); }, timeoutMs);

    let stdout = '';
    let stderr = '';
    let proc;
    try {
      proc = spawn(bin, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        signal: ac.signal,
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
      return;
    }

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.on('error', () => { clearTimeout(timer); resolve(null); });
    proc.on('close', (code) => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code }); });

    try {
      proc.stdin.write(request);
      proc.stdin.end();
    } catch {
      // stdin may already be closed on some CLI tools
    }
  });
}

export async function runCrossOp({
  mode,
  target,
  projectDir,
  env,
  runStamp,
  expand,   // reserved — passed through but unused in current CLI context
  only,
  confirm,  // reserved — handled by caller (CLI layer)
} = {}) {
  projectDir = projectDir ?? process.cwd();
  runStamp   = runStamp   ?? new Date().toISOString();
  env        = env        ?? process.env;

  const start = Date.now();

  // 1. Roster pick (isInstalled cached in audit-roster per U6)
  const { picks, missing, note } = pickAuditors({ strategy: 'diversity', env, only });

  // 2. Short-circuit when no auditors are available
  if (picks.length === 0) {
    process.stderr.write('No external auditors ready — install codex or gemini for full Trident.\n');
    return { merged: null, picks: [], missing, note };
  }

  // 3. UX gate — emit status line or prompt before firing
  const proceed = await uxGate(picks, missing, confirm);
  if (!proceed) {
    process.exit(0);
  }

  // 4. Swarm config (specialist list; swarm dispatch skipped in CLI context)
  const swarmConfig = loadSwarmConfig(projectDir);

  // 5. Build request payloads for each external pick
  const requests = picks.map(pick => ({
    pick,
    payload: buildRequest(mode, target, pick.id, angleFor(mode, pick.id), null),
  }));

  // 6. Fire externals in parallel
  const rawResults = await Promise.all(
    requests.map(({ pick, payload }) => fireExternal(pick, payload))
  );

  // 7. Parse each response; classify failures vs empty vs success
  const auditorResults = rawResults.map((raw, i) => {
    const pick = picks[i];
    if (raw === null) {
      return { status: 'failed', stderr: 'spawn error', exitCode: null, parsed: { items: [], prose: `[${pick.id}: spawn failed]` } };
    }
    const { stdout, stderr: rawStderr, exitCode } = raw;
    const stderrSnip = rawStderr ? rawStderr.slice(0, 500) : '';
    if (exitCode !== 0 || (stderrSnip && !stdout.trim())) {
      return { status: 'failed', stderr: stderrSnip, exitCode, parsed: { items: [], prose: `[${pick.id}: exited ${exitCode}]` } };
    }
    const p = parseResponse(mode, stdout);
    const itemCount = Array.isArray(p.items) ? p.items.length
      : Array.isArray(p.consensus) ? p.consensus.length + (p.contested || []).length : 0;
    return { status: itemCount === 0 ? 'empty' : 'ok', stderr: stderrSnip, exitCode, parsed: p };
  });

  const parsed = auditorResults.map(r => r.parsed);

  // 8. Merge
  const merged = mergeResponses(mode, parsed);

  const duration_ms = Date.now() - start;

  // 9. Extract findings shape for receipt
  let findings;
  if (mode === 'audit' || mode === 'critique') {
    // merged is a flat sorted array
    findings = { items: Array.isArray(merged) ? merged : [] };
  } else {
    // research: { consensus, contested, unique, openQuestions, synthesisPending }
    findings = merged;
  }

  // 10. Write receipt
  const receipt = {
    v: 1,
    timestamp: new Date().toISOString(),
    run_stamp: runStamp,
    mode,
    target,
    auditors: picks.map((p, i) => ({
      id: p.id,
      family: p.family,
      model: p.model || '',
      status: auditorResults[i].status,
      ...(auditorResults[i].status === 'failed' ? { error: auditorResults[i].stderr, exitCode: auditorResults[i].exitCode } : {}),
    })),
    findings,
    duration_ms,
    input_tokens: null,
    cost_usd: null,
    model: null,
    specialist_swarm: 'skipped (CLI context)',
    swarm_project_type: swarmConfig.project_type,
  };

  writeReceipt(projectDir, receipt);

  return { merged, receipt, picks, missing, note };
}
