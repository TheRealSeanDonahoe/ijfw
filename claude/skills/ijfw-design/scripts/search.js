#!/usr/bin/env node
// ijfw-design/scripts/search.js
// Zero runtime deps. Node.js built-ins only (ESM).
// Usage:
//   node search.js "<query>" --design-system [-p "Project"] [-f markdown|box]
//   node search.js "<keyword>" --domain <styles|palettes|typography|ux|charts|patterns> [-n N]
//   node search.js "<query>" --design-system --explain
//
// Fuzzy scoring: category match 3x + keyword match 1x + source-standard match 2x

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const DOMAIN_MAP = {
  styles:     'styles.csv',
  style:      'styles.csv',
  palettes:   'palettes.csv',
  palette:    'palettes.csv',
  color:      'palettes.csv',
  colors:     'palettes.csv',
  typography: 'typography.csv',
  typo:       'typography.csv',
  fonts:      'typography.csv',
  font:       'typography.csv',
  ux:         'ux-guidelines.csv',
  guidelines: 'ux-guidelines.csv',
  charts:     'charts.csv',
  chart:      'charts.csv',
  patterns:   'patterns.csv',
  pattern:    'patterns.csv',
  reasoning:  'reasoning.csv',
};

// ---------------------------------------------------------------------------
// CSV parser (handles quoted fields with commas)
// ---------------------------------------------------------------------------
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length === 0) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h.trim()] = (cols[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === ',' && !inQuote) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function loadCSV(filename) {
  const fp = join(DATA_DIR, filename);
  if (!existsSync(fp)) return [];
  return parseCSV(readFileSync(fp, 'utf8'));
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------
const STOPWORDS = new Set(['a','an','the','is','in','for','of','and','or','to',
  'with','on','as','its','at','by','from','not','no','be','are','was','use',
  'do','does','should','must','will','can','have','has','when','if','that',
  'this','it','all','any','some','each','per','via','vs','than','then','but']);

function tokenize(str) {
  return String(str).toLowerCase().split(/[^a-z0-9]+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

// ---------------------------------------------------------------------------
// Scorer: 3x category, 1x keyword, 2x source
// ---------------------------------------------------------------------------
function scoreRow(row, queryTokens) {
  if (queryTokens.length === 0) return 0;
  const rowText = Object.values(row).join(' ').toLowerCase();
  const category = (row.category || row.product_type || row.priority || '').toLowerCase();
  const source = (row.source || '').toLowerCase();
  const keywords = (row.keywords || row.rule || row.name || '').toLowerCase();

  let score = 0;
  for (const t of queryTokens) {
    if (category.includes(t))  score += 3;
    if (keywords.includes(t))  score += 1;
    if (source.includes(t))    score += 2;
    if (rowText.includes(t))   score += 0.5;
  }
  return score;
}

function search(rows, query, topN = 10) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return rows.slice(0, topN);
  return rows
    .map(row => ({ row, score: scoreRow(row, tokens) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(r => r.row);
}

// ---------------------------------------------------------------------------
// Design system recommendation builder
// ---------------------------------------------------------------------------
function buildRecommendation(query, project, explain) {
  const reasoning = loadCSV('reasoning.csv');
  const styles    = loadCSV('styles.csv');
  const palettes  = loadCSV('palettes.csv');
  const typo      = loadCSV('typography.csv');
  const ux        = loadCSV('ux-guidelines.csv');
  const patterns  = loadCSV('patterns.csv');
  const charts    = loadCSV('charts.csv');

  const ruleMatch = search(reasoning, query, 3);
  const rule = ruleMatch[0] || null;

  const styleName  = rule ? rule.style_match.split(' ')[0] : null;
  const palName    = rule ? rule.palette_match.split(' ')[0] : null;
  const typoName   = rule ? rule.typography_match.split(' ')[0] : null;
  const patternKey = rule ? rule.pattern_match : null;

  const matchedStyle   = styleName
    ? styles.find(r => r.id === styleName || r.name.toLowerCase().includes(styleName.toLowerCase())) || search(styles, query, 1)[0]
    : search(styles, query, 1)[0];
  const matchedPalette = palName
    ? palettes.find(r => r.name.toLowerCase().includes(palName.replace(/-/g,' ').toLowerCase())) || search(palettes, query, 1)[0]
    : search(palettes, query, 1)[0];
  const matchedTypo    = typoName
    ? typo.find(r => r.name.toLowerCase().includes(typoName.replace(/-/g,' ').toLowerCase())) || search(typo, query, 1)[0]
    : search(typo, query, 1)[0];
  const matchedPattern = patternKey
    ? patterns.find(r => r.product_type.toLowerCase().includes(patternKey.replace(/-/g,' ').toLowerCase().split(' ').slice(0,2).join(' '))) || search(patterns, query, 1)[0]
    : search(patterns, query, 1)[0];

  const topUX    = search(ux, query, 5);
  const topChart = search(charts, query, 3);

  const lines = [];
  const header = project ? `IJFW Design Recommendation -- ${project}` : 'IJFW Design Recommendation';
  lines.push(header);
  lines.push('Query: ' + query);
  lines.push('');

  if (matchedPattern) {
    lines.push('PATTERN');
    lines.push('  ' + matchedPattern.product_type + ': ' + matchedPattern.recommended_pattern);
    lines.push('  Style priority: ' + matchedPattern.style_priority);
    lines.push('');
  }

  if (matchedStyle) {
    lines.push('STYLE');
    lines.push('  ' + matchedStyle.name + ' (' + matchedStyle.category + ')');
    lines.push('  Best for: ' + (matchedStyle.best_for || '').split(';')[0].trim());
    lines.push('  WCAG: ' + matchedStyle.wcag_aa + '  Source: ' + matchedStyle.source);
    lines.push('');
  }

  if (matchedPalette) {
    lines.push('PALETTE');
    lines.push('  ' + matchedPalette.name + ' [' + matchedPalette.product_type + ']');
    lines.push('  Primary: ' + matchedPalette.primary + '  On primary: ' + matchedPalette.primary_on);
    lines.push('  Accent: ' + matchedPalette.accent + '  WCAG: ' + matchedPalette.wcag_level);
    lines.push('  Source: ' + matchedPalette.source);
    lines.push('');
  }

  if (matchedTypo) {
    lines.push('TYPOGRAPHY');
    lines.push('  ' + matchedTypo.name + ' (' + matchedTypo.category + ')');
    lines.push('  Heading: ' + matchedTypo.heading_stack);
    lines.push('  Body: ' + matchedTypo.body_stack);
    lines.push('  Min size: ' + matchedTypo.wcag_min_size + '  Line-height: ' + matchedTypo.line_height);
    lines.push('  Source: ' + matchedTypo.source);
    lines.push('');
  }

  if (topUX.length > 0) {
    lines.push('UX GUIDELINES (top ' + topUX.length + ')');
    topUX.forEach(g => {
      lines.push('  [' + g.severity + '] ' + g.rule + ' -- ' + g.do.split(';')[0].trim());
      lines.push('    Source: ' + g.source);
    });
    lines.push('');
  }

  if (topChart.length > 0) {
    lines.push('CHARTS');
    topChart.forEach(c => {
      lines.push('  ' + c.name + ': ' + c.best_for.split(';')[0].trim());
      lines.push('    A11y: ' + c.a11y_grade + ' -- ' + (c.a11y_notes || '').substring(0, 80).trim());
    });
    lines.push('');
  }

  const antiPattern = matchedStyle ? matchedStyle.avoid_for : null;
  const antiUX = matchedPattern ? matchedPattern.anti_patterns : null;
  if (antiPattern || antiUX) {
    lines.push('ANTI-PATTERNS');
    if (antiPattern) lines.push('  Style: avoid for ' + antiPattern.split(';')[0].trim());
    if (antiUX)      lines.push('  UX: ' + antiUX.split(';')[0].trim());
    lines.push('');
  }

  lines.push('IJFW INVARIANTS (always apply)');
  lines.push('  Zero runtime deps -- system font stacks first; webfonts self-hosted only');
  lines.push('  Positive framing -- no "error" headers; no "not found"; no "broken"');
  lines.push('  Platform segregation -- Claude/Codex/Gemini output areas color-coded');
  lines.push('  WCAG AA minimum -- 4.5:1 contrast on all text; 44px touch targets');
  lines.push('  ASCII-only source -- no unicode in code or config files');
  lines.push('');
  lines.push('Sources: WCAG 2.2 / Apple HIG 2025 / Material Design 3 / W3C Standards');

  if (explain && rule) {
    lines.push('');
    lines.push('REASONING TRACE');
    lines.push('  Rule matched: ' + rule.product_keywords.trim());
    lines.push('  Confidence: ' + rule.confidence);
    lines.push('  Rationale: ' + rule.rationale);
    lines.push('  Source: ' + rule.source);
    ruleMatch.slice(1).forEach(r => {
      lines.push('  Alt rule: ' + r.product_keywords.trim() + ' [' + r.confidence + ']');
    });
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Domain search output
// ---------------------------------------------------------------------------
function domainSearch(domain, query, n) {
  const file = DOMAIN_MAP[domain.toLowerCase()];
  if (!file) {
    const valid = [...new Set(Object.values(DOMAIN_MAP).map(f => f.replace('.csv','')))].join(', ');
    return `Domain "${domain}" not found. Available: ${valid}`;
  }

  const rows = loadCSV(file);
  if (rows.length === 0) return `No data in domain "${domain}".`;

  const results = query ? search(rows, query, n) : rows.slice(0, n);
  if (results.length === 0) {
    const closest = rows.slice(0, 3).map(r => r.name || r.rule || r.product_type || r.id).join(', ');
    return `Nothing matched "${query}" in ${domain}. Closest options: ${closest}. Try broader terms or omit query.`;
  }

  const lines = [`Domain: ${domain}  Query: "${query || '(all)'}"  Results: ${results.length}`, ''];
  results.forEach((row, i) => {
    const name = row.name || row.rule || row.product_type || row.id;
    const source = row.source || '';
    lines.push(`${i + 1}. ${name}`);
    const desc = row.description || row.do || row.best_for || row.mood || row.keywords || '';
    if (desc) lines.push(`   ${desc.substring(0, 100).trim()}`);
    if (source) lines.push(`   Source: ${source}`);
    lines.push('');
  });
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Box formatter
// ---------------------------------------------------------------------------
function boxFormat(text, width) {
  const w = width || 72;
  const border = '+' + '-'.repeat(w - 2) + '+';
  const lines = [border];
  text.split('\n').forEach(line => {
    const padded = '| ' + line.padEnd(w - 4, ' ') + ' |';
    lines.push(padded);
  });
  lines.push(border);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.log('Usage: node search.js "<query>" --design-system [-p "Project"] [-f markdown|box] [--explain]');
  console.log('       node search.js "<keyword>" --domain <styles|palettes|typography|ux|charts|patterns> [-n N]');
  process.exit(0);
}

const queryArg = argv.find(a => !a.startsWith('-')) || '';

let designSystem = false;
let domain = null;
let project = null;
let format = 'markdown';
let n = 10;
let explain = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--design-system') designSystem = true;
  else if (a === '--explain') explain = true;
  else if ((a === '--domain' || a === '-d') && argv[i + 1]) { domain = argv[++i]; }
  else if ((a === '-p' || a === '--project') && argv[i + 1]) { project = argv[++i]; }
  else if ((a === '-f' || a === '--format') && argv[i + 1]) { format = argv[++i]; }
  else if ((a === '-n' || a === '--max') && argv[i + 1]) { n = parseInt(argv[++i], 10) || 10; }
}

let output;
if (designSystem) {
  if (!queryArg) {
    process.stderr.write('Error: --design-system requires a query.\n');
    process.exit(1);
  }
  output = buildRecommendation(queryArg, project, explain);
  if (format === 'box') output = boxFormat(output);
} else if (domain) {
  output = domainSearch(domain, queryArg, n);
  if (format === 'box') output = boxFormat(output);
} else {
  const allResults = ['styles','palettes','ux','charts','patterns'].flatMap(d => {
    const file = DOMAIN_MAP[d];
    const rows = loadCSV(file);
    return search(rows, queryArg, 3).map(r => ({ domain: d, row: r }));
  });
  if (allResults.length === 0) {
    output = `Nothing matched "${queryArg}". Try --domain styles or --design-system for a full recommendation.`;
  } else {
    const lines = [`Search: "${queryArg}"  (use --domain <name> or --design-system for depth)`, ''];
    allResults.forEach(({ domain: d, row }) => {
      const name = row.name || row.rule || row.product_type;
      lines.push(`[${d}] ${name}`);
    });
    output = lines.join('\n');
  }
}

console.log(output);
