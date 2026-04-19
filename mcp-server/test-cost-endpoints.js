/**
 * test-cost-endpoints.js
 * HTTP response shape tests for new cost API endpoints.
 */

import { startServer } from './src/dashboard-server.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

let pass = 0, fail = 0;
function ok(label, cond, detail) {
  if (cond) {
    console.log('  ok ' + label);
    pass++;
  } else {
    console.error('  FAIL ' + label + (detail !== undefined ? ' -- ' + detail : ''));
    fail++;
  }
}

async function get(port, path) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  const text = await res.text();
  return { status: res.status, body: text, json: () => JSON.parse(text) };
}

// Set up a minimal ledger
const TMP = join(tmpdir(), 'ijfw-ep-test-' + Date.now());
mkdirSync(TMP, { recursive: true });
const ledgerPath = join(TMP, 'observations.jsonl');
writeFileSync(ledgerPath, '');

const { port, server } = await startServer({ ledgerPath, port: 37950 });

try {
  console.log('\n-- cost endpoints (port ' + port + ') --');

  {
    const r = await get(port, '/api/cost/today');
    ok('GET /api/cost/today -- 200', r.status === 200, r.status);
    const d = r.json();
    ok('/api/cost/today has cost field', 'cost' in d, Object.keys(d).join(','));
    ok('/api/cost/today has savings field', d.savings && 'total' in d.savings);
  }

  {
    const r = await get(port, '/api/cost/period?days=7');
    ok('GET /api/cost/period?days=7 -- 200', r.status === 200);
    const d = r.json();
    ok('/api/cost/period has cost field', 'cost' in d);
    ok('/api/cost/period has savings field', d.savings && 'total' in d.savings);
    ok('/api/cost/period cost is number', typeof d.cost === 'number');
    ok('/api/cost/period has baseline_cost field', 'baseline_cost' in d, Object.keys(d).join(','));
    ok('/api/cost/period baseline_cost is number', typeof d.baseline_cost === 'number', typeof d.baseline_cost);
    ok('/api/cost/period has measuredCost', typeof d.measuredCost === 'number', typeof d.measuredCost);
    ok('/api/cost/period has estimatedCost', typeof d.estimatedCost === 'number', typeof d.estimatedCost);
    ok('/api/cost/period has totalCost', typeof d.totalCost === 'number', typeof d.totalCost);
    ok('/api/cost/period measuredCost + estimatedCost = totalCost', Math.abs((d.measuredCost + d.estimatedCost) - d.totalCost) < 0.0001, `${d.measuredCost}+${d.estimatedCost} vs ${d.totalCost}`);
    ok('/api/cost/period savings has correct labelShort', d.savings && d.savings.labelShort === 'Cache efficiency (Claude Code automatic caching)', d.savings && d.savings.labelShort);
    ok('/api/cost/period cache savings has attribution', d.savings && d.savings.cache && d.savings.cache.attribution === 'claude-code-automatic-caching', d.savings && d.savings.cache && d.savings.cache.attribution);
  }

  {
    const r = await get(port, '/api/cost/by?dim=platform&period=7d');
    ok('GET /api/cost/by -- 200', r.status === 200);
    const d = r.json();
    ok('/api/cost/by returns array', Array.isArray(d));
  }

  {
    const r = await get(port, '/api/cost/block');
    ok('GET /api/cost/block -- 200', r.status === 200);
    const d = r.json();
    ok('/api/cost/block has window_minutes', d.window_minutes === 300, d.window_minutes);
    ok('/api/cost/block has used_usd', typeof d.used_usd === 'number');
  }

  {
    const r = await get(port, '/api/cost/history?days=30');
    ok('GET /api/cost/history -- 200', r.status === 200);
    const d = r.json();
    ok('/api/cost/history returns array', Array.isArray(d));
    ok('/api/cost/history has 30 entries', d.length === 30, d.length);
    ok('/api/cost/history entry has date + cost_usd', d[0] && 'date' in d[0] && 'cost_usd' in d[0]);
  }

  {
    const r = await get(port, '/api/prices');
    ok('GET /api/prices -- 200', r.status === 200);
    const d = r.json();
    ok('/api/prices has models', d.models && typeof d.models === 'object');
    ok('/api/prices has formulas', d.formulas && typeof d.formulas === 'object');
    ok('/api/prices has _source', typeof d._source === 'string');
  }

  // Existing endpoints must still work
  {
    const r = await get(port, '/api/health');
    ok('GET /api/health -- still 200', r.status === 200);
  }
  {
    const r = await get(port, '/api/economics');
    ok('GET /api/economics -- still 200', r.status === 200);
  }
  {
    const r = await get(port, '/api/observations');
    ok('GET /api/observations -- still 200', r.status === 200);
  }

  // /api/projects endpoint
  {
    const r = await get(port, '/api/projects');
    ok('GET /api/projects -- 200', r.status === 200, r.status);
    const d = r.json();
    ok('/api/projects has projects array', Array.isArray(d.projects), typeof d.projects);
    ok('/api/projects has total field', typeof d.total === 'number', typeof d.total);
  }

  // /api/memory?tier= filter
  {
    const r = await get(port, '/api/memory?tier=Project');
    ok('GET /api/memory?tier=Project -- 200', r.status === 200, r.status);
    const d = r.json();
    ok('/api/memory?tier has files array', Array.isArray(d.files), typeof d.files);
    ok('/api/memory?tier has tiers object', d.tiers && typeof d.tiers === 'object', typeof d.tiers);
    ok('/api/memory?tier files all match tier', d.files.every(f => f.tier === 'Project' || !f.tier), 'some files had wrong tier');
  }

  // /api/cost/today has baseline_cost
  {
    const r = await get(port, '/api/cost/today');
    const d = r.json();
    ok('/api/cost/today has baseline_cost', 'baseline_cost' in d, Object.keys(d).join(','));
  }

  // 404 for unknown routes
  {
    const r = await get(port, '/api/unknown-route');
    ok('unknown route -- 404', r.status === 404);
  }

} finally {
  await new Promise(res => server.close(res));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
