// Gate 1: shellcheck -- catches unbound vars (SC2154), POSIX violations, quoting bugs.
// shellcheck is a system binary (brew install shellcheck / apt install shellcheck).
// Graceful skip with install hint if absent.

import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function findShFiles(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const e of entries) {
    if (e === 'node_modules' || e === '.git') continue;
    const full = join(dir, e);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) findShFiles(full, acc);
    else if (e.endsWith('.sh')) acc.push(full);
  }
  return acc;
}

/** @param {import('../types.js').PreflightCtx} ctx */
export async function run(ctx) {
  const t0 = Date.now();

  // Check if shellcheck is available
  const which = spawnSync('shellcheck', ['--version'], { encoding: 'utf8' });
  if (which.status === null || which.error) {
    return {
      name: 'shellcheck',
      status: 'SKIP',
      message: 'shellcheck not installed -- brew install shellcheck / apt install shellcheck',
      details: ['Gate skipped: install shellcheck to enable shell linting.'],
      durationMs: Date.now() - t0,
    };
  }

  const files = findShFiles(ctx.repoRoot);
  if (files.length === 0) {
    return {
      name: 'shellcheck',
      status: 'PASS',
      message: 'No shell scripts found',
      details: [],
      durationMs: Date.now() - t0,
    };
  }

  const res = spawnSync('shellcheck', ['--enable=all', '--disable=SC2312', ...files], {
    encoding: 'utf8',
    cwd: ctx.repoRoot,
  });

  const durationMs = Date.now() - t0;

  if (res.status === 0) {
    return {
      name: 'shellcheck',
      status: 'PASS',
      message: `${files.length} shell script(s) clean`,
      details: [],
      durationMs,
    };
  }

  const lines = (res.stdout || '').split('\n').filter(Boolean);
  return {
    name: 'shellcheck',
    status: 'FAIL',
    message: `shellcheck found issues in ${files.length} script(s)`,
    details: lines.slice(0, 20),
    durationMs,
  };
}

export const name = 'shellcheck';
export const severity = 'blocking';
export const parallel = true;
