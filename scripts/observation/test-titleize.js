import { test } from 'node:test';
import assert from 'node:assert/strict';
import { titleize } from './titleize.js';

test('UserPromptSubmit returns prompt as title', () => {
  const t = titleize({ hook_event: 'UserPromptSubmit', user_prompt: 'Build the ledger' });
  assert.equal(t, 'Build the ledger');
});

test('UserPromptSubmit caps at 80 chars', () => {
  const long = 'A'.repeat(100);
  const t = titleize({ hook_event: 'UserPromptSubmit', user_prompt: long });
  assert.ok(t.length <= 80, `Expected <= 80, got ${t.length}`);
});

test('Write is_new_file -> Created <filename>', () => {
  const t = titleize({ tool_name: 'Write', tool_input_path: 'scripts/observation/capture.js', is_new_file: true });
  assert.match(t, /^Created capture\.js/);
});

test('Edit existing file -> Updated <filename>', () => {
  const t = titleize({ tool_name: 'Edit', tool_input_path: 'claude/hooks/scripts/post-tool-use.sh', is_new_file: false });
  assert.match(t, /^Updated post-tool-use\.sh/);
});

test('Bash git commit extracts commit message', () => {
  const t = titleize({ tool_name: 'Bash', tool_input_cmd: "git commit -m \"feat: add observation ledger\"" });
  assert.match(t, /feat: add observation ledger/);
});

test('Bash git commit with single quotes extracts message', () => {
  const t = titleize({ tool_name: 'Bash', tool_input_cmd: "git commit -m 'fix: correct null check'" });
  assert.match(t, /fix: correct null check/);
});

test('Bash grep returns abbreviated command', () => {
  const t = titleize({ tool_name: 'Bash', tool_input_cmd: 'grep -r "classify" scripts/' });
  assert.ok(t.length <= 80);
  assert.ok(t.includes('grep'));
});

test('Read returns Read <filename>', () => {
  const t = titleize({ tool_name: 'Read', tool_input_path: 'mcp-server/src/server.js' });
  assert.match(t, /^Read server\.js/);
});

test('Glob returns descriptive title', () => {
  const t = titleize({ tool_name: 'Glob', tool_input_path: '**/*.js' });
  assert.match(t, /Listed files/);
});

test('Empty cmd returns "Ran command"', () => {
  const t = titleize({ tool_name: 'Bash', tool_input_cmd: '' });
  assert.equal(t, 'Ran command');
});
