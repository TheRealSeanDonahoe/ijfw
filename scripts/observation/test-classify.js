import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from './classify.js';

// 1. UserPromptSubmit -> session-request
test('UserPromptSubmit is session-request', () => {
  assert.equal(classify({ hook_event: 'UserPromptSubmit' }), 'session-request');
});

// 2. Bash + git commit with fix prefix -> bugfix
test('Bash git commit fix: prefix -> bugfix', () => {
  assert.equal(classify({
    tool_name: 'Bash',
    tool_input_cmd: 'git commit -m "fix: correct null pointer"',
  }), 'bugfix');
});

// 3. Bash + git commit with feat prefix -> feature
test('Bash git commit feat: prefix -> feature', () => {
  assert.equal(classify({
    tool_name: 'Bash',
    tool_input_cmd: 'git commit -m "feat: add observation ledger"',
  }), 'feature');
});

// 4. Bash + git commit refactor prefix -> refactor
test('Bash git commit refactor: prefix -> refactor', () => {
  assert.equal(classify({
    tool_name: 'Bash',
    tool_input_cmd: 'git commit -m "refactor: extract classify fn"',
  }), 'refactor');
});

// 5. Bash + git commit chore prefix -> refactor
test('Bash git commit chore: prefix -> refactor', () => {
  assert.equal(classify({
    tool_name: 'Bash',
    tool_input_cmd: 'git commit -m "chore: update deps"',
  }), 'refactor');
});

// 6. Bash + grep -> discovery
test('Bash grep command -> discovery', () => {
  assert.equal(classify({
    tool_name: 'Bash',
    tool_input_cmd: 'grep -r "classify" scripts/',
  }), 'discovery');
});

// 7. Bash + ls -> discovery
test('Bash ls command -> discovery', () => {
  assert.equal(classify({
    tool_name: 'Bash',
    tool_input_cmd: 'ls -la /usr/bin',
  }), 'discovery');
});

// 8. Bash + npm run build -> change
test('Bash npm run build -> change', () => {
  assert.equal(classify({
    tool_name: 'Bash',
    tool_input_cmd: 'npm run build',
  }), 'change');
});

// 9. Write new file -> change
test('Write new file -> change', () => {
  assert.equal(classify({
    tool_name: 'Write',
    tool_input_path: 'scripts/observation/capture.js',
    is_new_file: true,
  }), 'change');
});

// 10. Edit PLAN.md -> decision
test('Edit PLAN.md -> decision', () => {
  assert.equal(classify({
    tool_name: 'Edit',
    tool_input_path: '.planning/v1.1/PLAN.md',
    is_new_file: false,
  }), 'decision');
});

// 11. Edit test file -> change
test('Edit test file -> change', () => {
  assert.equal(classify({
    tool_name: 'Edit',
    tool_input_path: 'scripts/observation/test-classify.js',
    is_new_file: false,
  }), 'change');
});

// 12. Read tool -> discovery
test('Read tool -> discovery', () => {
  assert.equal(classify({ tool_name: 'Read' }), 'discovery');
});

// 13. Grep tool -> discovery
test('Grep tool -> discovery', () => {
  assert.equal(classify({ tool_name: 'Grep' }), 'discovery');
});

// 14. Bash + git push -> bugfix when contains fix keyword
test('Bash git push with fix keyword -> bugfix', () => {
  assert.equal(classify({
    tool_name: 'Bash',
    tool_input_cmd: 'git push origin fix/null-pointer',
  }), 'bugfix');
});

// 15. Unknown tool -> change (fallback)
test('Unknown tool -> change fallback', () => {
  assert.equal(classify({ tool_name: 'UnknownTool' }), 'change');
});
