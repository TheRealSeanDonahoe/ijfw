// Gate 7: knip -- dead code detection (WARN only).

import { spawnSync } from 'node:child_process';

/** @param {import('../types.js').PreflightCtx} ctx */
export async function run(ctx) {
  const t0 = Date.now();
  const ver = ctx.versions['knip'] || 'latest';

  const res = spawnSync(
    'npx',
    ['--yes', `knip@${ver}`, '--production'],
    { encoding: 'utf8', cwd: ctx.repoRoot, timeout: 60_000 },
  );

  const durationMs = Date.now() - t0;
  const output = (res.stdout || '') + (res.stderr || '');
  const lines = output.split('\n').filter(Boolean);

  if (res.status === 0) {
    return {
      name: 'knip',
      status: 'PASS',
      message: 'knip: no unused exports or dead code',
      details: [],
      durationMs,
    };
  }

  return {
    name: 'knip',
    status: 'WARN',
    message: 'knip: unused code detected (advisory)',
    details: lines.slice(0, 20),
    durationMs,
  };
}

export const name = 'knip';
export const severity = 'warn';
export const parallel = true;
