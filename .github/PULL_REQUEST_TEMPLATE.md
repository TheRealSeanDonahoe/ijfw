## Summary

_What does this PR do? Why?_

## Checklist

- [ ] Ran `ijfw preflight` locally and it passed
- [ ] All blocking gates green (shellcheck, oxlint, publint, gitleaks, audit-ci, pack-smoke, upgrade-smoke)
- [ ] Added `trident` label if this is a HIGH-risk change (security, installer logic, MCP server, release plumbing)
- [ ] Advisory findings (knip, license-check) reviewed and either resolved or noted below
- [ ] No secrets, tokens, or credentials in the diff
- [ ] CHANGELOG.md updated if this is a user-facing change
- [ ] Commit message follows conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)

## Advisory findings (if any)

_List any knip or license-check warnings surfaced by preflight and why they are acceptable._

## Testing

_How was this tested beyond preflight?_
