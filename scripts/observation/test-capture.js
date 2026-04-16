import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendObservation, getSession, getRecent, readAll } from './ledger.js';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { homedir } from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Override IJFW global dir for test isolation via env patching
// We test via the exported API (ledger.js uses homedir() which we cannot override here),
// so tests use the real ~/.ijfw path but in a session-id-namespaced way.

const TEST_SESSION = `test-session-${Date.now()}`;

test('appendObservation returns record with id', () => {
  const rec = appendObservation({
    ts: new Date().toISOString(),
    type: 'change',
    title: 'Test append',
    files: [],
    session_id: TEST_SESSION,
    platform: 'claude-code',
    project: 'ijfw',
  });
  assert.ok(rec.id > 0, 'id should be positive integer');
  assert.equal(rec.type, 'change');
});

test('getSession returns observations for session', () => {
  const sid = `test-get-session-${Date.now()}`;
  appendObservation({ ts: new Date().toISOString(), type: 'discovery', title: 'obs1', files: [], session_id: sid, platform: 'claude-code', project: 'ijfw' });
  appendObservation({ ts: new Date().toISOString(), type: 'change',    title: 'obs2', files: [], session_id: sid, platform: 'claude-code', project: 'ijfw' });
  const results = getSession(sid);
  assert.equal(results.length, 2);
});

test('getRecent returns at most N observations', () => {
  const recent = getRecent(3);
  assert.ok(recent.length <= 3);
});

test('atomic append: 10 concurrent appenders produce 10+ valid lines', async () => {
  const promises = [];
  const concSession = `concurrent-${Date.now()}`;
  const captureScript = join(__dirname, 'capture.js');

  for (let i = 0; i < 10; i++) {
    promises.push(new Promise((resolve) => {
      const payload = JSON.stringify({
        hook_event_name: 'PostToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: `file${i}.js` },
        tool_response: { output: 'ok' },
      });
      const child = spawn(process.execPath, [captureScript], {
        env: {
          ...process.env,
          IJFW_SESSION_ID: concSession,
          IJFW_PLATFORM: 'claude-code',
          IJFW_PROJECT: 'ijfw',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      child.stdin.write(payload);
      child.stdin.end();
      child.on('close', resolve);
    }));
  }

  await Promise.all(promises);

  // Allow tiny fs settle time
  await new Promise(r => setTimeout(r, 200));

  const session_obs = getSession(concSession);
  assert.ok(session_obs.length >= 10, `Expected >= 10 observations, got ${session_obs.length}`);

  // All must be valid JSON (readAll() already filters invalids)
  for (const o of session_obs) {
    assert.ok(typeof o.id === 'number', 'id should be number');
    assert.ok(typeof o.type === 'string', 'type should be string');
  }
});
