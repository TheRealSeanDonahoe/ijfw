#!/usr/bin/env node
/**
 * IJFW Dashboard renderer.
 * Pure function: takes observations[] + sessionSummary -> ANSI string.
 * Zero deps. Node built-ins only.
 */

import { iconForType, colorForType, formatTime, formatDate, dateKey, truncateTitle, C } from './format.js';
import { computeEconomics } from './economics.js';

// Detect terminal width; wrap titles at (cols - 40), min 30.
const COLS = parseInt(process.env.COLUMNS || '80', 10);
const TITLE_MAX = Math.max(30, COLS - 40);

const HR = C.dim + ' ' + '-'.repeat(Math.min(COLS - 2, 60)) + C.reset;

function legend() {
  const entries = [
    ['session-request', '?', 'session-request'],
    ['bugfix',          'x', 'bugfix'],
    ['feature',         '+', 'feature'],
    ['refactor',        '~', 'refactor'],
    ['change',          '.', 'change'],
    ['discovery',       '?', 'discovery'],
    ['decision',        '!', 'decision'],
  ];
  const parts = entries.map(([type, icon, label]) =>
    `${colorForType(type)}${icon}${C.reset} ${C.dim}${label}${C.reset}`
  );
  return `     ${C.bold}Legend:${C.reset} ${parts.join(' | ')}`;
}

function economicsBlock(obs) {
  const { loadCost, workInvestment, savingsPct } = computeEconomics(obs);
  const lines = [];
  lines.push(`     ${C.bold}Context Economics${C.reset}`);
  lines.push(`       Loading: ${obs.length} observations (${loadCost.toLocaleString()} tokens to read)`);
  lines.push(`       Work investment: ${workInvestment.toLocaleString()} tokens spent on research, building, and decisions`);
  lines.push(`       Your savings: ${savingsPct}% reduction from reuse`);
  return lines.join('\n');
}

function renderObservations(obs) {
  if (!obs || obs.length === 0) return null;

  // Group by date, then by file within each date.
  const byDate = {};
  for (const o of obs) {
    const dk = dateKey(o.ts);
    if (!byDate[dk]) byDate[dk] = [];
    byDate[dk].push(o);
  }

  const lines = [];
  for (const dk of Object.keys(byDate).sort()) {
    const dayObs = byDate[dk];
    const dateLabel = formatDate(dayObs[0].ts);
    lines.push('');
    lines.push(`     ${C.bold}${dateLabel}${C.reset}`);

    // Group by file within the day.
    const byFile = {};
    for (const o of dayObs) {
      const f = (o.files && o.files[0]) ? o.files[0] : '';
      if (!byFile[f]) byFile[f] = [];
      byFile[f].push(o);
    }

    for (const [file, fileObs] of Object.entries(byFile)) {
      if (file) {
        lines.push(`     ${C.cyan}${file}${C.reset}`);
      }
      for (const o of fileObs) {
        const icon  = iconForType(o.type);
        const color = colorForType(o.type);
        const time  = formatTime(o.ts);
        const id    = o.id || '';
        const platform = o.platform || 'claude-code';
        const badge = `[${platform.replace('claude-code', 'claude').replace('-code', '')}]`;
        const title = truncateTitle(o.title || 'untitled', TITLE_MAX);
        const timeStr = time ? `${C.dim}${time}${C.reset}  ` : '';
        lines.push(
          `       ${C.dim}${badge} #${id}${C.reset}  ${timeStr}${color}${icon}${C.reset}  ${title}`
        );
      }
    }
  }

  return lines.join('\n');
}

function summaryBlock(sessionSummary) {
  if (!sessionSummary) return null;
  const lines = [];
  lines.push('');
  const fields = ['request', 'investigated', 'learned', 'completed', 'next_steps', 'notes'];
  const labels = {
    request:     'Requested',
    investigated:'Investigated',
    learned:     'Learned',
    completed:   'Completed',
    next_steps:  'Next Steps',
    notes:       'Notes',
  };
  for (const f of fields) {
    const val = sessionSummary[f] || (typeof sessionSummary === 'string' ? null : null);
    if (val) {
      lines.push(`     ${C.bold}${labels[f]}:${C.reset} ${val}`);
    }
  }
  return lines.length > 1 ? lines.join('\n') : null;
}

/**
 * Render the full dashboard ANSI string.
 *
 * @param {object[]} observations - recent observations from the ledger
 * @param {object|null} sessionSummary - most recent session summary record
 * @returns {string} ANSI-formatted dashboard
 */
export function render(observations, sessionSummary) {
  const obs = observations || [];

  if (obs.length === 0 && !sessionSummary) {
    return [
      '',
      HR,
      '',
      `     ${C.bold}Welcome to IJFW${C.reset}`,
      `     Observations will appear here as you work. Your context compounds over time.`,
      '',
      HR,
    ].join('\n');
  }

  const parts = [
    '',
    HR,
    '',
    legend(),
    '',
    `     ${C.bold}Context Index:${C.reset} ${C.dim}This semantic index (titles, types, files, tokens) is usually sufficient to understand past work.${C.reset}`,
    '',
    economicsBlock(obs),
  ];

  const obsSection = renderObservations(obs);
  if (obsSection) parts.push(obsSection);

  const sumSection = summaryBlock(sessionSummary);
  if (sumSection) parts.push(sumSection);

  parts.push('');
  parts.push(HR);

  return parts.join('\n');
}
