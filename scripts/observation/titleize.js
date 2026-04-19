#!/usr/bin/env node
/**
 * IJFW observation title extractor.
 * Pure function: titleize(event) -> string (<=80 chars, active voice, ASCII).
 * No I/O, no deps.
 */

const PATH_RE = /\/[^\s"']{5,}|[A-Za-z]:\\[^\s"']{5,}/g;

function stripLongPaths(str) {
  return str.replace(PATH_RE, (m) => {
    const parts = m.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || m;
  });
}

function cap(str, n) {
  str = str.trim();
  return str.length > n ? str.slice(0, n - 1) + '.' : str;
}

/**
 * @param {object} event
 * @param {string} event.tool_name
 * @param {string} [event.tool_input_cmd]
 * @param {string} [event.tool_input_path]
 * @param {boolean} [event.is_new_file]
 * @param {string} [event.hook_event]
 * @param {string} [event.user_prompt]
 * @returns {string}
 */
export function titleize(event) {
  const { tool_name, tool_input_cmd, tool_input_path, is_new_file, hook_event, user_prompt } = event;

  if (hook_event === 'UserPromptSubmit') {
    const prompt = (user_prompt || '').replace(/\n/g, ' ').trim();
    return cap(prompt || 'Session started', 80);
  }

  const tool = (tool_name || '').trim();
  const path = (tool_input_path || '');

  if (tool === 'Edit' || tool === 'Write') {
    const filename = path.split('/').pop() || path;
    if (!filename) return 'Modified file';
    const verb = is_new_file ? 'Created' : 'Updated';
    return cap(`${verb} ${filename}`, 80);
  }

  if (tool === 'Bash') {
    const cmd = (tool_input_cmd || '').trim();
    if (!cmd) return 'Ran command';
    // Extract commit message from git commit -m "..."
    const commitMsg = cmd.match(/git\s+commit\b.*?(?:-m\s+["']([^"']{1,120})|--message\s+["']([^"']{1,120}))/i);
    if (commitMsg) {
      const msg = (commitMsg[1] || commitMsg[2] || '').trim();
      return cap(msg || 'Committed changes', 80);
    }
    return cap(stripLongPaths(cmd), 80);
  }

  if (tool === 'Read') {
    const filename = path.split('/').pop() || path;
    return cap(`Read ${filename || 'file'}`, 80);
  }

  if (tool === 'Grep') {
    const filename = path.split('/').pop() || path;
    return cap(`Searched ${filename || 'codebase'}`, 80);
  }

  if (tool === 'Glob') return cap(`Listed files matching pattern`, 80);

  return cap(`Used ${tool || 'tool'}`, 80);
}
