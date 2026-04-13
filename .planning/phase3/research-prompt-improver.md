# Phase 3 Research — Prompt Improver

Date: 2026-04-14. Scope: landscape scan for IJFW deterministic prompt-improver hook across 6 agents.

## 1. Existing Claude Code plugin (severity1/claude-code-prompt-improver v0.5.1)

Installed locally at `~/.claude/plugins/cache/severity1-marketplace/prompt-improver/0.5.1/`. Architecture:

- `hooks/hooks.json` registers a single `UserPromptSubmit` hook → `scripts/improve-prompt.py` (~70 lines).
- The hook is **not** deterministic. It reads stdin JSON, applies three bypass prefixes (`*` skip, `/` slash-cmd, `#` memorize), then **wraps every remaining prompt** in a ~189-token "PROMPT EVALUATION" preamble and emits it as `hookSpecificOutput.additionalContext`. Claude itself decides if the prompt is vague and whether to invoke the `prompt-improver` skill.
- The skill (`skills/prompt-improver/SKILL.md`) runs a 4-phase workflow: Research (TodoWrite plan, Grep/Glob/git log/WebSearch) → Generate 1–6 grounded MCQ questions → `AskUserQuestion` tool → Execute. Max 1–2 questions simple, 3–4 moderate, 5–6 complex.
- Preamble instruction: *"PROCEED IMMEDIATELY if detailed/specific OR you have sufficient context OR can infer intent."* Fallback is conservative.
- UX nicety: on vague detection the model prefaces with `"Hey! The Prompt Improver Hook flagged your prompt as a bit vague because [reason]."` — single-line courtesy notice.
- Related: `johnpsasser/claude-code-prompt-optimizer` uses the opposite approach — always rewrites the prompt via Opus call (non-deterministic, expensive).

Takeaway: the existing plugin is **LLM-delegated**, not deterministic. IJFW can differentiate by shipping true pattern detection.

## 2. Ecosystem

| System | Technique | Trigger | Output |
|---|---|---|---|
| Anthropic Console Prompt Improver | LLM rewrite (Claude) | Manual button | Chain-of-thought + XML scaffolded prompt |
| OpenAI Prompt Optimizer (Playground) | LLM rewrite | Manual | Structured prompt w/ examples |
| DSPy | Programmatic optimizer (MIPRO/BootstrapFewShot) | Build-time | Compiled prompt + demos |
| PromptFlow (MS) | DAG evaluation harness | CI | Metrics, no clarifier |
| Promptfoo / LangSmith / Helicone / PromptHub | Eval + versioning | Offline | No runtime clarifier |
| GPT-5.2 Prompting Guide | Rules doc | — | Manual checklist |
| CLAMBER benchmark | 12k labelled ambiguous queries | — | Taxonomy only |
| Prompt Decorators (arXiv 2510.19850) | Declarative `@reasoning`, `@format` syntax | Author-time | Compiled |

**No mainstream tool does deterministic runtime clarification for coding agents.** This is IJFW's opening.

## 3. Vagueness taxonomy (synthesized from CLAMBER, Yang 2025 "What Prompts Don't Say", arXiv 2509.14404 "Taxonomy of Prompt Defects", LHAW)

Four dimensions of underspecification: **Goals, Constraints, Inputs, Context.** Concrete detectable patterns:

1. **Bare imperative verb, no object**: prompt = `^(fix|refactor|improve|clean up|optimize|update|review|check|test|debug|analyze|handle|make it better)\b` with token count < 6.
2. **Unqualified demonstrative / anaphora without referent**: `^(this|that|it|these|those|the bug|the issue|the file|the code|the function|the error)\b` at sentence start with no prior assistant turn or no code block in last 3 turns.
3. **Abstract goal without acceptance criteria**: contains `better|cleaner|nicer|more robust|production-ready|proper|correct` but no file path, no metric, no test name.
4. **Missing target**: zero tokens matching file-path regex (`[\w./-]+\.\w+`, `src/`, `tests/`), zero identifier tokens (CamelCase or snake_case ≥2 chars), zero line numbers (`:\d+`).
5. **Scope ambiguity**: plural without quantifier (`the tests|all the things|everything|stuff`).
6. **Contradictory / lexical ambiguity**: detected by dictionary of polysemous coding terms (`source`, `build`, `run`, `deploy` standalone).
7. **Missing constraint terms**: no `must|should|when|if|until|without|only` + no numeric threshold.

Yang et al. finding: underspecified prompts regress 2× under model changes, accuracy drops can exceed 20%. Justifies the hook.

## 4. Clarification UX patterns

- **Max 1–6 questions** (severity1 convention, matches CLAMBER human study sweet spot).
- **MCQ over open-ended** — 2–4 grounded options + "Other". Reduces user friction 3–5×.
- **Interrupt only on high-confidence vague** — false-positive annoyance is the #1 reason users disable clarifiers. Positive framing ("flagged as a bit vague because X") beats scolding.
- **One-keystroke bypass** is table-stakes: `*` prefix (severity1), `!!` (some forks), or config toggle.
- **Never ask if context answers it** — check last N turns for a referent before firing.
- **Show the reason** — users accept interruption when they see the specific trigger.

## 5. Per-platform hook capability

| Platform | True prompt interception? | Mechanism |
|---|---|---|
| Claude Code | **Yes** | `UserPromptSubmit` hook, stdin JSON, can inject `additionalContext` or block |
| Gemini CLI | **Partial** | settings.json `tools`/MCP; no documented pre-prompt hook as of 2026 — use MCP `ijfw_memory_prelude`-style tool the model is instructed to call first |
| Codex CLI | **No** | Static `instructions.md` / AGENTS.md only; guidance-as-rules |
| Cursor | **No** | `.cursor/rules/*.mdc` + MCP; no pre-submit hook — rules-file guidance |
| Windsurf | **No** | `.windsurfrules` + MCP; same as Cursor |
| Copilot | **No** | `copilot-instructions.md` + MCP; static only |

Only Claude Code can **intercept and transform**. The other five must receive the detector as either (a) a rules-file heuristic the model self-applies, or (b) an MCP tool (`ijfw_prompt_check`) the model is instructed to call on first turn of an ambiguous request.

## Recommendations for IJFW

**Detection rules (deterministic, shell/Node, <50ms):**
Implement 7 regex-based checks from §3 in `mcp-server/src/prompt-check.js` and `claude/hooks/scripts/prompt-improver.sh`. Fire only when **≥2 signals** trip AND prompt has <30 tokens AND no file path present. Single-signal = silent. This keeps false-positive rate low.

**Output template (single JSON shape, reused across platforms):**
```
{
  "vague": true,
  "signals": ["bare_verb:fix", "no_target"],
  "suggestion": "Which file or symbol? e.g. src/auth.py:145, getUserById",
  "bypass": "prefix with * to skip"
}
```

**Per-platform delivery:**
- **Claude Code**: `UserPromptSubmit` hook injects a one-line positive-framed notice as `additionalContext`, plus hands off to existing `ijfw-workflow` skill (Quick mode) for questions. Co-exists with severity1 plugin — detect and defer if installed.
- **Gemini CLI**: MCP tool `ijfw_prompt_check` + GEMINI.md line "On ambiguous user prompts, call ijfw_prompt_check first."
- **Codex / Cursor / Windsurf / Copilot**: ship identical 7-rule checklist in the rules file under a `## Prompt Self-Check` heading. Model self-applies before responding. Same MCP tool available for Cursor/Windsurf (they support MCP).

**Override mechanism:** `*` prefix (compat with severity1), plus `ijfw.promptCheck = off|signals|interrupt` in `.ijfw/config.json`. Default `signals` = silent annotation in `additionalContext`, no interrupt. `interrupt` = ask 1–3 MCQ questions via AskUserQuestion (Claude) or inline numbered list (others).

**Positive framing (per CLAUDE.md rule):** notice reads *"Sharpening your aim — need a target file or symbol."* not *"Your prompt is vague."*

## Sources
- [severity1/claude-code-prompt-improver](https://github.com/severity1/claude-code-prompt-improver)
- [johnpsasser/claude-code-prompt-optimizer](https://github.com/johnpsasser/claude-code-prompt-optimizer)
- [What Prompts Don't Say — Yang et al. 2025 (arXiv 2505.13360)](https://arxiv.org/html/2505.13360v2)
- [Taxonomy of Prompt Defects (arXiv 2509.14404)](https://arxiv.org/html/2509.14404v1)
- [CLAMBER benchmark (arXiv 2405.12063)](https://arxiv.org/html/2405.12063v1)
- [Clarifying Ambiguities (arXiv 2504.12113)](https://arxiv.org/html/2504.12113v1)
- [LHAW underspecification framework](https://arxiv.org/html/2602.10525)
- [Anthropic Prompt Improver announcement](https://www.anthropic.com/news/prompt-improver)
- [Claude Code Hooks reference](https://code.claude.com/docs/en/hooks)
- [AI coding config files guide 2026](https://www.deployhq.com/blog/ai-coding-config-files-guide)
- [AGENTS.md Guide 2026](https://vibecoding.app/blog/agents-md-guide)
