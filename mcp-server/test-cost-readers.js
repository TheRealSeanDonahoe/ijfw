/**
 * test-cost-readers.js
 * Fixture-based tests for Claude, Codex, Gemini readers.
 * Zero deps -- node built-ins only.
 */

import { readClaudeSessions } from './src/cost/readers/claude.js';
import { readCodexSessions  } from './src/cost/readers/codex.js';
import { readGeminiSessions } from './src/cost/readers/gemini.js';
import { computeCost }        from './src/cost/pricing.js';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let pass = 0, fail = 0;
function ok(label, cond, detail) {
  if (cond) {
    console.log('  ok ' + label);
    pass++;
  } else {
    console.error('  FAIL ' + label + (detail ? ' -- ' + detail : ''));
    fail++;
  }
}

// ---- fixtures ----
const TMP = join(tmpdir(), 'ijfw-test-readers-' + Date.now());

function setupClaudeFixture() {
  const projectDir = join(TMP, 'claude', 'projects', 'test-project');
  mkdirSync(projectDir, { recursive: true });

  // Valid turn with usage
  const valid = JSON.stringify({
    type: 'message',
    timestamp: '2026-04-16T10:00:00.000Z',
    sessionId: 'sess-001',
    message: {
      role: 'assistant',
      model: 'claude-sonnet-4-5',
      usage: {
        input_tokens: 1000,
        output_tokens: 200,
        cache_read_input_tokens: 5000,
        cache_creation: {
          ephemeral_5m_input_tokens: 3000,
          ephemeral_1h_input_tokens: 1000,
        },
      },
      content: [{ type: 'tool_use', name: 'Read' }],
    },
  });

  // Turn with no usage -- should be skipped
  const noUsage = JSON.stringify({
    type: 'message',
    message: { role: 'assistant', model: 'claude-sonnet-4-5' },
  });

  // Corrupt line
  const corrupt = '{bad json[[[';

  writeFileSync(join(projectDir, 'sess-001.jsonl'),
    [valid, noUsage, corrupt].join('\n') + '\n');

  return join(TMP, 'claude', 'projects');
}

function setupCodexFixture() {
  const sessDir = join(TMP, 'codex', 'sessions', '2026', '04', '16');
  mkdirSync(sessDir, { recursive: true });

  const meta = JSON.stringify({
    type: 'session_meta',
    timestamp: '2026-04-16T10:00:00.000Z',
    payload: {
      id: 'codex-sess-001',
      model: 'gpt-5',
      collaboration_mode: { settings: { model: 'gpt-5' } },
    },
  });

  const userMsg = JSON.stringify({
    type: 'response_item',
    timestamp: '2026-04-16T10:00:01.000Z',
    payload: {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: 'Hello from user with some content here' }],
    },
  });

  const assistantMsg = JSON.stringify({
    type: 'response_item',
    timestamp: '2026-04-16T10:00:02.000Z',
    payload: {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: 'Response from the assistant with output text' }],
    },
  });

  writeFileSync(join(sessDir, 'rollout-codex-sess-001.jsonl'),
    [meta, userMsg, assistantMsg].join('\n') + '\n');

  return join(TMP, 'codex', 'sessions');
}

function setupGeminiFixture() {
  const chatDir = join(TMP, 'gemini', 'tmp', 'proj-hash-abc', 'chats');
  mkdirSync(chatDir, { recursive: true });

  const chat = {
    sessionId: 'gemini-sess-001',
    projectHash: 'proj-hash-abc',
    startTime: '2026-04-16T10:00:00.000Z',
    lastUpdated: '2026-04-16T10:05:00.000Z',
    messages: [
      { id: 'm1', timestamp: '2026-04-16T10:00:01.000Z', type: 'user',
        content: [{ text: 'User message with enough content to register tokens here please' }] },
      { id: 'm2', timestamp: '2026-04-16T10:01:00.000Z', type: 'gemini',
        content: 'Gemini response text that is long enough to be counted as output tokens in our heuristic' },
    ],
  };

  writeFileSync(join(chatDir, 'session-2026-04-16.json'), JSON.stringify(chat));
  // Also write a corrupt file
  writeFileSync(join(chatDir, 'corrupt.json'), '{bad[');

  return join(TMP, 'gemini', 'tmp');
}

// ---- run tests ----

console.log('\n-- Claude reader --');
{
  const projectsDir = setupClaudeFixture();
  const turns = readClaudeSessions(projectsDir);

  ok('returns at least 1 turn', turns.length >= 1);
  const t = turns[0];
  ok('platform is claude', t.platform === 'claude');
  ok('input_tokens correct', t.input_tokens === 1000);
  ok('output_tokens correct', t.output_tokens === 200);
  ok('cache_read_tokens correct', t.cache_read_tokens === 5000);
  ok('cache_create_tokens_5m correct', t.cache_create_tokens_5m === 3000);
  ok('cache_create_tokens_1h correct', t.cache_create_tokens_1h === 1000);
  ok('tool_name extracted', t.tool_name === 'Read');
  ok('model extracted', t.model === 'claude-sonnet-4-5');
  ok('corrupt line skipped', turns.length === 1, 'expected exactly 1 turn');
}

console.log('\n-- Codex reader --');
{
  const sessionsDir = setupCodexFixture();
  const turns = readCodexSessions(sessionsDir);

  ok('returns at least 1 turn', turns.length >= 1, JSON.stringify(turns));
  const t = turns[0];
  ok('platform is codex', t.platform === 'codex');
  ok('model extracted', t.model === 'gpt-5');
  ok('input_tokens estimated > 0', t.input_tokens > 0);
  ok('output_tokens estimated > 0', t.output_tokens > 0);
  ok('marked as estimated', t.estimated === true);

  // Accuracy: estimated turns must have a cost field but must NOT contribute to measuredCost
  const cost = computeCost(t.model, t);
  ok('codex turn produces a cost value', cost >= 0, cost);

  // Simulate what aggregator does: measuredCost excludes estimated turns
  const measuredCost  = turns.filter(r => !r.estimated).reduce((s, r) => s + computeCost(r.model, r), 0);
  const estimatedCost = turns.filter(r =>  r.estimated).reduce((s, r) => s + computeCost(r.model, r), 0);
  ok('codex estimated cost not in measuredCost', measuredCost === 0, measuredCost);
  ok('codex estimated cost in estimatedCost > 0', estimatedCost > 0, estimatedCost);
}

console.log('\n-- Gemini reader --');
{
  const tmpDir = setupGeminiFixture();
  const turns = readGeminiSessions(tmpDir);

  ok('returns at least 1 turn', turns.length >= 1);
  const t = turns[0];
  ok('platform is gemini', t.platform === 'gemini');
  ok('input_tokens estimated > 0', t.input_tokens > 0);
  ok('output_tokens estimated > 0', t.output_tokens > 0);
  ok('marked as estimated', t.estimated === true);
  ok('corrupt file did not crash reader', true); // if we got here, it passed

  // Accuracy: gemini estimated cost not in measuredCost
  const gMeasured  = turns.filter(r => !r.estimated).reduce((s, r) => s + computeCost(r.model, r), 0);
  const gEstimated = turns.filter(r =>  r.estimated).reduce((s, r) => s + computeCost(r.model, r), 0);
  ok('gemini estimated cost not in measuredCost', gMeasured === 0, gMeasured);
  ok('gemini estimated cost in estimatedCost > 0', gEstimated > 0, gEstimated);
}

// Cleanup
try { rmSync(TMP, { recursive: true }); } catch {}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
