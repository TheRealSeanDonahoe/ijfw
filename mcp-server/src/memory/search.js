/**
 * Memory search -- linear regex over markdown files.
 * FTS5 swap-in deferred to Phase 3 (project_fts5_deferred.md).
 * Returns ranked results: more matches in title > body.
 */

import { readFileSync, existsSync } from 'node:fs';

const MAX_RESULTS  = 50;
const SNIPPET_HALF = 60; // chars either side of first match for snippet

function snippet(body, pattern) {
  const idx = body.search(pattern);
  if (idx === -1) return body.slice(0, 120).trim();
  const start = Math.max(0, idx - SNIPPET_HALF);
  const end   = Math.min(body.length, idx + SNIPPET_HALF + pattern.source.length);
  let s = body.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0)             s = '...' + s;
  if (end < body.length)     s = s + '...';
  return s;
}

/**
 * Search memory files for query string.
 * @param {string} q
 * @param {Array<{path,relpath,title,preview}>} files  -- from listMemoryFiles()
 * @param {number} limit
 * @returns {Array<{path,relpath,title,snippet,score}>}
 */
export function searchMemory(q, files, limit = MAX_RESULTS) {
  if (!q || !q.trim() || !files.length) return [];

  // Build case-insensitive pattern; escape regex specials
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let pattern;
  try {
    pattern = new RegExp(escaped, 'gi');
  } catch {
    return [];
  }

  const results = [];

  for (const f of files) {
    let body = '';
    try {
      body = existsSync(f.path) ? readFileSync(f.path, 'utf8') : '';
    } catch { /* skip */ }

    const titleMatches = (f.title.match(pattern) || []).length;
    const bodyMatches  = (body.match(pattern) || []).length;
    const total        = titleMatches + bodyMatches;
    if (total === 0) continue;

    // Reset lastIndex after global match
    pattern.lastIndex = 0;

    // Score: title hits worth 3x, body hits 1x; normalised by total matches
    const score = titleMatches * 3 + bodyMatches;

    results.push({
      path:     f.path,
      relpath:  f.relpath,
      title:    f.title,
      snippet:  snippet(body, pattern),
      score,
    });

    pattern.lastIndex = 0;
    if (results.length >= limit * 2) break; // cap scan early; trim after sort
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
