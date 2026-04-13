#!/usr/bin/env node

/**
 * IJFW Memory Server — Cross-platform MCP memory for AI coding agents
 * By Sean Donahoe | "It Just Fucking Works"
 *
 * 4 tools: recall, store, search, status
 * Storage: Markdown files (hot layer, zero dependencies)
 * Protocol: MCP over stdio (JSON-RPC 2.0)
 *
 * Architecture:
 *   - Project memory: .ijfw/memory/ (journal, knowledge base, handoff)
 *   - Session logs: .ijfw/sessions/
 *   - Global prefs: ~/.ijfw/memory/ (cross-project)
 *   - All storage is plain markdown — human-readable, git-friendly
 *
 * Designed for Phase 1. Phase 2 adds SQLite FTS5 warm layer.
 */

import { createInterface } from 'readline';
import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
  appendFileSync, readdirSync, statSync
} from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// --- Constants ---
const MAX_STORE_LENGTH = 5000;       // Max chars per store operation
const MAX_SEARCH_RESULTS = 20;       // Hard cap on search results
const MAX_FILE_READ = 500000;        // Max file size to read (500KB)
const VALID_MEMORY_TYPES = ['decision', 'observation', 'pattern', 'handoff', 'preference'];

// --- Configuration ---
const PROJECT_DIR = process.env.IJFW_PROJECT_DIR || process.cwd();
const IJFW_DIR = join(PROJECT_DIR, '.ijfw');
const MEMORY_DIR = join(IJFW_DIR, 'memory');
const SESSIONS_DIR = join(IJFW_DIR, 'sessions');
const GLOBAL_DIR = join(homedir(), '.ijfw', 'memory');

// Ensure directories exist (safe — mkdirSync with recursive won't fail if exists)
try {
  [MEMORY_DIR, SESSIONS_DIR, GLOBAL_DIR].forEach(dir => {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  });
} catch (err) {
  // Non-fatal: global dir might fail on restricted systems
  // Project dirs should always work
  try {
    [MEMORY_DIR, SESSIONS_DIR].forEach(dir => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    });
  } catch (innerErr) {
    // If even project dirs fail, server will still start but storage won't work
    process.stderr.write(`IJFW: Warning — could not create directories: ${innerErr.message}\n`);
  }
}

// --- Safe File Operations ---

/**
 * Read a markdown file safely. Returns null if missing, empty, or too large.
 */
function readMarkdownFile(filepath) {
  try {
    if (!existsSync(filepath)) return null;
    const stats = statSync(filepath);
    if (stats.size > MAX_FILE_READ) return null; // Skip files that are too large
    return readFileSync(filepath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Append an entry to the project journal.
 * Sanitises content to prevent markdown structure corruption.
 */
function appendToJournal(entry) {
  try {
    const journalPath = join(MEMORY_DIR, 'project-journal.md');
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    // Sanitise: prevent injected headings from breaking journal structure
    const sanitised = entry.replace(/^#{1,3}\s/gm, '- ');
    const formatted = `\n## ${timestamp}\n${sanitised}\n`;

    if (!existsSync(journalPath)) {
      writeFileSync(journalPath, `# IJFW Project Journal\n${formatted}`);
    } else {
      appendFileSync(journalPath, formatted);
    }
  } catch (err) {
    // Non-fatal: log but don't crash
    process.stderr.write(`IJFW: Warning — could not write to journal: ${err.message}\n`);
  }
}

function readKnowledgeBase() {
  return readMarkdownFile(join(MEMORY_DIR, 'knowledge.md')) || '';
}

function readHandoff() {
  return readMarkdownFile(join(MEMORY_DIR, 'handoff.md')) || '';
}

function readGlobalKnowledge() {
  return readMarkdownFile(join(GLOBAL_DIR, 'global-knowledge.md')) || '';
}

function getSessionCount() {
  try {
    if (!existsSync(SESSIONS_DIR)) return 0;
    return readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.md')).length;
  } catch {
    return 0;
  }
}

function getDecisionCount() {
  const journal = readMarkdownFile(join(MEMORY_DIR, 'project-journal.md'));
  if (!journal) return 0;
  return (journal.match(/^- /gm) || []).length;
}

function getRecentJournalEntries(count = 5) {
  const journal = readMarkdownFile(join(MEMORY_DIR, 'project-journal.md'));
  if (!journal) return '';
  const sections = journal.split(/^## /gm).filter(s => s.trim());
  return sections.slice(-count).map(s => `## ${s}`).join('\n');
}

// --- Search (keyword matching — Phase 2 upgrades to SQLite FTS5) ---

function searchMemory(query, limit = 10) {
  // Enforce hard cap
  limit = Math.min(limit, MAX_SEARCH_RESULTS);

  const results = [];
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);

  if (keywords.length === 0) return results;

  const sources = [
    { name: 'knowledge', content: readKnowledgeBase() },
    { name: 'journal', content: readMarkdownFile(join(MEMORY_DIR, 'project-journal.md')) || '' },
    { name: 'handoff', content: readHandoff() },
    { name: 'global', content: readGlobalKnowledge() }
  ];

  for (const source of sources) {
    if (!source.content) continue;
    const lines = source.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().length === 0) continue;
      const score = keywords.filter(k => line.toLowerCase().includes(k)).length;
      if (score > 0) {
        results.push({
          source: source.name,
          line: i + 1,
          content: line.trim().substring(0, 200), // Truncate long lines
          score
        });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// --- MCP Tool Definitions ---

const TOOLS = [
  {
    name: 'ijfw_memory_recall',
    description: 'Retrieve context from IJFW memory. Call at session start or when needing past decisions, handoff state, or project knowledge. Returns progressively detailed context.',
    inputSchema: {
      type: 'object',
      properties: {
        context_hint: {
          type: 'string',
          description: 'What context is needed: "session_start" for wake-up injection, "handoff" for last session state, "decisions" for recent decisions, or a natural language query.'
        },
        detail_level: {
          type: 'string',
          enum: ['summary', 'standard', 'full'],
          description: 'Level of detail. Summary: ~200 tokens. Standard: recent context. Full: everything.'
        }
      },
      required: ['context_hint']
    }
  },
  {
    name: 'ijfw_memory_store',
    description: 'Store a decision, observation, or session state in IJFW memory. Called automatically by hooks, or explicitly for important decisions.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'What to remember. Be specific: decision + rationale, observation + context, or session state. Max 5000 chars.'
        },
        type: {
          type: 'string',
          enum: VALID_MEMORY_TYPES,
          description: 'Memory type. Decisions promote to knowledge base. Preferences go to global.'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorisation (e.g., ["auth", "architecture"]).'
        }
      },
      required: ['content', 'type']
    }
  },
  {
    name: 'ijfw_memory_search',
    description: 'Search across all IJFW memory — knowledge base, journal, handoffs, global. Use for specific past decisions, patterns, or context.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query.'
        },
        limit: {
          type: 'number',
          description: 'Max results (default 10, max 20).'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'ijfw_memory_status',
    description: 'Compressed critical-facts summary (~200 tokens) for context injection. Use at session start.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// --- Tool Handlers ---

function handleRecall({ context_hint, detail_level = 'standard' }) {
  const parts = [];

  if (context_hint === 'session_start' || detail_level === 'summary') {
    const knowledge = readKnowledgeBase();
    const handoff = readHandoff();
    const global = readGlobalKnowledge();

    if (knowledge) parts.push(`## Knowledge\n${knowledge.split('\n').slice(0, 20).join('\n')}`);
    if (handoff) parts.push(`## Last Session\n${handoff.split('\n').slice(0, 15).join('\n')}`);
    if (global) parts.push(`## Preferences\n${global.split('\n').slice(0, 10).join('\n')}`);

    return parts.join('\n\n') || 'First session on this project. No memory stored yet.';
  }

  if (context_hint === 'handoff') {
    return readHandoff() || 'No handoff from previous session.';
  }

  if (context_hint === 'decisions') {
    return getRecentJournalEntries(10) || 'No decisions recorded yet.';
  }

  // Natural language query — use search
  const results = searchMemory(context_hint);
  if (results.length === 0) return `No memories matching: ${context_hint}`;
  return results.map(r => `[${r.source}] ${r.content}`).join('\n');
}

function handleStore({ content, type, tags = [] }) {
  // --- Input Validation ---
  if (!content || typeof content !== 'string') {
    return 'Error: content is required and must be a string.';
  }
  if (content.length > MAX_STORE_LENGTH) {
    return `Error: content exceeds ${MAX_STORE_LENGTH} character limit (got ${content.length}). Summarise and retry.`;
  }
  if (!VALID_MEMORY_TYPES.includes(type)) {
    return `Error: type must be one of: ${VALID_MEMORY_TYPES.join(', ')}`;
  }
  if (!Array.isArray(tags)) {
    tags = [];
  }
  // Sanitise tags
  tags = tags.filter(t => typeof t === 'string').map(t => t.substring(0, 50));

  const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
  const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
  const entry = `- **${type}**${tagStr}: ${content}`;

  // Always append to journal
  appendToJournal(entry);

  // Decisions also go to knowledge base
  if (type === 'decision') {
    try {
      const kbPath = join(MEMORY_DIR, 'knowledge.md');
      const existing = readMarkdownFile(kbPath) || '# IJFW Knowledge Base\n';
      writeFileSync(kbPath, `${existing}\n${entry}`);
    } catch (err) {
      process.stderr.write(`IJFW: Warning — could not update knowledge base: ${err.message}\n`);
    }
  }

  // Preferences go to global knowledge
  if (type === 'preference') {
    try {
      const globalPath = join(GLOBAL_DIR, 'global-knowledge.md');
      const existing = readMarkdownFile(globalPath) || '# IJFW Global Preferences\n';
      writeFileSync(globalPath, `${existing}\n${entry}`);
    } catch (err) {
      process.stderr.write(`IJFW: Warning — could not update global preferences: ${err.message}\n`);
    }
  }

  // Handoff type overwrites the handoff file
  if (type === 'handoff') {
    try {
      writeFileSync(join(MEMORY_DIR, 'handoff.md'), content);
    } catch (err) {
      process.stderr.write(`IJFW: Warning — could not write handoff: ${err.message}\n`);
    }
  }

  return `Stored ${type}${tagStr} at ${timestamp}`;
}

function handleSearch({ query, limit = 10 }) {
  if (!query || typeof query !== 'string') {
    return 'Error: query is required and must be a string.';
  }
  if (query.length > 500) {
    query = query.substring(0, 500);
  }

  const results = searchMemory(query, limit);
  if (results.length === 0) return `No results for: "${query}"`;

  return results.map(r =>
    `[${r.source}:L${r.line}] ${r.content}`
  ).join('\n');
}

function handleStatus() {
  const sessionCount = getSessionCount();
  const decisionCount = getDecisionCount();
  const hasKnowledge = existsSync(join(MEMORY_DIR, 'knowledge.md'));
  const hasHandoff = existsSync(join(MEMORY_DIR, 'handoff.md'));
  const hasGlobal = existsSync(join(GLOBAL_DIR, 'global-knowledge.md'));

  const parts = [];

  if (hasKnowledge) {
    const kb = readKnowledgeBase();
    const kbLines = kb.split('\n').filter(l => l.startsWith('- ')).length;
    parts.push(`Knowledge: ${kbLines} entries`);
  }

  if (sessionCount > 0 || decisionCount > 0) {
    parts.push(`History: ${sessionCount} sessions, ${decisionCount} tracked items`);
  }

  if (hasHandoff) {
    const handoff = readHandoff();
    const statusLine = handoff.split('\n').find(
      l => !l.startsWith('#') && !l.startsWith('-') && l.trim().length > 0
    );
    if (statusLine) parts.push(`Last: ${statusLine.trim().substring(0, 150)}`);
  }

  if (hasGlobal) parts.push('Global preferences loaded');

  return parts.join('\n') || 'Fresh project — no memory yet.';
}

// --- MCP Protocol Handler (JSON-RPC 2.0 over stdio) ---

function createResponse(id, result) {
  return JSON.stringify({ jsonrpc: '2.0', id, result });
}

function createError(id, code, message) {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
}

function handleMessage(msg) {
  const { id, method, params } = msg;

  switch (method) {
    // --- Lifecycle ---
    case 'initialize':
      return createResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},  // Advertise empty resources capability
          prompts: {}     // Advertise empty prompts capability
        },
        serverInfo: { name: 'ijfw-memory', version: '1.0.0' }
      });

    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null; // No response needed for notifications

    // --- Tools ---
    case 'tools/list':
      return createResponse(id, { tools: TOOLS });

    case 'tools/call': {
      const { name, arguments: args } = params || {};
      let result;

      try {
        switch (name) {
          case 'ijfw_memory_recall':
            result = handleRecall(args || {});
            break;
          case 'ijfw_memory_store':
            result = handleStore(args || {});
            break;
          case 'ijfw_memory_search':
            result = handleSearch(args || {});
            break;
          case 'ijfw_memory_status':
            result = handleStatus();
            break;
          default:
            return createError(id, -32601, `Unknown tool: ${name}`);
        }

        return createResponse(id, {
          content: [{ type: 'text', text: String(result) }]
        });
      } catch (err) {
        return createResponse(id, {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true
        });
      }
    }

    // --- Resources (empty — required by some clients) ---
    case 'resources/list':
      return createResponse(id, { resources: [] });

    case 'resources/read':
      return createError(id, -32601, 'No resources available');

    case 'resources/templates/list':
      return createResponse(id, { resourceTemplates: [] });

    // --- Prompts (empty — required by some clients) ---
    case 'prompts/list':
      return createResponse(id, { prompts: [] });

    case 'prompts/get':
      return createError(id, -32601, 'No prompts available');

    // --- Utility ---
    case 'ping':
      return createResponse(id, {});

    default:
      // For unknown methods: respond with error if it has an ID (request),
      // silently ignore if no ID (notification)
      if (id) return createError(id, -32601, `Method not found: ${method}`);
      return null;
  }
}

// --- stdio Transport ---

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  if (!line.trim()) return; // Skip empty lines

  try {
    const msg = JSON.parse(line);
    const response = handleMessage(msg);
    if (response) {
      process.stdout.write(response + '\n');
    }
  } catch (err) {
    // Malformed JSON — ignore silently per MCP spec
  }
});

// Graceful shutdown
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
process.on('uncaughtException', (err) => {
  process.stderr.write(`IJFW: Uncaught exception: ${err.message}\n`);
  // Don't crash — keep serving
});
process.on('unhandledRejection', (err) => {
  process.stderr.write(`IJFW: Unhandled rejection: ${err}\n`);
});
