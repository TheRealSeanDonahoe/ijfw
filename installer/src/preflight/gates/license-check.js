// Gate 8: license-checker -- validates that all production deps use allowed licenses (WARN only).

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const ALLOWED = 'MIT;ISC;BSD-2-Clause;BSD-3-Clause;Apache-2.0;CC0-1.0;Unlicense;0BSD;Python-2.0;BlueOak-1.0.0';

/** @param {import('../types.js').PreflightCtx} ctx */
export async function run(ctx) {
  const t0 = Date.now();
  const ver = ctx.versions['license-checker'] || 'latest';

  const res = spawnSync(
    'npx',
    ['--yes', `license-checker@${ver}`, '--onlyAllow', ALLOWED, '--production'],
    {
      encoding: 'utf8',
      cwd: join(ctx.repoRoot, 'installer'),
      timeout: 30_000,
    },
  );

  const durationMs = Date.now() - t0;
  const output = (res.stdout || '') + (res.stderr || '');
  const lines = output.split('\n').filter(Boolean);

  if (res.status === 0) {
    return {
      name: 'license-check',
      status: 'PASS',
      message: 'license-check: all production deps use approved licenses',
      details: [],
      durationMs,
    };
  }

  return {
    name: 'license-check',
    status: 'WARN',
    message: 'license-check: unexpected license(s) in production deps (advisory)',
    details: lines.slice(0, 20),
    durationMs,
  };
}

export const name = 'license-check';
export const severity = 'warn';
export const parallel = true;
