# Verb Violations — TASK-0a-1 scan

Pattern: `\b(gsd|superpowers|hookify|claude-supermemory|feature-dev|pr-review-toolkit):[a-z-]+`
Allow-list applied: lines containing `Agent(`, `absorbed`, `pattern`, or install.sh migration strings.

## Violations found: 11

### claude/commands/cross-audit.md
- line 98: `pr-review-toolkit:code-reviewer` OR `feature-dev:code-reviewer`
- line 99: `pr-review-toolkit:silent-failure-hunter`
- line 100: `pr-review-toolkit:pr-test-analyzer`
- line 101: `pr-review-toolkit:type-design-analyzer`

### claude/commands/cross-critique.md
- line 196: `pr-review-toolkit:code-reviewer` OR `feature-dev:code-reviewer`
- line 197: `pr-review-toolkit:silent-failure-hunter`
- line 198: `pr-review-toolkit:pr-test-analyzer`
- line 199: `pr-review-toolkit:type-design-analyzer`

### claude/commands/cross-research.md
- line 181: `feature-dev:code-explorer`
- line 182: `feature-dev:code-architect`
- line 183: `pr-review-toolkit:code-reviewer`
- line 184: `pr-review-toolkit:silent-failure-hunter`

## Status
All 11 violations fixed by TASK-0a-2. Zero violations remain after fix.
