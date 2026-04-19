// Gate 3: PSScriptAnalyzer -- PowerShell linter.
// On non-Windows this gate is advisory (WARN not FAIL) since pwsh may not be present.
// CI runs this on windows-latest where it is blocking.

import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';

function findPs1Files(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const e of entries) {
    if (e === 'node_modules' || e === '.git') continue;
    const full = join(dir, e);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) findPs1Files(full, acc);
    else if (e.endsWith('.ps1')) acc.push(full);
  }
  return acc;
}

/** @param {import('../types.js').PreflightCtx} ctx */
export async function run(ctx) {
  const t0 = Date.now();

  const files = findPs1Files(ctx.repoRoot);
  if (files.length === 0) {
    return {
      name: 'psscriptanalyzer',
      status: 'PASS',
      message: 'No PowerShell scripts found',
      details: [],
      durationMs: Date.now() - t0,
    };
  }

  // Check if pwsh is available
  const which = spawnSync('pwsh', ['--version'], { encoding: 'utf8' });
  if (which.status === null || which.error) {
    const isWin = platform() === 'win32';
    return {
      name: 'psscriptanalyzer',
      status: isWin ? 'FAIL' : 'WARN',
      message: isWin
        ? `pwsh not found -- ${files.length} .ps1 file(s) unchecked (install PowerShell)`
        : `pwsh not installed -- PSScriptAnalyzer skipped on non-Windows (runs in CI on windows-latest)`,
      details: [`Files that would be checked: ${files.join(', ')}`],
      durationMs: Date.now() - t0,
    };
  }

  // Run PSScriptAnalyzer inline via pwsh
  const script = `
$files = @(${files.map(f => `'${f.replace(/'/g, "''")}'`).join(',')})
$found = $false
foreach ($f in $files) {
  $results = Invoke-ScriptAnalyzer -Path $f -Severity Warning -ErrorAction SilentlyContinue
  if ($results) {
    $found = $true
    foreach ($r in $results) {
      Write-Output "$($r.ScriptName):$($r.Line): [$($r.Severity)] $($r.RuleName) -- $($r.Message)"
    }
  }
}
if ($found) { exit 1 } else { exit 0 }
`;

  const res = spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    cwd: ctx.repoRoot,
    timeout: 30_000,
  });

  const durationMs = Date.now() - t0;

  if (res.status === 0) {
    return {
      name: 'psscriptanalyzer',
      status: 'PASS',
      message: `${files.length} PowerShell script(s) clean`,
      details: [],
      durationMs,
    };
  }

  const lines = ((res.stdout || '') + (res.stderr || '')).split('\n').filter(Boolean);
  const isWin = platform() === 'win32';
  return {
    name: 'psscriptanalyzer',
    status: isWin ? 'FAIL' : 'WARN',
    message: `PSScriptAnalyzer found issues in ${files.length} script(s)`,
    details: lines.slice(0, 20),
    durationMs,
  };
}

export const name = 'psscriptanalyzer';
export const severity = 'blocking';
export const parallel = true;
