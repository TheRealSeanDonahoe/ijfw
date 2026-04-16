#!/usr/bin/env node
/**
 * IJFW Dashboard -- formatting helpers.
 * Pure functions. No I/O, no deps.
 */

// ANSI codes -- only applied when NO_COLOR is unset.
const USE_COLOR = !process.env.NO_COLOR;

const C = {
  reset:   USE_COLOR ? '\x1b[0m'  : '',
  bold:    USE_COLOR ? '\x1b[1m'  : '',
  dim:     USE_COLOR ? '\x1b[2m'  : '',
  red:     USE_COLOR ? '\x1b[31m' : '',
  green:   USE_COLOR ? '\x1b[32m' : '',
  yellow:  USE_COLOR ? '\x1b[33m' : '',
  blue:    USE_COLOR ? '\x1b[34m' : '',
  magenta: USE_COLOR ? '\x1b[35m' : '',
  cyan:    USE_COLOR ? '\x1b[36m' : '',
};

// Type -> ASCII icon (terminal-safe)
const ICON_MAP = {
  'session-request': '?',
  'bugfix':          'x',
  'feature':         '+',
  'refactor':        '~',
  'change':          '.',
  'discovery':       '?',
  'decision':        '!',
};

// Type -> ANSI color
const COLOR_MAP = {
  'session-request': C.dim,
  'bugfix':          C.red,
  'feature':         C.magenta,
  'refactor':        C.cyan,
  'change':          C.green,
  'discovery':       C.blue,
  'decision':        C.yellow,
};

export function iconForType(type) {
  return ICON_MAP[type] || '.';
}

export function colorForType(type) {
  return COLOR_MAP[type] || '';
}

/**
 * Format an ISO timestamp to "h:mm AM/PM".
 * e.g. "2026-04-16T09:58:22.000Z" -> "9:58 AM"
 */
export function formatTime(isoStr) {
  try {
    const d = new Date(isoStr);
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  } catch {
    return '';
  }
}

/**
 * Format an ISO timestamp to "MMM D, YYYY".
 * e.g. "2026-04-16T..." -> "Apr 16, 2026"
 */
export function formatDate(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Extract YYYY-MM-DD from ISO timestamp for grouping.
 */
export function dateKey(isoStr) {
  return (isoStr || '').slice(0, 10);
}

/**
 * Truncate a title to maxLen chars, appending '...' if cut.
 */
export function truncateTitle(title, maxLen) {
  if (!title) return '';
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen - 3) + '...';
}

export { C };
