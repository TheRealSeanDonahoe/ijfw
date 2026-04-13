---
name: ijfw-commit
description: "Terse conventional commits. Trigger: commit, git commit, /ijfw-commit"
---

Write commit messages following Conventional Commits.

Format: type(scope): subject

Rules:
- Subject ≤50 chars. Imperative mood.
- Why over what. The diff shows what changed.
- Types: feat, fix, refactor, docs, test, chore, perf, ci, style
- Scope: affected module/component (optional but preferred)
- Body only if the "why" isn't obvious from the subject.
- No "Updated", "Changed", "Modified" — be specific.

Examples:
- fix(auth): prevent token refresh race condition
- feat(api): add rate limiting to public endpoints
- refactor(db): extract connection pool into service
