# Wave 2 Verification

**Date:** 2026-04-14
**Branch:** `phase4/wave-2` → ready to merge
**Status:** All 5 items shipped.

## Items closed

| ID | Item | Commit |
|----|------|--------|
| W2.1 (A1) | Intent router hook + 13 tests | `4dce6c2`, `ed4e3c8` |
| W2.2 (A2) | Structured question pack on vague prompt + 6 tests | `b64291b` |
| W2.3 (B1) | `/mode brutal` added to /mode command + ijfw-core | `7faf6c9` |
| W2.4 (B2) | `IJFW_PRELUDE_MODE` lazy-load (pointer/summary/full) | `abc1aae` |
| W2.5 (B3) | Error-aware output trimmer in pre-tool-use.sh | `322e5cf`, `ecc9815` |

## The "brainstorm auto-fires workflow" moment

Saying "brainstorm X" / "let's design" / "help me build" → intent router
emits `<ijfw-intent>` context pointing the agent at `ijfw-workflow` skill
deterministically. 8 recognized intents:

- brainstorm → ijfw-workflow
- ship → ijfw-commit
- review → ijfw-review
- remember → ijfw_memory_store
- recall → ijfw_memory_recall
- critique → ijfw-critique (skill lands in W4)
- handoff → ijfw-handoff
- brutal mode → ijfw-core terse gate

## Test count (Wave 2 additions)

- Intent router: 13
- Prompt rewrite: 6
- **New: 19 tests, total now 170.**

## Suite status

`bash scripts/check-all.sh` → **All checks passed** (including positive-framing fix).
Plugin cache md5 parity verified.

## What's next

Wave 3 — Adaptive memory: FTS5, vectors (`all-MiniLM-L6-v2` default-on),
ambient auto-memorize, consent flow, audit surface, session-start "I remember"
reframe. ~20h. Largest wave of Phase 4.
