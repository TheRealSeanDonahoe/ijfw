#!/usr/bin/env node
/**
 * IJFW transcript parser.
 * Processes ~/.claude/projects/*\/*.jsonl and writes ~/.ijfw/transcript-summary.json.
 *
 * Usage:
 *   node parse-transcripts.js              # incremental (default)
 *   node parse-transcripts.js --incremental
 *   node parse-transcripts.js --force      # re-parse everything
 *   node parse-transcripts.js --stats      # print summary, no parse
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, basename } from 'path';

const HOME = homedir();
const CLAUDE_PROJECTS = join(HOME, '.claude', 'projects');
const IJFW_GLOBAL = join(HOME, '.ijfw');
const SUMMARY_FILE = join(IJFW_GLOBAL, 'transcript-summary.json');

// --- Pricing table (per million tokens) ---
const PRICING = {
  opus:   { in: 15,   out: 75,   cache_read: 1.50,  cache_creation: 18.75 },
  sonnet: { in: 3,    out: 15,   cache_read: 0.30,  cache_creation: 3.75  },
  haiku:  { in: 0.80, out: 4,    cache_read: 0.08,  cache_creation: 1.00  },
};

function getModelTier(model) {
  if (!model) return null;
  const m = model.toLowerCase();
  if (m.includes('opus'))   return 'opus';
  if (m.includes('sonnet')) return 'sonnet';
  if (m.includes('haiku'))  return 'haiku';
  return null;
}

function getModelFamily(model) {
  if (!model) return 'unknown';
  // Normalize: strip date suffixes, keep base name
  // e.g. "claude-haiku-4-5-20251001" -> "claude-haiku-4-5"
  return model.replace(/-\d{8}$/, '');
}

function computeCost(tier, usage) {
  if (!tier || !PRICING[tier]) return 0;
  const p = PRICING[tier];
  const M = 1_000_000;
  return (
    (usage.input_tokens || 0) / M * p.in +
    (usage.output_tokens || 0) / M * p.out +
    (usage.cache_read_input_tokens || 0) / M * p.cache_read +
    (usage.cache_creation_input_tokens || 0) / M * p.cache_creation
  );
}

// --- Parse a single JSONL file ---
function parseTranscript(filePath) {
  const result = {
    file: basename(filePath),
    startTime: null,
    endTime: null,
    durationMinutes: 0,
    model: null,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    cost: 0,
    toolUsage: {},
    turnCount: 0,
  };

  let raw;
  try { raw = readFileSync(filePath, 'utf8'); }
  catch (err) {
    process.stderr.write(`[parse-transcripts] Cannot read ${filePath}: ${err.message}\n`);
    return null;
  }

  const lines = raw.split('\n');
  let malformed = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    let obj;
    try { obj = JSON.parse(line); }
    catch { malformed++; continue; }

    // Track timestamps
    if (obj.timestamp) {
      if (!result.startTime || obj.timestamp < result.startTime) result.startTime = obj.timestamp;
      if (!result.endTime || obj.timestamp > result.endTime) result.endTime = obj.timestamp;
    }

    const msg = obj.message;
    if (!msg) continue;

    // Count human turns
    if (msg.role === 'user') result.turnCount++;

    // Assistant response with usage
    if (msg.usage) {
      result.inputTokens += msg.usage.input_tokens || 0;
      result.outputTokens += msg.usage.output_tokens || 0;
      result.cacheReadTokens += msg.usage.cache_read_input_tokens || 0;
      result.cacheCreationTokens += msg.usage.cache_creation_input_tokens || 0;

      if (msg.model && !result.model) result.model = msg.model;
    }

    // Tool use events in content array
    if (Array.isArray(msg.content)) {
      for (const item of msg.content) {
        if (item.type === 'tool_use' && item.name) {
          result.toolUsage[item.name] = (result.toolUsage[item.name] || 0) + 1;
        }
      }
    }
  }

  // Compute cost
  const tier = getModelTier(result.model);
  result.cost = computeCost(tier, {
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    cache_read_input_tokens: result.cacheReadTokens,
    cache_creation_input_tokens: result.cacheCreationTokens,
  });

  if (malformed > 0) {
    process.stderr.write(`[parse-transcripts] ${filePath}: ${malformed}/${lines.length} lines malformed\n`);
  }

  // Duration
  if (result.startTime && result.endTime) {
    const ms = new Date(result.endTime) - new Date(result.startTime);
    result.durationMinutes = Math.round(ms / 60000 * 10) / 10;
  }

  return result;
}

// --- Collect all JSONL files across all projects (recursive) ---
// Claude Code stores transcripts at two levels:
//   depth 2: ~/.claude/projects/<slug>/session.jsonl
//   depth 3: ~/.claude/projects/<slug>/session-uuid/agent.jsonl
function collectFiles() {
  if (!existsSync(CLAUDE_PROJECTS)) return [];
  const files = [];
  let dirs;
  try { dirs = readdirSync(CLAUDE_PROJECTS); }
  catch (err) {
    process.stderr.write(`[parse-transcripts] Cannot read ${CLAUDE_PROJECTS}: ${err.message}\n`);
    return [];
  }
  for (const dir of dirs) {
    const dirPath = join(CLAUDE_PROJECTS, dir);
    let stat;
    try { stat = statSync(dirPath); }
    catch (err) {
      process.stderr.write(`[parse-transcripts] Cannot read ${dirPath}: ${err.message}\n`);
      continue;
    }
    if (!stat.isDirectory()) continue;
    let entries;
    try { entries = readdirSync(dirPath); }
    catch (err) {
      process.stderr.write(`[parse-transcripts] Cannot read ${dirPath}: ${err.message}\n`);
      continue;
    }
    for (const f of entries) {
      const fp = join(dirPath, f);
      let fstat;
      try { fstat = statSync(fp); }
      catch (err) {
        process.stderr.write(`[parse-transcripts] Cannot read ${fp}: ${err.message}\n`);
        continue;
      }
      // Direct JSONL files (depth 2)
      if (f.endsWith('.jsonl') && fstat.isFile()) {
        files.push({ path: fp, projectDir: dir, mtime: fstat.mtimeMs });
      }
      // Session UUID directories: <uuid>/subagents/*.jsonl
      if (fstat.isDirectory()) {
        const subagentsDir = join(fp, 'subagents');
        if (existsSync(subagentsDir)) {
          let subEntries;
          try { subEntries = readdirSync(subagentsDir); }
          catch (err) {
            process.stderr.write(`[parse-transcripts] Cannot read ${subagentsDir}: ${err.message}\n`);
            continue;
          }
          for (const sf of subEntries) {
            if (!sf.endsWith('.jsonl')) continue;
            const sfp = join(subagentsDir, sf);
            let sfstat;
            try { sfstat = statSync(sfp); }
            catch (err) {
              process.stderr.write(`[parse-transcripts] Cannot read ${sfp}: ${err.message}\n`);
              continue;
            }
            if (sfstat.isFile()) {
              files.push({ path: sfp, projectDir: dir, mtime: sfstat.mtimeMs });
            }
          }
        }
      }
    }
  }
  return files;
}

// --- Derive a human-readable project name from the dir slug ---
// ~/.claude/projects/-Users-seandonahoe-dev-ijfw  ->  ijfw
function projectName(dirSlug) {
  const parts = dirSlug.replace(/^-/, '').split('-');
  // Last meaningful segment (skip username/home parts)
  // Heuristic: find index of 'dev' or 'Desktop', take the rest
  const devIdx = parts.indexOf('dev');
  if (devIdx !== -1 && devIdx < parts.length - 1) {
    return parts.slice(devIdx + 1).join('-');
  }
  return parts[parts.length - 1] || dirSlug;
}

// --- Load existing summary ---
function loadSummary() {
  if (!existsSync(SUMMARY_FILE)) return null;
  try { return JSON.parse(readFileSync(SUMMARY_FILE, 'utf8')); }
  catch (err) {
    process.stderr.write(`[parse-transcripts] Cannot parse ${SUMMARY_FILE}: ${err.message}\n`);
    return null;
  }
}

// --- Build aggregate from scratch from all project sessions ---
function buildAggregate(projects) {
  const agg = {
    totalCost: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheRead: 0,
    totalSessions: 0,
    totalTurns: 0,
    modelBreakdown: {},
    toolBreakdown: {},
    hourlyActivity: new Array(24).fill(0),
    dailyActivity: {},
    peakHour: 0,
    activeDays: 0,
    currentStreak: 0,
  };

  for (const [, proj] of Object.entries(projects)) {
    agg.totalCost += proj.totalCost;
    agg.totalInputTokens += proj.totalInputTokens;
    agg.totalOutputTokens += proj.totalOutputTokens;
    agg.totalCacheRead += proj.totalCacheRead;
    agg.totalSessions += proj.transcripts;

    for (const sess of proj.sessions) {
      agg.totalTurns += sess.turnCount || 0;

      // Model breakdown
      const family = getModelFamily(sess.model || '');
      if (!agg.modelBreakdown[family]) {
        agg.modelBreakdown[family] = { sessions: 0, cost: 0, tokens: 0 };
      }
      agg.modelBreakdown[family].sessions++;
      agg.modelBreakdown[family].cost += sess.cost || 0;
      agg.modelBreakdown[family].tokens += (sess.inputTokens || 0) + (sess.outputTokens || 0);

      // Tool breakdown
      for (const [tool, count] of Object.entries(sess.toolUsage || {})) {
        agg.toolBreakdown[tool] = (agg.toolBreakdown[tool] || 0) + count;
      }

      // Hourly + daily activity
      if (sess.startTime) {
        try {
          const d = new Date(sess.startTime);
          const hour = d.getUTCHours();
          agg.hourlyActivity[hour]++;
          const day = d.toISOString().slice(0, 10);
          if (!agg.dailyActivity[day]) agg.dailyActivity[day] = { sessions: 0, cost: 0 };
          agg.dailyActivity[day].sessions++;
          agg.dailyActivity[day].cost += sess.cost || 0;
        } catch (err) {
          process.stderr.write(`[parse-transcripts] Date parse error for ${sess.file}: ${err.message}\n`);
        }
      }
    }
  }

  // Peak hour
  let peak = 0;
  for (let h = 0; h < 24; h++) {
    if (agg.hourlyActivity[h] > agg.hourlyActivity[peak]) peak = h;
  }
  agg.peakHour = peak;

  // Active days + streak
  const days = Object.keys(agg.dailyActivity).sort();
  agg.activeDays = days.length;

  // Current streak: consecutive days ending today-or-yesterday
  if (days.length) {
    const today = new Date().toISOString().slice(0, 10);
    let streak = 0;
    let cursor = new Date(today);
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (agg.dailyActivity[key]) {
        streak++;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    }
    agg.currentStreak = streak;
  }

  return agg;
}

// --- Main ---

const args = process.argv.slice(2);
const forceAll = args.includes('--force');
const statsOnly = args.includes('--stats');

if (statsOnly) {
  if (!existsSync(SUMMARY_FILE)) {
    console.log('[parse-transcripts] No summary found. Run without --stats first.');
    process.exit(0);
  }
  const s = loadSummary();
  console.log(`projects:  ${Object.keys(s.projects).length}`);
  console.log(`sessions:  ${s.aggregate.totalSessions}`);
  console.log(`cost:      $${s.aggregate.totalCost.toFixed(4)}`);
  console.log(`turns:     ${s.aggregate.totalTurns}`);
  console.log(`generated: ${s.generated}`);
  process.exit(0);
}

try {

const existing = loadSummary();
const lastMtime = (!forceAll && existing?.lastParsedMtime) ? existing.lastParsedMtime : 0;

const allFiles = collectFiles();
const toProcess = forceAll
  ? allFiles
  : allFiles.filter(f => f.mtime > lastMtime);

if (toProcess.length === 0 && existing) {
  console.log(`[parse-transcripts] Up to date (${allFiles.length} transcripts, no changes).`);
  process.exit(0);
}

console.log(`[parse-transcripts] Parsing ${toProcess.length} file(s) (${allFiles.length} total)...`);
const t0 = Date.now();

// Start from existing projects if incremental, else fresh
const projects = (forceAll || !existing) ? {} : (existing.projects ? { ...existing.projects } : {});

// Clear sessions for projects that will be reparsed (on force, clear all)
if (forceAll) {
  for (const k of Object.keys(projects)) delete projects[k];
} else {
  // Remove existing session entries for files we're about to reparse
  const reparsePaths = new Set(toProcess.map(f => f.path));
  for (const proj of Object.values(projects)) {
    proj.sessions = proj.sessions.filter(s => {
      // Match by filename — find the original file path
      const match = toProcess.find(f => basename(f.path) === s.file);
      return !match; // keep sessions not being reparsed
    });
  }
}

let newMaxMtime = lastMtime;

for (const { path, projectDir, mtime } of toProcess) {
  const name = projectName(projectDir);
  if (!projects[name]) {
    projects[name] = {
      transcripts: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheRead: 0,
      totalCost: 0,
      sessions: [],
    };
  }

  const sess = parseTranscript(path);
  if (sess) projects[name].sessions.push(sess);

  if (mtime > newMaxMtime) newMaxMtime = mtime;
}

// Recompute project-level totals from all sessions (handles incremental correctly)
for (const proj of Object.values(projects)) {
  proj.transcripts = proj.sessions.length;
  proj.totalInputTokens = proj.sessions.reduce((s, r) => s + (r.inputTokens || 0), 0);
  proj.totalOutputTokens = proj.sessions.reduce((s, r) => s + (r.outputTokens || 0), 0);
  proj.totalCacheRead = proj.sessions.reduce((s, r) => s + (r.cacheReadTokens || 0), 0);
  proj.totalCost = proj.sessions.reduce((s, r) => s + (r.cost || 0), 0);
}

const aggregate = buildAggregate(projects);

const summary = {
  generated: new Date().toISOString(),
  lastParsedMtime: newMaxMtime || lastMtime,
  totalTranscripts: allFiles.length,
  projects,
  aggregate,
};

try {
  mkdirSync(IJFW_GLOBAL, { recursive: true });
  writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2));
} catch (err) {
  console.error(`[parse-transcripts] Failed to write summary: ${err.message}`);
  process.exit(1);
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`[parse-transcripts] Done in ${elapsed}s. Projects: ${Object.keys(projects).length}, sessions: ${aggregate.totalSessions}, cost: $${aggregate.totalCost.toFixed(4)}`);

} catch (err) {
  console.error(`[parse-transcripts] Fatal error: ${err.stack}`);
  process.exit(1);
}
