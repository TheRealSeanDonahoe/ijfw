# Wave 0 Verification

**Date:** 2026-04-14
**Branch:** `phase4/wave-0` → merged to `main`
**Status:** All 7 foundation items shipped.

## Audit items closed

| Audit ID | Item | Commit |
|----------|------|--------|
| E1 / ST6 | Hook-wiring swap + integration test | `7329b70` |
| S1 | Per-field size caps (`caps.js`, `applyCaps`) | `7c7fefd` |
| S3 | Tolerant settings.json parse (JSONC recovery) | `b1ae752` |
| R1 | Memory schema version marker (`schema.js`, `ensureSchemaHeader`) | `2609b6d` |
| R2 | Installer pins latest tagged release | `cdecedf` |
| S5 | Secret redactor module (`redactor.js`) | `a7bd582` |
| KS5 | `/ijfw doctor` user-facing health check | `05abac0` |

## Test count delta

- **Before Wave 0:** 89 total (83 MCP + 6 installer)
- **After Wave 0:** 117 total
  - 83 MCP smoke (unchanged)
  - 11 size-caps
  - 5 schema-version
  - 10 secret-redactor
  - 5 resilient-parse (installer)
  - 4 tagged-release (installer)
  - 6 installer original (unchanged)
  - Hook-wiring integration (6 assertions in one test)
  - Doctor smoke-run (via check-all)

## Suite status

`bash scripts/check-all.sh` → **All checks passed.**

- MCP server tests: 83/83 ✓
- Size caps: 11/11 ✓
- Schema version: 5/5 ✓
- Secret redactor: 10/10 ✓
- Hook syntax: OK
- Hook wiring: 6/6 ✓
- JSON validity: OK
- Line caps: OK (SKILL 53/55, rules 18/20)
- Positive framing: clean across 10 surfaces
- MCP launcher health: OK
- Doctor: runs cleanly

## Plugin cache parity

`rsync -a --delete claude/ ~/.claude/plugins/cache/ijfw/ijfw/1.0.0/` → md5 parity OK.

## New files shipped

- `mcp-server/src/caps.js` — size cap helper + constants
- `mcp-server/src/schema.js` — schema version marker + migration
- `mcp-server/src/redactor.js` — credential pattern redactor (library-only until W3)
- `claude/hooks/tests/test-wiring.sh` — hook event↔script integration test
- `scripts/doctor.sh` — user-facing health check
- `claude/commands/doctor.md` — `/doctor` slash command
- 5 new test files (MCP + installer)

## Next wave

**Wave 1 — Live + visible** (~10h P1):
C3 publish `@ijfw/install@0.4.0-rc.1` → soak 24h → `0.4.0` · C2 real benchmark run (`--max-cost-usd 2`) · C1 + G2 savings reframe in Stop hook + JSONL v3 · B4 `.claudeignore` shipped by install.sh · S7 privacy posture doc · KS2 first-run welcome message.

Before starting W1: **expand `PHASE4-PLAN.md` Wave 1 draft into `WAVE1-PLAN.md` with bite-sized TDD tasks** (same structure as WAVE0-PLAN.md).
