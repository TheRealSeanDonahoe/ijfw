// Gate 2a: oxlint -- fast Rust-based JS/TS linter (primary lint gate).

import { spawnSync } from 'node:child_process';

/** @param {import('../types.js').PreflightCtx} ctx */
export async function run(ctx) {
  const t0 = Date.now();
  const ver = ctx.versions['oxlint'] || 'latest';

  const res = spawnSync(
    'npx',
    ['--yes', `oxlint@${ver}`, '--deny-warnings', 'installer/src', 'mcp-server/src'],
    { encoding: 'utf8', cwd: ctx.repoRoot, timeout: 60_000 },
  );

  const durationMs = Date.now() - t0;
  const output = (res.stdout || '') + (res.stderr || '');
  const lines = output.split('\n').filter(Boolean);

  if (res.status === 0) {
    return {
      name: 'oxlint',
      status: 'PASS',
      message: 'oxlint: no issues',
      details: [],
      durationMs,
    };
  }

  return {
    name: 'oxlint',
    status: 'FAIL',
    message: 'oxlint found lint issues',
    details: lines.slice(0, 30),
    durationMs,
  };
}

export const name = 'oxlint';
export const severity = 'blocking';
export const parallel = true;
