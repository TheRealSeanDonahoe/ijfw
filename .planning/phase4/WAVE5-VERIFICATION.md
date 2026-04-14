# Wave 5 Verification — Polish + Proof

**Date:** 2026-04-14
**Status:** 13 P2 items + marketplace-prep shipped. Remaining P2/P3 deferred to Phase 5 (see end).

## Items closed this wave

| ID | Item | Commit |
|----|------|--------|
| S2 | Tag whitelist (alphanumeric + _-) | `3de8453` |
| S4 | Atomic TOML merge (.tmp + rename) | `3de8453` |
| S6 | Backup-file pruning >30d | `3de8453` |
| ST2 | SIGINT handler on MCP server | `3de8453` |
| E4 | `IJFW_DISABLE=1` universal kill switch (every hook) | `3de8453` |
| C5 / KS4 | Visible mode indicator in session-start banner | `3de8453` |
| G1 | CI workflow (`.github/workflows/ci.yml`) | `3de8453` |
| (mkt) | Plugin manifest validation in CI | `3de8453` |
| (mkt) | Benchmark numbers surfaced in README | `3de8453` |

Already shipped earlier waves (credit per plan):

| ID | Where |
|----|-------|
| S7 privacy posture | W1 (`NO_TELEMETRY.md`) |
| B6 compression caps | W0 (`caps.js`) |
| B7 protect-recent-turns | W4 (PreCompact hints) |
| P3 vectors lazy-load | W3 (lazy import in `vectors.js`) |
| P4 journal archival | W4 (monthly archive) |

## Deferred to Phase 5 / optional Wave 6

Items that are either genuinely complex, have diminishing marginal value, or deserve their own focused phase:

- **A4** — second-model cross-audit via real subprocess (needs Haiku or Ollama integration + cost story)
- **A5** — skill A/B via benchmark harness (needs more than scaffold first)
- **E3** — fully automated npm publish CI (needs manual publish first to claim scope)
- **E5** — explicit opusplan model routing
- **F3** — 10 more benchmark tasks (needs budget; current n=1 is directional)
- **F4** — Windows-native installer (currently WSL-recommended)
- **C4** — "pair with Headroom" README recipe
- **D2-D4** — mode/memory-tier visibility docs (nice-to-have)
- **KS6** — error-message polish sweep
- **KS7/KS8** — telemetry doc re-pass, update mechanism prose
- **R4/R5** — deprecation policy, plugin cache model docs
- **ST5** — file lock for concurrent-session writes (needs design)
- **S8** — transformers model SHA256 pin

## Test count: 214 (no new tests this wave — all items were operational)

## Suite status

`bash scripts/check-all.sh` → **All checks passed**.
Plugin cache md5 parity verified.

## Marketplace readiness

After this wave:
- ✓ CI workflow green
- ✓ Plugin manifest has all required fields + validated in CI
- ✓ README leads with measured impact (-41% cost)
- ✓ `NO_TELEMETRY.md` + privacy section
- ✓ MIT license, author, repo fields present
- ✓ Zero dependencies on personal infra
- ✓ Kill switches (IJFW_DISABLE=1, ijfw off, /mode manual)
- ⏳ **Blocker**: `@ijfw/install@0.4.0` not yet published to npm (W1 deferred — on Sean's todo)
- ⏳ Nice-to-have: release tag (v1.0.0) + screenshots/GIF in README

Once publish lands, we're one marketplace PR away from listing.
