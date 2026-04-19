// test-trident-output.js -- Assert that any Trident/cross-audit output
// containing "Option X" (bare letter) also names the option inline.
//
// Rule: every "Option A" (or B, C, ...) must be immediately followed by " -- "
// on the same line. Bare "Option B" with no name is the UX failure this guards.
//
// This test is deterministic -- no LLM calls, no spawned CLIs.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// lintOptionReferences(text) -- returns array of violations.
// A violation is a line that contains "Option [A-Z]" NOT followed by " -- ".
// ---------------------------------------------------------------------------

function lintOptionReferences(text) {
  const violations = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match "Option X" where X is a single uppercase letter
    const matches = line.matchAll(/\bOption ([A-Z])\b/g);
    for (const m of matches) {
      const after = line.slice(m.index + m[0].length);
      // Must be immediately followed by " -- " (with optional spaces before --)
      if (!/^\s*--/.test(after)) {
        violations.push({ lineNo: i + 1, line: line.trim(), letter: m[1] });
      }
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Test: lintOptionReferences correctly flags bare references
// ---------------------------------------------------------------------------

test('lintOptionReferences: flags bare "Option B" with no name', () => {
  const bad = `
RECOMMENDATION
  Option B -- revise-in-flight is the recommendation.

My recommendation: Option B -- revise-in-flight.
But also consider Option B without the name on this line.
  `;
  const violations = lintOptionReferences(bad);
  assert.equal(violations.length, 1, `expected 1 violation, got ${violations.length}: ${JSON.stringify(violations)}`);
  assert.equal(violations[0].letter, 'B');
  assert.ok(violations[0].line.includes('without the name'));
});

test('lintOptionReferences: passes clean structured report', () => {
  const good = `
VERDICT
  All reviewers converge on Option A -- revise-then-execute.

OPTIONS
  A -- revise-then-execute: revise the plan and run through full Trident before shipping.
  B -- revise-in-flight: revise while executing, spot-checking as you go.

REVIEWER CONVERGENCE
  Internal auditor:  A  6/10  "Revise 10, then trident"  => Option A -- revise-then-execute
  Codex (o4-mini):   A  6/10  "One more revision"        => Option A -- revise-then-execute
  Claude self-view:  B  7/10  "v3 then execute"          => Option B -- revise-in-flight

RECOMMENDATION
  Option A -- revise-then-execute because two of three reviewers want a revision gate before execution.

NEXT ACTION
  ijfw cross audit PLAN.md
  `;
  const violations = lintOptionReferences(good);
  assert.equal(violations.length, 0, `expected 0 violations, got: ${JSON.stringify(violations)}`);
});

test('lintOptionReferences: flags bare reference in scorecard table intro', () => {
  const bad = `
My recommendation: Option B -- revise-in-flight.

See scorecard above where I explained Option B for details.
  `;
  const violations = lintOptionReferences(bad);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].letter, 'B');
});

test('lintOptionReferences: multiple bare references all flagged', () => {
  const bad = `
Consider Option A or Option B.
Option C is also on the table.
  `;
  const violations = lintOptionReferences(bad);
  assert.equal(violations.length, 3);
});

test('lintOptionReferences: "Option A --" with spaces before -- is accepted', () => {
  const good = `
Option A  --  proceed-as-is: ship immediately without changes.
  `;
  const violations = lintOptionReferences(good);
  assert.equal(violations.length, 0, `should accept extra spaces before --`);
});

// ---------------------------------------------------------------------------
// Test: the required report sections are present
// ---------------------------------------------------------------------------

function hasRequiredSections(text) {
  const missing = [];
  for (const section of ['VERDICT', 'OPTIONS', 'REVIEWER CONVERGENCE', 'RECOMMENDATION', 'NEXT ACTION']) {
    if (!text.includes(section)) missing.push(section);
  }
  return missing;
}

test('hasRequiredSections: detects missing OPTIONS block', () => {
  const bad = `
VERDICT
  Proceed immediately.

RECOMMENDATION
  Option A -- proceed because clean audit.

NEXT ACTION
  ijfw cross audit PLAN.md
  `;
  const missing = hasRequiredSections(bad);
  assert.ok(missing.includes('OPTIONS'), 'should flag missing OPTIONS');
  assert.ok(missing.includes('REVIEWER CONVERGENCE'), 'should flag missing REVIEWER CONVERGENCE');
});

test('hasRequiredSections: full structured report passes', () => {
  const good = `
VERDICT
  converge.

OPTIONS
  A -- proceed: ship now.

REVIEWER CONVERGENCE
  codex: A  => Option A -- proceed

RECOMMENDATION
  Option A -- proceed because clean.

NEXT ACTION
  ship it
  `;
  const missing = hasRequiredSections(good);
  assert.equal(missing.length, 0, `unexpected missing sections: ${missing}`);
});
