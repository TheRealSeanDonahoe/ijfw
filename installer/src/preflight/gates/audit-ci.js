// Gate 6: audit-ci -- npm audit with severity gate (fails on high+).

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

/** @param {import('../types.js').PreflightCtx} ctx */
export async function run(ctx) {
  const t0 = Date.now();
  const ver = ctx.versions['audit-ci'] || 'latest';
  const configPath = join(ctx.repoRoot, '.audit-ci.jsonc');

  // Run audit-ci from installer dir (where package-lock.json is)
  const res = spawnSync(
    'npx',
    ['--yes', `audit-ci@${ver}`, '--config', configPath],
    {
      encoding: 'utf8',
      cwd: join(ctx.repoRoot, 'installer'),
      timeout: 60_000,
    },
  );

  const durationMs = Date.now() - t0;
  const output = (res.stdout || '') + (res.stderr || '');
  const lines = output.split('\n').filter(Boolean);

  if (res.status === 0) {
    return {
      name: 'audit-ci',
      status: 'PASS',
      message: 'audit-ci: no high/critical vulnerabilities',
      details: [],
      durationMs,
    };
  }

  return {
    name: 'audit-ci',
    status: 'FAIL',
    message: 'audit-ci: high or critical vulnerabilities found',
    details: lines.slice(0, 20),
    durationMs,
  };
}

export const name = 'audit-ci';
export const severity = 'blocking';
export const parallel = true;
