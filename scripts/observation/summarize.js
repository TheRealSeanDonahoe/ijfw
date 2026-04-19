#!/usr/bin/env node
/**
 * IJFW SessionEnd heuristic summarizer.
 * Reads observations for a session, emits prose summary block.
 * No LLM, no deps. Groups by type, picks top files.
 *
 * Threshold: only runs when >= 2 observations exist for the session.
 */

import { getSession } from './ledger.js';

const TYPE_LABELS = {
  'bugfix':          'Fixed',
  'feature':         'Built',
  'refactor':        'Refactored',
  'change':          'Changed',
  'discovery':       'Investigated',
  'decision':        'Decided',
  'session-request': 'Requested',
};

/**
 * Generate a prose summary block for a session.
 *
 * @param {string} sessionId
 * @param {object[]} [observations] - optional pre-loaded observations
 * @returns {string|null} markdown summary or null if < threshold
 */
export function summarize(sessionId, observations) {
  const obs = observations || getSession(sessionId);
  if (!obs || obs.length < 2) return null;

  const groups = {};
  const files = new Set();

  for (const o of obs) {
    const type = o.type || 'change';
    if (!groups[type]) groups[type] = [];
    groups[type].push(o.title || 'untitled');
    for (const f of (o.files || [])) files.add(f);
  }

  const lines = [];
  lines.push(`## Session summary (${obs.length} observations)`);
  lines.push('');

  // Completed / built / fixed
  const doneTypes = ['bugfix', 'feature', 'refactor', 'change'];
  const doneItems = [];
  for (const t of doneTypes) {
    if (groups[t]) {
      for (const title of groups[t]) doneItems.push(`- ${TYPE_LABELS[t]}: ${title}`);
    }
  }
  if (doneItems.length > 0) {
    lines.push('**Completed**');
    lines.push(...doneItems);
    lines.push('');
  }

  // Investigated
  if (groups['discovery'] && groups['discovery'].length > 0) {
    lines.push('**Investigated**');
    for (const title of groups['discovery']) lines.push(`- ${title}`);
    lines.push('');
  }

  // Decided
  if (groups['decision'] && groups['decision'].length > 0) {
    lines.push('**Decided**');
    for (const title of groups['decision']) lines.push(`- ${title}`);
    lines.push('');
  }

  // Files touched
  if (files.size > 0) {
    const fileList = [...files].slice(0, 10);
    lines.push('**Files**');
    for (const f of fileList) lines.push(`- ${f}`);
    if (files.size > 10) lines.push(`- ... and ${files.size - 10} more`);
    lines.push('');
  }

  return lines.join('\n');
}
