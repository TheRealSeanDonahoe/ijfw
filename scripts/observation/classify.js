#!/usr/bin/env node
/**
 * IJFW observation classifier -- heuristic only (v1.1).
 * Pure function: classify(event) -> type string.
 * No I/O, no deps, deterministic.
 *
 * Types: bugfix | feature | refactor | change | discovery | decision | session-request
 */

/**
 * @param {object} event
 * @param {string} event.tool_name  e.g. "Edit", "Write", "Bash", "Read"
 * @param {string} [event.tool_input_cmd]  for Bash: the command string
 * @param {string} [event.tool_input_path] for Edit/Write: the file path
 * @param {boolean} [event.is_new_file]    true when Write creates a new file
 * @param {string} [event.hook_event]      "UserPromptSubmit" | "PostToolUse" | "SessionEnd"
 * @returns {string} observation type
 */
export function classify(event) {
  const { tool_name, tool_input_cmd, tool_input_path, is_new_file, hook_event } = event;

  if (hook_event === 'UserPromptSubmit') return 'session-request';

  const tool = (tool_name || '').trim();
  const cmd  = (tool_input_cmd || '').toLowerCase();
  const path = (tool_input_path || '').toLowerCase();

  // Bash tool: inspect command
  if (tool === 'Bash') {
    // Git commit with conventional prefix
    if (cmd.includes('git commit') || cmd.includes('git push')) {
      if (/\bfix(es|ed)?\b/.test(cmd) || /\W(fix|bug)[\W:]/.test(cmd) || cmd.includes('"fix')) return 'bugfix';
      if (/\W(feat|feature)[\W:]/.test(cmd) || cmd.includes('"feat')) return 'feature';
      if (/\W(refactor|chore)[\W:]/.test(cmd) || cmd.includes('"refactor') || cmd.includes('"chore')) return 'refactor';
    }
    // Read-only discovery tools
    if (/\b(grep|ls|find|cat|head|tail|less|more|wc|diff|stat|du|file)\b/.test(cmd)) return 'discovery';
    // Package runners that produce artifacts
    if (/\b(npm|yarn|pnpm|bun|python|python3|node)\b.*\b(run|build|compile|test|install)\b/.test(cmd)) return 'change';
    return 'change';
  }

  // Edit/Write tool: inspect file path
  if (tool === 'Write' || tool === 'Edit') {
    if (is_new_file) return 'change';
    // Test file modification
    if (/\btest[-_.]|[-_.]test\b|\.spec\.[jt]s$|__tests__/.test(path)) return 'change';
    // Planning / architecture decisions
    if (/\bplan\.md$|\barchitecture\.md$|\bdesign\.md$|\badl\b/.test(path)) return 'decision';
    return 'change';
  }

  // Read, Glob, Grep -- pure discovery
  if (['Read', 'Glob', 'Grep', 'LS'].includes(tool)) return 'discovery';

  return 'change';
}
