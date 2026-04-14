# Wave 1 Verification

**Date:** 2026-04-14
**Branch:** `phase4/wave-1` → ready to merge to `main`
**Status:** All local tasks shipped. 2 gated tasks (npm publish rc.1 + promote 0.4.0 to latest) handed to user terminal for 2FA.

## Tasks closed on this branch

| ID | Item | Commit |
|----|------|--------|
| W1.4 (B4) | `.claudeignore` template shipped by install.sh | `0168ac7` |
| W1.5 (S7) | `NO_TELEMETRY.md` + README Privacy section | `8620767` |
| W1.6 (KS2) | First-run welcome message in installer | `7724da1` |
| W1.3 (C1, G2) | Metrics JSONL v3 + Stop-hook savings reframe | `4be634a` |
| W1.2 (C2) | Real benchmark run 01-bug-paginator × 3 arms + REPORT-001.md | `46879ec` |
| (hygiene) | `.gitignore`, narrative report, `type:module` | `e07977c` |
| W1.1 prep | `@ijfw/install` bumped to `0.4.0-rc.1` | `419cab0` |
| W1.1 prep | package-lock.json for reproducible builds | `8411052` |

## Benchmark headline (REPORT-001.md)

**Arm C (full IJFW) vs Arm A (baseline) on claude-sonnet-4-5:**
- **Cost:** −41.0%
- **Output tokens:** −20.3%
- **Cache-creation tokens:** −51.1%

Total spend: $0.675 across 3 arms. n=1 — directional, not conclusive.

## Baseline factor recalibrated

Default `IJFW_BASELINE_FACTOR` was 1.65 (speculative). Measured token ratio: **1.25**. Cost ratio: **1.69**. Stop-hook default updated to 1.25 (token-based) so the savings figure matches the measurement. Cost-based framing via `IJFW_BASELINE_FACTOR=1.7` override.

## Still open — require user terminal

### W1.1 — publish `@ijfw/install@0.4.0-rc.1`

- Scope verified **open** on npm (404 for `@ijfw/install`).
- Prep complete: version bumped, dist/ built and sized at 4.2 KB, tarball dry-run confirmed 4 files, package-lock committed.
- `npm whoami` on this machine: unauthenticated — cannot publish from here.

**Commands to run in an authenticated terminal:**

```bash
cd installer
npm login                          # web or 2FA auth
npm run build                      # regenerate dist/
npm pack --dry-run                 # sanity: ~4.2KB, 4 files
npm publish --access public --tag next
npm view @ijfw/install versions    # verify visible on registry
```

Once published, reply "rc published" and Wave 1 merges to main.

### W1.7 — promote `@ijfw/install@0.4.0` to latest (after 24h soak)

```bash
cd installer
# Edit installer/package.json: version → "0.4.0"
npm run build
npm publish --access public        # default tag 'latest'
```

## Suite status

`bash scripts/check-all.sh` → **All checks passed** at every step.
Plugin cache md5 parity verified after each commit that touched claude/.

## Test count

- MCP smoke: 83
- Size caps: 14
- Schema version: 5
- Secret redactor: 19
- Metrics v3: 5
- Resilient parse: 7
- Tagged release: 5
- Installer smoke: 6
- Hook wiring: 6 assertions (one test)
- Doctor smoke: 1

**Total: 151 tests, all green.**

## Next wave

Wave 2 — intelligent now: intent router hook (the "brainstorm auto-fires workflow" ask), prompt-rewrite on vague detection, `/mode brutal`, lazy-load prelude, PostToolUse output trimmer. ~9 hours P1. Plan expands from PHASE4-PLAN.md draft once rc.1 is live.
