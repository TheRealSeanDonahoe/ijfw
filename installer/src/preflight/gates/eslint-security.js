// Gate 2b: eslint with eslint-plugin-security -- Node-specific security rules
// that oxlint does not cover (e.g. no-eval, detect-non-literal-fs-filename).
// Uses a temp package dir so eslint and the plugin can resolve each other.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const RULES = {
  'security/detect-eval-with-expression': 'error',
  'security/detect-non-literal-fs-filename': 'warn',
  'security/detect-non-literal-regexp': 'warn',
  'security/detect-non-literal-require': 'warn',
  'security/detect-object-injection': 'warn',
  'security/detect-possible-timing-attacks': 'warn',
  'security/detect-pseudoRandomBytes': 'error',
  'security/detect-unsafe-regex': 'error',
};

/** @param {import('../types.js').PreflightCtx} ctx */
export async function run(ctx) {
  const t0 = Date.now();
  const eslintVer = ctx.versions['eslint'] || 'latest';
  const pluginVer = ctx.versions['eslint-plugin-security'] || 'latest';

  // Create an isolated tmp dir with eslint + plugin installed
  const tmpDir = mkdtempSync(join(tmpdir(), 'ijfw-eslint-security-'));
  try {
    // Write package.json so npm install works
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'eslint-security-runner', version: '1.0.0', type: 'module' }));

    // Install eslint + plugin
    const install = spawnSync(
      'npm',
      ['install', '--no-save', '--silent', `eslint@${eslintVer}`, `eslint-plugin-security@${pluginVer}`],
      { encoding: 'utf8', cwd: tmpDir, timeout: 90_000 },
    );

    if (install.status !== 0) {
      return {
        name: 'eslint-security',
        status: 'WARN',
        message: 'eslint-security: could not install plugin (npm install failed)',
        details: ((install.stdout || '') + (install.stderr || '')).split('\n').filter(Boolean).slice(0, 5),
        durationMs: Date.now() - t0,
      };
    }

    // Write flat config into the repo root so eslint can find files relative to it
    const configContent = `
import security from '${join(tmpDir, 'node_modules', 'eslint-plugin-security', 'index.js').replace(/\\/g, '/')}';
export default [
  {
    files: ['installer/src/**/*.js', 'mcp-server/src/**/*.js'],
    plugins: { security },
    rules: ${JSON.stringify(RULES)},
  }
];
`;
    const configPath = join(ctx.repoRoot, '.eslint-security-temp.mjs');
    writeFileSync(configPath, configContent, 'utf8');

    const eslintBin = join(tmpDir, 'node_modules', '.bin', 'eslint');

    const res = spawnSync(
      eslintBin,
      ['--config', configPath, 'installer/src/**/*.js', 'mcp-server/src/**/*.js'],
      { encoding: 'utf8', cwd: ctx.repoRoot, timeout: 60_000 },
    );

    const durationMs = Date.now() - t0;
    const output = (res.stdout || '') + (res.stderr || '');
    const lines = output.split('\n').filter(Boolean);

    if (res.status === 0) {
      return {
        name: 'eslint-security',
        status: 'PASS',
        message: 'eslint-security: no security issues',
        details: [],
        durationMs,
      };
    }

    // ESLint exit codes: 0=pass, 1=warnings only, 2=errors
    // We only fail on exit code 2 (actual errors)
    if (res.status === 1) {
      return {
        name: 'eslint-security',
        status: 'WARN',
        message: 'eslint-security: advisory warnings (review above)',
        details: lines.slice(0, 30),
        durationMs,
      };
    }

    return {
      name: 'eslint-security',
      status: 'FAIL',
      message: 'eslint-security: security errors found (exit code 2)',
      details: lines.slice(0, 30),
      durationMs,
    };
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ }
    try { rmSync(join(ctx.repoRoot, '.eslint-security-temp.mjs'), { force: true }); } catch { /* best effort */ }
  }
}

export const name = 'eslint-security';
export const severity = 'blocking';
export const parallel = true;
