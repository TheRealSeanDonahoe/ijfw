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
- No "Updated", "Changed", "Modified" -- be specific.

Examples:
- fix(auth): prevent token refresh race condition
- feat(api): add rate limiting to public endpoints
- refactor(db): extract connection pool into service

After commit completes successfully, run in the same shell:
```bash
command -v ijfw >/dev/null 2>&1 && ijfw cross critique HEAD~1..HEAD &
```
Then narrate to the user using this exact structure:
- One line: `Phase N / Wave NA -- Step N.M -- commit -- done.`
- One line: SHA + subject (e.g. `a1b2c3d feat(api): add rate limiting`)
- One line: `Background critique running -- check /ijfw-status for findings.` (omit if ijfw not present)
