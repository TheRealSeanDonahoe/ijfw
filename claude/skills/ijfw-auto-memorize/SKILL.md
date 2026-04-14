---
name: ijfw-auto-memorize
description: "Session-end auto-extraction of lessons, errors, fixes, and user feedback into structured memory. Fires at session end. Requires consent on first run."
---

Fires at session end. Reads deterministic signals captured during the session
and synthesizes structured memories. Nothing leaves the machine unless the user
explicitly configured an API model via `IJFW_AUTOMEM_MODEL`.

## Consent gate (first run only)

Before any synthesis, check `.ijfw/.automem-consent`:
- If missing: ask the user once: *"IJFW can automatically extract lessons (errors hit, fixes applied, preferences you stated) at session end into local memory. OK? (y/n). Reply `y`, `n`, or `ask` (ask again next time)."* Write answer as `{"consented": true|false, "at": "<iso>"}` to `.ijfw/.automem-consent`.
- If `"consented": false`: do nothing this session.
- If `"consented": true`: proceed.

## Inputs (all local files)

- `.ijfw/.session-signals.jsonl` — ERROR/FAIL/Traceback lines captured by the PreToolUse hook (W3.6).
- `.ijfw/.session-feedback.jsonl` — corrections/confirmations/preferences detected by the UserPromptSubmit hook (W3.7).
- `.ijfw/.prompt-check-state` — last turn's intent + vague signals.
- `.ijfw/memory/project-journal.md` — existing entries (dedupe against these).
- Transcript read via Claude Code's Stop-hook payload (`transcript_path`).

## Synthesis

For each signal cluster:

1. **Redact secrets first.** Call `redactSecrets()` from `mcp-server/src/redactor.js` on every field that came from transcript or tool output.
2. **Cap sizes.** Run `applyCaps` from `mcp-server/src/caps.js`. content ≤4KB, why/how ≤1KB, summary ≤120.
3. **Dedupe.** Use BM25 search (`mcp-server/src/search-bm25.js`) against `project-journal.md`. If score > 6 against an existing entry, skip (duplicate).
4. **Classify** into one of:
   - `pattern` — error→fix recurrence (same error type seen ≥2×).
   - `decision` — an explicit user choice ("from now on X").
   - `preference` — a style/workflow preference ("I prefer Y").
   - `observation` — something worth noting, single instance.
5. **Emit** via `ijfw_memory_store` MCP tool with fields:
   - `type`: one of the above
   - `summary`: single sentence, ≤120 chars
   - `content`: the fact + minimal context
   - `why`: where this came from (e.g., "user said 'don't use X'", or "hit error Y at step Z")
   - `how_to_apply`: when this should surface in future sessions
   - `tags`: include `auto-memorize` and the classifier kind (`correction`, `confirmation`, `preference`, `rule`, `error`)

## Model routing

`IJFW_AUTOMEM_MODEL` env var controls synthesis:
- unset or `off` — skip LLM synthesis; only deterministic signals promoted 1:1.
- `claude-haiku-4-5-*` — Anthropic Haiku (~$0.001/session).
- `ollama:<model>` — local Ollama, fully offline.

Default ship: unset. Deterministic signals still become memories; only the
richer "what did I learn" synthesis is gated on an LLM budget.

## Output to user

One-line summary in the terminal:
> *Stored 3 new memories: pagination-off-by-one fix, user prefers esbuild, stopped repeating rm -rf warnings.*

No summary on zero-emit sessions.

## Audit trail

Every auto-stored entry carries `tags: [..., "auto-memorize"]`. The
`/ijfw memory audit` command lists recent auto-entries for review/removal.

## Safety

- **Never** store raw transcript content — only redacted + capped extracts.
- **Never** call out to an LLM unless `IJFW_AUTOMEM_MODEL` is set AND consent is `true`.
- **Never** store secrets — the redactor runs first, always.
- **Never** silently overwrite user-authored memories — auto-entries go into the knowledge file with their distinguishing tag.

Resume normal mode after.
