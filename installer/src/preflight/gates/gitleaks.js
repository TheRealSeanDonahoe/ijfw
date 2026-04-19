// Gate 5: gitleaks -- secret scan.
// gitleaks is a system binary (not an npm package).
// Falls back to WARN with install hint if absent.

import { spawnSync } from 'node:child_process';

/** @param {import('../types.js').PreflightCtx} ctx */
export async function run(ctx) {
  const t0 = Date.now();

  // Check binary availability
  const which = spawnSync('gitleaks', ['version'], { encoding: 'utf8' });
  if (which.status === null || which.error) {
    return {
      name: 'gitleaks',
      status: 'WARN',
      message: 'gitleaks not installed -- brew install gitleaks / https://github.com/gitleaks/gitleaks',
      details: ['Secret scan skipped. Install gitleaks to enable this gate.'],
      durationMs: Date.now() - t0,
    };
  }

  const res = spawnSync(
    'gitleaks',
    ['detect', '--no-git', '--source', ctx.repoRoot, '--gitleaks-ignore-path', '.gitleaksignore', '-v', '--exit-code', '1'],
    { encoding: 'utf8', cwd: ctx.repoRoot, timeout: 30_000 },
  );

  const durationMs = Date.now() - t0;

  if (res.status === 0) {
    return {
      name: 'gitleaks',
      status: 'PASS',
      message: 'gitleaks: no secrets detected',
      details: [],
      durationMs,
    };
  }

  const lines = ((res.stdout || '') + (res.stderr || '')).split('\n').filter(Boolean);
  return {
    name: 'gitleaks',
    status: 'FAIL',
    message: 'gitleaks: potential secrets detected',
    details: lines.slice(0, 30),
    durationMs,
  };
}

export const name = 'gitleaks';
export const severity = 'blocking';
export const parallel = true;
