# Phase 13 Polish Audit

Pre-v1.0.0 deep polish pass. Three parallel audits + live smoke tests.

## Audit 1 -- Promise delivery (22/23 delivered)

All 22 functional promises from README, CHANGELOG, installer/README, DESIGN
backed by working code + tests. One stale design-doc claim ("4 Tools Only"
in docs/DESIGN.md line 165) -- **fixed in this pass**. Updated the design
table to reflect all 8 tools with their v1.0 purpose lines, and bumped
the build-phases checklist reference.

Every major v1.0 feature verified: 8 MCP tools, 6 platforms, pre-staging,
claude-mem importer, cross-project-audit, cross-project-search, installer
redesign, Windows PS installer, zero deps.

## Audit 2 -- Sutherland / Krug / Donahoe

README, hero-line, slash commands, install.sh summary banner, install.ps1
fallback path all graded A or A+ (no changes).

Three surfaces dragged Donahoe scores -- **all fixed:**
1. cross-orchestrator-cli.js had "Phase 10 / Wave 10A -- Step 1.N" in the
   status header. Replaced with "Trident -- run N -- <mode>".
2. receipts.js renderReceipt defaulted phaseWave to "Phase 10 / Wave 10A".
   Changed default to "Trident".
3. install.ps1 preflight reframed from deprivation to benefit
   ("Node 18+ unlocks IJFW", "Install Git for Windows -- bundles
   everything we need").

## Audit 3 -- Code-level deep dive

HIGH: **6 of 7 platform rule files contained banned em-dashes**, and
cursor/.cursor/rules/ijfw.mdc added a 7th. scripts/check-all.sh did not
cover those dirs so the lint never caught them. **Both fixed:**
1. Swept em-dash + middle-dot + en-dash from all 7 platform rule files.
2. Expanded check-all.sh TARGETS to cover codex/ gemini/ cursor/
   windsurf/ copilot/ universal/ claude/rules/ installer/{README,CHANGELOG}.md
   PUBLISH-CHECKLIST.md NO_TELEMETRY.md docs/ -- regression-proof.

MED: Claude rule doesn't document ijfw_memory_prelude -- **by design.**
Claude uses SessionStart hook; other platforms use the MCP tool call
directly. Same outcome, different mechanism.

## Live CLI smoke

- ijfw --help: Usage block now shows every subcommand (import +
  cross project-audit were missing).
- ijfw status: "Trident -- run 3 -- audit (2026-04-15)".
- ijfw doctor: 7 CLIs + 3 API keys, positive framing.
- ijfw cross / ijfw import with missing args: positive hints.

## Outcome

- Promise delivery: 22/22 actionable closed.
- Principle lenses: every surface A or A- after fixes.
- Code deep-dive HIGH: em-dashes in platform rules -- closed.
- Suite: 84/84 green.
- Banned-char lint now covers every shipped/installed directory.

Ready to publish.
