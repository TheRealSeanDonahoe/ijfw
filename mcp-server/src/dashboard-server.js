/**
 * IJFW Dashboard Server -- Wave V1.1D
 * Serves the single-file HTML dashboard + SSE stream from observations.jsonl.
 * Zero deps. node:http, node:fs, node:path, node:os, node:url only.
 */

import { createServer } from 'node:http';
import { existsSync, readFileSync, watch, writeFileSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = join(__dirname, 'dashboard-client.html');

const DEFAULT_PORT  = 37891;
const PORT_WALK_MAX = 10; // walk up to 37891+PORT_WALK_MAX (37900)
const BACKFILL_DEFAULT = 200;

// ---------- localhost guard ----------
function requireLocalhost(req, res) {
  const addr = req.socket.remoteAddress;
  if (addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1') return true;
  res.writeHead(403, { 'Content-Type': 'text/plain' });
  res.end('403 Forbidden -- localhost only');
  return false;
}

// ---------- simple router ----------
function route(req, res, routes) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  for (const [pattern, handler] of routes) {
    if (typeof pattern === 'string' ? path === pattern : pattern.test(path)) {
      handler(req, res, url);
      return;
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
}

// ---------- JSONL reader ----------
function readObservations(ledgerPath) {
  if (!existsSync(ledgerPath)) return [];
  try {
    return readFileSync(ledgerPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function filterObservations(obs, params) {
  let result = obs;
  const platform = params.get('platform');
  const since    = params.get('since');
  const limit    = parseInt(params.get('limit') || '200', 10);

  if (platform) result = result.filter(o => o.platform === platform);
  if (since)    result = result.filter(o => o.id > parseInt(since, 10));
  return result.slice(-limit);
}

// ---------- SSE broadcaster ----------
function makeBroadcaster() {
  const clients = new Set();
  let debounceTimer = null;
  let pendingLines = [];

  function flush() {
    if (pendingLines.length === 0) return;
    const toSend = pendingLines.slice();
    pendingLines = [];
    for (const res of clients) {
      try {
        for (const { id, data } of toSend) {
          res.write(`id: ${id}\ndata: ${data}\n\n`);
        }
      } catch {
        clients.delete(res);
      }
    }
  }

  function push(id, jsonLine) {
    pendingLines.push({ id, data: jsonLine });
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flush, 50);
  }

  function add(res) { clients.add(res); }
  function remove(res) { clients.delete(res); }

  function closeAll() {
    clearTimeout(debounceTimer);
    for (const res of clients) {
      try {
        res.write('event: close\ndata: shutdown\n\n');
        res.end();
      } catch {}
    }
    clients.clear();
  }

  function size() { return clients.size; }

  return { push, add, remove, closeAll, size };
}

// ---------- file watcher with tail ----------
function makeWatcher(ledgerPath, broadcaster) {
  let lastLineCount = 0;
  let watcher = null;
  let pollTimer = null;

  function tail() {
    if (!existsSync(ledgerPath)) return;
    try {
      const lines = readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean);
      if (lines.length > lastLineCount) {
        const newLines = lines.slice(lastLineCount);
        for (const line of newLines) {
          try {
            const obj = JSON.parse(line);
            broadcaster.push(obj.id ?? (lastLineCount + 1), line);
          } catch {}
        }
        lastLineCount = lines.length;
      }
    } catch {}
  }

  // Seed initial count
  if (existsSync(ledgerPath)) {
    try {
      lastLineCount = readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean).length;
    } catch {}
  }

  function startWatcher() {
    if (!existsSync(ledgerPath)) return;
    try {
      watcher = watch(ledgerPath, () => tail());
    } catch {
      watcher = null;
    }
  }

  // 2s poll fallback in case fs.watch is unreliable
  pollTimer = setInterval(tail, 2000);

  startWatcher();

  function stop() {
    clearInterval(pollTimer);
    if (watcher) { try { watcher.close(); } catch {} }
  }

  return { stop, tail };
}

// ---------- backfill SSE ----------
async function backfillSSE(res, ledgerPath, lastEventId, backfillCount) {
  if (!existsSync(ledgerPath)) return 0;
  const obs = readObservations(ledgerPath);
  const start = lastEventId ? obs.findIndex(o => o.id === lastEventId) + 1 : Math.max(0, obs.length - backfillCount);
  const toSend = obs.slice(start);
  for (const o of toSend) {
    try {
      res.write(`id: ${o.id}\ndata: ${JSON.stringify(o)}\n\n`);
    } catch {
      return -1;
    }
  }
  return toSend.length;
}

// ---------- main export ----------
export async function startServer(options = {}) {
  const {
    ledgerPath = join(homedir(), '.ijfw', 'observations.jsonl'),
    port: preferredPort = DEFAULT_PORT,
    maxPort,
    version = '1.1.0',
  } = options;

  // Walk up to PORT_WALK_MAX ports from preferredPort.
  // When preferredPort is DEFAULT_PORT, this gives the canonical 37891-37900 range.
  const portCeiling = maxPort ?? (preferredPort + PORT_WALK_MAX - 1);

  const broadcaster = makeBroadcaster();
  const watcher = makeWatcher(ledgerPath, broadcaster);

  const startTime = Date.now();

  // Lazily read HTML -- handle both: serving from source and from bundled context.
  let htmlContent = null;
  async function getHtml() {
    if (htmlContent) return htmlContent;
    try {
      htmlContent = await readFile(HTML_PATH, 'utf8');
    } catch {
      htmlContent = '<html><body>Dashboard UI not found. Run from IJFW repo.</body></html>';
    }
    return htmlContent;
  }

  const routes = [
    ['/', async (req, res) => {
      const html = await getHtml();
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'",
      });
      res.end(html);
    }],

    ['/api/observations', (req, res, url) => {
      const obs = readObservations(ledgerPath);
      const filtered = filterObservations(obs, url.searchParams);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(filtered));
    }],

    ['/api/summary', (req, res) => {
      const summaryPath = join(dirname(ledgerPath), 'session_summaries.jsonl');
      let summary = null;
      if (existsSync(summaryPath)) {
        try {
          const lines = readFileSync(summaryPath, 'utf8').split('\n').filter(Boolean);
          if (lines.length) summary = JSON.parse(lines[lines.length - 1]);
        } catch {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(summary));
    }],

    ['/api/economics', (req, res) => {
      const obs = readObservations(ledgerPath);
      const totalTokens = obs.reduce((s, o) => s + (o.token_cost || 0), 0);
      const workTokens  = obs.reduce((s, o) => s + (o.work_tokens || 0), 0);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ count: obs.length, totalTokens, workTokens }));
    }],

    ['/api/health', (req, res) => {
      const obs = readObservations(ledgerPath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        status: 'ok',
        version,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        ledgerPath,
        obsCount: obs.length,
      }));
    }],

    ['/stream', async (req, res, url) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      // Heartbeat comment to keep connection alive
      res.write(': connected\n\n');

      const lastId = parseInt(req.headers['last-event-id'] || url.searchParams.get('lastEventId') || '0', 10);
      const backfill = parseInt(url.searchParams.get('backfill') || String(BACKFILL_DEFAULT), 10);
      await backfillSSE(res, ledgerPath, lastId || 0, backfill);

      broadcaster.add(res);
      req.on('close', () => broadcaster.remove(res));
    }],
  ];

  return new Promise((resolve, reject) => {
    let port = preferredPort;

    function tryBind() {
      if (port > portCeiling) {
        reject(new Error(`No free port in range ${preferredPort}-${portCeiling}`));
        return;
      }

      const server = createServer((req, res) => {
        if (!requireLocalhost(req, res)) return;
        route(req, res, routes);
      });

      server.once('error', err => {
        if (err.code === 'EADDRINUSE') {
          port++;
          tryBind();
        } else {
          reject(err);
        }
      });

      server.listen(port, '127.0.0.1', () => {
        function shutdown() {
          watcher.stop();
          broadcaster.closeAll();
          server.close(() => process.exit(0));
        }
        // Increase limit for test environments that start many servers.
        process.setMaxListeners(process.getMaxListeners() + 2);
        process.once('SIGTERM', shutdown);
        process.once('SIGINT', shutdown);

        // Wrap server.close so tests can clean up watcher + broadcaster without
        // knowing about them directly.
        const originalClose = server.close.bind(server);
        server.close = (cb) => {
          watcher.stop();
          broadcaster.closeAll();
          return originalClose(cb);
        };
        resolve({ port, server, broadcaster, watcher });
      });
    }

    tryBind();
  });
}

// ---------- daemon entry point ----------
// When spawned with `--daemon`, starts the server and writes PID + port files.
if (process.argv.includes('--daemon')) {
  const pidFile  = process.env.IJFW_PID_FILE  || join(homedir(), '.ijfw', 'dashboard.pid');
  const portFile = process.env.IJFW_PORT_FILE || join(homedir(), '.ijfw', 'dashboard.port');

  startServer().then(({ port }) => {
    const ijfwDir = dirname(pidFile);
    mkdirSync(ijfwDir, { recursive: true });
    writeFileSync(pidFile,  String(process.pid), 'utf8');
    writeFileSync(portFile, String(port),        'utf8');
  }).catch(err => {
    process.stderr.write('[ijfw-dashboard] ' + err.message + '\n');
    process.exit(1);
  });
}
