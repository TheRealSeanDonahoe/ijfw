<!-- pre-P10-template: historical, preserved as-is -->
# IJFW Phase 5 — Complete

**Closed:** 2026-04-14
**Branch:** `phase5/wave-1` → merging to main
**Tests:** 214 (unchanged; this phase was architectural wiring + new surfaces)

## Items shipped

### Adaptive memory — closed the Phase 4 carryover loop

1. **BM25 in `ijfw_memory_search`** — replaces naive token-overlap. Per-source boost (team 1.25x, knowledge 1.15x, handoff 1.1x, journal 1.0x, global/native 0.95x). Legacy output shape preserved.

2. **`ijfw-memorize` standalone synthesizer** (`mcp-server/bin/ijfw-memorize`) — invoked by Stop hook after metrics write:
   - Consent-gated (`.ijfw/.automem-consent`)
   - Reads `.session-signals.jsonl` + `.session-feedback.jsonl`
   - Redactor + caps applied
   - BM25 dedupe against existing knowledge
   - Deterministic 1:1 promotion: feedback → pattern/preference, recurring errors (≥2×) → observation
   - `IJFW_AUTOMEM_MODEL` writes a pending marker for future LLM-synthesis
   - Prints "Stored N memories: …" summary
   - Clears signal files for next session

3. **`/memory-consent`** command — yes/no/ask writes `.ijfw/.automem-consent`.

4. **S8 model SHA256 pin** — `IJFW_VECTORS_MODEL_SHA256` env for supply-chain verification.

### Cross-audit loop (A4)

5. **`/cross-audit`** command — two-phase flow:
   - Phase 1: writes `.ijfw/cross-audit/request.md` with structured prompt. User copies to Gemini CLI / Codex in another tab.
   - Phase 2: `/cross-audit compare` reads response, renders agreement/new/disputed table.
   - Archives to `.ijfw/cross-audit/archive/<ts>/`.

### Skill A/B (A5)

6. **`--skill-variant` flag on benchmark runner** — swaps `ijfw-core/SKILL.md` with an alternate file for the run, restores in finally.

### Release readiness

7. **`.github/workflows/publish.yml`** — tag-gated npm publish (`installer-v*` tags), `--provenance`, tag-derived dist-tag (rc → next, else latest), `secrets.NPM_TOKEN`.

8. **Opusplan routing (E5)** — `ijfw-core` SKILL.md explicit model hints: Haiku for scout, Sonnet for builder, Opus for architect only.

9. **Windows installer stub (F4)** — `installer/src/install.ps1`. Mirrors the JS installer flow, calls `scripts/install.sh` via Git Bash. Preflight checks Node ≥18, git, bash.

## Still deferred (consciously)

- **F3** 10 more benchmark tasks — budget not worth it yet; scaffold is proven
- **ST5** concurrent-session file locks — existing atomic writes cover small entries; full design is a mini-project
- **Actual LLM-synthesis wiring** for auto-memorize — scaffold + queue exists, Anthropic SDK wiring is a focused 2h job when wanted
- **Installer auto-install of `@xenova/transformers`** — optional dep declared, real install step needs platform-aware tooling
- **KS6 / R4 / R5** — micro-polish, diminishing returns

## New surfaces

Binaries: `mcp-server/bin/ijfw-memorize`
Commands: `/memory-consent`, `/cross-audit`, `/cross-audit compare`
CI: `publish.yml` (tag-gated)
Installer: `install.ps1` (Windows)

## Suite status

`bash scripts/check-all.sh` → **All checks passed**.
Plugin cache md5 parity verified.

## Combined Phase 4 + 5 headline

From 89 tests + no published installer + no benchmarks → **214 tests, measured −41% cost reduction, live adaptive memory loop, Windows installer, marketplace-ready CI, 42 shipped items across 7 waves.**

## External actions still on Sean's plate

1. `npm publish @ijfw/install@0.4.0-rc.1` (captcha-blocked on the plane; see `PUBLISH-CHECKLIST.md`)
2. Add `NPM_TOKEN` secret to GitHub repo (for tag-triggered auto-publish)
3. 24h soak → promote to `latest`
4. `v1.0.0` release tag on `main`
5. Marketplace PR at `anthropics/claude-code-plugins-marketplace`
