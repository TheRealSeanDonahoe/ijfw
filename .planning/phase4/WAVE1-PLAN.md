# IJFW Phase 4 — Wave 1: Live + Visible

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn IJFW from "installed" into "published, measured, and proud." Ship the npx install to npm, commit a real benchmark number, surface per-session savings in the Stop hook, and document the privacy posture.

**Branch:** `phase4/wave-1` (single branch, atomic commits).

**External-action gates (require explicit user go):**
- W1.2 real benchmark run (costs real Anthropic API tokens, capped at $2)
- W1.1 `npm publish @ijfw/install@0.4.0-rc.1` (irreversible npm scope claim)
- W1.7 `npm publish @ijfw/install@0.4.0` (irreversible version release)

All other tasks are local and reversible.

## Execution order

1. W1.4 ship `.claudeignore` via install.sh *(local)*
2. W1.5 `NO_TELEMETRY.md` + privacy README paragraph *(local)*
3. W1.6 first-run welcome message in installer *(local)*
4. W1.3 metrics JSONL v3 + Stop-hook savings reframe *(local)*
5. **PAUSE — confirm W1.2 benchmark spend**
6. W1.2 real benchmark run + commit JSONL + report
7. **PAUSE — confirm W1.1 npm publish rc.1**
8. W1.1 `npm publish @ijfw/install@0.4.0-rc.1`
9. [out-of-session] 24h soak
10. **PAUSE — confirm W1.7 publish 0.4.0**
11. W1.7 `npm publish @ijfw/install@0.4.0`

---

## W1.4: `.claudeignore` shipped by install.sh (B4)

**Files:** `claude/.claudeignore` (new canonical file), `scripts/install.sh` (copy to project on install when Claude target selected)

- [ ] Create `claude/.claudeignore` with opinionated defaults:
      `node_modules/`, `.git/`, `dist/`, `build/`, `.next/`, `target/`, `.cargo/`, `.venv/`, `coverage/`, `.DS_Store`, `*.log`, package-lock.json, pnpm-lock.yaml, yarn.lock, Cargo.lock, `.ijfw/archive/`
- [ ] In `scripts/install.sh` under the `claude)` target, print a `note`: ".claudeignore available at $REPO_ROOT/claude/.claudeignore — copy to your project root for instant context savings."
- [ ] Commit: `feat(install): ship opinionated .claudeignore template (B4)`

## W1.5: Privacy posture (S7)

**Files:** `NO_TELEMETRY.md` (new root), `docs/README.md` paragraph (if README exists, else root `README.md`)

- [ ] Create `NO_TELEMETRY.md` with: no phone home, all memory local, transformers/vectors/FTS5 local only, auto-memorize runs locally (Wave 3) unless `IJFW_AUTOMEM_MODEL` is set to an API model (Haiku), and every opt-in with `IJFW_*_MODEL=off` toggle.
- [ ] Link from `docs/README.md` or root README in a "Privacy" section.
- [ ] Commit: `docs: privacy posture — no telemetry, all local (S7)`

## W1.6: First-run welcome (KS2)

**Files:** `installer/src/install.js`

- [ ] Replace the terse "IJFW ready. Launch Claude Code and say hi." with a 5-line welcome:
      line 1: "IJFW ready."
      line 2: "  Memory preserved at: ${memDir}"
      line 3: "  Run `ijfw-install --help` to see options."
      line 4: "  /doctor inside Claude Code to verify health."
      line 5: "  Privacy: everything local. See NO_TELEMETRY.md."
- [ ] Extend `install.js --help` test to assert the welcome body isn't printed (help is still terse).
- [ ] Commit: `feat(install): first-run welcome surface (KS2)`

## W1.3: Metrics JSONL v3 + savings reframe (C1, G2)

**Files:** `mcp-server/src/metrics.js` (new module, extracted from server.js metrics code), `claude/hooks/scripts/session-end.sh` (emit one-line savings), `mcp-server/src/server.js` (update writer to v3 format), existing metrics tests.

- [ ] Write a failing test asserting session-end Stop hook output contains "IJFW this session:" line with token count.
- [ ] Extract metrics read/parse logic to `mcp-server/src/metrics.js`; keep v2 compatibility (ignore unknown fields). Bump schema to v3: add `compression_ratio`, `baseline_tokens_estimate`.
- [ ] Session-end hook: read today's JSONL, sum input+output, compute saved-vs-baseline (baseline = tokens * 1.65 as documented estimate from benchmarks), emit:
      `IJFW this session: 12 turns • ~9,200 tokens saved vs baseline • ~$0.11`
- [ ] Tests: 3+ covering v2 backward-compat, v3 forward-compat, empty-JSONL graceful.
- [ ] Commit: `feat(metrics): JSONL v3 + Stop-hook savings reframe (C1, G2)`

## W1.2: Real benchmark run (C2) — **GATED**

Pre-check: user explicitly approved `--max-cost-usd 2`.

- [ ] Verify `CLAUDE_DISABLE_PLUGINS=1` actually disables IJFW hooks (audit E4 carry-over). If not: document caveat + introduce `IJFW_DISABLE=1`.
- [ ] Run: `node core/benchmarks/run.js --task 01-bug-paginator --arm A --epochs 1 --really --max-cost-usd 0.75`
- [ ] Run: `node core/benchmarks/run.js --task 01-bug-paginator --arm B --epochs 1 --really --max-cost-usd 0.75`
- [ ] Run: `node core/benchmarks/run.js --task 01-bug-paginator --arm C --epochs 1 --really --max-cost-usd 0.75`
- [ ] Run: `node core/benchmarks/report.js core/benchmarks/runs/*.jsonl > core/benchmarks/REPORT-001.md`
- [ ] Commit: `chore(bench): first real run — 01-bug-paginator × 3 arms (C2)`

## W1.1: npm publish rc.1 (C3) — **GATED**

- [ ] `cd installer && npm run build` — produces dist/install.js + dist/uninstall.js
- [ ] `npm pack --dry-run` — verify tarball <100KB
- [ ] `npm publish --access public --tag next` — publishes 0.4.0-rc.1 under `next` dist-tag so users running plain `npx @ijfw/install` don't pick up the RC.
- [ ] Verify via `npm view @ijfw/install versions`
- [ ] Commit: `chore(release): publish @ijfw/install@0.4.0-rc.1 (C3)`

## W1.7: npm publish 0.4.0 (C3-final) — **GATED**

After 24h soak with no reported issues:

- [ ] Bump version to `0.4.0` in `installer/package.json`
- [ ] Rebuild, republish: `npm publish --access public` (uses default `latest` tag)
- [ ] Commit: `chore(release): promote 0.4.0 to latest (C3)`

## Wave 1 exit criteria

- [ ] All 7 tasks committed to `main`.
- [ ] `scripts/check-all.sh` green.
- [ ] `npx @ijfw/install@0.4.0` works end-to-end on a clean machine.
- [ ] First benchmark JSONL committed; REPORT-001.md renders.
- [ ] Session-end Stop hook prints savings line.
- [ ] `WAVE1-VERIFICATION.md` filed.
