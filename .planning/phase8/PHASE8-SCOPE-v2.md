# Phase 8 — scope v2 (post 4-way Trident audit)

**Theme:** "Trident, enforced · visible · everywhere · owned."

Closes the 9 issues from `SCOPE-AUDIT.md`: unified 1+8, reordered build chain, JSONL receipts piggybacking on `sessions.jsonl`, measured-delta hero lines (Codex/METR caveat), codex/ as sole-CLI-path (Explorer), and the user-flagged workflow-ownership problem.

## Locked answers to open questions (unless overruled)

| # | Question | Answer | Source |
|---|----------|--------|--------|
| 1 | 2s abort UX | Rewrite as "auto-proceeds unless overridden" — truthful beats aspirational | Architect C4 |
| 2 | CLI distribution | Second bin in `mcp-server/package.json` alongside `ijfw-memory` | Explorer + zero-deps invariant |
| 3 | swarm.json default gen | Lazy on first orchestrator call (not install-time) | Architect open-Q3 |
| 4 | Receipts cost model | Pull from existing `sessions.jsonl` schema v3 | Architect U8 |
| 5 | Combo policy in repo | Promote `project_trident_combo_policy.md` → `.planning/policies/trident-combo.md` for non-Claude platform visibility | Codex U3 |

## Tier A — v2 lock

### 0. OWNERSHIP DISCIPLINE + VISIBLE TODO SURFACE (broadened after user follow-up)

Two coupled product-values fixes. No optimisation, no deferral.

**0a — Ownership discipline (systemic, user-flagged after /plan-phase slip):**
No IJFW surface (skill, command, hook, subagent prompt, MCP nudge, AND assistant narration while under IJFW workflow) may name a foreign plugin's command as the next action. `gsd:*`, `superpowers:*`, `hookify:*`, `claude-supermemory:*`, `feature-dev:*` and `pr-review-toolkit:*` are BANNED as action verbs. Specialist subagents fired inside a swarm via `Agent(` are allowed — that IS the swarm pattern. Attribution in source comments is allowed.

Work:
- **Naming-gap audit:** inventory IJFW's own verbs. Today `plan`/`execute`/`verify` are sub-phases inside `ijfw-workflow`, not standalone commands. Gap — a user mid-conversation has no native IJFW jump-in verb and will reach for `gsd:plan-phase` or `superpowers:writing-plans`. **Add thin wrapper commands** `/ijfw-plan`, `/ijfw-execute`, `/ijfw-verify`, `/ijfw-audit`, `/ijfw-ship` that invoke the corresponding phase of the workflow skill directly. Close the verb vacuum.
- **Audit** `claude/skills/ijfw-workflow/SKILL.md` + every `claude/commands/*.md` + every hook script for foreign-plugin action verbs; rewrite each violation to IJFW-native or to `Agent(` dispatch.
- **Static guard in `scripts/check-all.sh`:** grep IJFW user-facing surfaces for `\b(gsd|superpowers|hookify|claude-supermemory|feature-dev|pr-review-toolkit):[a-z-]+` at action position → fail CI. Allow-list: `Agent(` call sites, attribution comments (must include the word "absorbed" or "pattern"), migration-detection strings.
- **Runtime lint in workflow skill:** before emitting any "next step" text, the skill's renderer checks for foreign verbs and rewrites or halts.

**0b — Mandatory TODO surface (Krug visibility, user-flagged in original message):**
Every workflow phase transition creates a `TaskCreate` entry; every audit gate (Discover → Plan, Plan → Execute, Execute → Verify, Verify → Ship) creates its own gate task; every specialist subagent dispatch creates a task owned by that agent id. User sees the list update in real-time — it IS the progress bar.

Quick mode: 3–5 task surface per cycle. Deep mode: 15+ task phase breakdown.

**Regression test:** `/ijfw-workflow` run on a real phase must produce:
(1) TaskList with ≥1 task per audit gate,
(2) zero foreign-plugin verbs in any user-facing output,
(3) TaskUpdate to `completed` for every task that closed successfully.

### 1. Executable cross-orchestrator + `bin/ijfw` CLI (unified, was Items 1 + 8)

New `mcp-server/bin/ijfw` shim + `mcp-server/src/cross-orchestrator.js` that owns: probe roster → family-diversity pick → swarm resolve → parallel fire (externals bg-bash, internals via Agent tool) → wait → merge → receipt-write → archive. Auto-fire by construction; markdown runbooks cannot regress the invariant.

Platform integration: one-line addition in each of `codex/`, `gemini/`, `cursor/`, `windsurf/`, `copilot/`, `universal/` rules files: "to cross-audit/research/critique, run `ijfw cross <mode> <target>`." **Explorer U9:** `codex/` package has no MCP config — CLI is the sole Trident path for Codex users, so this lands Codex parity.

Architect U6: memoize `isInstalled` across probe loop within one orchestrator run (per-process cache is cold on every CLI invocation).
Architect U7: orchestrator stamps a single `runStamp` and passes it into `buildRequest` so parallel requests share the same timestamp.

### 2. Intent-router priority + specificity scoring

Add `priority: number` to every `INTENTS` entry. Replace first-match-wins loop with: filter matches → sort by `priority` DESC, then `specificity` (longer pattern = higher) → return highest. Gemini U5: this is the proven enterprise rule-engine order.

Update `test-intent-router.js:56` shadow-regression test to assert priority-driven ordering explicitly (not positional).

### 3. Family-diversity picker (`pickAuditors({strategy:'diversity'})`)

Add `family: 'anthropic' | 'openai' | 'google' | 'oss'` to each `ROSTER` entry in `audit-roster.js`. Add new `strategy: 'diversity'` branch that picks 1 OpenAI + 1 Google excluding caller's family. Tie-break on zero-in-family: emit `missing: [{family, angle}]` then backfill from other families with a Trident-principle nudge. Existing `strategy` default stays for backward compat.

Codex U3: receipts must log exact CLI+model identity (Codex CLI GPT-5.2 != Codex CLI GPT-5.4; Terminal-Bench shows within-family variance is material).

### 4. Swarm roster as config (`.ijfw/swarm.json`)

Schema: `{ project_type: "node" | "python" | …, specialists: [{id, role, agent_type}] }`. Lazy init on first orchestrator call — detect project type from repo signals, write default file, read thereafter. Defaults per language (Node → code-reviewer + silent-failure-hunter + pr-test-analyzer; typed → add type-design-analyzer).

### 5. Trident default-fire reconcile (was Item 4)

Replace "which combo A/B/C" prompt with auto-fire whenever family-diversity pick is unambiguous (≥1 OpenAI + ≥1 Google installed excluding caller). Prompt only on partial roster or explicit `--confirm`. **Truthful UX language:** "Auto-proceeding with Codex + Gemini unless you override on the next turn."

### 6. Session receipts + measured-delta hero lines

`.ijfw/receipts/cross-runs.jsonl` (append-only, atomic-append-safe, one line per run). Schema piggybacks on `sessions.jsonl` v3 fields where relevant (input_tokens, cost_usd, model) + adds cross-specific (`mode`, `auditors: [{id, family, model}]`, `findings: {consensus, contested, unique}`, `duration_ms`, `run_stamp`).

Hero-line renderer reads the JSONL and produces one-liners like:
```
3 AIs · 47s · 6 findings, 2 consensus-critical · measured Δ: −41% tokens vs solo Claude 3×
```
**Codex U1 caveat:** deltas must be real measurements from `sessions.jsonl`, not estimates. If the delta can't be computed from real data yet, show `findings count + duration` only — don't fabricate savings. METR showed users believe they're +20% faster while being -19% slower; our receipts must never enable that self-deception.

`/ijfw-status` command reads the JSONL for aggregate hero numbers.

### 7. Auto-critique on commit (flagship wow)

Two paths, both same receipt output:
- **`/ijfw-commit` chain** — fires `ijfw cross critique HEAD~1..HEAD` in background before returning. Claude-native, zero infra.
- **`.git/hooks/post-commit`** — written by `scripts/install.sh`, calls `ijfw cross critique HEAD~1..HEAD` in background. Covers every platform (gated on Item 1 landing first).

Receipt appears in `.ijfw/receipts/cross-runs.jsonl`; user sees it at next `/ijfw-status` or when they next open the repo.

### 8. Combo policy doc in repo

Copy `~/.claude/projects/.../feedback_trident_combo_policy.md` → `.planning/policies/trident-combo.md`. Durable for non-Claude platforms. Reference it from every `cross-*.md` runbook and from the CLI's `--help` output.

---

## Build order (consensus-locked)

1. **Item 0** — workflow ownership + TODO surface. Self-contained, unblocks nothing technical but restores product integrity immediately.
2. **Item 2** — intent-router priority. Self-contained, ~20 lines, no deps.
3. **Item 3** — family field + diversity branch in `pickAuditors`. Unblocks orchestrator.
4. **Item 4** — `swarm.json` schema + lazy init. Unblocks orchestrator.
5. **Item 1** — orchestrator + `bin/ijfw` + platform rules one-liners. Blocked on 3 + 4.
6. **Item 6** — receipts + hero-line renderer. Parallel-safe with Item 1 (can build simultaneously).
7. **Item 5** — Trident default-fire reconcile. Depends on Item 1.
8. **Item 7** — auto-critique on commit. Depends on Item 1.
9. **Item 8** — combo policy doc copy. Trivial, any time.

## Estimate

5–7h unified scope, parallelisable across swarm subagents. Items 0, 2, 3, 4, 8 can fire in parallel; Item 1 + 6 are the sequential backbone; Items 5 + 7 are thin decorations on 1.

## Success criteria (measured, per Codex U1)

- `ijfw cross audit <file>` runs end-to-end from a fresh shell with no Claude session open.
- `node --test` passes on all new/modified test files; `scripts/check-all.sh` green incl. new workflow-superpowers-delegation regression check.
- At least one real cross-critique receipt is written to `.ijfw/receipts/cross-runs.jsonl` during the P8 branch itself (eating own food).
- `/ijfw-status` renders aggregate hero-line with measured deltas pulled from `sessions.jsonl`.
- Shadow-regression test updated to assert priority-driven intent routing.
- `ijfw-workflow` skill contains zero "dispatch to superpowers:*" runtime hand-offs.
- At least one `ijfw-workflow` run (on a real phase in a real repo) produces a visible TODO surface with tasks for every audit gate.

## Post-P8 polish pass (unchanged from v1)

`ijfw demo`, timeout/hang handling, prompt-caching, new-machine bootstrap + uninstall + RTK coexist live-fire tests, intent-phrase gap audit, non-Claude platform parity audit.
