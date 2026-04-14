# IJFW Phase 4 — Complete

**Closed:** 2026-04-14
**Branches merged:** 5 (waves 0→5) + 1 hotpatch
**Commits on main:** `c739755` (Phase 3 close) → `2170dac` (current HEAD)
**Tests:** 89 → **214** (+125 new)
**Suite:** `bash scripts/check-all.sh` → all green
**Pushed:** ✅ `origin/main`

## Waves shipped

| Wave | Theme | Items | Commits |
|------|-------|-------|---------|
| W0 | Foundations (no-regret fixes) | 7 P1 + 6 hotpatch | `7329b70`..`feea396` |
| W1 | Live + visible | 6 local, 2 gated (publish deferred) | `0168ac7`..`8411052` |
| W2 | Intelligent now | 5 P1 | `4dce6c2`..`ecc9815` |
| W3 | Adaptive memory | 11 P1 | `bd5565d`..`c75cff0` |
| W4 | Uniform | 6 P1 | `ad6b8d2`..`c4ea987` |
| W5 | Polish + proof | 13 P2 + marketplace prep | `3de8453` |

## Flagship features delivered

1. **Measured impact** — Benchmark harness + real run shows IJFW Arm C delivers **−41% cost, −20% output tokens, −51% cache-creation** vs baseline on `claude-sonnet-4-5`. Report at `core/benchmarks/REPORT-001.md`.

2. **Savings reframe** — Every session ends with a one-line "IJFW this session: ~N tokens saved (~$X)" in the Stop hook.

3. **"Brainstorm auto-fires workflow"** — Deterministic intent router (`mcp-server/src/intent-router.js`) matches 8 high-signal intents and dispatches to the right skill without LLM guessing.

4. **Adaptive memory architecture** —
   - BM25 search (`search-bm25.js`, 14 tests)
   - Vector scaffold via `@xenova/transformers` (optional dep, default-on when installed)
   - Hybrid rerank
   - PreToolUse signal capture (errors/failures/stack traces)
   - UserPromptSubmit feedback detection (corrections/confirmations/preferences)
   - `ijfw-auto-memorize` skill for session-end synthesis with consent gate, redactor, size caps, BM25 dedupe
   - Session-start "Remembered: …" Sutherland moment
   - `/ijfw memory audit` review surface
   - `/ijfw memory why` recall provenance

5. **Token + context discipline** —
   - `/mode brutal` (Caveman-equivalent)
   - Lazy-load prelude (pointer / summary / full via `IJFW_PRELUDE_MODE`)
   - Error-aware PostToolUse output trimmer
   - PreCompact preservation hints

6. **Installer hardening** — Tolerant JSONC parse, tagged-release pinning, atomic TOML merge, backup pruning, memory-preserving uninstall, full platform parity (Codex/Gemini/Cursor/Windsurf/Copilot auto-wired same depth as Claude).

7. **Security & hardening** —
   - Per-field size caps (UTF-8-safe truncation)
   - Secret redactor with 12 credential patterns (OpenAI/Anthropic/GitHub/AWS/Stripe/npm/HF/Azure/GCP/bearer/slack/inline)
   - Schema version marker with legacy auto-migration
   - Corruption recovery with quarantine
   - Tag whitelist
   - `IJFW_DISABLE=1` universal kill switch

8. **Observability & trust** —
   - `/ijfw doctor` health check
   - Hook error log rotation
   - Memory journal archival (>90d monthly)
   - Session-dir pruning (keep newest 30, gzip older)
   - `NO_TELEMETRY.md` + README Privacy section
   - Plugin manifest validation in CI
   - Full `check-all.sh` green on every push via `.github/workflows/ci.yml`

## New files (count: 27)

Source modules (7):
- `mcp-server/src/caps.js`
- `mcp-server/src/schema.js`
- `mcp-server/src/redactor.js`
- `mcp-server/src/search-bm25.js`
- `mcp-server/src/vectors.js`
- `mcp-server/src/intent-router.js`
- `mcp-server/src/feedback-detector.js`

Skills (2):
- `claude/skills/ijfw-auto-memorize/SKILL.md`
- `claude/skills/ijfw-critique/SKILL.md`

Commands (4):
- `claude/commands/doctor.md`
- `claude/commands/ijfw.md`
- `claude/commands/memory-audit.md`
- `claude/commands/memory-why.md`

Scripts + config (3):
- `scripts/doctor.sh`
- `claude/hooks/tests/test-wiring.sh`
- `.github/workflows/ci.yml`

Docs (5):
- `NO_TELEMETRY.md`
- `PUBLISH-CHECKLIST.md`
- `claude/.claudeignore`
- `core/benchmarks/REPORT-001.md`
- Wave verification docs × 6

Tests (8 new files):
- `mcp-server/test-{size-caps,schema-version,redactor,metrics-v3,intent-router,prompt-rewrite,search-bm25,corruption-recovery,feedback-detector,vectors}.js`
- `installer/test-{resilient-parse,tagged-release}.js`

## External-action backlog (carried forward)

1. **`npm publish @ijfw/install@0.4.0-rc.1`** — Sean's terminal, after npm signup + 2FA + `ijfw` org. Full walkthrough in `PUBLISH-CHECKLIST.md`. Deferred due to onboard-wifi captcha issues on-plane.
2. **Promote to 0.4.0 latest** — 24h after rc.1 soaks.
3. **Tag `v1.0.0-phase4`** — optional, after publish.
4. **Marketplace PR** — to `anthropics/claude-code-plugins-marketplace`, once publish lands.

## What's explicitly NOT in Phase 4 (deferred to Phase 5)

- **A4** — second-model cross-audit via subprocess
- **A5** — skill A/B via benchmark harness
- **E3** — automated npm publish CI
- **E5** — explicit opusplan routing
- **F3** — 10 more benchmark tasks
- **F4** — Windows-native installer
- **ST5** — file locks for concurrent-session writes
- **S8** — transformers model SHA256 pin
- **Minor UX polish** — D2/D3/D4, KS6/7/8, R4/R5

These are tracked in `WAVE5-VERIFICATION.md` "Deferred to Phase 5" section.

## Honest caveats

1. **Auto-memorize is skill-level, not wired to a live LLM.** The skill documents the synthesis flow and invokes `ijfw_memory_store` — but actually calling Haiku/Ollama at session end is a Phase-5 wiring. Deterministic signal capture (signals, feedback) IS live and accumulating data.
2. **Vectors are scaffolded but transformers.js isn't auto-installed.** The optional dep is declared; real first-run model fetch needs the user to either run `npm install --prefix mcp-server @xenova/transformers` once or for the installer to do it. Phase 5 wiring.
3. **Benchmark n=1.** Numbers are directional. Phase 3.5 / Phase 5 will run proper epochs.
4. **Arm A isolation** (`CLAUDE_DISABLE_PLUGINS=1`) still not empirically verified. The new `IJFW_DISABLE=1` covers it regardless.

## How to resume

1. Finish npm publish from a stable network (`PUBLISH-CHECKLIST.md`).
2. Tag `v1.0.0-phase4` on `main`.
3. Open marketplace PR at `anthropics/claude-code-plugins-marketplace` — single JSON entry pointing at our repo + version.
4. Plan Phase 5 when ready: pick from the deferred list above.
