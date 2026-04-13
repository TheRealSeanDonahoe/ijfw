#!/usr/bin/env node

/**
 * IJFW Memory Server — Cross-platform MCP memory for AI coding agents
 * By Sean Donahoe | "It Just Fucking Works"
 *
 * 4 tools: recall, store, search, status
 * Storage: append-only markdown (hot layer, zero dependencies)
 * Protocol: MCP over stdio (JSON-RPC 2.0)
 *
 * Hardened against: prompt injection via stored content, cross-project worming,
 * non-atomic writes, silent storage failures, Windows path traversal.
 */

import { createInterface } from 'readline';
import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
  appendFileSync, readdirSync, statSync, renameSync, unlinkSync,
  openSync, closeSync
} from 'fs';
import { join, resolve, isAbsolute, normalize, basename } from 'path';
import { homedir } from 'os';
import { createHash, randomBytes } from 'crypto';

// --- Constants ---
const SCHEMA_VERSION = 1;
const MAX_STORE_LENGTH = 5000;
const MAX_TAGS = 20;
const MAX_TAG_LEN = 50;
const MAX_SEARCH_RESULTS = 20;
const MAX_FILE_READ = 5_000_000;       // 5MB — large enough that unbounded growth doesn't hit during normal lifetime
const VALID_MEMORY_TYPES = ['decision', 'observation', 'pattern', 'handoff', 'preference'];

// --- Project root resolution (path-traversal-safe; cross-platform) ---
function safeProjectDir() {
  const raw = process.env.IJFW_PROJECT_DIR;
  if (!raw) return process.cwd();
  const resolved = resolve(raw);
  // normalize() collapses ".." segments; if any survive after normalize the path
  // escaped the absolute root, which on POSIX/Windows means traversal.
  const normalized = normalize(resolved);
  if (!isAbsolute(normalized)) return process.cwd();
  // Detect any residual `..` segment using platform-aware splitter.
  const parts = normalized.split(/[\\/]+/);
  if (parts.includes('..')) return process.cwd();
  return normalized;
}

const PROJECT_DIR = safeProjectDir();
const PROJECT_HASH = createHash('sha256').update(PROJECT_DIR).digest('hex').slice(0, 12);
const IJFW_DIR = join(PROJECT_DIR, '.ijfw');
const MEMORY_DIR = join(IJFW_DIR, 'memory');
const SESSIONS_DIR = join(IJFW_DIR, 'sessions');
const GLOBAL_DIR = join(homedir(), '.ijfw', 'memory');
// Legacy single-file location (pre-Phase 2). Still read for backward compat
// but new writes go to the faceted structure.
const LEGACY_GLOBAL_FILE = join(GLOBAL_DIR, 'global-knowledge.md');
// Faceted global memory (Phase 2). Each file is bounded, human-readable, git-friendly.
const GLOBAL_FACETS_DIR = join(GLOBAL_DIR, 'global');
const GLOBAL_FACETS = ['preferences', 'patterns', 'stack', 'anti-patterns', 'lessons'];
const DEFAULT_FACET = 'preferences';

// Claude Code's native auto-memory lives at ~/.claude/projects/<encoded>/memory/
// where <encoded> is the project path with `/` → `-`. IJFW reads these files
// and surfaces them via MCP so all platforms (not just Claude) see the same
// memories — no fighting Claude's native "Remember X" handler.
const NATIVE_CLAUDE_DIR = join(
  homedir(), '.claude', 'projects',
  PROJECT_DIR.replace(/\//g, '-'),
  'memory'
);

// --- Bootstrap directories ---
// Project dirs are required; global is best-effort (HOME may be read-only on CI).
// Failures here are reported via stderr; subsequent store/read calls return
// structured errors rather than silently dropping data.
try {
  [MEMORY_DIR, SESSIONS_DIR].forEach(dir => {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  });
} catch (err) {
  process.stderr.write(`IJFW: project memory dir unavailable: ${err.code || err.message}\n`);
}
try {
  if (!existsSync(GLOBAL_DIR)) mkdirSync(GLOBAL_DIR, { recursive: true });
} catch { /* handleStore reports on attempted write */ }

// --- Sanitizer (defense against prompt-injection via stored content) ---
//
// Stored content is read back and injected into LLM context on every recall.
// An attacker who can write to .ijfw/memory/ (rogue dep, malicious teammate
// commit, compromised plugin) controls future sessions unless we neutralize
// the structural and semantic markdown features they could weaponize.
function sanitizeContent(s) {
  if (typeof s !== 'string') return '';
  let out = s;

  // 1. Strip C0/C1 control characters (incl. NUL) except tab and newline.
  out = out.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '');

  // 2. Strip Unicode bidi/zero-width/format chars used to hide payloads.
  // U+200B-U+200F, U+202A-U+202E, U+2066-U+2069, U+FEFF
  out = out.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');

  // 3. Defang ANY heading prefix (1+ hashes, optional whitespace) — entry must
  // never produce a structural ## section that mimics a journal timestamp.
  out = out.replace(/^[ \t]*#+[ \t]+/gm, '> ');

  // 4. Defang setext-style headings (=== or --- under a line) — strip the underline.
  out = out.replace(/^[ \t]*[=-]{3,}[ \t]*$/gm, '');

  // 5. Neutralize fenced code blocks (``` and ~~~) so attacker can't open a fence
  // that swallows surrounding journal structure as "code".
  out = out.replace(/^[ \t]*(```|~~~).*$/gm, '> $1');

  // 6. Neutralize HTML/XML-style tags that LLMs may parse as instructions
  // (<system>, </assistant>, <instructions>, etc.) — escape angle brackets.
  out = out.replace(/[<>]/g, ch => (ch === '<' ? '&lt;' : '&gt;'));

  // 7. Collapse to single line — multi-line stored content can't fake new
  // journal sections. Newlines become " | " for readability.
  out = out.replace(/\r\n?|\n/g, ' | ');

  return out;
}

// --- Atomic write (write to .tmp, fsync, rename) ---
//
// Eliminates partial-write corruption on crash and makes concurrent writers
// from two server instances on the same project safe at the file level
// (last writer wins atomically, no interleaved bytes).
function atomicWrite(filepath, content) {
  const tmp = `${filepath}.tmp.${process.pid}.${randomBytes(4).toString('hex')}`;
  let fd;
  try {
    fd = openSync(tmp, 'w');
    writeFileSync(fd, content, 'utf-8');
    closeSync(fd);
    fd = null;
    renameSync(tmp, filepath);
    return { ok: true };
  } catch (err) {
    if (fd != null) { try { closeSync(fd); } catch {} }
    try { unlinkSync(tmp); } catch {}
    return { ok: false, code: err.code || 'EUNKNOWN', message: err.message };
  }
}

// --- Read with explicit error reporting ---
//
// Returns { ok: true, content } on success including empty file.
// Returns { ok: false, reason } so callers can distinguish "absent" from
// "permission denied" / "too big" / "I/O error" — silent null was the
// previous root of multiple bugs.
function readMarkdownFile(filepath) {
  if (!existsSync(filepath)) return { ok: false, reason: 'absent' };
  let stats;
  try {
    stats = statSync(filepath);
  } catch (err) {
    return { ok: false, reason: err.code || 'stat-failed' };
  }
  if (stats.size > MAX_FILE_READ) return { ok: false, reason: 'too-large', size: stats.size };
  try {
    return { ok: true, content: readFileSync(filepath, 'utf-8') };
  } catch (err) {
    return { ok: false, reason: err.code || 'read-failed' };
  }
}

// Convenience wrapper: returns string ('' if absent or unreadable) for the
// recall hot-path where we just need text. Logs unexpected failures.
function readOr(filepath, fallback = '') {
  const r = readMarkdownFile(filepath);
  if (r.ok) return r.content;
  if (r.reason !== 'absent') {
    process.stderr.write(`IJFW: read ${basename(filepath)}: ${r.reason}\n`);
  }
  return fallback;
}

// --- Append helper (atomic for entries < PIPE_BUF; append-only growth) ---
//
// We rely on POSIX O_APPEND atomicity for entries under 4KB. Sanitized
// entries are bounded at MAX_STORE_LENGTH=5000 chars, but the entry header
// keeps each *line* well under 4KB after sanitization (single-line collapse).
function appendLine(filepath, line) {
  try {
    if (!existsSync(filepath)) {
      // First write seeds the schema header. Best-effort atomic.
      const seed = `<!-- ijfw schema:${SCHEMA_VERSION} -->\n# ${basename(filepath, '.md')}\n${line}\n`;
      const r = atomicWrite(filepath, seed);
      if (!r.ok) return r;
      return { ok: true };
    }
    appendFileSync(filepath, line + '\n');
    return { ok: true };
  } catch (err) {
    return { ok: false, code: err.code || 'EUNKNOWN', message: err.message };
  }
}

// --- Storage helpers ---
function appendToJournal(entry) {
  const journalPath = join(MEMORY_DIR, 'project-journal.md');
  const ts = new Date().toISOString();
  const line = `- [${ts}] ${entry}`;
  return appendLine(journalPath, line);
}

function appendToKnowledge(entry) {
  return appendLine(join(MEMORY_DIR, 'knowledge.md'), entry);
}

// Structured append for decisions/patterns — produces a richer frontmatter block
// similar to Claude's native auto-memory format: YAML frontmatter plus a body with
// Why / How-to-apply sections. This is the format users retrieve well from.
// If structured fields are empty the caller falls back to appendToKnowledge (flat line).
function appendStructuredToKnowledge({ type, summary, content, why, howToApply, tags }) {
  const filepath = join(MEMORY_DIR, 'knowledge.md');
  const ts = new Date().toISOString();
  const tagLine = tags && tags.length ? tags.join(', ') : '';
  const block = [
    '',
    '---',
    `type: ${type}`,
    `summary: ${summary}`,
    `stored: ${ts}`,
    tagLine ? `tags: [${tagLine}]` : '',
    '---',
    content,
    why ? `\n**Why:** ${why}` : '',
    howToApply ? `\n**How to apply:** ${howToApply}` : '',
    ''
  ].filter(l => l !== '').join('\n') + '\n';

  try {
    if (!existsSync(filepath)) {
      const seed = `<!-- ijfw schema:1 -->\n# Knowledge Base\n${block}`;
      return atomicWrite(filepath, seed);
    }
    appendFileSync(filepath, block);
    return { ok: true };
  } catch (err) {
    return { ok: false, code: err.code || 'EUNKNOWN', message: err.message };
  }
}

// Per-project namespacing prevents cross-project worming. A poisoned preference
// stored from project A is namespaced to A's hash, so project B never reads it
// as if it were its own preference.
//
// Phase 2: writes go to faceted files. facet is inferred from tags when present
// (tag matches facet name → that facet; else preferences). Legacy global file is
// read but not written — future migration can merge it into facets.
function appendToGlobalPrefs(entry, tags = []) {
  try {
    if (!existsSync(GLOBAL_FACETS_DIR)) mkdirSync(GLOBAL_FACETS_DIR, { recursive: true });
  } catch { /* best-effort — if HOME is RO we can't write global */ }
  const facet = GLOBAL_FACETS.find(f => tags.some(t => t.toLowerCase() === f)) || DEFAULT_FACET;
  const namespaced = `[ns:${PROJECT_HASH}] ${entry}`;
  return appendLine(join(GLOBAL_FACETS_DIR, `${facet}.md`), namespaced);
}

function readKnowledgeBase() {
  return readOr(join(MEMORY_DIR, 'knowledge.md'));
}
function readHandoff() {
  return readOr(join(MEMORY_DIR, 'handoff.md'));
}
// Read Claude Code native auto-memory for this project. Returns concatenated
// sanitized content of all project_*.md files (skipping MEMORY.md index).
// This lets IJFW surface Claude-native memories to other platforms that don't
// have an equivalent built-in system.
function readNativeClaudeMemory() {
  try {
    if (!existsSync(NATIVE_CLAUDE_DIR)) return '';
    const files = readdirSync(NATIVE_CLAUDE_DIR)
      .filter(f => f.endsWith('.md') && f !== 'MEMORY.md')
      .sort();
    const parts = [];
    for (const f of files) {
      const r = readMarkdownFile(join(NATIVE_CLAUDE_DIR, f));
      if (!r.ok) continue;
      // Strip YAML frontmatter for brevity in prelude — keep the body that
      // already includes the **Why:** / **How to apply:** sections.
      const body = r.content.replace(/^---[\s\S]*?---\n/, '').trim();
      if (body) parts.push(body);
    }
    return parts.join('\n\n---\n\n');
  } catch {
    return '';
  }
}

// Global prefs are filtered to entries matching this project's namespace OR
// entries with no namespace (legacy/manual entries). Cross-project prefs are
// not exposed by default. Phase 2: reads both faceted files and legacy flat.
function readGlobalKnowledge() {
  const sources = [];
  // Faceted files (Phase 2)
  if (existsSync(GLOBAL_FACETS_DIR)) {
    for (const facet of GLOBAL_FACETS) {
      const p = join(GLOBAL_FACETS_DIR, `${facet}.md`);
      const raw = readOr(p);
      if (raw) sources.push(`### ${facet}\n${raw}`);
    }
  }
  // Legacy single-file (pre-Phase 2) — still surface if present, unfaceted
  const legacy = readOr(LEGACY_GLOBAL_FILE);
  if (legacy) sources.push(`### legacy\n${legacy}`);

  if (sources.length === 0) return '';

  // Filter to entries matching this project's namespace (or unnamespaced).
  return sources.map(section =>
    section.split('\n').filter(line => {
      if (!line.startsWith('[ns:')) return true;
      return line.startsWith(`[ns:${PROJECT_HASH}]`);
    }).join('\n')
  ).join('\n\n');
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
  const journal = readOr(join(MEMORY_DIR, 'project-journal.md'));
  if (!journal) return 0;
  // Match only journal entry lines (we now prefix with - [timestamp]) — not
  // arbitrary list bullets that might appear in seeded content.
  return (journal.match(/^- \[\d{4}-\d{2}-\d{2}T/gm) || []).length;
}

function getRecentJournalEntries(count = 5) {
  const journal = readOr(join(MEMORY_DIR, 'project-journal.md'));
  if (!journal) return '';
  const entries = journal.split('\n').filter(l => /^- \[\d{4}-/.test(l));
  return entries.slice(-count).join('\n');
}

// --- Search ---
function searchMemory(query, limit = 10) {
  limit = Math.min(Math.max(1, limit | 0), MAX_SEARCH_RESULTS);
  const results = [];
  const queryLower = String(query).toLowerCase();
  const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);
  if (keywords.length === 0) return results;

  const sources = [
    { name: 'knowledge', content: readKnowledgeBase() },
    { name: 'journal', content: readOr(join(MEMORY_DIR, 'project-journal.md')) },
    { name: 'handoff', content: readHandoff() },
    { name: 'global', content: readGlobalKnowledge() },
    { name: 'claude-native', content: readNativeClaudeMemory() }
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
          content: line.trim().substring(0, 200),
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
    description: 'Retrieve context from IJFW memory. Call at session start or when needing past decisions, handoff state, or project knowledge.',
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
    description: 'Store a decision, observation, or session state. For decisions and patterns, provide summary/why/how_to_apply for a richer knowledge-base entry. Returns isError on storage failure.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Full statement of what to remember. Max 5000 chars. Sanitised on storage.' },
        type: { type: 'string', enum: VALID_MEMORY_TYPES, description: 'decision/pattern promote to knowledge base with frontmatter block. preference → project-namespaced global. handoff → overwrites handoff.md. observation → journal only.' },
        summary: { type: 'string', description: 'Optional 1-line summary (≤80 chars). Used as the frontmatter name for decisions/patterns.' },
        why: { type: 'string', description: 'Optional rationale — why this decision was made. Populates the Why section in the knowledge base entry.' },
        how_to_apply: { type: 'string', description: 'Optional guidance — when and how to apply this. Populates the How-to-apply section.' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Up to 20 tags, 50 chars each.' }
      },
      required: ['content', 'type']
    }
  },
  {
    name: 'ijfw_memory_search',
    description: 'Keyword search across memory sources. Up to 20 results.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query.' },
        limit: { type: 'number', description: 'Max results (default 10, max 20).' }
      },
      required: ['query']
    }
  },
  {
    name: 'ijfw_memory_status',
    description: 'Compressed critical-facts summary (~200 tokens) for context injection.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'ijfw_memory_prelude',
    description: 'CALL THIS AT SESSION START. Returns all relevant project memory in one pass — knowledge base, handoff state, recent activity. Eliminates the need to grep/search/recall separately. Call once at the start of a session before answering the user.',
    inputSchema: {
      type: 'object',
      properties: {
        detail_level: {
          type: 'string',
          enum: ['summary', 'standard', 'full'],
          description: 'summary ≈ 200 tokens (defaults). standard ≈ 500 tokens. full = everything available.'
        }
      },
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

    return { text: parts.join('\n\n') || 'First session on this project. No memory stored yet.' };
  }

  if (context_hint === 'handoff') {
    return { text: readHandoff() || 'No handoff from previous session.' };
  }

  if (context_hint === 'decisions') {
    return { text: getRecentJournalEntries(10) || 'No decisions recorded yet.' };
  }

  const results = searchMemory(context_hint);
  if (results.length === 0) return { text: `No memories matching: ${context_hint}` };
  return { text: results.map(r => `[${r.source}] ${r.content}`).join('\n') };
}

function handleStore({ content, type, tags = [], summary, why, how_to_apply }) {
  // --- Input Validation ---
  if (!content || typeof content !== 'string') {
    return { text: 'content is required and must be a string.', isError: true };
  }
  if (content.length > MAX_STORE_LENGTH) {
    return { text: `content exceeds ${MAX_STORE_LENGTH} character limit (got ${content.length}). Summarise and retry.`, isError: true };
  }
  if (!VALID_MEMORY_TYPES.includes(type)) {
    return { text: `type must be one of: ${VALID_MEMORY_TYPES.join(', ')}`, isError: true };
  }
  if (!Array.isArray(tags)) tags = [];
  tags = tags
    .filter(t => typeof t === 'string')
    .slice(0, MAX_TAGS)
    .map(t => sanitizeContent(t).substring(0, MAX_TAG_LEN));

  // Sanitize ALL text fields — never store raw user/agent text in markdown
  // that gets re-injected into a future LLM context.
  const safeContent = sanitizeContent(content);
  if (!safeContent) {
    return { text: 'content was empty after sanitisation (only control/format chars).', isError: true };
  }
  const safeSummary = summary ? sanitizeContent(summary).substring(0, 120) : '';
  const safeWhy = why ? sanitizeContent(why) : '';
  const safeHow = how_to_apply ? sanitizeContent(how_to_apply) : '';

  const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
  const journalEntry = `**${type}**${tagStr}: ${safeSummary || safeContent.substring(0, 200)}`;

  // 1. Always append to journal (one-line timeline). Hard failure → report.
  const journalResult = appendToJournal(journalEntry);
  if (!journalResult.ok) {
    return { text: `journal write failed (${journalResult.code}): ${journalResult.message}`, isError: true };
  }

  // 2. Type-specific secondary writes. Each tracked so we report partial
  // success accurately rather than lying about "stored."
  const failures = [];

  if (type === 'decision' || type === 'pattern') {
    // Richer frontmatter block for retrieval-quality entries.
    const r = appendStructuredToKnowledge({
      type,
      summary: safeSummary || safeContent.substring(0, 80),
      content: safeContent,
      why: safeWhy,
      howToApply: safeHow,
      tags
    });
    if (!r.ok) failures.push(`knowledge base (${r.code})`);
  }

  if (type === 'preference') {
    const r = appendToGlobalPrefs(`**preference**${tagStr}: ${safeContent}`, tags);
    if (!r.ok) failures.push(`global preferences (${r.code})`);
  }

  if (type === 'handoff') {
    const handoffPath = join(MEMORY_DIR, 'handoff.md');
    const prior = readMarkdownFile(handoffPath);
    if (prior.ok && prior.content.trim()) {
      appendToJournal(`prior-handoff-archived: ${sanitizeContent(prior.content).substring(0, 500)}`);
    }
    const r = atomicWrite(handoffPath, safeContent + '\n');
    if (!r.ok) failures.push(`handoff (${r.code})`);
  }

  if (failures.length > 0) {
    return {
      text: `Stored ${type} to journal. Secondary writes failed: ${failures.join(', ')}`,
      isError: true
    };
  }

  return { text: `Stored ${type}${tagStr}` };
}

// Universal first-turn recall — call once at session start to hydrate context.
// Returns a compact, structured block that agents on any platform can ingest
// without cascading into multiple exploratory tool calls.
function handlePrelude({ detail_level = 'summary' } = {}) {
  const KB_LINES = detail_level === 'full' ? 200 : detail_level === 'standard' ? 80 : 40;
  const HO_LINES = detail_level === 'full' ? 80  : detail_level === 'standard' ? 30 : 15;
  const JN_LINES = detail_level === 'full' ? 20  : detail_level === 'standard' ? 10 : 5;

  const parts = ['<ijfw-memory>'];
  parts.push('Project memory hydrated. Treat as background context — no further recall needed unless the user asks something not covered here.');
  parts.push('');

  const knowledge = readKnowledgeBase();
  if (knowledge) {
    const body = knowledge.split('\n')
      .filter(l => !l.startsWith('<!-- ijfw'))
      .filter(l => !/^#[^#]/.test(l))
      .slice(0, KB_LINES)
      .join('\n')
      .trim();
    if (body) parts.push('## Knowledge base', body, '');
  }

  // Claude Code's native auto-memory — Claude's own skill writes here on
  // "Remember X". Surfacing it via IJFW makes those memories available to
  // Codex/Gemini/Cursor too, fulfilling the cross-platform promise without
  // fighting Claude's native handler.
  const nativeMem = readNativeClaudeMemory();
  if (nativeMem) {
    const body = nativeMem.split('\n').slice(0, KB_LINES).join('\n').trim();
    if (body) parts.push('## Claude-native project memory', body, '');
  }

  const handoff = readHandoff();
  if (handoff) {
    const body = handoff.split('\n')
      .filter(l => !l.startsWith('<!-- ijfw'))
      .slice(0, HO_LINES)
      .join('\n')
      .trim();
    if (body) parts.push('## Last session handoff', body, '');
  }

  const recent = getRecentJournalEntries(JN_LINES);
  if (recent) parts.push('## Recent activity', recent, '');

  const global = readGlobalKnowledge();
  if (global) {
    const body = global.split('\n').slice(0, 10).join('\n').trim();
    if (body) parts.push('## Project preferences', body, '');
  }

  parts.push('</ijfw-memory>');

  const text = parts.join('\n');
  if (text.length < 60) {
    return { text: 'Fresh project — no memory stored yet. Proceed normally.' };
  }
  return { text };
}

function handleSearch({ query, limit = 10 }) {
  if (!query || typeof query !== 'string') {
    return { text: 'query is required and must be a string.', isError: true };
  }
  if (query.length > 500) query = query.substring(0, 500);
  const results = searchMemory(query, limit);
  if (results.length === 0) return { text: `No results for: "${query}"` };
  return { text: results.map(r => `[${r.source}:L${r.line}] ${r.content}`).join('\n') };
}

function handleStatus() {
  const sessionCount = getSessionCount();
  const decisionCount = getDecisionCount();
  const hasKnowledge = existsSync(join(MEMORY_DIR, 'knowledge.md'));
  const hasHandoff = existsSync(join(MEMORY_DIR, 'handoff.md'));
  const hasGlobal = readGlobalKnowledge().trim().length > 0;

  const parts = [];
  if (hasKnowledge) {
    const kb = readKnowledgeBase();
    const kbLines = kb.split('\n').filter(l => l.trim().startsWith('**')).length;
    parts.push(`Knowledge: ${kbLines} entries`);
  }
  if (sessionCount > 0 || decisionCount > 0) {
    parts.push(`History: ${sessionCount} sessions, ${decisionCount} decisions`);
  }
  if (hasHandoff) {
    const handoff = readHandoff();
    const statusLine = handoff.split('\n').find(l => l.trim().length > 0 && !l.startsWith('<!--') && !l.startsWith('#'));
    if (statusLine) parts.push(`Last: ${statusLine.trim().substring(0, 150)}`);
  }
  if (hasGlobal) parts.push('Project preferences loaded');

  return { text: parts.join('\n') || 'Fresh project — no memory yet.' };
}

// --- MCP Protocol Handler (JSON-RPC 2.0 over stdio) ---

function createResponse(id, result) {
  return JSON.stringify({ jsonrpc: '2.0', id, result });
}

function createError(id, code, message) {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
}

function handleMessage(msg) {
  const { method, params, id } = msg;

  switch (method) {
    case 'initialize':
      return createResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: 'ijfw-memory', version: '1.1.0', schemaVersion: SCHEMA_VERSION }
      });

    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null;

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
          case 'ijfw_memory_prelude':
            result = handlePrelude(args || {});
            break;
          default:
            return createError(id, -32601, `Unknown tool: ${name}`);
        }

        // Handlers now return {text, isError?}. Forward both to the MCP client
        // so failures aren't silently labelled as success.
        return createResponse(id, {
          content: [{ type: 'text', text: String(result.text) }],
          isError: result.isError === true
        });
      } catch (err) {
        return createResponse(id, {
          content: [{ type: 'text', text: `Internal error: ${err.message}` }],
          isError: true
        });
      }
    }

    case 'resources/list':
      return createResponse(id, { resources: [] });
    case 'resources/read':
      return createError(id, -32601, 'No resources available');
    case 'resources/templates/list':
      return createResponse(id, { resourceTemplates: [] });
    case 'prompts/list':
      return createResponse(id, { prompts: [] });
    case 'prompts/get':
      return createError(id, -32601, 'No prompts available');
    case 'ping':
      return createResponse(id, {});

    default:
      if (id) return createError(id, -32601, `Method not found: ${method}`);
      return null;
  }
}

// --- stdio Transport ---
const rl = createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0', id: null,
      error: { code: -32700, message: 'Parse error' }
    }) + '\n');
    return;
  }
  try {
    const response = handleMessage(msg);
    if (response) process.stdout.write(response + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: msg && msg.id ? msg.id : null,
      error: { code: -32603, message: `Internal error: ${err.message}` }
    }) + '\n');
  }
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
process.on('uncaughtException', (err) => {
  process.stderr.write(`IJFW: uncaught: ${err.stack || err.message}\n`);
});
process.on('unhandledRejection', (err) => {
  process.stderr.write(`IJFW: unhandled rejection: ${err}\n`);
});

// Export for tests (Node ESM allows this — only consumed when imported, not on stdio run)
export { sanitizeContent, atomicWrite, readMarkdownFile, PROJECT_HASH };
