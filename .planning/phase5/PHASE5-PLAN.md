# IJFW Phase 5 — Plan

**Goal:** Close the Phase 4 carryovers (live auto-memorize, vectors in search), then light up the cross-audit loop (user's Gemini/Codex tabs as second-model oracle), then release-readiness polish.

## Scope

**Wave P5-W1 — Complete the memory loop (~5h)**
1. Wire `ijfw_memory_search` to use BM25 + optional vectors + hybrid rerank
2. Auto-memorize: add `ijfw_auto_memorize` MCP tool that runs the synthesis flow (redactor, caps, BM25 dedupe, classify) on session signal files; Stop hook invokes it when consent is `true`
3. Consent CLI — `/ijfw memory consent yes|no|ask`
4. S8 — model SHA256 pin for transformers.js model download

**Wave P5-W2 — Cross-audit + skill A/B (~3h)**
5. A4 — `/cross-audit` command that formats a structured prompt for the user to paste into Gemini/Codex; schema for the response; comparison rendered
6. A5 — benchmark runner `--skill-variant` arg that swaps a skill file before the run, measures difference

**Wave P5-W3 — Release + docs (~2h)**
7. E3 — tag-gated automated npm publish workflow (`.github/workflows/publish.yml`)
8. E5 — explicit opusplan routing documented in ijfw-core
9. F4 — Windows Powershell installer stub (`installer/src/install.ps1`)
10. KS6 + R4/R5 — error message polish + deprecation policy + plugin cache docs

## What stays deferred

- **F3** 10 more benchmark tasks — needs budget + time
- **ST5** concurrent-session file locks — covered by existing atomic writes for small entries; full design needs its own mini-project

## Execution

Single branch `phase5/wave-1`. Atomic commits per item. No gates (publish is workflow-only — doesn't run).
