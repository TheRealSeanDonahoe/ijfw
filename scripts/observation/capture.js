#!/usr/bin/env node
/**
 * IJFW observation capture -- reads hook JSON from stdin, classifies,
 * appends to ~/.ijfw/observations.jsonl.
 *
 * Called by observation-capture.sh (async, via `& disown`).
 * Zero deps. Never crashes; all errors to stderr.
 *
 * stdin: Claude Code hook JSON envelope (PostToolUse or UserPromptSubmit)
 * env:
 *   IJFW_SESSION_ID  -- session UUID (set by session-start.sh)
 *   IJFW_PROJECT     -- project name (set by session-start.sh, fallback to cwd basename)
 *   IJFW_PLATFORM    -- "claude-code" | "codex" | "gemini" (default: "claude-code")
 */

import { readFileSync, existsSync, readFileSync as rf } from 'fs';
import { basename } from 'path';
import { homedir } from 'os';
import { join } from 'path';
import { classify } from './classify.js';
import { titleize } from './titleize.js';
import { appendObservation } from './ledger.js';

const SESSION_FILE = join(homedir(), '.ijfw', '.current-session');

function readSessionId() {
  const envId = process.env.IJFW_SESSION_ID;
  if (envId) return envId;
  try {
    if (existsSync(SESSION_FILE)) return readFileSync(SESSION_FILE, 'utf8').trim();
  } catch {}
  return 'unknown';
}

function main() {
  let raw = '';
  try {
    raw = readFileSync('/dev/stdin', 'utf8');
  } catch {
    // stdin may not be available -- exit silently
    process.exit(0);
  }

  if (!raw || !raw.trim()) process.exit(0);

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const hookEvent = payload.hook_event_name || payload.hook || 'PostToolUse';
  const toolName  = payload.tool_name || '';
  const toolInput = payload.tool_input || {};
  const toolResp  = payload.tool_response || {};

  // Determine if file is newly created (Write creating a new path)
  let isNewFile = false;
  if (toolName === 'Write') {
    const p = toolInput.file_path || '';
    // If the tool_response indicates success and it's a Write, treat as new file
    // (conservative: always new for Write, diff check is too expensive here)
    isNewFile = true;
  }

  const filePath = toolInput.file_path || toolInput.path || '';
  const cmd      = toolInput.command   || '';
  const userPrompt = payload.user_prompt || '';

  // Build classifier event
  const classEvent = {
    tool_name: toolName,
    tool_input_cmd:  cmd,
    tool_input_path: filePath,
    is_new_file: isNewFile,
    hook_event: hookEvent,
    user_prompt: userPrompt,
  };

  const type  = classify(classEvent);
  const title = titleize({ ...classEvent });

  // Collect files touched
  const files = [];
  if (filePath) files.push(filePath);

  const obs = {
    ts:         new Date().toISOString(),
    type,
    title,
    files,
    tool_name:   toolName || null,
    token_cost:  null,
    work_tokens: null,
    platform:    process.env.IJFW_PLATFORM || 'claude-code',
    session_id:  readSessionId(),
    project:     process.env.IJFW_PROJECT || basename(process.cwd()),
  };

  try {
    appendObservation(obs);
  } catch (err) {
    process.stderr.write(`[ijfw] capture error: ${err.message}\n`);
  }
}

main();
