# IJFW v1.1 -- Preflight + Observability -- BUILD PLAN

Planned: 2026-04-16. Inputs: `RESEARCH-claude-mem.md`, `RESEARCH-preflight.md`, `RESEARCH-observability.md`, `CLAUDE.md`, `CHANGELOG.md`. Style: Donahoe Loop, positive framing, zero runtime deps.

---

## 1. Goal

Ship v1.1 of `@ijfw/install` with a blocking preflight pipeline that would have caught every v1.0.x bug before tag, plus an always-on observation ledger and a zero-dep local dashboard at `http://localhost:37891` that makes IJFW legible in real time across Claude Code, Codex, and Gemini. One install still wires everything; `ijfw preflight` and `ijfw dashboard` are additional verbs on the same binary.

## 2. In scope

- `ijfw preflight` CLI with 11 gates (ordered fast-to-slow, fail-fast on blockers).
- `.ijfw/observations.jsonl` append-only ledger + deterministic heuristic classifier.
- PostToolUse hook capture on Claude, Codex, Gemini.
- SessionEnd classifier + `session_summaries.jsonl` prose summary (heuristic, no LLM).
- SessionStart dashboard banner + `/clear` and `/ijfw-status` integration.
- `ijfw dashboard {start|stop|status}` + SSE server on port 37891 (fallback to 37892-37900).
- Single-file HTML viewer, light/dark CSS vars, `EventSource`, no React, no build step.
- `.github/workflows/ci.yml` + `release.yml` with Trusted Publishing + provenance.
- Cross-platform parity: the observation + dashboard features work identically on Claude, Codex, Gemini.
- Fix ALL preflight findings in-pass (no carryovers, per user instruction).

## 3. Out of scope

- LLM classification of observations (heuristic ships; LLM deferred to v1.2 as opt-in MCP tool).
- ChromaDB or any vector store (FTS5 covers 90% at current scale).
- WebSockets (SSE is simpler and dep-free).
- React / Express / Bun / `uv` -- every claude-mem dep we explicitly reject.
- OpenTelemetry exporter (post-v1.1, separate opt-in package).
- Team memory tier UI in the dashboard (Phase 3).
- Windows-native dashboard service wrapper (dashboard works on Windows via Node; no MSI/nssm).
- Cursor / Windsurf / Copilot dashboard parity (they do not have hook lifecycles; they read the JSONL only).

## 4. Waves

### Wave dependency graph

```
        V1.1A (preflight CLI)
            |
            +------> V1.1E (CI/CD -- invokes preflight)
            |
V1.1B (observation ledger + classifier)
            |
            +------> V1.1C (dashboard renderer -- reads ledger)
            |             |
            |             +------> V1.1D (observability server -- tails ledger, serves HTML + SSE)
            |                          |
            +------> V1.1F (cross-platform parity -- Codex + Gemini hooks write ledger)
                                       |
                                       v
                                 V1.1G (verify + ship)
```

Legend: `A -> B` means B consumes A's output. A and B can run in parallel; C depends on B; D depends on C; E depends on A; F depends on B+C+D; G depends on everything.

---

### Wave V1.1A -- Preflight tool

**Goal:** `ijfw preflight` runs 11 gates locally in <90s and returns exit 0/1 with a positive-framed summary.

**Files to create:**
- `installer/src/preflight.js` (entry; parses argv, dispatches gates, aggregates results)
- `installer/src/preflight/gates/shellcheck.js`
- `installer/src/preflight/gates/oxlint.js`
- `installer/src/preflight/gates/eslint-security.js`
- `installer/src/preflight/gates/psscriptanalyzer.js`
- `installer/src/preflight/gates/publint.js`
- `installer/src/preflight/gates/gitleaks.js`
- `installer/src/preflight/gates/audit-ci.js`
- `installer/src/preflight/gates/knip.js`
- `installer/src/preflight/gates/license-check.js`
- `installer/src/preflight/gates/pack-smoke.js`
- `installer/src/preflight/gates/upgrade-smoke.js`
- `installer/src/preflight/runner.js` (executes gate list, respects `--fail-fast`, renders report)
- `scripts/preflight/pack-smoke.sh`
- `scripts/preflight/upgrade-smoke.sh`
- `.shellcheckrc`, `.audit-ci.jsonc`, `knip.json`, `.eslintrc.security.json`

**Files to modify:**
- `installer/package.json` -- add `bin.ijfw` pointing to `dist/ijfw.js` (single binary, subcommands: `install`, `preflight`, `dashboard`, `doctor`). Deprecate nothing; `ijfw-install` stays as alias.
- `installer/src/install.js` -- split into `installer/src/cmd-install.js` and a thin dispatcher `installer/src/ijfw.js`.

**Acceptance:**
- `ijfw preflight` exits 0 on clean HEAD, 1 on injected shellcheck SC2154 in a fixture file.
- Each gate gracefully downgrades to "skipped: tool not installed" in positive-framed prose (no negatives in user output) when its CLI is absent, except blockers which print actionable install hints.
- Pack-smoke gate rebuilds `npm pack`, installs into a temp dir, invokes `./node_modules/.bin/ijfw --help`, asserts exit 0.
- Upgrade-smoke installs `@ijfw/install@1.0.3` (hardcoded floor), then HEAD tarball on top, then `jq`-asserts `~/.claude/settings.json` plugin key == `ijfw`.
- Runs under 90s on M-series laptop with warm caches.
- Cold-cache run documented; warm-cache <=90s is the SLO; cold run <=240s is acceptable and noted in output.

**Depends on:** none.

**Effort:** ~10-12h. Heaviest wave.

**Open questions for builder:**
- `npx --yes <tool>@<pinned-version>` for preflight tools; pinned versions tracked in `.ijfw/preflight-versions.json`. LOCKED: `npx --yes tool@pinned-version`. Pinned versions tracked in `.ijfw/preflight-versions.json` for reproducibility.
- `jq` is not standard on Windows -- does upgrade-smoke.sh need a pure-Node fallback? Ship both: shell for macOS/Linux, Node for Windows, via a gate-level adapter.

---

### Wave V1.1B -- Observation ledger

**Goal:** Every PostToolUse event on every supported platform appends one JSONL line to `.ijfw/observations.jsonl`; SessionEnd writes one summary line to `.ijfw/session_summaries.jsonl`.

**Files to create:**
- `mcp-server/src/ledger.js` -- append-only writer with atomic file lock, line-length cap 8KB, rotation at 10MB.
- `mcp-server/src/classifier.js` -- deterministic heuristic: tool name + tool_input + file pattern -> type in {bugfix, feature, refactor, change, discovery, decision, note}.
- `mcp-server/src/summarizer.js` -- SessionEnd prose summarizer (pure heuristic: groups by type, picks top N files, emits request/investigated/learned/completed/next_steps paragraphs).
- `mcp-server/src/schema-observation.js` -- JSON schema for observation records.
- `claude/hooks/scripts/observation-capture.sh` -- reads envelope, shells to `node mcp-server/src/cli-ledger.js append`.
- `mcp-server/src/cli-ledger.js` -- CLI entry for hook shell scripts (`append`, `summarize`, `tail`, `stats`).

**Files to modify:**
- `claude/hooks/scripts/post-tool-use.sh` -- call `observation-capture.sh` async (`& disown`) BEFORE the trim envelope emission, so PostToolUse envelope remains the terminal stdout line.
- `claude/hooks/scripts/session-end.sh` -- call `node cli-ledger.js summarize`.
- `claude/hooks.json` -- no wiring change; existing PostToolUse + SessionEnd already matched.
- `shared/skills/ijfw-core/SKILL.md` -- add one line about the ledger (must stay <=55 lines).

**Acceptance:**
- After a Claude Code session with 5 Edits + 3 Reads + 1 Bash, `.ijfw/observations.jsonl` has 9 valid JSON lines, each with `{id, ts, platform, session_id, tool, type, files, summary}`.
- Classifier emits `change` for Write/Edit, `discovery` for Read/Grep/Glob, `bugfix` when user prompt contains `/fix|bug|broken/i`, `decision` when summary matches `/decide|choose|picking/i`, `feature` when prompt+diff adds net-new files.
- SessionEnd appends one summary line with keys `{session_id, request, investigated, learned, completed, next_steps, notes, files_read, files_edited}`.
- Atomic write proven via `node --test` that spawns 10 concurrent appenders and asserts exactly 10 valid lines, no partial/interleaved writes.
- No LLM call made. Hooks remain deterministic shell per CLAUDE.md invariant.
- PostToolUse envelope remains the terminal stdout line. Unit test asserts envelope is the final line.

**Depends on:** none (parallel with V1.1A).

**Effort:** ~8h.

**Open questions for builder:**
- Lock strategy: `mkdir`-based lock (claude-mem style, already used for session-counter per `project_session_state_2026-04-14`) or `node:fs.openSync(path, 'ax')`? Recommend `mkdir`-lock for parity with existing code.
- Ledger rotation: rename to `.jsonl.<epoch>` and start fresh, or gzip? Recommend plain rename; dashboard reads only the live file; archived files are for audit only.

---

### Wave V1.1C -- Dashboard renderer

**Goal:** Single-file HTML viewer + SessionStart banner make observations visible without opening a browser; browser view available via `/` on the server from V1.1D.

**Files to create:**
- `dashboard/public/index.html` (single-file, inline CSS + JS, `EventSource('/stream')`, `document.createElement` + `textContent` only, no `innerHTML` with observation data).
- `dashboard/public/favicon.svg` (inline SVG).
- `shared/skills/ijfw-dashboard/SKILL.md` (<=55 lines) -- intent triggers, `/dashboard` slash-command binding.
- `claude/commands/ijfw-dashboard.md` -- Claude slash command wrapper.
- `claude/hooks/scripts/session-start-banner.sh` -- prints 3-line banner: `dashboard: http://localhost:37891` + obs-count from ledger + `ijfw dashboard` to open. Positive framing only.

**Files to modify:**
- `claude/hooks/scripts/session-start.sh` -- append call to `session-start-banner.sh`. Banner runs after existing startup report; it must not print negatives if server down (instead: `dashboard: ijfw dashboard  (starts in ~1s)`).
- `shared/skills/ijfw-status/SKILL.md` -- show ledger line count + dashboard port in `/ijfw-status`.
- `shared/skills/ijfw-core/SKILL.md` -- keep <=55 lines; one bullet on dashboard.

**Acceptance:**
- `curl -s http://localhost:37891/` returns the HTML with a valid `<!doctype html>` + no external network references (grep asserts no `http://` or `https://` fetches in script).
- Viewer loads and shows last 200 observations in <100ms on a 2000-line ledger.
- Filter input narrows rows client-side without a round-trip.
- `prefers-color-scheme: light` renders light theme; `prefers-reduced-motion: reduce` stops pulsing dot.
- SessionStart banner adds <=3 lines, ANSI-clean, zero negatives, runs <50ms.
- `/ijfw-status` shows `dashboard: http://localhost:37891 (42 observations, ~2h session)`.

**Depends on:** V1.1B (ledger).

**Effort:** ~6h.

**Open questions for builder:**
- File-click behavior: `vscode://file/...` only, or detect `$EDITOR` and branch? Recommend vscode:// default + `?editor=` query param override in V1.2.
- "Load earlier" pagination UX: infinite scroll vs explicit button? Recommend explicit button; simpler, no IntersectionObserver.

---

### Wave V1.1D -- Local observability server

**Goal:** `ijfw dashboard start` spawns a detached Node process on 127.0.0.1:37891 with SSE tail; `stop`/`status` read PID file.

**Files to create:**
- `dashboard/server.js` -- `node:http` server, routes `/`, `/observations`, `/observations/:id`, `/stream`, `/api/health`, `POST /api/shutdown`; all gated by `requireLocalhost`. Uses `fs.watch` + 2s poll fallback + `node:readline` tail with known-offset diff (claude-mem gotcha #1).
- `dashboard/lib/sse-broadcaster.js` -- `Set<res>` fan-out, 50ms debounce, `Last-Event-ID` replay, `event: close` on shutdown.
- `dashboard/lib/require-localhost.js` -- rejects `req.socket.remoteAddress` not in {`127.0.0.1`, `::1`, `::ffff:127.0.0.1`}.
- `dashboard/lib/port-walk.js` -- tries 37891..37900, returns first bindable; writes `.ijfw/dashboard.port`.
- `dashboard/lib/pid-file.js` -- writes `.ijfw/dashboard.pid`; `stop` reads + SIGTERM + cleanup.
- `installer/src/cmd-dashboard.js` -- subcommand handler for `start|stop|status|--no-open`.
- `installer/src/lib/open-browser.js` -- shells to `open` (mac) / `xdg-open` (linux) / `start` (win); skip if `$CI` or `--no-open`.

**Files to modify:**
- `installer/src/ijfw.js` -- dispatch `dashboard` subcommand to `cmd-dashboard.js`.

**Acceptance:**
- `ijfw dashboard start` on a clean machine binds to 37891 within 500ms, writes PID + port files, opens browser (unless `$CI`).
- Port 37891 busy -> walks to 37892; port file reflects actual port; banner reads from port file.
- External request (`curl --interface en0 http://<lan-ip>:37891/`) is refused (`403`).
- SSE client sees new observation within 150ms of ledger append (50ms debounce + watcher latency).
- `ijfw dashboard stop` sends `event: close`, closes server, removes PID + port files. Re-start works immediately on macOS; 500ms delay on Windows (claude-mem gotcha #8).
- `/api/health` returns `{status:"ok", version, uptime, ledgerPath, obsCount}`.
- XSS audit: feed the ledger a line with `{"summary":"<script>alert(1)</script>"}`, confirm browser renders it as visible text, no script execution.
- Process memory <40MB on a 10k-line ledger.
- Zero runtime deps confirmed by `npm ls --production` in the shipped tarball.
- Start with stale PID file (PID not alive) reclaims port and rewrites PID file; stop with missing PID file exits 0 with positive message.

**Depends on:** V1.1B (ledger), V1.1C (HTML to serve).

**Effort:** ~8-10h.

**Open questions for builder:**
- Default port: LOCKED: 37891, walk to 37900 on conflict, write actual port to `.ijfw/dashboard.port`.
- Auto-start: LOCKED: NO. Explicit `ijfw dashboard start`. Krug "sane defaults, not surprise processes."
- SSE backfill size: 200 rows vs 500? Default 200; configurable via `?backfill=500` on `/stream`.

---

### Wave V1.1E -- CI/CD GitHub Actions

**Goal:** Every push runs preflight; every tag publishes with provenance via npm Trusted Publishing; zero humans touch npm tokens.

**Files to create:**
- `.github/workflows/ci.yml` -- runs `npm run preflight` on ubuntu-latest + a `preflight-windows` job for PSScriptAnalyzer.
- `.github/workflows/release.yml` -- on `push: tags: ['v*']`, re-runs preflight belt-and-braces, then `npm publish --provenance --access public` with `id-token: write`.
- `.github/workflows/cross-audit.yml` -- manual/label-triggered Trident on PRs labelled `needs-trident`, non-blocking.
- `.github/dependabot.yml` -- weekly, dev-deps only.

**Files to modify:**
- `installer/package.json` -- add `"preflight": "node dist/ijfw.js preflight"` script + `"scripts.prepublishOnly": "npm run build && npm run preflight"`.
- `README.md` -- add CI badge + "built with provenance" line.

**Acceptance:**
- PR simulated with SC2154 in a shell script fails CI on the shellcheck gate.
- PR simulated with a plaintext AWS key in README fails CI on the gitleaks gate.
- Tag `v1.1.0-rc.1` on a clean tree triggers release.yml, publishes to npm with provenance, CI run URL visible on npmjs.com package page.
- npm Trusted Publisher configured on npmjs.com for `@ijfw/install`; no `NPM_TOKEN` secret in GitHub.
- Fresh `npm install -g @ijfw/install@1.1.0-rc.1` pack-smokes clean on macOS + Ubuntu + Windows matrix.

**Depends on:** V1.1A (preflight must exist).

**Effort:** ~4h (most time = npm Trusted Publisher UI dance + first green run).

**Builder notes:**
- Trident: LOCKED label-triggered only (`trident` label on PR). Per `project_trident_combo_policy.md`.
- Matrix Node versions: 18 + 20 + 22? Recommend 18 + 22 (oldest supported + latest LTS).

---

### Wave V1.1F -- Cross-platform parity (Codex + Gemini)

**Goal:** The observation ledger + dashboard work identically on Codex and Gemini. Cursor, Windsurf, Copilot: ledger read-only (they have no hook lifecycle we can write from).

**Files to create:**
- `codex/.codex/scripts/observation-capture.sh` (mirrors claude version).
- `codex/.codex/scripts/session-start-banner.sh`.
- `gemini/extensions/ijfw/hooks/scripts/observation-capture.sh`.
- `gemini/extensions/ijfw/hooks/scripts/session-start-banner.sh`.
- `shared/skills/ijfw-dashboard/SKILL.md` -- already written in V1.1C; referenced identically from `codex/skills/` and `gemini/extensions/ijfw/skills/` per the canonical shared-skills pattern.

**Files to modify:**
- `codex/.codex/hooks.json` -- wire observation-capture to PostToolUse; session-start-banner to SessionStart.
- `gemini/extensions/ijfw/hooks/hooks.json` -- same, respecting Gemini's 11-hook lifecycle (attach to `AfterModel` if PostToolUse unavailable).
- `scripts/install.sh` -- copy new scripts into per-platform install targets.
- `installer/src/install.js` (Windows + Node paths) -- same, for `.codex/scripts/` and `gemini/extensions/ijfw/hooks/scripts/`.

**Acceptance:**
- `ijfw demo` run with `PLATFORM=codex` produces observations with `"platform":"codex"` in the ledger.
- Same for `PLATFORM=gemini`.
- Dashboard feed shows all three platforms interleaved, correctly color-coded by platform column.
- Parity matrix in README updated: Claude, Codex, Gemini show "yes" for observation + dashboard; Cursor, Windsurf, Copilot show "view-only" (dashboard reads ledger; they have no write path).

**Depends on:** V1.1B + V1.1C + V1.1D.

**Effort:** ~5h.

**Open questions for builder:**
- Gemini hook semantics: does `AfterModel` give us tool_input+tool_response in the same envelope as Claude's PostToolUse? Per `project_hook_event_semantics.md` this was hardened in P6.2 for Claude only. Confirm Gemini envelope shape before mapping fields; build an adapter in `mcp-server/src/platform-adapter.js` if shapes differ.

---

### Wave V1.1G -- Verify + ship

**Goal:** Close the Donahoe Loop. Every wave's acceptance passes; cross-audit clean; CHANGELOG written; npm publish green.

**Files to create:**
- `installer/test/e2e/preflight.test.js` -- spawns `ijfw preflight` against fixtures, asserts all 11 gates fire and results match expectations.
- `installer/test/e2e/dashboard.test.js` -- starts server, writes a fixture line to ledger, asserts SSE client sees it within 200ms.
- `installer/test/e2e/cross-platform.test.js` -- synthesizes hook invocations for claude/codex/gemini, asserts ledger shape.

**Files to modify:**
- `CHANGELOG.md` -- add `## [1.1.0] -- 2026-04-XX` entry with themed bullets matching the P10/P9/P8 cadence already in the file.
- `installer/package.json` -- version bump to `1.1.0`.
- `README.md` -- screenshot/ASCII of dashboard; one-line pitch for preflight; update install/quickstart.
- `docs/DESIGN.md` -- observability section; port 37891 decision.

**Acceptance:**
- `npm run preflight` green.
- `node --test installer/test/**/*.test.js` -- all pass.
- `/cross-audit v1.1` (Trident) returns consensus: no blocking findings. Any medium/low findings closed in-pass per user instruction.
- `npm publish --provenance` dry-run succeeds via release.yml workflow_dispatch.
- Tag `v1.1.0`, release.yml green, package visible on npm with provenance badge.
- `ijfw-install` on a fresh machine brings up a working dashboard in one command.
- Post-ship: handoff written via `/handoff`; memory updated; task list closed.
- Preflight gate outputs JSON; no TODO/FIXME strings in wave deliverables (grep gate enforced).

**Depends on:** everything above.

**Effort:** ~4-6h (test authoring + ship mechanics + cross-audit triage).

**Open questions for builder:**
- Release cadence: LOCKED: ship `1.1.0-rc.1` first, soak 24h, then `1.1.0` stable. Given v1.0.x unpublish scar.

---

## 5. GATE V1.1 checklist

v1.1 is "done" when ALL of the following are true. No subjective items; each line is a command or file check.

- [ ] `installer/dist/ijfw.js` exists and has `#!/usr/bin/env node` on line 1 (publint gate).
- [ ] `ijfw --help` lists `install`, `preflight`, `dashboard`, `doctor` subcommands.
- [ ] `ijfw preflight` on HEAD: exit 0, 11 gates reported, <=90s on M-series laptop.
- [ ] Injecting each of the 4 known v1.0.x bugs into fixtures causes preflight exit 1 with a clear gate name.
- [ ] `.ijfw/observations.jsonl` appends 1 line per PostToolUse on Claude + Codex + Gemini (proven via `installer/test/e2e/cross-platform.test.js`).
- [ ] `ijfw dashboard start` binds 127.0.0.1:37891 (or next free in 37892-37900) and opens browser unless `$CI`.
- [ ] `curl http://<lan-ip>:37891/` returns 403 (localhost gate enforced).
- [ ] SSE delivers a new observation within 200ms of ledger append.
- [ ] XSS fixture line does not execute JS in the browser.
- [ ] `npm ls --production` in the shipped tarball: 0 deps.
- [ ] `.github/workflows/ci.yml` green on main; `.github/workflows/release.yml` green on `v1.1.0` tag.
- [ ] npm Trusted Publisher configured; no `NPM_TOKEN` in repo secrets.
- [ ] `@ijfw/install@1.1.0` on npmjs.com shows provenance badge.
- [ ] `CHANGELOG.md` `[1.1.0]` entry exists, follows P10/P9/P8 cadence, uses positive framing, no banned chars (checked by `scripts/check-all.sh`).
- [ ] `scripts/check-all.sh` green (banned-char, positive-framing, foreign-plugin-verb, narration-pattern, line-cap rules all pass).
- [ ] `ijfw-core/SKILL.md` remains <=55 lines.
- [ ] Cross-audit Trident on v1.1 returns zero blocking findings; all medium/low closed in-pass.
- [ ] Handoff doc written; task list `#10..#17` all `completed`.

## 6. Design decisions (locked)

1. **Single binary vs multi-bin.** LOCKED: YES. Single `ijfw` bin with subcommands. Old bins (`ijfw-install`, `ijfw-uninstall`) remain as symlinks for backwards compat.
2. **Heuristic classifier only for v1.1, LLM deferred?** LOCKED: YES. Heuristic based on tool name, commit message prefix, file patterns. LLM classifier deferred to v1.2 as opt-in MCP tool.
3. **Port 37891 default, walk to 37900.** LOCKED: 37891, walk to 37900 on conflict, write actual port to `.ijfw/dashboard.port`.
4. **Explicit `ijfw dashboard start` vs auto-start on first SessionStart.** LOCKED: NO auto-start. Explicit `ijfw dashboard start`. Krug "sane defaults, not surprise processes."
5. **Pinned `npx --yes <tool>@<ver>` vs vendored devDeps for preflight tools.** LOCKED: `npx --yes tool@pinned-version`. Pinned versions tracked in `.ijfw/preflight-versions.json` for reproducibility.
6. **`1.1.0-rc.1` dry-run before `1.1.0` stable.** LOCKED: ship `1.1.0-rc.1` first, soak 24h, then `1.1.0` stable. Given v1.0.x unpublish scar.
7. **Trident on every PR vs label-triggered.** LOCKED: label-triggered only (`trident` label on PR), not every push. Per `project_trident_combo_policy.md`.
8. **Summary heuristic threshold.** LOCKED: 2 observations. SessionEnd summary fires if >=2 observations in the session.

---

End of PLAN. Total: ~45-55h across seven waves. A + B run in parallel as the critical path's first fork; F and G are serial sinks.
