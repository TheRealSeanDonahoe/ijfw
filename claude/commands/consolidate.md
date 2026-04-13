---
name: consolidate
description: "Dream cycle — promote patterns, prune stale, reconcile contradictions, optionally promote to global."
---

Run the IJFW dream cycle on project memory using the architect agent.

## Inputs to read

- `.ijfw/memory/project-journal.md` — append-only timeline
- `.ijfw/memory/knowledge.md` — curated decisions/patterns
- `.ijfw/memory/handoff.md` — latest session handoff (if present)
- `~/.ijfw/memory/global-knowledge.md` — cross-project preferences (this project's namespace only)
- `.ijfw/sessions/*.md` — session markers
- `~/.claude/projects/<encoded>/memory/*.md` — Claude native project memory (read-only mirror)

## Algorithm

### 1. Promote (journal → knowledge)
Scan the journal for entries that meet the **promotion threshold**:
- Same topic/pattern referenced in **≥3 journal entries** AND
- Spanning **≥2 distinct session IDs** AND
- Not already present in knowledge.md

For each qualifying pattern, write a structured entry to knowledge.md:
```markdown
---
type: pattern
summary: <1-line>
stored: <ISO timestamp>
tags: [derived, from, content]
---
<consolidated statement>

**Why:** <extracted rationale>
**How to apply:** <extracted guidance>
```

### 2. Reconcile contradictions
Detect pairs of entries where a later statement supersedes an earlier one
(e.g., "use REST" followed later by "migrated to GraphQL"). For each:
- Mark the older entry with `superseded: true` and a `superseded_by_date` field.
- Do NOT delete — history matters for audit trails.
- Add a reconciliation note to knowledge.md explaining the transition.

### 3. Prune stale journal
- Entries older than **14 days** that never reached promotion threshold: archive to
  `.ijfw/sessions/archive/journal-<YYYY-MM>.md`, remove from active journal.
- Keep the last 30 days regardless of promotion status.

### 4. Compress knowledge base
- Merge near-duplicate entries (same summary, same type, overlapping content).
- Deduplicate by structural similarity, preserving the most recent/complete version.
- Stay under ~2000 tokens total. If larger, cluster and archive oldest cluster.

### 5. Cross-project promotion (opt-in)
If a pattern is referenced in **≥3 different projects** (via global-knowledge
namespace inspection) OR the user explicitly flags it with `globalize: true`:
- Promote to `~/.ijfw/memory/global/<facet>.md` (preferences/patterns/stack/anti-patterns/lessons).
- Facet classification by architect agent using concise rule: the "what I like"
  axis → preferences; reusable solution → patterns; tool/framework knowledge →
  stack; "never do this" → anti-patterns; hard-won insight → lessons.

### 6. Report (positive framing only)

```
Dream cycle complete.
  ✓ Promoted N patterns to knowledge
  ✓ Reconciled N contradictions (M superseded)
  ✓ Archived N stale entries
  ✓ Knowledge base: N entries (P tokens)
  ✓ Global promoted: N entries (if any)
```

No "Warning:" lines. No "Failed to..." — if a step couldn't run (e.g. journal
missing), silently skip and omit from the report.

## Mode-aware

- **smart mode:** full cycle, architect agent, ~5-10K tokens. Runs automatically every 5 sessions.
- **fast mode:** skip cross-project promotion, skip reconciliation. Scout agent, ~1-2K tokens.
- **deep mode:** adds second pass — re-read knowledge.md after compression to detect any remaining redundancies.

## When to run
- `/consolidate` explicit invocation anytime
- Auto-triggered when `.ijfw/.startup-flags` contains `IJFW_NEEDS_CONSOLIDATE=1`
- session-end hook sets the flag every 5 sessions
