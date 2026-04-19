/**
 * IJFW Dashboard Server -- Wave V1.1I
 * Serves the single-file HTML dashboard + SSE stream from observations.jsonl.
 * Adds cost tracking + savings + memory search endpoints.
 * Credit: ccusage (ryoppippi, MIT), tokscale (junhoyeo, MIT), CodeBurn (AgentSeal, MIT).
 * Zero deps. node:http, node:fs, node:path, node:os, node:url only.
 */

import { createServer } from 'node:http';
import { existsSync, readFileSync, watch, writeFileSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCostReport, buildBreakdown, buildDailySeries, buildBlockUsage, getSavingsMethodology } from './cost/aggregator.js';
import { getPricesTable } from './cost/pricing.js';
import { computeValueDelivered } from './cost/savings.js';
import { listMemoryFiles, listKnownProjects } from './memory/reader.js';
import { searchMemory } from './memory/search.js';
import { buildRecallCounts, mergeRecallCounts, topRecalled } from './memory/recall-counter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Repo root two levels up from src/
const REPO_ROOT = join(__dirname, '..', '..');
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

    ['/api/memory/file', (req, res, url) => {
      try {
        const reqPath = resolve(url.searchParams.get('path') || '');
        // Security: serve files under ~/.ijfw, ~/.claude/projects, or repo/.ijfw
        const HOME_IJFW = resolve(homedir() + '/.ijfw');
        const HOME_CLAUDE = resolve(homedir() + '/.claude/projects');
        const REPO_IJFW = resolve(join(REPO_ROOT, '.ijfw'));
        const allowed = (
          reqPath.startsWith(HOME_IJFW + '/') ||
          reqPath.startsWith(HOME_CLAUDE + '/') ||
          reqPath.startsWith(REPO_IJFW + '/')
        );
        if (!reqPath || !allowed) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Access denied' }));
          return;
        }
        const body = existsSync(reqPath) ? readFileSync(reqPath, 'utf8') : null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ body: body ? body.slice(0, 10000) : null }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ body: null, error: err.message }));
      }
    }],

    // ---------- cost endpoints ----------
    ['/api/cost/today', (req, res) => {
      try {
        const obs = readObservations(ledgerPath);
        const report = buildCostReport(1, obs);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(report));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ cost: 0, savings: { total: 0 }, error: err.message }));
      }
    }],

    ['/api/cost/period', (req, res, url) => {
      try {
        const days = parseInt(url.searchParams.get('days') || '7', 10);
        const obs = readObservations(ledgerPath);
        const report = buildCostReport(days, obs);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(report));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ cost: 0, savings: { total: 0 }, error: err.message }));
      }
    }],

    ['/api/cost/by', (req, res, url) => {
      try {
        const dim    = url.searchParams.get('dim') || 'platform';
        const period = url.searchParams.get('period') || '7d';
        const days   = parseInt(period.replace(/\D/g, '') || '7', 10);
        const obs    = readObservations(ledgerPath);
        const result = buildBreakdown(dim, days, obs);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    }],

    ['/api/cost/block', (req, res) => {
      try {
        const result = buildBlockUsage();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    }],

    ['/api/cost/history', (req, res, url) => {
      try {
        const days   = parseInt(url.searchParams.get('days') || '30', 10);
        const series = buildDailySeries(days);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(series));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    }],

    ['/api/prices', (req, res) => {
      try {
        const table = getPricesTable();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(table));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    }],

    ['/api/savings/methodology', (req, res) => {
      try {
        const methodology = getSavingsMethodology();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(methodology));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    }],

    // ---------- memory endpoints ----------
    ['/api/memory', (req, res, url) => {
      try {
        const tierFilter = url.searchParams.get('tier') || null;
        const { files, total, root, tiers } = listMemoryFiles(REPO_ROOT, tierFilter);
        const { counts, weekCounts, totalThisWeek } = buildRecallCounts(ledgerPath);
        const enriched = mergeRecallCounts(files, counts, weekCounts);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ files: enriched, total, root, tiers, totalRecallsThisWeek: totalThisWeek }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ files: [], total: 0, root: null, tiers: {}, error: err.message }));
      }
    }],

    ['/api/memory/search', (req, res, url) => {
      try {
        const q     = url.searchParams.get('q') || '';
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const { files } = listMemoryFiles(REPO_ROOT);
        const { counts, weekCounts } = buildRecallCounts(ledgerPath);
        const enriched = mergeRecallCounts(files, counts, weekCounts);
        const results  = searchMemory(q, enriched, limit);
        // Merge recall counts into search results
        const resultMap = new Map(enriched.map(f => [f.path, f]));
        const withCounts = results.map(r => ({
          ...r,
          recall_count:      resultMap.get(r.path)?.recall_count || 0,
          recall_count_week: resultMap.get(r.path)?.recall_count_week || 0,
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ results: withCounts, count: withCounts.length }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ results: [], count: 0, error: err.message }));
      }
    }],

    ['/api/projects', (req, res) => {
      try {
        const projects = listKnownProjects();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ projects, total: projects.length }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ projects: [], total: 0, error: err.message }));
      }
    }],

    ['/api/memory/recall-stats', (req, res) => {
      try {
        const { files } = listMemoryFiles(REPO_ROOT);
        const { counts, weekCounts, totalThisWeek } = buildRecallCounts(ledgerPath);
        const enriched = mergeRecallCounts(files, counts, weekCounts);
        const top = topRecalled(enriched, 5);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ top_recalled: top, total_recalls_this_week: totalThisWeek }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ top_recalled: [], total_recalls_this_week: 0, error: err.message }));
      }
    }],

    // ---------- config endpoints ----------
    ['/api/config', (req, res) => {
      const configPath = join(homedir(), '.ijfw', 'config.json');
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; if (body.length > 65536) { req.destroy(); return; } });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            mkdirSync(join(homedir(), '.ijfw'), { recursive: true });
            writeFileSync(configPath, JSON.stringify(parsed, null, 2), 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
        return;
      }
      // GET
      const CONFIG_DEFAULTS = { version: 1, subscriptions: {}, accounts: [], prices_pinned_date: '2026-04-16' };
      let config = { ...CONFIG_DEFAULTS };
      if (existsSync(configPath)) {
        try {
          const stored = JSON.parse(readFileSync(configPath, 'utf8'));
          // Merge stored over defaults so new fields appear on first read.
          config = Object.assign({}, CONFIG_DEFAULTS, stored);
        } catch {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(config));
    }],

    ['/api/value-delivered', (req, res, url) => {
      try {
        const platform   = url.searchParams.get('platform') || 'claude';
        const days       = parseInt(url.searchParams.get('days') || '7', 10);
        const configPath = join(homedir(), '.ijfw', 'config.json');
        let config = {};
        if (existsSync(configPath)) {
          try { config = JSON.parse(readFileSync(configPath, 'utf8')); } catch {}
        }
        const tierCfg = (config.subscriptions || {})[platform] || null;
        const obs    = readObservations(ledgerPath);
        const report = buildCostReport(days, obs);
        // Pass a single synthetic turn with aggregated cost
        const turns  = [{ cost_usd: report.cost, platform }];
        const result = computeValueDelivered(tierCfg, turns, days);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ payg_equivalent: 0, framing: 'unconfigured', error: err.message }));
      }
    }],

    // ---------- design companion ----------
    ['/design', async (req, res) => {
      const contentDir = join(homedir(), '.ijfw', 'design-companion', 'content');
      mkdirSync(contentDir, { recursive: true });
      let html = null;
      try {
        const { readdirSync, statSync } = await import('node:fs');
        const files = readdirSync(contentDir)
          .filter(f => f.endsWith('.html'))
          .map(f => ({ name: f, mtime: statSync(join(contentDir, f)).mtimeMs }))
          .sort((a, b) => b.mtime - a.mtime);
        if (files.length > 0) {
          html = readFileSync(join(contentDir, files[0].name), 'utf8');
        }
      } catch {}
      if (!html) {
        html = `<!doctype html><html><body><pre>Design companion active. Push a design with: ijfw design push file.html</pre></body></html>`;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
      });
      res.end(html);
    }],

    ['/design/stream', (req, res) => {
      const contentDir = join(homedir(), '.ijfw', 'design-companion', 'content');
      mkdirSync(contentDir, { recursive: true });
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write(': connected\n\n');

      let debounceTimer = null;
      let watcher = null;
      try {
        watcher = watch(contentDir, () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            try { res.write('event: reload\ndata: reload\n\n'); } catch {}
          }, 50);
        });
      } catch {}

      req.on('close', () => {
        clearTimeout(debounceTimer);
        if (watcher) { try { watcher.close(); } catch {} }
      });
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
