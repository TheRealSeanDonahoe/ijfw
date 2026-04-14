import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, 'fixtures/demo-target.js');
const PKG_PATH = join(__dirname, 'package.json');

test('demo fixture exists', () => {
  assert.ok(existsSync(FIXTURE_PATH), `fixture not found: ${FIXTURE_PATH}`);
});

test('demo fixture contains CWE-476', () => {
  const src = readFileSync(FIXTURE_PATH, 'utf8');
  assert.ok(src.includes('CWE-476'), 'fixture missing CWE-476 tag');
});

test('demo fixture contains CWE-89', () => {
  const src = readFileSync(FIXTURE_PATH, 'utf8');
  assert.ok(src.includes('CWE-89'), 'fixture missing CWE-89 tag');
});

test('demo fixture contains CWE-755', () => {
  const src = readFileSync(FIXTURE_PATH, 'utf8');
  assert.ok(src.includes('CWE-755'), 'fixture missing CWE-755 tag');
});

test('package.json files field includes fixtures/', () => {
  const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
  assert.ok(Array.isArray(pkg.files), 'package.json missing "files" field');
  assert.ok(pkg.files.includes('fixtures/'), `"fixtures/" not in files: ${JSON.stringify(pkg.files)}`);
});

test('CLI source contains demo subcommand', () => {
  const cliSrc = readFileSync(join(__dirname, 'src/cross-orchestrator-cli.js'), 'utf8');
  assert.ok(cliSrc.includes("args[0] === 'demo'"), 'parseArgs missing demo branch');
  assert.ok(cliSrc.includes("cmd: 'demo'"), 'parseArgs missing demo return');
  assert.ok(cliSrc.includes('cmdDemo'), 'cmdDemo function missing from CLI');
});
