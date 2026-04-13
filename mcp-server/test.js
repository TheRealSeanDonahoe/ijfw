#!/usr/bin/env node

/**
 * IJFW Memory Server — Smoke Test
 * Tests all 4 tools and MCP protocol compliance.
 * Run: node mcp-server/test.js
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { rmSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = join(__dirname, 'src', 'server.js');

// Clean test state
const TEST_DIR = join(__dirname, '.test-ijfw');
if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.log(`  ✗ FAIL: ${message}`);
  }
}

async function runTest() {
  console.log('IJFW Memory Server — Smoke Test\n');

  const server = spawn('node', [SERVER_PATH], {
    env: { ...process.env, IJFW_PROJECT_DIR: TEST_DIR },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responseBuffer = '';
  const responses = [];

  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop(); // Keep incomplete line in buffer
    for (const line of lines) {
      if (line.trim()) {
        try {
          responses.push(JSON.parse(line));
        } catch {}
      }
    }
  });

  function send(msg) {
    server.stdin.write(JSON.stringify(msg) + '\n');
  }

  function waitForResponse(expectedId, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const match = responses.find(r => r.id === expectedId);
        if (match) {
          clearInterval(interval);
          resolve(match);
        }
      }, 50);
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error(`Timeout waiting for response id=${expectedId}`));
      }, timeoutMs);
    });
  }

  try {
    // --- Test 1: Initialize ---
    console.log('Protocol:');
    send({ jsonrpc: "2.0", id: 1, method: 'initialize', params: {} });
    let resp = await waitForResponse(1);
    assert(resp.result?.protocolVersion === '2024-11-05', 'Initialize returns protocol version');
    assert(resp.result?.capabilities?.tools !== undefined, 'Initialize advertises tools capability');
    assert(resp.result?.capabilities?.resources !== undefined, 'Initialize advertises resources capability');
    assert(resp.result?.capabilities?.prompts !== undefined, 'Initialize advertises prompts capability');
    assert(resp.result?.serverInfo?.name === 'ijfw-memory', 'Server name is ijfw-memory');

    // --- Test 2: Notifications (no response expected) ---
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    // No response expected — just verify no crash

    // --- Test 3: Tools list ---
    console.log('\nTools:');
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    resp = await waitForResponse(2);
    assert(resp.result?.tools?.length === 4, 'Lists exactly 4 tools');
    const toolNames = resp.result?.tools?.map(t => t.name) || [];
    assert(toolNames.includes('ijfw_memory_recall'), 'Has recall tool');
    assert(toolNames.includes('ijfw_memory_store'), 'Has store tool');
    assert(toolNames.includes('ijfw_memory_search'), 'Has search tool');
    assert(toolNames.includes('ijfw_memory_status'), 'Has status tool');

    // --- Test 4: Resources list (empty, but shouldn't error) ---
    console.log('\nProtocol compliance:');
    send({ jsonrpc: '2.0', id: 3, method: 'resources/list', params: {} });
    resp = await waitForResponse(3);
    assert(Array.isArray(resp.result?.resources), 'Resources list returns empty array');

    // --- Test 5: Prompts list (empty, but shouldn't error) ---
    send({ jsonrpc: '2.0', id: 4, method: 'prompts/list', params: {} });
    resp = await waitForResponse(4);
    assert(Array.isArray(resp.result?.prompts), 'Prompts list returns empty array');

    // --- Test 6: Ping ---
    send({ jsonrpc: '2.0', id: 5, method: 'ping', params: {} });
    resp = await waitForResponse(5);
    assert(resp.result !== undefined, 'Ping responds');

    // --- Test 7: Status (empty memory) ---
    console.log('\nTools — status:');
    send({ jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'ijfw_memory_status', arguments: {} } });
    resp = await waitForResponse(10);
    const statusText = resp.result?.content?.[0]?.text || '';
    assert(statusText.includes('Fresh project'), 'Status shows fresh project for empty memory');

    // --- Test 8: Store a decision ---
    console.log('\nTools — store:');
    send({ jsonrpc: '2.0', id: 11, method: 'tools/call', params: {
      name: 'ijfw_memory_store',
      arguments: { content: 'Use PostgreSQL for the database because of relational integrity needs.', type: 'decision', tags: ['database', 'architecture'] }
    }});
    resp = await waitForResponse(11);
    const storeText = resp.result?.content?.[0]?.text || '';
    assert(storeText.includes('Stored decision'), 'Store returns confirmation');
    assert(storeText.includes('database, architecture'), 'Store includes tags');

    // --- Test 9: Store validation — too long ---
    console.log('\nTools — validation:');
    send({ jsonrpc: '2.0', id: 12, method: 'tools/call', params: {
      name: 'ijfw_memory_store',
      arguments: { content: 'x'.repeat(6000), type: 'decision' }
    }});
    resp = await waitForResponse(12);
    const validText = resp.result?.content?.[0]?.text || '';
    assert(validText.includes('exceeds'), 'Rejects content exceeding 5000 chars');

    // --- Test 10: Store validation — invalid type ---
    send({ jsonrpc: '2.0', id: 13, method: 'tools/call', params: {
      name: 'ijfw_memory_store',
      arguments: { content: 'test', type: 'invalid_type' }
    }});
    resp = await waitForResponse(13);
    const typeText = resp.result?.content?.[0]?.text || '';
    assert(typeText.includes('must be one of'), 'Rejects invalid memory type');

    // --- Test 11: Search ---
    console.log('\nTools — search:');
    send({ jsonrpc: '2.0', id: 14, method: 'tools/call', params: {
      name: 'ijfw_memory_search',
      arguments: { query: 'PostgreSQL database' }
    }});
    resp = await waitForResponse(14);
    const searchText = resp.result?.content?.[0]?.text || '';
    assert(searchText.includes('PostgreSQL'), 'Search finds stored decision');

    // --- Test 12: Recall ---
    console.log('\nTools — recall:');
    send({ jsonrpc: '2.0', id: 15, method: 'tools/call', params: {
      name: 'ijfw_memory_recall',
      arguments: { context_hint: 'decisions' }
    }});
    resp = await waitForResponse(15);
    const recallText = resp.result?.content?.[0]?.text || '';
    assert(recallText.includes('PostgreSQL'), 'Recall returns stored decisions');

    // --- Test 13: Recall with session_start ---
    send({ jsonrpc: '2.0', id: 16, method: 'tools/call', params: {
      name: 'ijfw_memory_recall',
      arguments: { context_hint: 'session_start' }
    }});
    resp = await waitForResponse(16);
    const wakeupText = resp.result?.content?.[0]?.text || '';
    assert(wakeupText.includes('Knowledge') || wakeupText.includes('PostgreSQL'), 'Session start recall includes knowledge');

    // --- Test 14: Unknown method ---
    console.log('\nError handling:');
    send({ jsonrpc: '2.0', id: 20, method: 'unknown/method', params: {} });
    resp = await waitForResponse(20);
    assert(resp.error?.code === -32601, 'Unknown method returns -32601 error');

    // --- Test 15: Unknown tool ---
    send({ jsonrpc: '2.0', id: 21, method: 'tools/call', params: { name: 'nonexistent_tool', arguments: {} } });
    resp = await waitForResponse(21);
    assert(resp.error?.code === -32601, 'Unknown tool returns -32601 error');

  } catch (err) {
    console.log(`\n  ✗ Test error: ${err.message}`);
    failed++;
  }

  // Clean up
  server.kill();
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });

  // Summary
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Results: ${passed}/${total} passed, ${failed} failed`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  process.exit(failed > 0 ? 1 : 0);
}

runTest();
