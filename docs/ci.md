# CI/CD

IJFW ships GitHub Actions workflows that gate every push and automate npm publishing.

## What runs on every push and PR

| Job | Runner | What it does |
|-----|--------|--------------|
| `preflight` | ubuntu-latest | Runs all 11 preflight gates, uploads JSON report as artifact |
| `preflight-windows` | windows-latest | Runs PSScriptAnalyzer on PowerShell files |
| `check-all` | ubuntu-latest | Runs `scripts/check-all.sh` (banned-char + positive-framing audit) |
| `plugin-manifest` | ubuntu-latest | Validates `claude/.claude-plugin/plugin.json` |
| `trident` | ubuntu-latest | Cross-audit via Trident -- ONLY when PR has the `trident` label |

The `trident` job is label-triggered by design. It dispatches external AI auditors (Codex + Gemini + Claude swarm) and posts results as a PR comment. It does not block merge.

## Running preflight locally

```
cd installer
npm ci
npm run build
node dist/ijfw.js preflight
```

With JSON output (same format as CI artifact):

```
node dist/ijfw.js preflight --json
```

Stop on first failure:

```
node dist/ijfw.js preflight --fail-fast
```

The JSON report schema is documented in `docs/preflight.md`.

## Interpreting CI failures

Each preflight gate maps to a v1.0.x incident class:

| Gate | Catches |
|------|---------|
| `shellcheck` | Unbound shell variables (the `$APPDATA` bug) |
| `publint` | Missing bin field, missing shebang |
| `pack-smoke` | Missing exec bit, broken bin wiring |
| `upgrade-smoke` | Plugin key mismatch on reinstall |
| `gitleaks` | Committed secrets |
| `audit-ci` | High/critical npm advisory |

When a gate fails, the artifact `preflight-report-ubuntu` on the Actions run contains the full JSON report. Download it and look at the `gates` array for the failing gate's `details` field.

## Release workflow

The release workflow runs on any tag matching `v*`.

```
git tag v1.1.0-rc.1
git push origin v1.1.0-rc.1
```

Release cadence (locked): publish `v1.1.0-rc.1` first, soak 24h, then `v1.1.0` stable.

RC tags publish to the `next` dist-tag. Non-RC tags publish to `latest`.

### Fail-closed guarantee

The `publish` job has `needs: preflight`. If preflight fails, publish does not run.

### npm Trusted Publishing (OIDC)

The workflow uses `permissions.id-token: write` and `npm publish --provenance` for supply-chain attestation. This requires a one-time setup on npmjs.com:

1. Go to npmjs.com -> your package -> Settings -> Trusted Publishers.
2. Add a GitHub Actions publisher:
   - Owner: `seandonahoe` (or your org)
   - Repository: `ijfw`
   - Workflow: `release.yml`
   - Environment: (leave blank)
3. Save. No `NPM_TOKEN` secret needed after this.

Until Trusted Publishing is configured, the workflow falls back to `NPM_TOKEN`:

```
GitHub repo -> Settings -> Secrets -> Actions -> New repository secret
Name: NPM_TOKEN
Value: npm token with publish scope
```

Both paths use `--provenance`, which attaches a signed SLSA attestation to the published package. The provenance badge appears on the npmjs.com package page.

## Dependabot

Dependabot runs weekly on Mondays and opens PRs for:
- `installer/` npm devDependencies
- GitHub Actions version pins

Runtime dependencies are zero by design; Dependabot will not open PRs for them.

## Adding the `trident` label

Apply the `trident` label to any PR that touches:
- Installer logic (`installer/src/`)
- MCP server (`mcp-server/`)
- CI/release workflows (`.github/workflows/`)
- Security-sensitive hooks (`claude/hooks/`)

The Trident job fires automatically when the label is present and posts a multi-auditor review as a PR comment.
