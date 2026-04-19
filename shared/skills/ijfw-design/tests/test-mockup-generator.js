// tests/test-mockup-generator.js -- node:test suite for mockup-generator.js + --mockup/--gallery flags
// Run: node --test shared/skills/ijfw-design/tests/test-mockup-generator.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEARCH_JS = join(__dirname, '..', 'scripts', 'search.js');
const GENERATOR = join(__dirname, '..', 'scripts', 'mockup-generator.js');
const COMPONENTS_DIR = join(__dirname, '..', 'components');

function run(argsArr) {
  return execFileSync(process.execPath, [SEARCH_JS, ...argsArr], {
    encoding: 'utf8',
    timeout: 15000,
  });
}

function tmpDir(suffix) {
  return join(tmpdir(), 'ijfw-test-' + suffix + '-' + Date.now());
}

// ---------------------------------------------------------------------------
// Generator module exports
// ---------------------------------------------------------------------------
test('mockup-generator.js exports generateMockup and generateGallery', async () => {
  const mod = await import(GENERATOR);
  assert.equal(typeof mod.generateMockup, 'function', 'generateMockup missing');
  assert.equal(typeof mod.generateGallery, 'function', 'generateGallery missing');
});

test('paletteToVars returns CSS custom properties string', async () => {
  const { paletteToVars } = await import(GENERATOR);
  const vars = paletteToVars({ primary: '#2563EB', primary_on: '#FFFFFF', background: '#F8FAFC', foreground: '#1E293B', accent: '#EA580C', accent_on: '#FFFFFF', secondary: '#3B82F6', secondary_on: '#FFFFFF', card: '#FFFFFF', muted: '#E2E8F0', border: '#CBD5E1', destructive: '#DC2626' });
  assert.ok(vars.includes('--color-primary: #2563EB'), 'Missing primary var');
  assert.ok(vars.includes('--color-bg: #F8FAFC'), 'Missing bg var');
  assert.ok(vars.includes('--color-accent: #EA580C'), 'Missing accent var');
});

test('typoToVars returns CSS custom properties string', async () => {
  const { typoToVars } = await import(GENERATOR);
  const vars = typoToVars({ heading_stack: "Georgia serif", body_stack: "system-ui sans-serif", mono_stack: "monospace", wcag_min_size: '16px', line_height: '1.5' });
  assert.ok(vars.includes('--font-heading: Georgia serif'), 'Missing heading var');
  assert.ok(vars.includes('--font-size-base: 16px'), 'Missing font-size var');
});

// ---------------------------------------------------------------------------
// generateMockup -- default (no layout)
// ---------------------------------------------------------------------------
test('generateMockup creates index.html', async () => {
  const { generateMockup } = await import(GENERATOR);
  const dir = tmpDir('mockup-default');
  const outPath = generateMockup('dashboard', null, null, null, null, dir);
  assert.ok(existsSync(outPath), 'index.html not created');
  assert.ok(outPath.endsWith('index.html'), 'Wrong filename');
});

test('generateMockup HTML is valid (doctype, head, body)', async () => {
  const { generateMockup } = await import(GENERATOR);
  const dir = tmpDir('mockup-valid');
  const outPath = generateMockup('dashboard', null, null, null, null, dir);
  const html = readFileSync(outPath, 'utf8');
  assert.ok(html.startsWith('<!DOCTYPE html>'), 'Missing doctype');
  assert.ok(html.includes('<head>'), 'Missing head');
  assert.ok(html.includes('<body>'), 'Missing body');
});

test('generateMockup HTML is self-contained (no external URLs)', async () => {
  const { generateMockup } = await import(GENERATOR);
  const dir = tmpDir('mockup-nodeps');
  const outPath = generateMockup('dashboard', null, null, null, null, dir);
  const html = readFileSync(outPath, 'utf8');
  // No external stylesheet/script links
  assert.ok(!html.includes('https://fonts.googleapis'), 'Has Google Fonts link');
  assert.ok(!html.includes('https://cdn.'), 'Has CDN link');
  assert.ok(!html.includes('<link rel="stylesheet"'), 'Has external stylesheet link');
  assert.ok(!html.includes('src="http'), 'Has external script');
});

test('generateMockup HTML has aria-label attributes (a11y)', async () => {
  const { generateMockup } = await import(GENERATOR);
  const dir = tmpDir('mockup-a11y');
  const outPath = generateMockup('dashboard', null, null, null, null, dir);
  const html = readFileSync(outPath, 'utf8');
  assert.ok(html.includes('aria-label'), 'Missing aria-label');
  assert.ok(html.includes('role='), 'Missing role attributes');
});

test('generateMockup HTML has prefers-color-scheme media query', async () => {
  const { generateMockup } = await import(GENERATOR);
  const dir = tmpDir('mockup-colorscheme');
  const outPath = generateMockup('dashboard', null, null, null, null, dir);
  const html = readFileSync(outPath, 'utf8');
  assert.ok(html.includes('prefers-color-scheme: dark'), 'Missing dark mode media query');
});

test('generateMockup HTML contains palette swatches section', async () => {
  const { generateMockup } = await import(GENERATOR);
  const pal = { name: 'Test', product_type: 'SaaS', primary: '#2563EB', primary_on: '#FFFFFF', secondary: '#3B82F6', secondary_on: '#FFFFFF', accent: '#EA580C', accent_on: '#FFFFFF', background: '#F8FAFC', foreground: '#1E293B', card: '#FFFFFF', muted: '#E2E8F0', border: '#CBD5E1', destructive: '#DC2626', wcag_level: 'AA', source: 'test' };
  const dir = tmpDir('mockup-swatches');
  const outPath = generateMockup('dashboard', pal, null, null, null, dir);
  const html = readFileSync(outPath, 'utf8');
  assert.ok(html.includes('swatch'), 'Missing palette swatches');
  assert.ok(html.includes('#2563EB'), 'Missing primary color');
});

test('generateMockup HTML contains typography specimens', async () => {
  const { generateMockup } = await import(GENERATOR);
  const typo = { name: 'System', heading_stack: 'system-ui sans-serif', body_stack: 'system-ui sans-serif', mono_stack: 'monospace', wcag_min_size: '16px', line_height: '1.5' };
  const dir = tmpDir('mockup-typo');
  const outPath = generateMockup('dashboard', null, typo, null, null, dir);
  const html = readFileSync(outPath, 'utf8');
  assert.ok(html.includes('type-specimen'), 'Missing typography specimens');
  assert.ok(html.includes('The quick brown fox'), 'Missing specimen text');
});

test('generateMockup HTML contains component demos', async () => {
  const { generateMockup } = await import(GENERATOR);
  const dir = tmpDir('mockup-components');
  const outPath = generateMockup('dashboard', null, null, null, null, dir);
  const html = readFileSync(outPath, 'utf8');
  assert.ok(html.includes('btn-primary'), 'Missing primary button');
  assert.ok(html.includes('data-table'), 'Missing data table');
  assert.ok(html.includes('form-input'), 'Missing form input');
  assert.ok(html.includes('<svg'), 'Missing SVG chart');
});

test('generateMockup HTML has contrast check table', async () => {
  const { generateMockup } = await import(GENERATOR);
  const pal = { name: 'Test', product_type: 'SaaS', primary: '#2563EB', primary_on: '#FFFFFF', secondary: '#3B82F6', secondary_on: '#FFFFFF', accent: '#EA580C', accent_on: '#FFFFFF', background: '#F8FAFC', foreground: '#1E293B', card: '#FFFFFF', muted: '#E2E8F0', border: '#CBD5E1', destructive: '#DC2626', wcag_level: 'AA', source: 'test' };
  const dir = tmpDir('mockup-contrast');
  const outPath = generateMockup('dashboard', pal, null, null, null, dir);
  const html = readFileSync(outPath, 'utf8');
  assert.ok(html.includes('Contrast Check'), 'Missing contrast section');
  assert.ok(html.includes(':1'), 'Missing contrast ratios');
});

// ---------------------------------------------------------------------------
// Layout variants
// ---------------------------------------------------------------------------
test('generateMockup with layout=tabs creates tabs dashboard', async () => {
  const { generateMockup } = await import(GENERATOR);
  const dir = tmpDir('mockup-tabs');
  const outPath = generateMockup('dashboard', null, null, null, 'tabs', dir);
  const html = readFileSync(outPath, 'utf8');
  assert.ok(html.includes('role="tablist"'), 'Missing tablist');
  assert.ok(html.includes('role="tabpanel"'), 'Missing tabpanel');
  assert.ok(html.includes('aria-selected'), 'Missing aria-selected');
  assert.ok(html.includes('ArrowRight'), 'Missing keyboard nav');
});

test('generateMockup with layout=sidebar creates sidebar dashboard', async () => {
  const { generateMockup } = await import(GENERATOR);
  const dir = tmpDir('mockup-sidebar');
  const outPath = generateMockup('dashboard', null, null, null, 'sidebar', dir);
  const html = readFileSync(outPath, 'utf8');
  assert.ok(html.includes('sidebar'), 'Missing sidebar class');
  assert.ok(html.includes('aria-label="Toggle sidebar"'), 'Missing toggle button');
  assert.ok(html.includes('nav-item'), 'Missing nav items');
});

test('generateMockup with layout=cards creates bento grid', async () => {
  const { generateMockup } = await import(GENERATOR);
  const dir = tmpDir('mockup-cards');
  const outPath = generateMockup('dashboard', null, null, null, 'cards', dir);
  const html = readFileSync(outPath, 'utf8');
  assert.ok(html.includes('bento-grid'), 'Missing bento grid');
  assert.ok(html.includes('bento-card'), 'Missing bento cards');
});

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------
test('generateGallery creates index.html', async () => {
  const { generateGallery } = await import(GENERATOR);
  const dir = tmpDir('gallery');
  const styles = [
    { id: '1', name: 'Swiss Grid', category: 'minimal', wcag_aa: 'AAA', source: 'test', primary_colors: '#000000', keywords: 'clean' },
    { id: '2', name: 'Flat 2.0', category: 'minimal', wcag_aa: 'AA', source: 'test', primary_colors: '#1E88E5', keywords: 'flat' },
  ];
  const palettes = [
    { name: 'Test', product_type: 'minimal', primary: '#2563EB', foreground: '#1E293B', background: '#F8FAFC', border: '#CBD5E1', muted: '#E2E8F0', secondary: '#3B82F6', accent: '#EA580C', card: '#FFFFFF', primary_on: '#FFFFFF' },
  ];
  const outPath = generateGallery(styles, palettes, dir);
  assert.ok(existsSync(outPath), 'index.html not created');
});

test('generateGallery HTML has gallery cards for each style', async () => {
  const { generateGallery } = await import(GENERATOR);
  const dir = tmpDir('gallery-cards');
  const styles = [
    { id: '1', name: 'Style One', category: 'minimal', wcag_aa: 'AA', source: 'test', keywords: 'test' },
    { id: '2', name: 'Style Two', category: 'dashboard', wcag_aa: 'AA', source: 'test', keywords: 'test' },
    { id: '3', name: 'Style Three', category: 'landing', wcag_aa: 'AA', source: 'test', keywords: 'test' },
  ];
  const palettes = [{ name: 'P', product_type: 'SaaS', primary: '#2563EB', foreground: '#1E293B', background: '#F8FAFC', border: '#CBD5E1', muted: '#E2E8F0', secondary: '#3B82F6', accent: '#EA580C', card: '#FFFFFF', primary_on: '#FFFFFF' }];
  const outPath = generateGallery(styles, palettes, dir);
  const html = readFileSync(outPath, 'utf8');
  assert.ok(html.includes('Style One'), 'Missing Style One');
  assert.ok(html.includes('Style Two'), 'Missing Style Two');
  assert.ok(html.includes('Style Three'), 'Missing Style Three');
  assert.ok(html.includes('3 styles'), 'Missing style count');
});

test('generateGallery HTML has filter buttons by category', async () => {
  const { generateGallery } = await import(GENERATOR);
  const dir = tmpDir('gallery-filter');
  const styles = [
    { id: '1', name: 'A', category: 'minimal', wcag_aa: 'AA', source: 'x', keywords: '' },
    { id: '2', name: 'B', category: 'dashboard', wcag_aa: 'AA', source: 'x', keywords: '' },
  ];
  const palettes = [{ name: 'P', product_type: 'SaaS', primary: '#000', foreground: '#000', background: '#fff', border: '#ccc', muted: '#eee', secondary: '#333', accent: '#666', card: '#fff', primary_on: '#fff' }];
  const outPath = generateGallery(styles, palettes, dir);
  const html = readFileSync(outPath, 'utf8');
  assert.ok(html.includes('filterGallery'), 'Missing filter JS');
  assert.ok(html.includes('data-cat'), 'Missing data-cat attributes');
});

test('generateGallery HTML is self-contained', async () => {
  const { generateGallery } = await import(GENERATOR);
  const dir = tmpDir('gallery-nodeps');
  const styles = [{ id: '1', name: 'Test', category: 'minimal', wcag_aa: 'AA', source: 'x', keywords: '' }];
  const palettes = [{ name: 'P', product_type: 'SaaS', primary: '#000', foreground: '#000', background: '#fff', border: '#ccc', muted: '#eee', secondary: '#333', accent: '#666', card: '#fff', primary_on: '#fff' }];
  const outPath = generateGallery(styles, palettes, dir);
  const html = readFileSync(outPath, 'utf8');
  assert.ok(!html.includes('https://fonts.googleapis'), 'Has Google Fonts');
  assert.ok(!html.includes('https://cdn.'), 'Has CDN link');
});

// ---------------------------------------------------------------------------
// CLI flags via search.js
// ---------------------------------------------------------------------------
test('search.js --mockup flag creates index.html', () => {
  const dir = tmpDir('cli-mockup');
  run(['dashboard', '--mockup', '-o', dir]);
  assert.ok(existsSync(join(dir, 'index.html')), 'index.html not created via CLI');
});

test('search.js --mockup reports path to stdout', () => {
  const dir = tmpDir('cli-mockup-stdout');
  const out = run(['dashboard', '--mockup', '-o', dir]);
  assert.ok(out.includes('Mockup generated'), 'Missing success message');
  assert.ok(out.includes('index.html'), 'Missing file path');
});

test('search.js --mockup --layout tabs creates tab dashboard', () => {
  const dir = tmpDir('cli-tabs');
  run(['dashboard', '--mockup', '--layout', 'tabs', '-o', dir]);
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.ok(html.includes('role="tablist"'), 'Missing tablist');
});

test('search.js --mockup --layout sidebar creates sidebar dashboard', () => {
  const dir = tmpDir('cli-sidebar');
  run(['dashboard', '--mockup', '--layout', 'sidebar', '-o', dir]);
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.ok(html.includes('sidebar'), 'Missing sidebar');
});

test('search.js --mockup --layout cards creates bento grid', () => {
  const dir = tmpDir('cli-cards');
  run(['dashboard', '--mockup', '--layout', 'cards', '-o', dir]);
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.ok(html.includes('bento-grid'), 'Missing bento grid');
});

test('search.js --gallery creates index.html', () => {
  const dir = tmpDir('cli-gallery');
  run(['--gallery', '-o', dir]);
  assert.ok(existsSync(join(dir, 'index.html')), 'Gallery index.html not created');
});

test('search.js --gallery reports style count', () => {
  const dir = tmpDir('cli-gallery-count');
  const out = run(['--gallery', '-o', dir]);
  assert.ok(out.includes('styles'), 'Missing style count in output');
});

test('search.js --gallery HTML contains 50+ gallery cards', () => {
  const dir = tmpDir('cli-gallery-cards');
  run(['--gallery', '-o', dir]);
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  const matches = html.match(/class="gallery-card"/g) || [];
  assert.ok(matches.length >= 50, `Expected 50+ gallery cards, got ${matches.length}`);
});

// ---------------------------------------------------------------------------
// Component files exist
// ---------------------------------------------------------------------------
test('all 9 component HTML files exist', () => {
  const required = ['button.html','card.html','table.html','tabs.html','sidebar.html',
    'chart.html','modal.html','form.html','toast.html'];
  for (const f of required) {
    assert.ok(existsSync(join(COMPONENTS_DIR, f)), `Missing component: ${f}`);
  }
});

test('all component files are self-contained HTML', () => {
  const files = ['button.html','card.html','table.html','tabs.html','sidebar.html',
    'chart.html','modal.html','form.html','toast.html'];
  for (const f of files) {
    const html = readFileSync(join(COMPONENTS_DIR, f), 'utf8');
    assert.ok(html.startsWith('<!DOCTYPE html>'), `${f}: Missing doctype`);
    assert.ok(html.includes('<style>'), `${f}: Missing inline styles`);
    assert.ok(!html.includes('https://fonts.googleapis'), `${f}: Has external font`);
  }
});

test('all component files have focus-visible styles', () => {
  const files = ['button.html','modal.html','form.html','table.html'];
  for (const f of files) {
    const html = readFileSync(join(COMPONENTS_DIR, f), 'utf8');
    assert.ok(html.includes('focus-visible'), `${f}: Missing focus-visible`);
  }
});

test('all interactive component files have aria attributes', () => {
  const checks = [
    ['modal.html', 'aria-modal'],
    ['tabs.html', 'aria-selected'],
    ['sidebar.html', 'aria-expanded'],
    ['table.html', 'aria-sort'],
    ['toast.html', 'aria-live'],
  ];
  for (const [file, attr] of checks) {
    const html = readFileSync(join(COMPONENTS_DIR, file), 'utf8');
    assert.ok(html.includes(attr), `${file}: Missing ${attr}`);
  }
});
