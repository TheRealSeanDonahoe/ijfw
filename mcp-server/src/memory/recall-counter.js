/**
 * Recall counter -- counts per-file recall events from observations.jsonl.
 * A "memory-recall" observation has {type:"memory-recall", file_path:<str>}.
 * Also accepts legacy observations where tool_name === "ijfw_memory_recall"
 * and files[0] is the memory file path.
 */

import { readFileSync, existsSync } from 'node:fs';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * @param {string} ledgerPath  path to observations.jsonl
 * @returns {{ counts: Map<string,number>, totalThisWeek: number, allTime: Map<string,number> }}
 */
export function buildRecallCounts(ledgerPath) {
  const counts      = new Map(); // all-time per file
  const weekCounts  = new Map(); // this-week per file
  let totalThisWeek = 0;

  if (!existsSync(ledgerPath)) return { counts, weekCounts, totalThisWeek };

  const cutoff = Date.now() - MS_PER_WEEK;
  let raw;
  try { raw = readFileSync(ledgerPath, 'utf8'); } catch { return { counts, weekCounts, totalThisWeek }; }

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let obs;
    try { obs = JSON.parse(line); } catch { continue; }

    // Detect memory-recall observation by type or tool_name
    const isRecall = obs.type === 'memory-recall' ||
                     (obs.tool_name === 'ijfw_memory_recall');
    if (!isRecall) continue;

    const fp = obs.file_path || (obs.files && obs.files[0]) || null;
    if (!fp) { totalThisWeek++; continue; } // count global recalls without file

    counts.set(fp, (counts.get(fp) || 0) + 1);

    const ts = obs.ts ? new Date(obs.ts).getTime() : 0;
    if (ts >= cutoff) {
      weekCounts.set(fp, (weekCounts.get(fp) || 0) + 1);
      totalThisWeek++;
    }
  }

  return { counts, weekCounts, totalThisWeek };
}

/**
 * Merge recall counts into file list.
 * @param {Array} files  from listMemoryFiles()
 * @param {Map<string,number>} counts
 * @param {Map<string,number>} weekCounts
 * @returns {Array} files with recall_count + recall_count_week added
 */
export function mergeRecallCounts(files, counts, weekCounts) {
  return files.map(f => ({
    ...f,
    recall_count:      counts.get(f.path) || 0,
    recall_count_week: weekCounts.get(f.path) || 0,
  }));
}

/**
 * Top N recalled files (all-time).
 */
export function topRecalled(files, n = 5) {
  return [...files]
    .filter(f => f.recall_count > 0)
    .sort((a, b) => b.recall_count - a.recall_count)
    .slice(0, n)
    .map(f => ({ path: f.path, relpath: f.relpath, title: f.title, count: f.recall_count }));
}
