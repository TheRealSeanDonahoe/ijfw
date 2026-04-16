// Preflight runner: executes gate list, handles parallelism, renders ANSI + JSON output.


// ANSI helpers -- only when stdout is a TTY
const isTTY = process.stdout.isTTY;
const c = {
  green:  isTTY ? '\x1b[32m' : '',
  yellow: isTTY ? '\x1b[33m' : '',
  red:    isTTY ? '\x1b[31m' : '',
  cyan:   isTTY ? '\x1b[36m' : '',
  bold:   isTTY ? '\x1b[1m'  : '',
  reset:  isTTY ? '\x1b[0m'  : '',
  dim:    isTTY ? '\x1b[2m'  : '',
};

function statusColor(status) {
  if (status === 'PASS') return c.green;
  if (status === 'FAIL') return c.red;
  if (status === 'WARN') return c.yellow;
  if (status === 'SKIP') return c.cyan;
  return '';
}

function pad(s, n) { return s.padEnd(n, ' '); }

function printGateResult(result, index, total) {
  const col = statusColor(result.status);
  const badge = `${col}[${result.status}]${c.reset}`;
  const ms = `${c.dim}${result.durationMs}ms${c.reset}`;
  const num = `${c.dim}${String(index).padStart(2, ' ')}/${total}${c.reset}`;
  console.log(`  ${num} ${badge} ${pad(result.name, 20)} ${result.message}  ${ms}`);
  if (result.details.length > 0) {
    for (const line of result.details) {
      console.log(`       ${c.dim}${line}${c.reset}`);
    }
  }
}

/** @param {import('./types.js').Gate[]} gates @param {import('./types.js').PreflightCtx} ctx */
export async function runPreflight(gates, ctx) {
  const t0 = Date.now();
  /** @type {import('./types.js').GateResult[]} */
  const results = [];

  if (!ctx.json) {
    console.log(`\n${c.bold}IJFW Preflight${c.reset}  -- ${gates.length} gates\n`);
  }

  // Split into parallel-safe and serial groups
  // We run all parallel gates concurrently, then serial gates in order.
  const parallelGates = gates.filter(g => g.parallel !== false);
  const serialGates   = gates.filter(g => g.parallel === false);

  // Run parallel batch
  if (parallelGates.length > 0) {
    if (!ctx.json) console.log(`${c.dim}  Running ${parallelGates.length} gate(s) in parallel...${c.reset}`);
    const parallelResults = await Promise.all(parallelGates.map(g => g.run(ctx)));
    for (let i = 0; i < parallelResults.length; i++) {
      results.push(parallelResults[i]);
      if (!ctx.json) printGateResult(parallelResults[i], results.length, gates.length);
    }
  }

  // Run serial gates in order
  for (const gate of serialGates) {
    const result = await gate.run(ctx);
    results.push(result);
    if (!ctx.json) printGateResult(result, results.length, gates.length);

    // Fail-fast: stop serial gates if a blocking gate fails
    if (ctx.failFast && result.status === 'FAIL' && gate.severity === 'blocking') {
      if (!ctx.json) {
        console.log(`\n  ${c.red}Stopped early (--fail-fast) at gate: ${gate.name}${c.reset}\n`);
      }
      break;
    }
  }

  const totalMs = Date.now() - t0;

  // Determine outcome
  const blockingFailures = results.filter((r) => {
    const gate = gates.find(g => g.name === r.name);
    return r.status === 'FAIL' && gate && gate.severity === 'blocking';
  });
  const outcome = blockingFailures.length > 0 ? 'fail' : 'pass';

  /** @type {import('./types.js').PreflightReport} */
  const report = {
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    gates: results,
    outcome,
    totalMs,
  };

  if (ctx.json) {
    console.log(JSON.stringify(report, null, 2));
    return report;
  }

  // Print summary
  const passCount = results.filter(r => r.status === 'PASS').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;
  const skipCount = results.filter(r => r.status === 'SKIP').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;

  const warmSLO = 90_000;
  const coldSLO = 240_000;
  const timeNote = totalMs <= warmSLO
    ? `${c.green}within warm-cache SLO (<=90s)${c.reset}`
    : totalMs <= coldSLO
      ? `${c.yellow}within cold-cache limit (<=240s)${c.reset}`
      : `${c.red}exceeded cold-cache limit (${Math.round(totalMs / 1000)}s > 240s)${c.reset}`;

  console.log('');
  console.log(`  ${c.bold}Summary${c.reset}`);
  console.log(`  ${c.green}PASS ${passCount}${c.reset}  ${c.yellow}WARN ${warnCount}${c.reset}  ${c.cyan}SKIP ${skipCount}${c.reset}  ${c.red}FAIL ${failCount}${c.reset}`);
  console.log(`  Time: ${Math.round(totalMs / 1000)}s  ${timeNote}`);
  console.log('');

  if (outcome === 'pass') {
    console.log(`  ${c.bold}${c.green}All blocking gates passed.${c.reset}`);
    if (warnCount > 0) {
      console.log(`  ${c.yellow}${warnCount} advisory finding(s) -- review details above.${c.reset}`);
    }
  } else {
    console.log(`  ${c.bold}${c.red}${blockingFailures.length} blocking gate(s) failed.${c.reset}`);
    for (const r of blockingFailures) {
      console.log(`  ${c.red}  HIGH  ${r.name}: ${r.message}${c.reset}`);
    }
  }
  console.log('');

  return report;
}
