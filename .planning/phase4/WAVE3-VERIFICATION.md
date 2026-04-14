# Wave 3 Verification — Adaptive Memory

**Date:** 2026-04-14
**Branch:** `phase4/wave-3` → merging to main
**Status:** 11 items shipped. Largest Phase 4 wave by scope.

## Items closed

| ID | Item | Commit |
|----|------|--------|
| W3.1 (H4) | BM25 search (search-bm25.js, 14 tests) | `bd5565d` |
| W3.2 (ST4) | Corruption recovery (schema.js:recoverIfCorrupt, 7 tests) | `bd5565d` |
| W3.3 (H5a) | Vectors module (@xenova/transformers, lazy-load, 10 tests) | `c75cff0` |
| W3.4 (H5b) | Hybrid rerank (hybridRerank function + weights) | `c75cff0` |
| W3.5 (H5c) | `/ijfw memory why` recall provenance command | `c75cff0` |
| W3.6 (H2) | PostToolUse signal capture (.session-signals.jsonl) | `bd5565d` |
| W3.7 (H3) | Feedback-phrase detector (13 tests, wired into pre-prompt) | `c75cff0` |
| W3.8 (H8+H7) | Consent flow + redactor wiring documented in auto-memorize skill | `c75cff0` |
| W3.9 (H1) | `ijfw-auto-memorize` SKILL.md (instructions for session-end synthesis) | `c75cff0` |
| W3.10 (H6) | `/ijfw memory audit` command | `c75cff0` |
| W3.11 (H9+H10) | Session-start "Remembered: X" line + memory count | `c75cff0` |

## Test count (Wave 3 additions)

- BM25 search: 14
- Corruption recovery: 7
- Feedback detector: 13
- Vectors module: 10
- **New: 44 tests, total now 214.**

## The "gets smarter as you use it" architecture

1. During turn: UserPromptSubmit detects feedback phrases + intent. Writes signals to `.ijfw/.session-feedback.jsonl` and `.prompt-check-state`.
2. During tool calls: PreToolUse captures ERROR/FAIL/Traceback patterns into `.ijfw/.session-signals.jsonl`.
3. At session end: Stop hook emits savings reframe. `ijfw-auto-memorize` skill (if invoked) reads the two signal files + transcript, redacts secrets, caps sizes, dedupes against existing memories via BM25, classifies, and stores structured entries tagged `auto-memorize`.
4. Next session: session-start surfaces the most-recent auto-extracted entry ("Remembered: …") — the Sutherland moment.
5. Recall: BM25 + optional vector embeddings → hybrid rerank. `/ijfw memory why` shows provenance.

## Vectors posture

- **Optional dependency** on `@xenova/transformers` in mcp-server/package.json. Doesn't break zero-deps default install path.
- Default: ON when the library is installed (via future installer step).
- `IJFW_VECTORS=off` disables regardless.
- First-run model fetch is ~23MB (MiniLM) from HuggingFace — documented in NO_TELEMETRY.md as one of the three optional network actions.
- Not yet wired into `ijfw_memory_search` MCP tool (that's a W5 polish step — current tool uses linear scan; adding BM25 + vector rerank is a focused refactor).

## Suite status

`bash scripts/check-all.sh` → **All checks passed**.
Plugin cache md5 parity verified.
Node warnings silenced via root package.json `type:module`.

## Caveats

- **Auto-memorize skill is instructions, not yet executable code.** The agent reads the skill and performs the synthesis. When invoked, it uses the existing `ijfw_memory_store` MCP tool. LLM-budget gating (`IJFW_AUTOMEM_MODEL`) is documented in the skill and `NO_TELEMETRY.md`; wiring it to a real Haiku call is a W4/W5 polish.
- **Vectors library not yet installed by default.** The optional dep is declared; installer step to `npm install --prefix mcp-server @xenova/transformers` lands in W4 platform parity.
- **Search tool not yet rewired to BM25+vectors.** The BM25 and vector modules exist and tested; the `ijfw_memory_search` MCP tool still uses linear scan. This is a surgical refactor for W5.

## Next wave

Wave 4 — Uniform: platform parity (Codex/Gemini/Cursor/Windsurf/Copilot auto-wired same depth as Claude), `/ijfw` landing command, auto-compact, `ijfw-critique` skill, `set -euo pipefail` sweep, hook error log, memory archival. ~10h.
