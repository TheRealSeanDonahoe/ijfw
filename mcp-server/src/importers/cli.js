// --- ijfw import <tool> [--dry-run] [--force] [--path <p>] ---
//
// Wires importer modules (claude-mem, rtk) into the `ijfw` CLI. Keeps IO
// at the edge so the per-tool modules stay unit-testable with fixtures.
//
// Writes normalized entries to .ijfw/memory/ in the current project:
//   decision   -> appends under knowledge.md (structured frontmatter block)
//   pattern    -> appends under knowledge.md (structured frontmatter block)
//   observation-> appends under project-journal.md
//   handoff    -> overwrites handoff.md (last one wins if multiple)
//   preference -> appends under .ijfw/memory/preferences.md
//
// Collision policy: default SKIP (summary-based duplicate detection on
// knowledge entries; content-hash on journal entries). --force overwrites.

import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { emptyStats, bumpStat, renderSummary } from './common.js';

import * as claudeMem from './claude-mem.js';
import * as rtk       from './rtk.js';

const IMPORTERS = {
  'claude-mem': claudeMem,
  'rtk':        rtk,
};

export function listImporters() { return Object.keys(IMPORTERS); }

export async function runImport({ tool, dryRun = false, force = false, path = null, includeMetrics = false, projectDir = process.cwd() } = {}) {
  const importer = IMPORTERS[tool];
  if (!importer) {
    return { ok: false, error: `Unknown tool: ${tool}. Available: ${listImporters().join(', ')}.` };
  }

  // RTK default: skip unless --include-metrics. RTK is metrics-only (see
  // IMPORTER-SCHEMAS.md); importing everything would drown project-journal.md.
  if (tool === 'rtk' && !includeMetrics) {
    return {
      ok: true,
      tool,
      dryRun,
      stats: emptyStats(),
      samples: [],
      summary: `Skipped rtk -- metrics-only by design. Use --include-metrics to ingest anyway (recall value is low).`,
    };
  }

  const hit = importer.detect({ path });
  if (!hit.found) {
    return {
      ok: false,
      error: `No ${tool} data found${path ? ` at ${path}` : ' on this machine'}. Pass --path <dir> if it lives elsewhere.`,
    };
  }

  const memDir = join(projectDir, '.ijfw', 'memory');
  if (!dryRun) mkdirSync(memDir, { recursive: true });

  const stats = emptyStats();
  const samples = [];
  let records;
  try {
    records = importer.readSource(hit.path);
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }

  try {
    const cache = {}; // file path -> cached body (avoids O(n^2) re-reads)
    for await (const record of records) {
      const entry = importer.normalize(record);
      if (!entry) { bumpStat(stats, null, 'skipped'); continue; }

      const outcome = dryRun
        ? 'preview'
        : writeEntry(memDir, entry, { force, cache });

      if (outcome === 'failed')       bumpStat(stats, entry, 'failed');
      else if (outcome === 'skipped') bumpStat(stats, entry, 'skipped');
      else                             bumpStat(stats, entry, 'ok');

      if (samples.length < 3) samples.push({ type: entry.type, summary: entry.summary });
    }
  } catch (err) {
    return { ok: false, error: err.message || String(err), stats, samples };
  }

  // Per Trident MED finding: ok should reflect write health, not just that
  // the iteration completed.
  if (stats.failed > 0 && stats.total === stats.failed) {
    return { ok: false, error: `All ${stats.failed} writes failed.`, stats, samples };
  }

  return {
    ok: true,
    source: hit.path,
    tool,
    dryRun,
    stats,
    samples,
    summary: renderSummary(tool, stats),
  };
}

// Writer: returns 'ok' | 'skipped' | 'failed'.
// cache: { path -> body } to avoid re-reading the same memory file per entry.
function writeEntry(memDir, entry, { force, cache }) {
  try {
    switch (entry.type) {
      case 'decision':
      case 'pattern':
        return appendKnowledge(memDir, entry, force, cache);
      case 'handoff':
        return writeHandoff(memDir, entry, force, cache);
      case 'preference':
        return appendFaceted(memDir, 'preferences.md', entry, force, cache);
      default:
        return appendJournal(memDir, entry, force, cache);
    }
  } catch { return 'failed'; }
}

function getBody(file, cache) {
  if (cache[file] !== undefined) return cache[file];
  cache[file] = existsSync(file) ? readFileSync(file, 'utf8') : '';
  return cache[file];
}

function appendAndCache(file, addition, cache) {
  appendFileSync(file, addition);
  cache[file] = (cache[file] || '') + addition;
}

// Content-hash dedup: two decisions with the same summary but different
// bodies are NOT duplicates (Trident HIGH). Key is sha12(content).
function appendKnowledge(memDir, entry, force, cache) {
  const file = join(memDir, 'knowledge.md');
  const body = getBody(file, cache);
  const hash = sha12(entry.content);
  if (!force && body.includes(`<!-- hash:${hash} -->`)) return 'skipped';
  const summary = (entry.summary || entry.content.slice(0, 80)).replace(/\n/g, ' ');
  const block = [
    '',
    '---',
    `name: ${quoteYaml(summary)}`,
    `type: ${entry.type}`,
    `source: ${entry.source}`,
    entry.tags.length > 0 ? `tags: [${entry.tags.map(quoteYaml).join(', ')}]` : null,
    `hash: ${hash}`,
    '---',
    '',
    `<!-- hash:${hash} -->`,
    entry.content,
    entry.why ? `\n**Why:** ${entry.why}` : null,
    entry.how_to_apply ? `\n**How to apply:** ${entry.how_to_apply}` : null,
    '',
  ].filter((l) => l !== null).join('\n');
  appendAndCache(file, block, cache);
  return 'ok';
}

// Last-one-wins per scope intent: a new handoff overwrites the existing one.
function writeHandoff(memDir, entry, force, cache) {
  const file = join(memDir, 'handoff.md');
  writeFileSync(file, entry.content + '\n');
  cache[file] = entry.content + '\n';
  return 'ok';
}

function appendFaceted(memDir, name, entry, force, cache) {
  const file = join(memDir, name);
  const body = getBody(file, cache);
  const hash = sha12(entry.content);
  if (!force && body.includes(`<!-- hash:${hash} -->`)) return 'skipped';
  appendAndCache(file, `\n<!-- hash:${hash} -->\n${entry.content}\n`, cache);
  return 'ok';
}

function appendJournal(memDir, entry, force, cache) {
  const file = join(memDir, 'project-journal.md');
  const body = getBody(file, cache);
  const hash = sha12(entry.content);
  if (!force && body.includes(`<!-- hash:${hash} -->`)) return 'skipped';
  const iso = new Date().toISOString();
  // Preserve multi-line content; encode newlines as explicit \n rather than
  // flattening. Recall surfaces still work (BM25 tokenizes per-line).
  const inline = entry.content.replace(/\r?\n/g, ' \\n ');
  appendAndCache(file, `\n- [${iso}] <!-- hash:${hash} --> ${inline}\n`, cache);
  return 'ok';
}

// Minimal YAML quoting: wrap in double quotes if the value has special chars.
function quoteYaml(s) {
  const str = String(s);
  if (/[:#[\]{}&*!|>'%"@`\n]/.test(str)) {
    return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return str;
}

function sha12(s) {
  return createHash('sha256').update(s).digest('hex').slice(0, 12);
}
