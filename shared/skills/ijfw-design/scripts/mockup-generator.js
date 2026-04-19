#!/usr/bin/env node
// ijfw-design/scripts/mockup-generator.js
// Generates self-contained HTML design system mockups. Zero external deps.
// All CSS/JS inline. Works from file://

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = join(__dirname, '..', 'components');

// ---------------------------------------------------------------------------
// CSS custom properties from a palette row
// ---------------------------------------------------------------------------
export function paletteToVars(p) {
  if (!p) return '';
  return `
    --color-primary: ${p.primary || '#2563EB'};
    --color-primary-on: ${p.primary_on || '#FFFFFF'};
    --color-secondary: ${p.secondary || '#3B82F6'};
    --color-secondary-on: ${p.secondary_on || '#FFFFFF'};
    --color-accent: ${p.accent || '#EA580C'};
    --color-accent-on: ${p.accent_on || '#FFFFFF'};
    --color-bg: ${p.background || '#F8FAFC'};
    --color-fg: ${p.foreground || '#1E293B'};
    --color-card: ${p.card || '#FFFFFF'};
    --color-muted: ${p.muted || '#E2E8F0'};
    --color-border: ${p.border || '#CBD5E1'};
    --color-destructive: ${p.destructive || '#DC2626'};
    --color-destructive-on: #FFFFFF;`.trim();
}

// ---------------------------------------------------------------------------
// Font stacks from a typography row
// ---------------------------------------------------------------------------
export function typoToVars(t) {
  if (!t) return '';
  return `
    --font-heading: ${t.heading_stack || "system-ui, -apple-system, sans-serif"};
    --font-body: ${t.body_stack || "system-ui, -apple-system, sans-serif"};
    --font-mono: ${t.mono_stack || "'SFMono-Regular', Consolas, monospace"};
    --font-size-base: ${t.wcag_min_size || '16px'};
    --line-height-base: ${t.line_height || '1.5'};`.trim();
}

// ---------------------------------------------------------------------------
// Base CSS shared across all generated pages
// ---------------------------------------------------------------------------
function baseCSS(paletteVars, typoVars) {
  return `
:root {
  ${paletteVars}
  ${typoVars}
  --radius: 8px;
  --radius-sm: 4px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.12);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.15);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.18);
  --transition: 200ms ease;
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0F172A;
    --color-fg: #F1F5F9;
    --color-card: #1E293B;
    --color-muted: #334155;
    --color-border: #475569;
  }
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: var(--font-size-base); }
body {
  font-family: var(--font-body);
  background: var(--color-bg);
  color: var(--color-fg);
  line-height: var(--line-height-base);
  min-height: 100vh;
}
h1,h2,h3,h4,h5,h6 { font-family: var(--font-heading); line-height: 1.2; }
code, pre, .mono { font-family: var(--font-mono); }
a { color: var(--color-primary); }
a:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.sr-only { position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0; }
`.trim();
}

// ---------------------------------------------------------------------------
// Palette swatch section HTML
// ---------------------------------------------------------------------------
function paletteSectionHTML(palette) {
  if (!palette) return '';
  const tokens = [
    { name: 'Primary',     bg: palette.primary,     fg: palette.primary_on },
    { name: 'Secondary',   bg: palette.secondary,   fg: palette.secondary_on },
    { name: 'Accent',      bg: palette.accent,      fg: palette.accent_on },
    { name: 'Background',  bg: palette.background,  fg: palette.foreground },
    { name: 'Card',        bg: palette.card,        fg: palette.foreground },
    { name: 'Muted',       bg: palette.muted,       fg: palette.foreground },
    { name: 'Border',      bg: palette.border,      fg: palette.foreground },
    { name: 'Destructive', bg: palette.destructive, fg: '#FFFFFF' },
  ];

  const swatches = tokens.map(t => `
    <button class="swatch" style="background:${t.bg};color:${t.fg}"
      aria-label="Copy ${t.name} color ${t.bg}"
      onclick="navigator.clipboard.writeText('${t.bg}');this.setAttribute('data-copied','1');setTimeout(()=>this.removeAttribute('data-copied'),1500)">
      <span class="swatch-name">${t.name}</span>
      <span class="swatch-hex">${t.bg}</span>
    </button>`).join('');

  return `
<section class="ds-section" aria-labelledby="palette-heading">
  <h2 id="palette-heading">Palette <span class="ds-badge">${palette.name || ''}</span></h2>
  <p class="ds-meta">${palette.product_type || ''} &bull; WCAG ${palette.wcag_level || 'AA'} &bull; ${palette.source || ''}</p>
  <div class="swatch-grid" role="list" aria-label="Color palette swatches">${swatches}
  </div>
  <p class="ds-hint">Click any swatch to copy hex to clipboard.</p>
</section>`.trim();
}

// ---------------------------------------------------------------------------
// Typography specimen section
// ---------------------------------------------------------------------------
function typographySectionHTML(typo) {
  if (!typo) return '';
  const sizes = [
    { label: 'Display (2.5rem)', size: '2.5rem', w: '700', family: 'var(--font-heading)' },
    { label: 'H1 (2rem)',        size: '2rem',   w: '700', family: 'var(--font-heading)' },
    { label: 'H2 (1.5rem)',      size: '1.5rem', w: '600', family: 'var(--font-heading)' },
    { label: 'H3 (1.25rem)',     size: '1.25rem',w: '600', family: 'var(--font-heading)' },
    { label: 'Body (1rem)',      size: '1rem',   w: '400', family: 'var(--font-body)' },
    { label: 'Small (0.875rem)', size: '0.875rem',w:'400', family: 'var(--font-body)' },
    { label: 'Mono (0.875rem)',  size: '0.875rem',w:'400', family: 'var(--font-mono)' },
  ];

  const specimens = sizes.map(s => `
    <div class="type-specimen">
      <span class="type-label">${s.label}</span>
      <p style="font-family:${s.family};font-size:${s.size};font-weight:${s.w};line-height:1.2">
        The quick brown fox jumps over the lazy dog
      </p>
    </div>`).join('');

  return `
<section class="ds-section" aria-labelledby="typo-heading">
  <h2 id="typo-heading">Typography <span class="ds-badge">${typo.name || ''}</span></h2>
  <p class="ds-meta">Heading: <code>${typo.heading_stack || ''}</code></p>
  <p class="ds-meta">Body: <code>${typo.body_stack || ''}</code></p>
  <p class="ds-meta">Mono: <code>${typo.mono_stack || ''}</code></p>
  <div class="type-specimens">${specimens}
  </div>
</section>`.trim();
}

// ---------------------------------------------------------------------------
// Component demos
// ---------------------------------------------------------------------------
function componentSectionHTML() {
  return `
<section class="ds-section" aria-labelledby="components-heading">
  <h2 id="components-heading">Components</h2>

  <h3 class="ds-subsection">Buttons</h3>
  <div class="component-row" role="group" aria-label="Button variants">
    <button class="btn btn-primary">Primary Action</button>
    <button class="btn btn-secondary">Secondary</button>
    <button class="btn btn-ghost">Ghost</button>
    <button class="btn btn-destructive">Destructive</button>
    <button class="btn btn-primary" disabled aria-disabled="true">Disabled</button>
  </div>

  <h3 class="ds-subsection">Cards</h3>
  <div class="card-row">
    <article class="card">
      <div class="card-stat">
        <span class="stat-label">Total Users</span>
        <span class="stat-value">24,891</span>
        <span class="stat-delta positive">+12.4%</span>
      </div>
    </article>
    <article class="card">
      <div class="card-stat">
        <span class="stat-label">Revenue</span>
        <span class="stat-value">$184,320</span>
        <span class="stat-delta positive">+8.1%</span>
      </div>
    </article>
    <article class="card">
      <div class="card-stat">
        <span class="stat-label">Active Sessions</span>
        <span class="stat-value">3,204</span>
        <span class="stat-delta neutral">+0.2%</span>
      </div>
    </article>
  </div>

  <h3 class="ds-subsection">Form Inputs</h3>
  <form class="demo-form" onsubmit="return false" novalidate aria-label="Example form">
    <div class="form-group">
      <label class="form-label" for="demo-text">Project name</label>
      <input class="form-input" id="demo-text" type="text" placeholder="My project" value="IJFW Platform">
    </div>
    <div class="form-group">
      <label class="form-label" for="demo-select">Style</label>
      <select class="form-input" id="demo-select">
        <option>Dashboard</option><option>Landing</option><option>Editorial</option>
      </select>
    </div>
    <div class="form-group form-group-inline">
      <input type="checkbox" id="demo-check" class="form-checkbox">
      <label for="demo-check" class="form-label-inline">Enable dark mode by default</label>
    </div>
    <button type="submit" class="btn btn-primary">Save changes</button>
  </form>

  <h3 class="ds-subsection">Data Table</h3>
  <div class="table-wrap" role="region" aria-label="Sample data table" tabindex="0">
    <table class="data-table">
      <thead>
        <tr>
          <th scope="col"><button class="sort-btn" aria-label="Sort by Name">Name <span aria-hidden="true">&#x2195;</span></button></th>
          <th scope="col"><button class="sort-btn" aria-label="Sort by Status">Status <span aria-hidden="true">&#x2195;</span></button></th>
          <th scope="col"><button class="sort-btn" aria-label="Sort by Score">Score <span aria-hidden="true">&#x2195;</span></button></th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Alpha project</td><td><span class="badge badge-success">Active</span></td><td>94</td><td><button class="btn-link">View</button></td></tr>
        <tr><td>Beta rollout</td><td><span class="badge badge-warning">Review</span></td><td>71</td><td><button class="btn-link">View</button></td></tr>
        <tr><td>Gamma sprint</td><td><span class="badge badge-success">Active</span></td><td>88</td><td><button class="btn-link">View</button></td></tr>
        <tr><td>Delta initiative</td><td><span class="badge badge-neutral">Draft</span></td><td>42</td><td><button class="btn-link">View</button></td></tr>
      </tbody>
    </table>
  </div>

  <h3 class="ds-subsection">Charts (SVG)</h3>
  <div class="chart-row">
    ${inlineSVGLineChart()}
    ${inlineSVGBarChart()}
  </div>
</section>`.trim();
}

// ---------------------------------------------------------------------------
// SVG charts (zero deps, inline)
// ---------------------------------------------------------------------------
function inlineSVGLineChart() {
  const pts = [40,65,52,78,60,85,72,91,68,95];
  const w = 300, h = 120, pad = 20;
  const xStep = (w - pad * 2) / (pts.length - 1);
  const yMin = 30, yMax = 100;
  const scale = v => h - pad - ((v - yMin) / (yMax - yMin)) * (h - pad * 2);
  const polyline = pts.map((v, i) => `${pad + i * xStep},${scale(v)}`).join(' ');

  return `
  <figure class="chart-figure" aria-label="Line chart: sample trend data">
    <figcaption>Trend (last 10 periods)</figcaption>
    <svg width="${w}" height="${h}" role="img" aria-hidden="true" style="overflow:visible">
      <polyline fill="none" stroke="var(--color-primary)" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round" points="${polyline}"/>
      ${pts.map((v,i)=>`<circle cx="${pad+i*xStep}" cy="${scale(v)}" r="4" fill="var(--color-primary)"/>`).join('')}
    </svg>
  </figure>`;
}

function inlineSVGBarChart() {
  const bars = [
    { label: 'Mon', v: 60 },
    { label: 'Tue', v: 80 },
    { label: 'Wed', v: 55 },
    { label: 'Thu', v: 90 },
    { label: 'Fri', v: 75 },
    { label: 'Sat', v: 40 },
    { label: 'Sun', v: 30 },
  ];
  const w = 260, h = 120, pad = 20, barW = 26, gap = 8;
  const maxV = 100;
  const barHTML = bars.map((b, i) => {
    const bh = ((b.v / maxV) * (h - pad * 2));
    const x = pad + i * (barW + gap);
    const y = h - pad - bh;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="3"
      fill="var(--color-primary)" opacity="${0.6 + (b.v/maxV)*0.4}"
      aria-label="${b.label}: ${b.v}"/>
    <text x="${x + barW/2}" y="${h - 4}" text-anchor="middle" font-size="9"
      fill="var(--color-fg)" opacity="0.7">${b.label}</text>`;
  }).join('');

  return `
  <figure class="chart-figure" aria-label="Bar chart: weekly activity">
    <figcaption>Weekly Activity</figcaption>
    <svg width="${w}" height="${h}" role="img" aria-hidden="true">
      ${barHTML}
    </svg>
  </figure>`;
}

// ---------------------------------------------------------------------------
// Contrast check section
// ---------------------------------------------------------------------------
function contrastSectionHTML(palette) {
  if (!palette) return '';

  function luminance(hex) {
    const h = hex.replace('#','');
    if (h.startsWith('rgba') || h.startsWith('rgb') || !h.match(/^[0-9a-fA-F]{6}$/)) return 0.5;
    const r = parseInt(h.slice(0,2),16)/255;
    const g = parseInt(h.slice(2,4),16)/255;
    const b = parseInt(h.slice(4,6),16)/255;
    const sRGB = c => c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
    return 0.2126*sRGB(r) + 0.7152*sRGB(g) + 0.0722*sRGB(b);
  }

  function ratio(hex1, hex2) {
    const l1 = luminance(hex1), l2 = luminance(hex2);
    const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
    return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
  }

  const pairs = [
    { name: 'Primary text on Background',   bg: palette.background,  fg: palette.foreground },
    { name: 'Primary button text',          bg: palette.primary,     fg: palette.primary_on },
    { name: 'Accent on Background',         bg: palette.background,  fg: palette.accent },
    { name: 'Destructive on Background',    bg: palette.background,  fg: palette.destructive },
  ];

  const rows = pairs.map(pair => {
    const r = ratio(pair.bg, pair.fg);
    const pass = parseFloat(r) >= 4.5;
    const level = parseFloat(r) >= 7 ? 'AAA' : pass ? 'AA' : 'Needs review';
    return `
    <tr>
      <td>${pair.name}</td>
      <td><span class="color-chip" style="background:${pair.bg};border:1px solid var(--color-border)">&nbsp;&nbsp;&nbsp;&nbsp;</span> ${pair.bg}</td>
      <td><span class="color-chip" style="background:${pair.fg};border:1px solid var(--color-border)">&nbsp;&nbsp;&nbsp;&nbsp;</span> ${pair.fg}</td>
      <td>${r}:1</td>
      <td><span class="badge ${pass ? 'badge-success' : 'badge-warning'}">${level}</span></td>
    </tr>`;
  }).join('');

  return `
<section class="ds-section" aria-labelledby="contrast-heading">
  <h2 id="contrast-heading">Contrast Check (WCAG 2.2)</h2>
  <div class="table-wrap" role="region" aria-label="Contrast ratio table" tabindex="0">
    <table class="data-table">
      <thead><tr><th>Pair</th><th>Background</th><th>Foreground</th><th>Ratio</th><th>Level</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</section>`.trim();
}

// ---------------------------------------------------------------------------
// Component-level CSS
// ---------------------------------------------------------------------------
function componentCSS() {
  return `
/* -- Layout ---------------------------------------------------------------- */
.ds-page { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; }
.ds-header { margin-bottom: 3rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--color-border); }
.ds-header h1 { font-size: 2rem; font-weight: 700; color: var(--color-primary); }
.ds-header p { margin-top: 0.5rem; color: var(--color-fg); opacity: 0.7; }
.ds-section { margin-bottom: 3rem; padding: 2rem; background: var(--color-card);
  border-radius: var(--radius); border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm); }
.ds-section h2 { font-size: 1.375rem; font-weight: 700; margin-bottom: 0.5rem; }
.ds-section h3.ds-subsection { font-size: 1rem; font-weight: 600; margin: 1.5rem 0 0.75rem;
  color: var(--color-fg); opacity: 0.8; text-transform: uppercase; letter-spacing: 0.04em;
  font-size: 0.8125rem; }
.ds-badge { background: var(--color-muted); color: var(--color-fg); border-radius: 4px;
  padding: 0.15em 0.5em; font-size: 0.8em; font-weight: 500; vertical-align: middle; }
.ds-meta { font-size: 0.875rem; opacity: 0.65; margin-bottom: 0.25rem; }
.ds-hint { font-size: 0.8rem; opacity: 0.5; margin-top: 0.75rem; }

/* -- Palette swatches ------------------------------------------------------ */
.swatch-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1rem; }
.swatch { display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end;
  width: 110px; height: 80px; border-radius: var(--radius); padding: 0.6rem;
  border: 1px solid rgba(0,0,0,0.08); cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition);
  box-shadow: var(--shadow-sm); }
.swatch:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.swatch:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.swatch[data-copied] { outline: 2px solid var(--color-accent); }
.swatch-name { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.04em;
  text-transform: uppercase; opacity: 0.85; }
.swatch-hex { font-family: var(--font-mono); font-size: 0.7rem; margin-top: 0.15rem; opacity: 0.75; }

/* -- Typography specimens -------------------------------------------------- */
.type-specimens { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
.type-specimen { display: flex; align-items: baseline; gap: 1rem;
  padding: 0.75rem 0; border-bottom: 1px solid var(--color-muted); }
.type-specimen:last-child { border-bottom: none; }
.type-label { flex-shrink: 0; width: 130px; font-size: 0.7rem; opacity: 0.55;
  font-family: var(--font-mono); }

/* -- Buttons --------------------------------------------------------------- */
.btn { display: inline-flex; align-items: center; justify-content: center;
  padding: 0.5rem 1.125rem; border-radius: var(--radius-sm); font-family: var(--font-body);
  font-size: 0.9375rem; font-weight: 500; border: none; cursor: pointer;
  transition: opacity var(--transition), transform var(--transition);
  min-width: 44px; min-height: 44px; }
.btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.btn:hover { opacity: 0.88; }
.btn:active { transform: scale(0.98); }
.btn:disabled, .btn[aria-disabled="true"] { opacity: 0.4; cursor: not-allowed; }
.btn-primary { background: var(--color-primary); color: var(--color-primary-on); }
.btn-secondary { background: var(--color-muted); color: var(--color-fg);
  border: 1px solid var(--color-border); }
.btn-ghost { background: transparent; color: var(--color-primary);
  border: 1px solid var(--color-primary); }
.btn-destructive { background: var(--color-destructive); color: var(--color-destructive-on); }
.btn-link { background: none; border: none; color: var(--color-primary); cursor: pointer;
  font-size: 0.875rem; padding: 0.25rem 0.5rem; min-height: 44px; }
.component-row { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }

/* -- Cards ----------------------------------------------------------------- */
.card-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 0.5rem; }
.card { background: var(--color-bg); border-radius: var(--radius);
  border: 1px solid var(--color-border); padding: 1.25rem; flex: 1; min-width: 160px;
  box-shadow: var(--shadow-sm); transition: box-shadow var(--transition), transform var(--transition); }
.card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.card-stat { display: flex; flex-direction: column; gap: 0.25rem; }
.stat-label { font-size: 0.75rem; font-weight: 500; text-transform: uppercase;
  letter-spacing: 0.06em; opacity: 0.6; }
.stat-value { font-size: 1.75rem; font-weight: 700; font-family: var(--font-heading);
  color: var(--color-fg); }
.stat-delta { font-size: 0.8125rem; font-weight: 600; }
.stat-delta.positive { color: #16A34A; }
.stat-delta.neutral { color: var(--color-fg); opacity: 0.5; }

/* -- Forms ----------------------------------------------------------------- */
.demo-form { max-width: 400px; display: flex; flex-direction: column; gap: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.25rem; }
.form-label { font-size: 0.875rem; font-weight: 500; }
.form-input { padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);
  border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-fg);
  font-family: var(--font-body); font-size: 1rem; min-height: 44px;
  transition: border-color var(--transition), box-shadow var(--transition); }
.form-input:focus { outline: none; border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent); }
.form-group-inline { flex-direction: row; align-items: center; gap: 0.5rem; }
.form-checkbox { width: 18px; height: 18px; cursor: pointer; accent-color: var(--color-primary); }
.form-label-inline { font-size: 0.875rem; }

/* -- Table ----------------------------------------------------------------- */
.table-wrap { overflow-x: auto; border-radius: var(--radius-sm);
  border: 1px solid var(--color-border); }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.data-table th, .data-table td { padding: 0.625rem 1rem; text-align: left;
  border-bottom: 1px solid var(--color-border); }
.data-table thead tr { background: var(--color-muted); }
.data-table tbody tr:hover { background: color-mix(in srgb, var(--color-primary) 5%, transparent); }
.data-table tbody tr:last-child td { border-bottom: none; }
.sort-btn { background: none; border: none; cursor: pointer; font-weight: 600;
  font-size: 0.9rem; color: var(--color-fg); padding: 0; display: inline-flex;
  align-items: center; gap: 0.25rem; }
.sort-btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

/* -- Badges ---------------------------------------------------------------- */
.badge { display: inline-block; padding: 0.2em 0.55em; border-radius: 4px;
  font-size: 0.75rem; font-weight: 600; letter-spacing: 0.02em; }
.badge-success { background: #DCFCE7; color: #14532D; }
.badge-warning { background: #FEF9C3; color: #713F12; }
.badge-neutral { background: var(--color-muted); color: var(--color-fg); }
@media (prefers-color-scheme: dark) {
  .badge-success { background: #14532D; color: #DCFCE7; }
  .badge-warning { background: #713F12; color: #FEF9C3; }
}

/* -- Charts ---------------------------------------------------------------- */
.chart-row { display: flex; flex-wrap: wrap; gap: 2rem; margin-top: 0.5rem; }
.chart-figure { display: flex; flex-direction: column; gap: 0.5rem; }
.chart-figure figcaption { font-size: 0.8125rem; font-weight: 500; opacity: 0.65; }

/* -- Contrast chips -------------------------------------------------------- */
.color-chip { display: inline-block; width: 24px; height: 14px; border-radius: 3px;
  vertical-align: middle; margin-right: 0.35rem; }
`.trim();
}

// ---------------------------------------------------------------------------
// Dashboard layout: tabs
// ---------------------------------------------------------------------------
function tabsDashboardHTML(palette, typo, style) {
  const name = style ? style.name : 'Dashboard';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} -- Tabs Layout</title>
<style>
${baseCSS(paletteToVars(palette), typoToVars(typo))}
${componentCSS()}
/* -- Tabs layout ----------------------------------------------------------- */
.app-shell { display: flex; flex-direction: column; min-height: 100vh; }
.topbar { background: var(--color-card); border-bottom: 1px solid var(--color-border);
  padding: 0 1.5rem; display: flex; align-items: center; gap: 1rem; height: 56px; }
.topbar-brand { font-family: var(--font-heading); font-weight: 700; font-size: 1.125rem;
  color: var(--color-primary); }
.topbar-spacer { flex: 1; }
.topbar-user { width: 36px; height: 36px; border-radius: 50%; background: var(--color-muted);
  display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem; }
.tab-bar { background: var(--color-card); border-bottom: 1px solid var(--color-border);
  display: flex; padding: 0 1.5rem; }
.tab-btn { padding: 0 1rem; height: 44px; background: none; border: none; border-bottom: 3px solid transparent;
  cursor: pointer; font-family: var(--font-body); font-size: 0.9375rem; font-weight: 500;
  color: var(--color-fg); opacity: 0.65; transition: opacity var(--transition), border-color var(--transition); }
.tab-btn:hover { opacity: 1; }
.tab-btn.active { border-bottom-color: var(--color-primary); color: var(--color-primary); opacity: 1; }
.tab-btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.main-content { flex: 1; padding: 2rem 1.5rem; }
.tab-panel { display: none; }
.tab-panel.active { display: block; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap: 1rem;
  margin-bottom: 2rem; }
.section-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;
  color: var(--color-fg); opacity: 0.9; }
</style>
</head>
<body>
<div class="app-shell">
  <header class="topbar" role="banner">
    <span class="topbar-brand">${name}</span>
    <span class="topbar-spacer"></span>
    <button class="btn btn-primary" style="height:36px;padding:0 0.875rem;font-size:0.875rem">New report</button>
    <div class="topbar-user" aria-label="User menu">SD</div>
  </header>

  <nav class="tab-bar" role="tablist" aria-label="Main navigation">
    <button class="tab-btn active" role="tab" aria-selected="true" aria-controls="panel-overview" id="tab-overview">Overview</button>
    <button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-analytics" id="tab-analytics">Analytics</button>
    <button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-data" id="tab-data">Data</button>
    <button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-settings" id="tab-settings">Settings</button>
  </nav>

  <main class="main-content">
    <div class="tab-panel active" role="tabpanel" id="panel-overview" aria-labelledby="tab-overview">
      <div class="stats-grid">
        <article class="card"><div class="card-stat"><span class="stat-label">Total Users</span><span class="stat-value">24,891</span><span class="stat-delta positive">+12.4%</span></div></article>
        <article class="card"><div class="card-stat"><span class="stat-label">Revenue</span><span class="stat-value">$184,320</span><span class="stat-delta positive">+8.1%</span></div></article>
        <article class="card"><div class="card-stat"><span class="stat-label">Sessions</span><span class="stat-value">3,204</span><span class="stat-delta neutral">+0.2%</span></div></article>
        <article class="card"><div class="card-stat"><span class="stat-label">Conversion</span><span class="stat-value">4.7%</span><span class="stat-delta positive">+1.3%</span></div></article>
      </div>
      <p class="section-title">Recent activity</p>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th scope="col">Project</th><th scope="col">Status</th><th scope="col">Score</th><th scope="col">Actions</th></tr></thead>
          <tbody>
            <tr><td>Alpha</td><td><span class="badge badge-success">Active</span></td><td>94</td><td><button class="btn-link">View</button></td></tr>
            <tr><td>Beta</td><td><span class="badge badge-warning">Review</span></td><td>71</td><td><button class="btn-link">View</button></td></tr>
            <tr><td>Gamma</td><td><span class="badge badge-success">Active</span></td><td>88</td><td><button class="btn-link">View</button></td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="tab-panel" role="tabpanel" id="panel-analytics" aria-labelledby="tab-analytics" hidden>
      <p class="section-title">Charts</p>
      <div class="chart-row">
        ${inlineSVGLineChart()}
        ${inlineSVGBarChart()}
      </div>
    </div>
    <div class="tab-panel" role="tabpanel" id="panel-data" aria-labelledby="tab-data" hidden>
      <p class="section-title">Data explorer</p>
      <p style="opacity:0.6;font-size:0.9rem">Connect a data source to see results here.</p>
    </div>
    <div class="tab-panel" role="tabpanel" id="panel-settings" aria-labelledby="tab-settings" hidden>
      <p class="section-title">Settings</p>
      <form class="demo-form" onsubmit="return false" novalidate>
        <div class="form-group"><label class="form-label" for="s-name">Project name</label><input class="form-input" id="s-name" type="text" value="${name}"></div>
        <div class="form-group form-group-inline"><input type="checkbox" id="s-dark" class="form-checkbox"><label class="form-label-inline" for="s-dark">Dark mode default</label></div>
        <button type="submit" class="btn btn-primary">Save</button>
      </form>
    </div>
  </main>
</div>
<script>
(function(){
  const tabs = document.querySelectorAll('[role=tab]');
  const panels = document.querySelectorAll('[role=tabpanel]');
  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      tabs.forEach(function(t){ t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      panels.forEach(function(p){ p.classList.remove('active'); p.hidden = true; });
      tab.classList.add('active'); tab.setAttribute('aria-selected','true');
      var panel = document.getElementById(tab.getAttribute('aria-controls'));
      if(panel){ panel.classList.add('active'); panel.hidden = false; }
    });
    tab.addEventListener('keydown', function(e){
      var idx = Array.from(tabs).indexOf(tab);
      if(e.key==='ArrowRight') tabs[(idx+1)%tabs.length].click();
      if(e.key==='ArrowLeft')  tabs[(idx-1+tabs.length)%tabs.length].click();
    });
  });
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Dashboard layout: sidebar
// ---------------------------------------------------------------------------
function sidebarDashboardHTML(palette, typo, style) {
  const name = style ? style.name : 'Dashboard';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} -- Sidebar Layout</title>
<style>
${baseCSS(paletteToVars(palette), typoToVars(typo))}
${componentCSS()}
/* -- Sidebar layout -------------------------------------------------------- */
.app-shell { display: flex; min-height: 100vh; }
.sidebar { width: 240px; background: var(--color-card); border-right: 1px solid var(--color-border);
  display: flex; flex-direction: column; flex-shrink: 0; transition: width 250ms ease; }
.sidebar.collapsed { width: 56px; overflow: hidden; }
.sidebar-header { padding: 1.25rem 1rem; display: flex; align-items: center; gap: 0.75rem;
  border-bottom: 1px solid var(--color-border); }
.sidebar-brand { font-family: var(--font-heading); font-weight: 700; font-size: 1rem;
  color: var(--color-primary); white-space: nowrap; overflow: hidden; }
.sidebar-toggle { margin-left: auto; background: none; border: none; cursor: pointer;
  width: 32px; height: 32px; border-radius: var(--radius-sm); display: flex;
  align-items: center; justify-content: center; color: var(--color-fg); opacity: 0.6;
  flex-shrink: 0; }
.sidebar-toggle:hover { background: var(--color-muted); opacity: 1; }
.sidebar-toggle:focus-visible { outline: 2px solid var(--color-primary); }
.sidebar-nav { padding: 0.75rem 0; flex: 1; }
.nav-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 1rem;
  color: var(--color-fg); opacity: 0.65; cursor: pointer; border: none; background: none;
  width: 100%; text-align: left; font-family: var(--font-body); font-size: 0.9375rem;
  font-weight: 500; transition: background var(--transition), opacity var(--transition);
  white-space: nowrap; overflow: hidden; border-radius: 0; min-height: 44px; }
.nav-item:hover { background: color-mix(in srgb, var(--color-primary) 8%, transparent); opacity: 1; }
.nav-item.active { background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary); opacity: 1; border-right: 3px solid var(--color-primary); }
.nav-item:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.nav-icon { flex-shrink: 0; width: 20px; text-align: center; }
.sidebar-footer { padding: 1rem; border-top: 1px solid var(--color-border); }
.main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.topbar { background: var(--color-card); border-bottom: 1px solid var(--color-border);
  padding: 0 1.5rem; display: flex; align-items: center; height: 56px; gap: 1rem; }
.page-title { font-weight: 700; font-size: 1.0625rem; }
.topbar-spacer { flex: 1; }
.main-content { flex: 1; padding: 2rem 1.5rem; overflow-y: auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap: 1rem; margin-bottom: 2rem; }
.section-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; }
</style>
</head>
<body>
<div class="app-shell">
  <aside class="sidebar" id="sidebar" aria-label="Main navigation">
    <div class="sidebar-header">
      <span class="sidebar-brand" id="brand-label">${name}</span>
      <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle sidebar" aria-expanded="true" aria-controls="sidebar">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="3" y1="4" x2="15" y2="4"/><line x1="3" y1="9" x2="15" y2="9"/><line x1="3" y1="14" x2="15" y2="14"/>
        </svg>
      </button>
    </div>
    <nav class="sidebar-nav" role="navigation" aria-label="Sidebar navigation">
      <button class="nav-item active" aria-current="page">
        <span class="nav-icon" aria-hidden="true">&#9632;</span>
        <span class="nav-label">Overview</span>
      </button>
      <button class="nav-item">
        <span class="nav-icon" aria-hidden="true">&#9650;</span>
        <span class="nav-label">Analytics</span>
      </button>
      <button class="nav-item">
        <span class="nav-icon" aria-hidden="true">&#9670;</span>
        <span class="nav-label">Data</span>
      </button>
      <button class="nav-item">
        <span class="nav-icon" aria-hidden="true">&#9786;</span>
        <span class="nav-label">Users</span>
      </button>
      <button class="nav-item">
        <span class="nav-icon" aria-hidden="true">&#9881;</span>
        <span class="nav-label">Settings</span>
      </button>
    </nav>
    <div class="sidebar-footer">
      <div style="display:flex;align-items:center;gap:0.5rem">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--color-muted);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;flex-shrink:0">SD</div>
        <span class="nav-label" style="font-size:0.875rem;font-weight:500">Sean Donahoe</span>
      </div>
    </div>
  </aside>

  <div class="main-area">
    <header class="topbar" role="banner">
      <span class="page-title">Overview</span>
      <span class="topbar-spacer"></span>
      <button class="btn btn-primary" style="height:36px;padding:0 0.875rem;font-size:0.875rem">New report</button>
    </header>
    <main class="main-content">
      <div class="stats-grid">
        <article class="card"><div class="card-stat"><span class="stat-label">Total Users</span><span class="stat-value">24,891</span><span class="stat-delta positive">+12.4%</span></div></article>
        <article class="card"><div class="card-stat"><span class="stat-label">Revenue</span><span class="stat-value">$184,320</span><span class="stat-delta positive">+8.1%</span></div></article>
        <article class="card"><div class="card-stat"><span class="stat-label">Sessions</span><span class="stat-value">3,204</span><span class="stat-delta neutral">+0.2%</span></div></article>
        <article class="card"><div class="card-stat"><span class="stat-label">Conversion</span><span class="stat-value">4.7%</span><span class="stat-delta positive">+1.3%</span></div></article>
      </div>
      <p class="section-title">Activity</p>
      <div class="chart-row">
        ${inlineSVGLineChart()}
        ${inlineSVGBarChart()}
      </div>
      <p class="section-title" style="margin-top:2rem">Recent Projects</p>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th scope="col">Project</th><th scope="col">Status</th><th scope="col">Score</th></tr></thead>
          <tbody>
            <tr><td>Alpha</td><td><span class="badge badge-success">Active</span></td><td>94</td></tr>
            <tr><td>Beta</td><td><span class="badge badge-warning">Review</span></td><td>71</td></tr>
            <tr><td>Gamma</td><td><span class="badge badge-success">Active</span></td><td>88</td></tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</div>
<script>
(function(){
  var sidebar = document.getElementById('sidebar');
  var toggle = document.getElementById('sidebar-toggle');
  var labels = sidebar.querySelectorAll('.nav-label, .sidebar-brand');
  var collapsed = false;
  toggle.addEventListener('click', function(){
    collapsed = !collapsed;
    sidebar.classList.toggle('collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    labels.forEach(function(el){ el.style.display = collapsed ? 'none' : ''; });
  });
  sidebar.querySelectorAll('.nav-item').forEach(function(item){
    item.addEventListener('click', function(){
      sidebar.querySelectorAll('.nav-item').forEach(function(i){ i.classList.remove('active'); i.removeAttribute('aria-current'); });
      item.classList.add('active'); item.setAttribute('aria-current','page');
    });
  });
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Dashboard layout: cards
// ---------------------------------------------------------------------------
function cardsDashboardHTML(palette, typo, style) {
  const name = style ? style.name : 'Dashboard';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} -- Cards Layout</title>
<style>
${baseCSS(paletteToVars(palette), typoToVars(typo))}
${componentCSS()}
/* -- Cards bento layout ---------------------------------------------------- */
.page-header { padding: 2rem 1.5rem 0; display: flex; align-items: center; gap: 1rem; }
.page-brand { font-family: var(--font-heading); font-weight: 700; font-size: 1.5rem;
  color: var(--color-primary); flex: 1; }
.bento-grid { display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  grid-auto-rows: auto; gap: 1rem; padding: 1.5rem; }
.bento-card { background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius); padding: 1.5rem; box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition), transform var(--transition); }
.bento-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.bento-card.span2 { grid-column: span 2; }
.bento-card h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;
  opacity: 0.55; font-weight: 600; margin-bottom: 0.75rem; }
</style>
</head>
<body>
<header class="page-header" role="banner">
  <span class="page-brand">${name}</span>
  <button class="btn btn-secondary" style="height:36px;padding:0 0.875rem;font-size:0.875rem">Filter</button>
  <button class="btn btn-primary" style="height:36px;padding:0 0.875rem;font-size:0.875rem">New report</button>
</header>
<main>
  <div class="bento-grid">
    <article class="bento-card">
      <h3>Total Users</h3>
      <div class="card-stat"><span class="stat-value">24,891</span><span class="stat-delta positive">+12.4%</span></div>
    </article>
    <article class="bento-card">
      <h3>Revenue</h3>
      <div class="card-stat"><span class="stat-value">$184,320</span><span class="stat-delta positive">+8.1%</span></div>
    </article>
    <article class="bento-card">
      <h3>Sessions</h3>
      <div class="card-stat"><span class="stat-value">3,204</span><span class="stat-delta neutral">+0.2%</span></div>
    </article>
    <article class="bento-card">
      <h3>Conversion</h3>
      <div class="card-stat"><span class="stat-value">4.7%</span><span class="stat-delta positive">+1.3%</span></div>
    </article>
    <article class="bento-card span2" style="min-width:0">
      <h3>Trend</h3>
      <div class="chart-row">${inlineSVGLineChart()}${inlineSVGBarChart()}</div>
    </article>
    <article class="bento-card span2" style="min-width:0">
      <h3>Projects</h3>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th scope="col">Project</th><th scope="col">Status</th><th scope="col">Score</th></tr></thead>
          <tbody>
            <tr><td>Alpha</td><td><span class="badge badge-success">Active</span></td><td>94</td></tr>
            <tr><td>Beta</td><td><span class="badge badge-warning">Review</span></td><td>71</td></tr>
            <tr><td>Gamma</td><td><span class="badge badge-success">Active</span></td><td>88</td></tr>
          </tbody>
        </table>
      </div>
    </article>
    <article class="bento-card">
      <h3>Quick actions</h3>
      <div class="component-row" style="flex-direction:column;align-items:stretch;gap:0.5rem">
        <button class="btn btn-primary">New project</button>
        <button class="btn btn-secondary">Import data</button>
        <button class="btn btn-ghost">View all reports</button>
      </div>
    </article>
  </div>
</main>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Full design system reference page
// ---------------------------------------------------------------------------
export function generateMockup(query, palette, typo, style, layout, outputDir) {
  mkdirSync(outputDir, { recursive: true });

  const vars = paletteToVars(palette);
  const typoVars = typoToVars(typo);
  const styleName = style ? style.name : 'Design System';
  const paletteName = palette ? palette.name : '';
  const typoName = typo ? typo.name : '';

  if (layout === 'tabs') {
    const html = tabsDashboardHTML(palette, typo, style);
    const outPath = join(outputDir, 'index.html');
    writeFileSync(outPath, html, 'utf8');
    return outPath;
  }

  if (layout === 'sidebar') {
    const html = sidebarDashboardHTML(palette, typo, style);
    const outPath = join(outputDir, 'index.html');
    writeFileSync(outPath, html, 'utf8');
    return outPath;
  }

  if (layout === 'cards') {
    const html = cardsDashboardHTML(palette, typo, style);
    const outPath = join(outputDir, 'index.html');
    writeFileSync(outPath, html, 'utf8');
    return outPath;
  }

  // Default: full design system reference page
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>IJFW Design System -- ${styleName}</title>
<style>
${baseCSS(vars, typoVars)}
${componentCSS()}
</style>
</head>
<body>
<div class="ds-page">
  <header class="ds-header">
    <h1>IJFW Design System</h1>
    <p>Query: <strong>${query}</strong> &bull; Style: <strong>${styleName}</strong> &bull; Palette: <strong>${paletteName}</strong> &bull; Typography: <strong>${typoName}</strong></p>
    <p style="font-size:0.8125rem;opacity:0.5;margin-top:0.25rem">Zero external deps &bull; WCAG AA &bull; System fonts &bull; Works from file://</p>
  </header>

  ${paletteSectionHTML(palette)}
  ${typographySectionHTML(typo)}
  ${componentSectionHTML()}
  ${contrastSectionHTML(palette)}
</div>
</body>
</html>`;

  const outPath = join(outputDir, 'index.html');
  writeFileSync(outPath, html, 'utf8');
  return outPath;
}

// ---------------------------------------------------------------------------
// Gallery: render all styles as swatches
// ---------------------------------------------------------------------------
export function generateGallery(styles, palettes, outputDir) {
  mkdirSync(outputDir, { recursive: true });

  const cards = styles.map(s => {
    const pal = palettes.find(p =>
      p.product_type && s.category &&
      (p.product_type.toLowerCase().includes(s.category.toLowerCase()) ||
       s.category.toLowerCase().includes(p.product_type.toLowerCase().split(' ')[0]))
    ) || palettes[0];

    const bg = pal ? pal.background : '#F8FAFC';
    const fg = pal ? pal.foreground : '#1E293B';
    const primary = pal ? pal.primary : '#2563EB';
    const accent = pal ? pal.accent : '#EA580C';

    return `
    <article class="gallery-card" style="background:${bg};color:${fg};border-color:${pal ? pal.border : '#CBD5E1'}">
      <div class="gallery-preview" style="background:${bg}">
        <div class="preview-topbar" style="background:${pal ? pal.card : '#fff'};border-color:${pal ? pal.border : '#CBD5E1'}">
          <div class="preview-dot" style="background:${primary}"></div>
          <div class="preview-bar" style="background:${pal ? pal.muted : '#E2E8F0'};width:60%"></div>
        </div>
        <div class="preview-body">
          <div class="preview-block" style="background:${primary};color:${pal ? pal.primary_on : '#fff'}">
            <span>${s.name}</span>
          </div>
          <div class="preview-row">
            <div class="preview-pill" style="background:${accent}"></div>
            <div class="preview-pill" style="background:${pal ? pal.muted : '#E2E8F0'}"></div>
            <div class="preview-pill" style="background:${pal ? pal.secondary : '#3B82F6'}"></div>
          </div>
        </div>
      </div>
      <div class="gallery-info">
        <strong>${s.name}</strong>
        <span class="gallery-cat">${s.category}</span>
        <span class="gallery-wcag">WCAG ${s.wcag_aa}</span>
      </div>
    </article>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>IJFW Design -- Style Gallery</title>
<style>
:root {
  --radius: 8px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.12);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.15);
  --transition: 200ms ease;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui,-apple-system,sans-serif; background: #F1F5F9; color: #0F172A;
  min-height: 100vh; }
@media (prefers-color-scheme: dark) {
  body { background: #0F172A; color: #F1F5F9; }
}
.page-header { padding: 2rem; }
.page-header h1 { font-size: 1.75rem; font-weight: 700; color: #2563EB; }
.page-header p { margin-top: 0.5rem; opacity: 0.6; font-size: 0.9rem; }
.filter-bar { padding: 0 2rem 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
.filter-btn { padding: 0.35rem 0.875rem; border-radius: 20px; border: 1px solid #CBD5E1;
  background: #FFFFFF; cursor: pointer; font-size: 0.8125rem; font-weight: 500;
  transition: background var(--transition), color var(--transition); min-height: 36px; }
.filter-btn:hover, .filter-btn.active { background: #2563EB; color: #fff; border-color: #2563EB; }
.filter-btn:focus-visible { outline: 2px solid #2563EB; outline-offset: 2px; }
.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(220px,1fr));
  gap: 1rem; padding: 0 2rem 3rem; }
.gallery-card { border-radius: var(--radius); overflow: hidden; border: 1px solid;
  box-shadow: var(--shadow-sm); cursor: pointer;
  transition: box-shadow var(--transition), transform var(--transition); }
.gallery-card:hover { box-shadow: var(--shadow-md); transform: translateY(-3px); }
.gallery-preview { height: 120px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
.preview-topbar { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.5rem;
  border-radius: 4px; border: 1px solid; }
.preview-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.preview-bar { height: 8px; border-radius: 4px; flex: 1; }
.preview-body { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; }
.preview-block { border-radius: 4px; padding: 0.4rem 0.6rem; font-size: 0.7rem;
  font-weight: 700; letter-spacing: 0.02em; }
.preview-row { display: flex; gap: 0.4rem; }
.preview-pill { height: 12px; border-radius: 6px; flex: 1; }
.gallery-info { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.2rem; }
.gallery-info strong { font-size: 0.9rem; }
.gallery-cat { font-size: 0.75rem; opacity: 0.6; text-transform: capitalize; }
.gallery-wcag { font-size: 0.7rem; opacity: 0.5; font-family: monospace; }
.count { padding: 0 2rem 0.75rem; font-size: 0.875rem; opacity: 0.55; }
</style>
</head>
<body>
<header class="page-header" role="banner">
  <h1>IJFW Design -- Style Gallery</h1>
  <p>${styles.length} styles &bull; Click a card to copy the style name &bull; Zero external deps</p>
</header>
<div class="filter-bar" role="group" aria-label="Filter by category">
  <button class="filter-btn active" data-cat="all" onclick="filterGallery('all')">All (${styles.length})</button>
  ${[...new Set(styles.map(s=>s.category))].map(cat=>`
  <button class="filter-btn" data-cat="${cat}" onclick="filterGallery('${cat}')">${cat} (${styles.filter(s=>s.category===cat).length})</button>`).join('')}
</div>
<p class="count" id="count-label">${styles.length} styles shown</p>
<main>
  <div class="gallery-grid" id="gallery" role="list" aria-label="Style gallery">${cards}</div>
</main>
<script>
(function(){
  var cards = document.querySelectorAll('.gallery-card');
  cards.forEach(function(c, i){
    var name = c.querySelector('strong').textContent;
    c.setAttribute('role','listitem');
    c.setAttribute('tabindex','0');
    c.setAttribute('aria-label', name);
    c.addEventListener('click', function(){
      navigator.clipboard && navigator.clipboard.writeText(name);
    });
    c.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' ') c.click(); });
  });
  window.filterGallery = function(cat){
    var btns = document.querySelectorAll('.filter-btn');
    btns.forEach(function(b){ b.classList.toggle('active', b.dataset.cat===cat); });
    var visible = 0;
    cards.forEach(function(c){
      var catEl = c.querySelector('.gallery-cat');
      var show = cat==='all' || (catEl && catEl.textContent.trim()===cat);
      c.style.display = show ? '' : 'none';
      if(show) visible++;
    });
    document.getElementById('count-label').textContent = visible + ' styles shown';
  };
})();
</script>
</body>
</html>`;

  const outPath = join(outputDir, 'index.html');
  writeFileSync(outPath, html, 'utf8');
  return outPath;
}
