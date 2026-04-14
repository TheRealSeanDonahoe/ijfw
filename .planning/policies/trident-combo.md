---
name: Trident combo policy — lineage diversity, not raw capability
description: Default external picks for /cross-* are chosen by training-lineage diversity (1 OpenAI + 1 Google, excluding caller's family). OSS auditors are "expand" options, never default. Batch size defaults to 2 external (3 total incl. caller), cap 4.
type: project
originSessionId: 27e1e869-a61f-47a1-b504-0be415295f37
---
**Rule:** The Trident default roster is picked by lineage diversity, not by raw model quality. Two models from the same lineage catch correlated failure modes; two from different lineages catch disjoint classes of bug.

**Families:**
- Anthropic: claude
- OpenAI: codex, copilot, cursor-agent
- Google: gemini
- OSS/mixed: aider, opencode, cline, kilo (floating — run whatever model the user points at, so lineage claim doesn't hold)

**Default pick algorithm:**
1. Caller is always one leg (via specialist swarm on Claude; external-identity on codex/gemini).
2. Pick 1 installed auditor from OpenAI family, excluding caller's family.
3. Pick 1 installed auditor from Google family, excluding caller's family.
4. If either family has zero installed, backfill from the other family (e.g. caller=claude, no gemini installed → fall back to a second OpenAI-family auditor, surface the "install gemini for full diversity" nudge).
5. If total installed non-caller auditors is 1, run with that one and surface the Donahoe Trident principle nudge.

**OSS auditors (aider, opencode, cline, kilo) are never default** — they appear under "[e] expand" only. Reason: they run whatever backing model the user configured, so they don't give guaranteed lineage diversity. Power users who know their stack can add them explicitly.

**Batch-size policy:**
- Default: 2 external (3 total incl. caller).
- Cap: 4 total. Beyond that, cost increases faster than findings diversity.
- `/cross-* --expand` adds 1 extra auditor from a different family if available.
- `/cross-* --full` runs all installed. Power-user escape hatch.

**UI pattern (Krug-compliant):**
```
Firing Trident: Claude (you) · Codex · Gemini    [2s to abort]
  [e] expand ▸ add aider / opencode    [c] custom    [n] skip external
```
- No numbered menu. Single-letter shortcuts.
- Auto-fires after 2s of no input — default is action, not prompt.
- Progressive disclosure: OSS row only shown on [e].
- Never asks "which combo?" when the family-diversity pick is unambiguous.

**Why:** User (2026-04-14): "which have the best effect? ... Recommended combo bum bum bum two." And: "don't make me think." The family-diversity heuristic gives an objective reason for the default so the recommendation isn't arbitrary, and the 2s auto-fire respects the don't-make-me-think rule.

**How to apply:**
- `audit-roster.js::pickAuditors` gets a new `strategy: 'diversity'` (default) that implements the family-grouped pick. Old `priority` strategy stays as fallback.
- All `/cross-*` runbooks document the combo choice so users understand what ran and why ("fired Codex + Gemini for OpenAI/Google lineage diversity").
- Family metadata lives in `audit-roster.js` alongside the existing roster entries.
- Intent router nudges surface the combo rule when user asks "which should I pick" / "what's the best combo".
