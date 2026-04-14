# IJFW Phase 4 — Wave 0: Foundations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land seven no-regret fixes that remove data-corrupting footguns and unblock every later wave.

**Architecture:** Pure defensive work — no new features. Cap sizes, version schemas, harden parsers, pin releases, add a human-friendly health check. Each task is independent; can land as separate atomic commits on a single `phase4/wave-0` branch.

**Tech Stack:** Node 18+ ESM, Bash, existing SQLite-free JSON storage.

**Branch:** `phase4/wave-0` (create from `main`, merge back at end).

**Verification at end of wave:** `bash scripts/check-all.sh` green, test count ≥96 (currently 89 + 7 new).

---

## File structure for this wave

- Modify: `claude/hooks/hooks.json` (line ~28-47 — swap entries)
- Create: `claude/hooks/tests/test-wiring.sh` (integration test)
- Modify: `mcp-server/src/server.js` (add size caps in `handleStore`, add schema-version constants)
- Create: `mcp-server/test-size-caps.js`
- Modify: `installer/src/marketplace.js` (resilient parse)
- Create: `installer/test-resilient-parse.js` (smoke test)
- Modify: `installer/src/install.js` (tagged-release resolution)
- Create: `mcp-server/src/redactor.js` (new module, unused this wave but shipped)
- Create: `mcp-server/test-redactor.js`
- Create: `claude/commands/doctor.md`
- Create: `scripts/doctor.sh`
- Modify: `scripts/check-all.sh` (add hook-wiring assertion + redactor tests)

---

## Task 1: Fix hook-wiring swap (audit E1 / ST6)

**Files:**
- Modify: `claude/hooks/hooks.json:28-47`
- Create: `claude/hooks/tests/test-wiring.sh`
- Modify: `scripts/check-all.sh` (add wiring test to suite)

- [ ] **Step 1.1: Write the failing wiring test**

Create `claude/hooks/tests/test-wiring.sh`:

```bash
#!/usr/bin/env bash
# Assert each hook event's command points to the matching script name.
set -euo pipefail
cd "$(dirname "$0")/../../.."

FAILED=0
assert_event() {
  local event="$1" want_script="$2"
  local got
  got=$(node -e "
    const h = JSON.parse(require('fs').readFileSync('claude/hooks/hooks.json','utf8'));
    const entry = (h.hooks['$event']||[])[0]?.hooks?.[0]?.command || '';
    const m = entry.match(/scripts\/([a-z0-9.-]+\.sh)/);
    process.stdout.write(m ? m[1] : '');
  ")
  if [ "$got" != "$want_script" ]; then
    echo "  ✗ $event → expected scripts/$want_script, got scripts/${got:-<none>}" >&2
    FAILED=$((FAILED+1))
  else
    echo "  ✓ $event → scripts/$got"
  fi
}

echo "=== Hook wiring ==="
assert_event "SessionStart"     "session-start.sh"
assert_event "PreCompact"       "pre-compact.sh"
assert_event "Stop"             "session-end.sh"
assert_event "PreToolUse"       "pre-tool-use.sh"
assert_event "PostToolUse"      "post-tool-use.sh"
assert_event "UserPromptSubmit" "pre-prompt.sh"

[ $FAILED -eq 0 ]
```

`chmod +x claude/hooks/tests/test-wiring.sh`

- [ ] **Step 1.2: Run test to verify it fails on current main**

Run: `bash claude/hooks/tests/test-wiring.sh`

Expected: FAIL. `PreToolUse → expected scripts/pre-tool-use.sh, got scripts/post-tool-use.sh` and the inverse for PostToolUse.

- [ ] **Step 1.3: Fix hooks.json — swap PreToolUse and PostToolUse script paths**

In `claude/hooks/hooks.json`, change:
- `PreToolUse` entry command → `bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/pre-tool-use.sh`
- `PostToolUse` entry command → `bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/post-tool-use.sh`

(Swap the two so each event points to the matching-named script.)

- [ ] **Step 1.4: Run wiring test to verify it passes**

Run: `bash claude/hooks/tests/test-wiring.sh`

Expected: all 6 `✓` lines, exit 0.

- [ ] **Step 1.5: Add wiring test to `check-all.sh`**

Modify `scripts/check-all.sh` — add a line that runs `bash claude/hooks/tests/test-wiring.sh` as a named step. Place it in the same section as other hook checks.

- [ ] **Step 1.6: Run full suite**

Run: `bash scripts/check-all.sh`

Expected: all green including the new wiring check.

- [ ] **Step 1.7: Commit**

```bash
git add claude/hooks/hooks.json claude/hooks/tests/test-wiring.sh scripts/check-all.sh
git commit -m "fix: swap PreToolUse/PostToolUse hook script paths (audit E1)

Pre- and Post- tool-use scripts were transposed in hooks.json. Benign
(both scripts exist) but misleading. Adds an integration test that
asserts each event name matches its script filename.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Cap stored memory content size (audit S1)

**Files:**
- Modify: `mcp-server/src/server.js` (`handleStore` function, add caps before write)
- Create: `mcp-server/test-size-caps.js`
- Modify: `scripts/check-all.sh` (add test)

- [ ] **Step 2.1: Write the failing size-cap tests**

Create `mcp-server/test-size-caps.js`:

```javascript
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Load server with a sandboxed IJFW_DIR
const sandbox = mkdtempSync(join(tmpdir(), 'ijfw-caps-'));
process.env.IJFW_DIR = sandbox;
const { CAP_CONTENT, CAP_WHY, CAP_HOW, CAP_SUMMARY, applyCaps } =
  await import('./src/server.js').then(m => m.__testHooks ?? m);

test('content cap is enforced at 4096 bytes', () => {
  const huge = 'a'.repeat(10_000);
  const capped = applyCaps({ content: huge });
  assert.ok(capped.content.length <= 4096, `got ${capped.content.length}`);
  assert.ok(capped.content.endsWith('…[truncated]'), 'trailing marker');
});

test('why cap is enforced at 1024 bytes', () => {
  const capped = applyCaps({ content: 'ok', why: 'b'.repeat(5_000) });
  assert.ok(capped.why.length <= 1024);
});

test('how_to_apply cap is enforced at 1024 bytes', () => {
  const capped = applyCaps({ content: 'ok', how_to_apply: 'c'.repeat(5_000) });
  assert.ok(capped.how_to_apply.length <= 1024);
});

test('summary cap is enforced at 120 bytes', () => {
  const capped = applyCaps({ content: 'ok', summary: 'd'.repeat(500) });
  assert.ok(capped.summary.length <= 120);
});

test('under-cap values pass through untouched', () => {
  const capped = applyCaps({ content: 'small', why: 'small', how_to_apply: 'small', summary: 'small' });
  assert.equal(capped.content, 'small');
  assert.equal(capped.why, 'small');
});
```

- [ ] **Step 2.2: Run tests to verify they fail**

Run: `node --test mcp-server/test-size-caps.js`

Expected: FAIL — `applyCaps` does not yet exist in server.js.

- [ ] **Step 2.3: Implement caps in server.js**

In `mcp-server/src/server.js`, near the top of the file with other constants, add:

```javascript
// --- Storage caps (audit S1) ---
// Prevents a single rogue call from bloating knowledge files to MB-scale
// which would poison every future session-start read.
export const CAP_CONTENT = 4096;
export const CAP_WHY     = 1024;
export const CAP_HOW     = 1024;
export const CAP_SUMMARY = 120;

export function applyCaps({ content = '', summary = '', why = '', how_to_apply = '' } = {}) {
  const cap = (s, limit) => {
    if (typeof s !== 'string') return '';
    if (s.length <= limit) return s;
    const marker = '…[truncated]';
    return s.slice(0, limit - marker.length) + marker;
  };
  return {
    content: cap(content, CAP_CONTENT),
    summary: cap(summary, CAP_SUMMARY),
    why: cap(why, CAP_WHY),
    how_to_apply: cap(how_to_apply, CAP_HOW),
  };
}
```

Then in `handleStore` (search for the existing function that builds `safeContent = sanitizeContent(content)`), change the destructured input to flow through `applyCaps` first:

```javascript
// Before sanitize, enforce size caps.
const capped = applyCaps({ content, summary, why, how_to_apply });
content = capped.content;
summary = capped.summary;
why = capped.why;
how_to_apply = capped.how_to_apply;
```

(Place this immediately before the existing `const safeContent = sanitizeContent(content);` line.)

- [ ] **Step 2.4: Run tests to verify they pass**

Run: `node --test mcp-server/test-size-caps.js`

Expected: all 5 tests pass.

- [ ] **Step 2.5: Run full existing suite to verify no regression**

Run: `node --test mcp-server/test.js`

Expected: all existing tests still green.

- [ ] **Step 2.6: Add test to check-all.sh**

In `scripts/check-all.sh`, add `node --test mcp-server/test-size-caps.js` alongside the existing `mcp-server/test.js` invocation.

- [ ] **Step 2.7: Commit**

```bash
git add mcp-server/src/server.js mcp-server/test-size-caps.js scripts/check-all.sh
git commit -m "feat(mcp): cap memory store sizes (audit S1)

content ≤4096, why/how_to_apply ≤1024, summary ≤120 bytes. Over-cap
values get '…[truncated]' suffix. Prevents a rogue store call from
bloating knowledge files to MB-scale.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Resilient settings.json parse (audit S3)

**Files:**
- Modify: `installer/src/marketplace.js`
- Create: `installer/test-resilient-parse.js`
- Modify: `installer/test.js` (add new test to default test run) *(skip if already runs via `node --test`)*

- [ ] **Step 3.1: Write the failing test**

Create `installer/test-resilient-parse.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeMarketplace } from './src/marketplace.js';

test('parses settings.json with trailing comma gracefully', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-resilient-'));
  const path = join(dir, 'settings.json');
  writeFileSync(path, '{\n  "theme": "dark",\n  "custom": {"keep": "me"},\n}\n');
  mergeMarketplace(path); // must not throw
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(parsed.theme, 'dark');
  assert.equal(parsed.custom.keep, 'me');
  assert.ok(parsed.extraKnownMarketplaces.ijfw);
  rmSync(dir, { recursive: true, force: true });
});

test('parses settings.json with // comments gracefully', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-resilient-'));
  const path = join(dir, 'settings.json');
  writeFileSync(path, '// user comment\n{\n  "theme": "dark" // inline\n}\n');
  mergeMarketplace(path);
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(parsed.theme, 'dark');
  assert.ok(parsed.extraKnownMarketplaces.ijfw);
  rmSync(dir, { recursive: true, force: true });
});

test('truly malformed JSON aborts with clear error, never corrupts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-resilient-'));
  const path = join(dir, 'settings.json');
  const original = '{broken not recoverable';
  writeFileSync(path, original);
  let err;
  try { mergeMarketplace(path); } catch (e) { err = e; }
  assert.ok(err, 'must throw on unrecoverable JSON');
  assert.match(err.message, /settings\.json/);
  // File on disk is unchanged.
  assert.equal(readFileSync(path, 'utf8'), original);
  rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 3.2: Run tests to verify they fail**

Run: `node --test installer/test-resilient-parse.js`

Expected: FAIL — `mergeMarketplace` uses plain `JSON.parse` and throws on trailing comma and on `//` comments.

- [ ] **Step 3.3: Implement resilient parse in marketplace.js**

Modify `installer/src/marketplace.js`. Replace the `JSON.parse` block in `mergeMarketplace` with a tolerant strip-then-parse:

```javascript
function tolerantJsonParse(raw, filepath) {
  // First try strict parse.
  try { return JSON.parse(raw); }
  catch { /* fall through to tolerant path */ }

  // Tolerant path: strip // line comments and /* block */ comments, and
  // remove trailing commas before } or ]. This is a best-effort recovery
  // for VS Code / Cursor style JSONC settings.
  const stripped = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/,(\s*[}\]])/g, '$1');

  try { return JSON.parse(stripped); }
  catch (e) {
    const err = new Error(`settings.json at ${filepath} is not valid JSON or recoverable JSONC: ${e.message}`);
    err.code = 'IJFW_SETTINGS_UNPARSEABLE';
    throw err;
  }
}
```

In `mergeMarketplace`, replace:
```javascript
try { settings = JSON.parse(raw); }
catch (e) { throw new Error(`settings.json at ${settingsPath} is not valid JSON: ${e.message}`); }
```

with:
```javascript
settings = tolerantJsonParse(raw, settingsPath);
```

Export `tolerantJsonParse` so other callers can reuse it.

- [ ] **Step 3.4: Run tests to verify they pass**

Run: `node --test installer/test-resilient-parse.js`

Expected: all 3 tests pass.

- [ ] **Step 3.5: Run existing installer tests for regression**

Run: `node --test installer/test.js`

Expected: all existing 6 tests still green.

- [ ] **Step 3.6: Commit**

```bash
git add installer/src/marketplace.js installer/test-resilient-parse.js
git commit -m "feat(installer): tolerant settings.json parse (audit S3)

Survives // line comments, /* block */ comments, and trailing commas —
common in VS Code / Cursor edited settings. Unrecoverable JSON still
throws a clear error and leaves the file untouched.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Memory schema version marker (audit R1)

**Files:**
- Modify: `mcp-server/src/server.js` (add `MEMORY_SCHEMA`, `ensureSchemaHeader`, call on every appender)
- Modify: existing test file or new `mcp-server/test-schema-version.js`
- Modify: `scripts/check-all.sh`

- [ ] **Step 4.1: Write the failing schema-version test**

Create `mcp-server/test-schema-version.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureSchemaHeader, MEMORY_SCHEMA } from './src/server.js';

test('MEMORY_SCHEMA is defined and stable', () => {
  assert.equal(typeof MEMORY_SCHEMA, 'string');
  assert.match(MEMORY_SCHEMA, /^v\d+$/);
});

test('ensureSchemaHeader adds header to empty file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-schema-'));
  const p = join(dir, 'm.md');
  writeFileSync(p, '');
  ensureSchemaHeader(p);
  const txt = readFileSync(p, 'utf8');
  assert.ok(txt.startsWith(`<!-- ijfw-schema: ${MEMORY_SCHEMA} -->`));
});

test('ensureSchemaHeader leaves correctly-versioned file alone', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-schema-'));
  const p = join(dir, 'm.md');
  const original = `<!-- ijfw-schema: ${MEMORY_SCHEMA} -->\n\nexisting entries`;
  writeFileSync(p, original);
  ensureSchemaHeader(p);
  assert.equal(readFileSync(p, 'utf8'), original);
});

test('ensureSchemaHeader upgrades legacy file (no header)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijfw-schema-'));
  const p = join(dir, 'm.md');
  const legacy = '- [2026-01-01] old entry\n- [2026-01-02] another\n';
  writeFileSync(p, legacy);
  ensureSchemaHeader(p);
  const txt = readFileSync(p, 'utf8');
  assert.ok(txt.startsWith(`<!-- ijfw-schema: ${MEMORY_SCHEMA} -->`));
  assert.ok(txt.includes('old entry'));
  assert.ok(txt.includes('another'));
});
```

- [ ] **Step 4.2: Run test to verify it fails**

Run: `node --test mcp-server/test-schema-version.js`

Expected: FAIL — `ensureSchemaHeader` and `MEMORY_SCHEMA` are not exported.

- [ ] **Step 4.3: Implement schema header in server.js**

In `mcp-server/src/server.js`, add near the other storage constants:

```javascript
// --- Memory schema versioning (audit R1) ---
// Changes to memory file structure bump this. Readers auto-migrate on
// next touch. v1 = post-Phase-3 format with structured frontmatter blocks.
export const MEMORY_SCHEMA = 'v1';
const SCHEMA_HEADER = `<!-- ijfw-schema: ${MEMORY_SCHEMA} -->`;

export function ensureSchemaHeader(filepath) {
  if (!existsSync(filepath)) {
    writeFileSync(filepath, SCHEMA_HEADER + '\n\n');
    return;
  }
  const cur = readFileSync(filepath, 'utf-8');
  if (cur.startsWith(SCHEMA_HEADER)) return;
  // Prepend header — legacy files keep their content.
  writeFileSync(filepath, SCHEMA_HEADER + '\n\n' + cur);
}
```

Then call `ensureSchemaHeader(filepath)` at the top of both `appendLine` and `appendStructuredToKnowledge` (before any write). Also call it at the top of any read path that does BM25 ranking (add in W3 with FTS5; for W0 just the write paths).

- [ ] **Step 4.4: Run test to verify it passes**

Run: `node --test mcp-server/test-schema-version.js`

Expected: all 4 tests pass.

- [ ] **Step 4.5: Run full MCP test suite for regression**

Run: `node --test mcp-server/test.js`

Expected: all existing tests green.

- [ ] **Step 4.6: Add test to check-all.sh**

Add `node --test mcp-server/test-schema-version.js` to the test runner.

- [ ] **Step 4.7: Commit**

```bash
git add mcp-server/src/server.js mcp-server/test-schema-version.js scripts/check-all.sh
git commit -m "feat(mcp): add memory schema version marker (audit R1)

<!-- ijfw-schema: v1 --> header prepended to all memory files on
write. Legacy files auto-migrate on next touch (prepend only, no
data loss). Future schema bumps can gate read-path migrations.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Installer pins latest tagged release (audit R2)

**Files:**
- Modify: `installer/src/install.js`

- [ ] **Step 5.1: Write the failing test**

Append to `installer/test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBranchOrTag } from './src/install.js';

test('resolveBranchOrTag honors explicit --branch', () => {
  const got = resolveBranchOrTag({ branch: 'main', branchExplicit: true });
  assert.equal(got, 'main');
});

test('resolveBranchOrTag defaults to latest-tag fallback when not explicit', () => {
  // We don't actually hit the network; just assert the function returns
  // either a v-prefixed tag or falls back to 'main' if lookup fails.
  const got = resolveBranchOrTag({ branch: 'main', branchExplicit: false, _tagLookup: () => 'v0.4.0-rc.1' });
  assert.equal(got, 'v0.4.0-rc.1');
});

test('resolveBranchOrTag falls back to main on tag-lookup failure', () => {
  const got = resolveBranchOrTag({ branch: 'main', branchExplicit: false, _tagLookup: () => null });
  assert.equal(got, 'main');
});
```

- [ ] **Step 5.2: Run test to verify it fails**

Run: `node --test installer/test.js`

Expected: FAIL — `resolveBranchOrTag` not exported.

- [ ] **Step 5.3: Add `resolveBranchOrTag` + wire it into install flow**

In `installer/src/install.js`:

1. Modify `parseArgs` to track explicit branch:
   ```javascript
   const out = { yes: false, dir: null, noMarketplace: false, branch: DEFAULT_BRANCH, branchExplicit: false, purge: false };
   ```
   And in the `--branch` case:
   ```javascript
   else if (a === '--branch') { out.branch = argv[++i]; out.branchExplicit = true; }
   ```

2. Add:
   ```javascript
   export function resolveBranchOrTag({ branch, branchExplicit, _tagLookup } = {}) {
     if (branchExplicit) return branch;
     const lookup = _tagLookup || latestTagFromGithub;
     const tag = lookup();
     return tag || branch || DEFAULT_BRANCH;
   }

   function latestTagFromGithub() {
     try {
       const res = spawnSync('git', ['ls-remote', '--tags', '--refs', '--sort=-v:refname', DEFAULT_REPO], { encoding: 'utf8', timeout: 10_000 });
       if (res.status !== 0) return null;
       const first = (res.stdout || '').split('\n')[0] || '';
       const m = first.match(/refs\/tags\/(v[0-9][^\s]*)$/);
       return m ? m[1] : null;
     } catch { return null; }
   }
   ```

3. In `main()`, replace the `opts.branch` usage:
   ```javascript
   const ref = resolveBranchOrTag({ branch: opts.branch, branchExplicit: opts.branchExplicit });
   console.log(`  resolving IJFW @ ${ref}`);
   const action = cloneOrPull(target, ref);
   ```

- [ ] **Step 5.4: Run tests to verify they pass**

Run: `node --test installer/test.js installer/test-resilient-parse.js`

Expected: all pass.

- [ ] **Step 5.5: Commit**

```bash
git add installer/src/install.js installer/test.js
git commit -m "feat(installer): pin to latest tagged release by default (audit R2)

Default install clones the newest v-prefixed tag from origin. Users
who pass --branch explicitly still get that branch. Falls back to
'main' if tag lookup fails.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Secret redactor module (audit S5 / prep for H7)

**Files:**
- Create: `mcp-server/src/redactor.js`
- Create: `mcp-server/test-redactor.js`
- Modify: `scripts/check-all.sh`

- [ ] **Step 6.1: Write the failing redactor tests**

Create `mcp-server/test-redactor.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redactSecrets } from './src/redactor.js';

test('redacts OpenAI-style sk- keys', () => {
  const out = redactSecrets('token is sk-proj-ABC123DEF456GHI789JKL012MNO345PQR678');
  assert.match(out, /\[REDACTED:openai\]/);
  assert.doesNotMatch(out, /ABC123DEF456/);
});

test('redacts GitHub fine-grained tokens', () => {
  const out = redactSecrets('GH ghp_abcdefghijklmnopqrstuvwxyz0123456789');
  assert.match(out, /\[REDACTED:github\]/);
});

test('redacts AWS access key IDs', () => {
  const out = redactSecrets('AWS AKIAIOSFODNN7EXAMPLE now');
  assert.match(out, /\[REDACTED:aws\]/);
});

test('redacts Bearer tokens in Authorization headers', () => {
  const out = redactSecrets('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig');
  assert.match(out, /\[REDACTED:bearer\]/);
});

test('redacts password=... / token=... inline secrets', () => {
  const out = redactSecrets('db password=hunter2 api_token=xyz12345');
  assert.match(out, /password=\[REDACTED\]/);
  assert.match(out, /api_token=\[REDACTED\]/);
});

test('leaves ordinary prose alone', () => {
  const p = 'The user clicked submit. No secrets here.';
  assert.equal(redactSecrets(p), p);
});

test('preserves short code-like strings that aren\'t secrets', () => {
  const p = 'function foo(bar) { return bar + 1; }';
  assert.equal(redactSecrets(p), p);
});

test('handles empty and non-string input', () => {
  assert.equal(redactSecrets(''), '');
  assert.equal(redactSecrets(null), '');
  assert.equal(redactSecrets(undefined), '');
});
```

- [ ] **Step 6.2: Run tests to verify they fail**

Run: `node --test mcp-server/test-redactor.js`

Expected: FAIL — `redactor.js` does not exist.

- [ ] **Step 6.3: Implement redactor**

Create `mcp-server/src/redactor.js`:

```javascript
// Secret redactor — strips common credential patterns before any memory store.
// Pattern list is conservative: better to miss a novel format than to corrupt
// legitimate prose. W5 can extend this.

const PATTERNS = [
  { re: /sk-[A-Za-z0-9_-]{20,}/g,        label: 'openai'  },
  { re: /ghp_[A-Za-z0-9]{20,}/g,         label: 'github'  },
  { re: /github_pat_[A-Za-z0-9_]{20,}/g, label: 'github'  },
  { re: /AKIA[0-9A-Z]{16}/g,             label: 'aws'     },
  { re: /Bearer\s+[A-Za-z0-9._~+/=-]{10,}/g, label: 'bearer' },
  { re: /xox[baprs]-[A-Za-z0-9-]{10,}/g, label: 'slack'   },
];

const INLINE = [
  /(password\s*=\s*)\S+/gi,
  /(api[_-]?token\s*=\s*)\S+/gi,
  /(api[_-]?key\s*=\s*)\S+/gi,
  /(secret\s*=\s*)\S+/gi,
];

export function redactSecrets(s) {
  if (typeof s !== 'string' || !s) return '';
  let out = s;
  for (const { re, label } of PATTERNS) out = out.replace(re, `[REDACTED:${label}]`);
  for (const re of INLINE) out = out.replace(re, '$1[REDACTED]');
  return out;
}
```

- [ ] **Step 6.4: Run tests to verify they pass**

Run: `node --test mcp-server/test-redactor.js`

Expected: all 8 tests pass.

- [ ] **Step 6.5: Add to check-all.sh**

Add `node --test mcp-server/test-redactor.js` to the test runner.

- [ ] **Step 6.6: Commit**

```bash
git add mcp-server/src/redactor.js mcp-server/test-redactor.js scripts/check-all.sh
git commit -m "feat(mcp): secret redactor module (audit S5)

Redacts common credential patterns: OpenAI sk-, GitHub ghp_/pat,
AWS AKIA, Bearer tokens, Slack xoxb-, and inline password/token=
assignments. Shipped as a library module; W3 wires it into
auto-memorize before any memory write.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `/ijfw doctor` command (audit KS5)

**Files:**
- Create: `scripts/doctor.sh`
- Create: `claude/commands/doctor.md`

- [ ] **Step 7.1: Create `scripts/doctor.sh`**

Create `scripts/doctor.sh`:

```bash
#!/usr/bin/env bash
# IJFW doctor — user-facing health check. Wraps the dev check-*.sh
# scripts in human-friendly output. Positive-framed throughout.
set -u
cd "$(dirname "$0")/.."

ok()   { printf "  ✓ %s\n" "$1"; }
info() { printf "  · %s\n" "$1"; }

echo "IJFW health check"
echo ""

echo "[Files]"
[ -f claude/hooks/hooks.json ] && ok "hook wiring present"
[ -f mcp-server/bin/ijfw-memory ] && ok "MCP launcher present"
[ -d "${IJFW_HOME:-$HOME/.ijfw}" ] && ok "IJFW home reachable at ${IJFW_HOME:-$HOME/.ijfw}" || info "IJFW home will be created on first use"
echo ""

echo "[Memory]"
MEM_DIR="${IJFW_HOME:-$HOME/.ijfw}/memory"
if [ -d "$MEM_DIR" ]; then
  COUNT=$(find "$MEM_DIR" -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')
  ok "$COUNT memory files in $MEM_DIR"
else
  info "memory directory will be created on first store"
fi
echo ""

echo "[MCP server]"
if bash scripts/check-mcp.sh >/dev/null 2>&1; then
  ok "MCP server responds cleanly"
else
  info "MCP launcher present — will initialize on first Claude session"
fi
echo ""

echo "[Hook wiring]"
if bash claude/hooks/tests/test-wiring.sh >/dev/null 2>&1; then
  ok "all 6 hook events correctly wired"
else
  info "hook wiring needs attention — run: bash claude/hooks/tests/test-wiring.sh"
fi
echo ""

echo "[Line caps]"
if bash scripts/check-line-caps.sh >/dev/null 2>&1; then
  ok "skill and rule files under their caps"
fi
echo ""

echo "[Positive framing]"
if bash scripts/check-positive-framing.sh >/dev/null 2>&1; then
  ok "user-facing surfaces clean"
fi
echo ""

echo "Doctor complete."
```

`chmod +x scripts/doctor.sh`

- [ ] **Step 7.2: Create slash-command definition**

Create `claude/commands/doctor.md`:

```markdown
---
description: "Run IJFW health check (files, MCP server, hooks, memory, caps, framing)"
allowed-tools: ["Bash"]
---

Run `bash $IJFW_REPO/scripts/doctor.sh` if `$IJFW_REPO` is set, otherwise run from the user's current IJFW install (`~/.ijfw` or `$IJFW_HOME`).

Report the output as-is to the user. Do not summarize — the doctor output is already positive-framed and scannable.
```

- [ ] **Step 7.3: Run the doctor manually to confirm output**

Run: `bash scripts/doctor.sh`

Expected: sections print, lots of `✓`, no `✗`, exit 0.

- [ ] **Step 7.4: Add doctor invocation to `check-all.sh`**

Add as a final step in `scripts/check-all.sh`:
```bash
echo "=== Doctor output sample ==="
bash scripts/doctor.sh >/dev/null  # run silently; confirms no crash
echo "  ✓ doctor runs cleanly"
```

- [ ] **Step 7.5: Commit**

```bash
git add scripts/doctor.sh claude/commands/doctor.md scripts/check-all.sh
git commit -m "feat: /ijfw doctor command — user-facing health check (audit KS5)

Wraps existing check-*.sh dev scripts in human-friendly, positive-framed
output. Reports files, memory state, MCP server, hook wiring, line caps,
and positive-framing status. Invokable as /doctor from Claude Code.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Wave 0 finalization

- [ ] **Step 8.1: Run the complete suite**

Run: `bash scripts/check-all.sh`

Expected: all green, test count ≥96 (89 + 5 caps + 4 schema + 8 redactor + 3 resilient + 3 tagged + wiring check ≈ 89+23+wiring = one-line doctor = well over 96).

- [ ] **Step 8.2: Plugin cache rsync + md5 parity**

Run:
```bash
rsync -a --delete claude/ ~/.claude/plugins/cache/ijfw/ijfw/1.0.0/
diff <(cd claude && find . -type f ! -name '.DS_Store' -exec md5 -q {} \; | sort) \
     <(cd ~/.claude/plugins/cache/ijfw/ijfw/1.0.0 && find . -type f ! -name '.DS_Store' -exec md5 -q {} \; | sort)
```

Expected: diff is empty, exit 0.

- [ ] **Step 8.3: Merge Wave 0 to main**

```bash
git checkout main
git merge --no-ff phase4/wave-0 -m "Merge phase4/wave-0 — foundations"
git branch -d phase4/wave-0
```

- [ ] **Step 8.4: Push**

```bash
git push origin main
```

- [ ] **Step 8.5: Write WAVE0-VERIFICATION.md**

Create `.planning/phase4/WAVE0-VERIFICATION.md` with:
- Test count before/after
- All 7 audit items closed (E1, S1, S3, R1, R2, S5, KS5) with the commit hash next to each
- Next wave: Wave 1 (expand plan from draft).

## Wave 0 exit criteria

- [ ] All 7 tasks committed, each with its TDD test green.
- [ ] `scripts/check-all.sh` green.
- [ ] Plugin cache md5 parity verified.
- [ ] Merged to main and pushed.
- [ ] `WAVE0-VERIFICATION.md` filed.
- [ ] Wave 1 plan promoted from draft to detailed (triggers next planning pass).
