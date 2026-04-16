// ijfw -- single entry point with subcommand dispatch.
// Subcommands: install, uninstall, preflight, dashboard (v1.1D), doctor

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function repoRoot() {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, 'package.json')) && existsSync(join(dir, '.git'))) return dir;
    dir = resolve(dir, '..');
  }
  return process.cwd();
}

function printHelp() {
  console.log(`
ijfw -- the AI efficiency layer

USAGE
  ijfw <command> [options]

COMMANDS
  install     Install IJFW into your AI coding agents
  uninstall   Remove IJFW from your AI coding agents
  preflight   Run 11-gate quality pipeline before publishing
  dashboard   Start / stop / check the local observability dashboard
  doctor      Diagnose IJFW installation health

  --help, -h  Show this help
  --version   Show version
`);
}

function doctorCheck(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split('\n')[0].trim() : 'not found';
}

async function main() {
  const argv = process.argv;
  const sub = argv[2];

  if (!sub || sub === '--help' || sub === '-h') {
    printHelp();
    process.exit(0);
  }

  if (sub === '--version' || sub === '-v') {
    try {
      const { readFileSync } = await import('node:fs');
      const pkgPath = join(__dirname, '..', 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      console.log(pkg.version || 'unknown');
    } catch {
      console.log('unknown');
    }
    process.exit(0);
  }

  switch (sub) {
    case 'install': {
      // Delegate to dist/install.js via the existing entry point
      const installBin = resolve(__dirname, '..', 'dist', 'install.js');
      const r = spawnSync('node', [installBin, ...argv.slice(3)], { stdio: 'inherit' });
      process.exit(r.status ?? 1);
      break;
    }
    case 'uninstall': {
      const uninstallBin = resolve(__dirname, '..', 'dist', 'uninstall.js');
      const r = spawnSync('node', [uninstallBin, ...argv.slice(3)], { stdio: 'inherit' });
      process.exit(r.status ?? 1);
      break;
    }
    case 'preflight': {
      const { runPreflightCommand } = await import('./preflight.js');
      await runPreflightCommand([argv[0], argv[1], ...argv.slice(3)], repoRoot());
      break;
    }
    case 'dashboard': {
      const dashSub = argv[3]; // start | stop | status | render
      const root = repoRoot();

      if (dashSub === 'start' || dashSub === 'stop' || dashSub === 'status') {
        // V1.1D: HTTP server subcommands via ijfw-dashboard bin
        const dashBin = join(root, 'mcp-server', 'bin', 'ijfw-dashboard');
        if (existsSync(dashBin)) {
          const r = spawnSync('node', [dashBin, dashSub, ...argv.slice(4)], { stdio: 'inherit' });
          process.exit(r.status ?? 0);
        } else {
          // Fallback: run dashboard-server.js directly for start
          const serverJs = join(root, 'mcp-server', 'src', 'dashboard-server.js');
          if (dashSub === 'start' && existsSync(serverJs)) {
            const { spawn } = await import('node:child_process');
            const child = spawn(process.execPath, [serverJs, '--daemon'], {
              detached: true,
              stdio: 'ignore',
            });
            child.unref();
            console.log('Dashboard starting... (check: ijfw dashboard status)');
            process.exit(0);
          }
          console.log('[ijfw] Dashboard bin not found. Run from the IJFW repo root.');
          process.exit(1);
        }
      } else if (dashSub === 'render' || !dashSub) {
        // V1.1C: render terminal dashboard
        const binJs = join(root, 'scripts', 'dashboard', 'bin.js');
        if (existsSync(binJs)) {
          const r = spawnSync('node', [binJs, ...argv.slice(dashSub ? 4 : 3)], { stdio: 'inherit' });
          process.exit(r.status ?? 0);
        } else {
          console.log('[ijfw] Dashboard renderer not found. Run from the IJFW repo root.');
          process.exit(1);
        }
      } else {
        console.log('Usage: ijfw dashboard <start|stop|status|render>');
        process.exit(1);
      }
      break;
    }
    case 'doctor': {
      console.log('\nijfw doctor\n');
      console.log('  node:       ' + doctorCheck('node', ['--version']));
      console.log('  git:        ' + doctorCheck('git', ['--version']));
      console.log('  shellcheck: ' + doctorCheck('shellcheck', ['--version']));
      console.log('  gitleaks:   ' + doctorCheck('gitleaks', ['version']));
      console.log('');
      process.exit(0);
      break;
    }
    default: {
      console.error(`Unknown subcommand: ${sub}`);
      printHelp();
      process.exit(1);
    }
  }
}

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
