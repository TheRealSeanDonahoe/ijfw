/**
 * IJFW cost/readers/claude.js
 * Reads Claude Code JSONL session files from ~/.claude/projects/<project>/*.jsonl
 * Extracts per-turn token usage. Never throws on corrupt lines -- logs and skips.
 * Data approach adapted from ccusage (ryoppippi, MIT) and tokscale (junhoyeo, MIT).
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

/**
 * Walk ~/.claude/projects/<project>/<session>.jsonl and extract usage turns.
 * Returns array of turn objects.
 */
export function readClaudeSessions(projectsDir = CLAUDE_PROJECTS_DIR) {
  if (!existsSync(projectsDir)) return [];

  const turns = [];
  let projectDirs;
  try {
    projectDirs = readdirSync(projectsDir);
  } catch {
    return [];
  }

  for (const projectName of projectDirs) {
    const projectPath = join(projectsDir, projectName);
    let stat;
    try { stat = statSync(projectPath); } catch { continue; }
    if (!stat.isDirectory()) continue;

    let files;
    try { files = readdirSync(projectPath); } catch { continue; }

    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const filePath = join(projectPath, file);
      const sessionId = file.replace('.jsonl', '');

      try {
        const lines = readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            const turn = extractClaudeTurn(record, sessionId, projectName);
            if (turn) turns.push(turn);
          } catch {
            // corrupt line -- skip
          }
        }
      } catch {
        // unreadable file -- skip
      }
    }

    // Also walk subagents/ subdirectory
    const subagentsDir = join(projectPath, 'subagents');
    if (existsSync(subagentsDir)) {
      let subfiles;
      try { subfiles = readdirSync(subagentsDir); } catch { subfiles = []; }
      for (const file of subfiles) {
        if (!file.endsWith('.jsonl')) continue;
        const filePath = join(subagentsDir, file);
        const sessionId = file.replace('.jsonl', '');
        try {
          const lines = readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const record = JSON.parse(line);
              const turn = extractClaudeTurn(record, sessionId, projectName);
              if (turn) turns.push(turn);
            } catch {}
          }
        } catch {}
      }
    }
  }

  return turns;
}

function extractClaudeTurn(record, sessionId, project) {
  // Claude Code JSONL: assistant messages have message.usage
  const msg = record.message;
  if (!msg || msg.role !== 'assistant') return null;

  const usage = msg.usage;
  if (!usage) return null;

  const inputTokens  = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  const cacheRead    = usage.cache_read_input_tokens || 0;

  // Claude Code 3.7+ splits cache creation into 5m and 1h buckets
  const cacheCreate5m = (usage.cache_creation && usage.cache_creation.ephemeral_5m_input_tokens) ||
                        (usage.cache_creation_input_tokens || 0); // fallback: pre-3.7
  const cacheCreate1h = (usage.cache_creation && usage.cache_creation.ephemeral_1h_input_tokens) || 0;

  if (!inputTokens && !outputTokens && !cacheRead && !cacheCreate5m && !cacheCreate1h) return null;

  // Find tool_name from the content blocks if present
  let toolName = null;
  if (Array.isArray(msg.content)) {
    for (const block of msg.content) {
      if (block && block.type === 'tool_use') {
        toolName = block.name;
        break;
      }
    }
  }

  return {
    platform: 'claude',
    session_id: sessionId,
    project,
    timestamp: record.timestamp || null,
    model: msg.model || 'claude-unknown',
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_create_tokens_5m: cacheCreate5m,
    cache_create_tokens_1h: cacheCreate1h,
    cache_read_tokens: cacheRead,
    tool_name: toolName,
  };
}
