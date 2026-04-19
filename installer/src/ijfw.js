// ijfw -- single entry point with subcommand dispatch.
// Subcommands: install, uninstall, preflight, dashboard (v1.1D), doctor, design, help

import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, copyFileSync, readdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
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
  help        Open the full IJFW guide (terminal, or --browser for rendered)
  preflight   Run 11-gate quality pipeline before publishing
  dashboard   Start / stop / check the local observability dashboard
  design      Manage the visual design companion
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
          console.log('[ijfw] Run `ijfw dashboard start` to launch the web dashboard.');
          process.exit(1);
        }
      } else {
        console.log('Usage: ijfw dashboard <start|stop|status|render>');
        process.exit(1);
      }
      break;
    }
    case 'design': {
      const designSub = argv[3];
      const contentDir = join(homedir(), '.ijfw', 'design-companion', 'content');
      mkdirSync(contentDir, { recursive: true });

      if (designSub === 'push') {
        const filePath = argv[4];
        if (!filePath) {
          console.error('Usage: ijfw design push <file.html>');
          process.exit(1);
        }
        const abs = resolve(filePath);
        if (!existsSync(abs)) {
          console.error(`File not found: ${abs}`);
          process.exit(1);
        }
        const dest = join(contentDir, basename(abs));
        copyFileSync(abs, dest);
        console.log(`Design pushed: ${dest}`);
      } else if (designSub === 'clear') {
        const files = readdirSync(contentDir);
        for (const f of files) rmSync(join(contentDir, f), { force: true });
        console.log('Design companion content cleared.');
      } else {
        console.log('ijfw design -- Manage the visual design companion. Push HTML mockups for live preview.');
        console.log('');
        console.log('Usage: ijfw design push <file.html> | ijfw design clear');
        process.exit(1);
      }
      break;
    }
    case 'help': {
      const wantsBrowser = argv.slice(3).includes('--browser');
      const candidates = [
        join(repoRoot(), 'docs', 'GUIDE.md'),
        resolve(__dirname, '..', 'docs', 'GUIDE.md'),
        join(homedir(), '.ijfw', 'docs', 'GUIDE.md'),
      ];
      const guidePath = candidates.find(p => existsSync(p));
      if (!guidePath) {
        console.error('[ijfw] Guide not found. Run `ijfw install` to fetch the full guide, or visit https://github.com/TheRealSeanDonahoe/ijfw/blob/main/docs/GUIDE.md');
        process.exit(1);
      }

      if (wantsBrowser) {
        const { marked } = await import('marked');
        const assetsSrc = join(dirname(guidePath), 'guide', 'assets');
        const outDir = join(homedir(), '.ijfw', 'guide');
        mkdirSync(join(outDir, 'assets'), { recursive: true });
        if (existsSync(assetsSrc)) {
          for (const f of readdirSync(assetsSrc)) {
            copyFileSync(join(assetsSrc, f), join(outDir, 'assets', f));
          }
        }
        const md = readFileSync(guidePath, 'utf8').replace(/\(guide\/assets\//g, '(assets/');
        const rendered = marked.parse(md, { gfm: true, breaks: false });
        const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<title>IJFW Guide</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.5.1/github-markdown-dark.css"/>
<style>
  body{margin:0;background:#0d1117;color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif}
  .wrap{max-width:960px;margin:0 auto;padding:48px 32px}
  .markdown-body{background:transparent;color:#e6edf3}
  pre,code{font-family:ui-monospace,Menlo,Consolas,monospace}
  img{border-radius:8px;max-width:100%}
  table{display:table;width:100%}
</style>
</head><body><div class="wrap markdown-body">${rendered}</div></body></html>`;
        const outHtml = join(outDir, 'index.html');
        writeFileSync(outHtml, html);
        const opener = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'start' : 'xdg-open';
        spawnSync(opener, [outHtml], { stdio: 'ignore', detached: true });
        console.log(`[ijfw] Guide opened in your browser.`);
        console.log(`       Local copy: ${outHtml}`);
        process.exit(0);
      }

      const hasLess = spawnSync('less', ['-V'], { stdio: 'ignore' }).status === 0;
      if (hasLess) {
        spawnSync('less', ['-R', guidePath], { stdio: 'inherit' });
      } else {
        process.stdout.write(readFileSync(guidePath, 'utf8'));
      }
      process.exit(0);
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
