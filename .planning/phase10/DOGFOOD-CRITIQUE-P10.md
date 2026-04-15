# Phase 10 dogfood critique -- self-audit of the polish branch

Auditor role: Claude / Opus (specialist-swarm leg of the Trident, same
pattern used in Waves 10E.2 - 10E.5). Principle lens: combined
Krug + Sutherland + Donahoe, focused on REGRESSIONS introduced by the
polish work itself, not repeats of findings the three-lens pass already
closed in Wave 10E.6.

## Scope

- Commit range reviewed: 14436a5..587dc1f (main merge-base to P10 tip)
- P10 commits in range: 42
- Files changed vs main: 68 total (26 planning docs, 42 user-facing)
- User-facing files reviewed: 42
- Surfaces fresh in P10 (vs P9):
  - `ijfw doctor` subcommand (cross-orchestrator-cli.js)
  - Install.sh self-run guard via `.ijfw-source` marker
  - Hero-line cache-savings suffix (`prompt cache hit -- ~$X saved`)
  - CHANGELOG.md (P0-P10 history)
  - PUBLISH-CHECKLIST.md refresh
  - README.md 30-second-hook rewrite
  - `/ijfw-status` Phase/Wave/Step line
  - Receipts purge subcommand + receipts pruning
  - Anthropic prompt caching (`cache_control` + receipt stats)
  - Static guard lint rules (check-all.sh banned-chars + narration)

## Method

1. Ran the project's own guard suite (`scripts/check-all.sh`): all 27
   checks pass -- positive framing, line caps, banned chars,
   ownership-discipline, hook wiring, JSON validity, doctor runs clean.
2. Byte-scanned all 42 user-facing modified files for section-sign,
   box-heavy, dingbat, and emoji code-points. Zero hits against the
   project's banned-char guard.
3. Cross-referenced partial-rewrite surfaces (README + CHANGELOG +
   ijfw.md + CLAUDE.md + skill headers) for contradictory claims.
4. Manually traced each new surface against Krug (effortless to scan),
   Sutherland (reframe to delivered value), Donahoe (just fucking works
   for a stranger on first run).

## Findings

Severity rule: findings without `file:line` auto-downgrade one tier and
are marked `[no-file-ref]`.

| ID | Surface | Severity | Description | Recommended action | Disposition |
|----|---------|----------|-------------|--------------------|-------------|
| D01 | `mcp-server/src/hero-line.js:84` | LOW | `.toFixed(2)` on cache-savings math prints `$0.00 saved` when cache-read tokens < ~1852 (Haiku-scale short prompts). A zero-dollar value attached to a "prompt cache hit" nudge feels like anti-value -- Sutherland lens: if we can't show a positive number, suppress the suffix. | Guard: only append cacheSuffix when the rounded-cents figure is `>= 0.01`. Otherwise drop the parenthetical. | Close in P10 (one-line fix) OR defer to P11.R0 with rationale "show-savings threshold tuning". |
| D02 [closed] | `CLAUDE.md:22` | LOW | CLAUDE.md states "Currently 51 lines" for ijfw-core/SKILL.md; actual on-branch count is 53 lines. Still under the 55 hard cap, but the authoritative doc drifted from reality during P10 rewrites (Wave 10A-sk touched skill bodies). | Update "51" to "53" in CLAUDE.md, or replace with "under 55" to avoid future drift. | Close in P10 (one-line doc fix). |
| D03 [closed] | `README.md:3` vs `README.md:39` | LOW | L3 claims "7 platforms"; L39 enumerates 6 coding agents plus a "universal paste-anywhere rules file". Internally consistent only if the reader counts the universal file as a platform. First-scan Krug friction: a stranger counts agents in L39 and gets 6. | Either enumerate all 7 by name in L39 (add "universal rules") or change L3 to "6 coding agents + universal rules". | Close in P10 (one-line README fix). |
| D04 | `mcp-server/src/cross-orchestrator-cli.js:394` | LOW | On a successful cross run the CLI prints `Receipt: .ijfw/receipts/cross-runs.jsonl` -- an internal dot-file path exposed at peak success moment. Hook scripts explicitly ban JSONL / file paths in user output (session-start.sh:15). Inconsistent discipline between CLI output and hook output. | Replace with `Receipt logged -- run \`ijfw status\` to see it` or similar action phrase. | Consider for P10 (one-line CLI fix); otherwise P11.R0. |
| D05 | Cross-surface naming drift | MEDIUM `[no-file-ref]` -> downgraded to LOW | Fresh P10 doctor output uses `[ ok ]` / `[ .. ]` prefixes; session-start banner uses plain-text praise prose; hero-line uses `--` separators; `/ijfw-status` uses its own layout. Each is individually clean but the vocabulary of "status / readiness" is rendered four different ways across four surfaces. Stranger running all four in one session sees no unified visual grammar. | After P10 ship, pick one house style (probably doctor's bracket notation) and align the other three. | Defer to V1.1.R0 -- not a publish blocker. |
| D06 | `scripts/install.sh:22` | INFO | P10 Wave 10B.5 added the self-run guard using a Unicode em-dash (`U+2014`). The project's banned-char guard does NOT forbid em-dash, and install.sh has predated-P10 lines using check-mark / right-arrow / middle-dot dingbats (U+2713, U+2192, U+00B7) (L55-57, since 2026-04-14). So this is a STYLE continuation, not a regression. Noted only so the publish checklist can decide whether V1.0 wants ASCII-strict installer output for pipe-safety on exotic terminals. | No action. Flag for V1.1 polish. | No disposition -- informational only. |

Severity summary:
- HIGH (new): 0
- MEDIUM (new): 0 (D05 downgraded per severity rule)
- LOW (new): 4 (D01, D02, D03, D04 + D05-downgraded)
- INFO: 1 (D06)

## Dogfood signal

The polish work itself is polished. The Wave 10E.6 fix-wave closed
every HIGH from the three-lens pass without introducing contradictory
rewrites -- cross-referencing README / CHANGELOG / PUBLISH-CHECKLIST /
ijfw.md / CLAUDE.md found zero claim conflicts. New surfaces (doctor,
install guard, receipt purge, hero-line savings, CHANGELOG) all pass
the project's own guard suite on first run. Positive-framing guard
clean across 31 files. Banned-char guard clean. Ownership-discipline
guard clean. This is the 4th consecutive phase using the loop
(P7, P8, P9, P10) and the loop continues to find real issues each
pass -- D01 is a genuine Sutherland-lens miss from 10D.4, D02/D03 are
genuine consistency misses from 10A. All four are one-line fixes.

No regression introduced by the fix-wave. Polish work is polished.

## Verdict

ZERO new HIGH findings -> PUBLISH GATE ready.

Four LOW findings (D01-D04) and one informational note (D06). Per plan,
only HIGH findings block publish. LOWs may close in P10 opportunistically
or ride into V1.1.R0 with explicit disposition.
