# IJFW -- It Just Fucking Works.

**The operating system for AI-assisted development.**

One install. Six AI coding agents. Shared memory. Diverse perspectives. Zero config, zero telemetry, zero vendor lock-in.

```bash
npm install -g @ijfw/install && ijfw-install
```

```powershell
# Windows (PowerShell 5.1+)
iwr https://raw.githubusercontent.com/TradeCanyon/ijfw/main/installer/src/install.ps1 -OutFile install.ps1
.\install.ps1
```

---

## Why this exists

You already know the problems.

**Your AI forgets.** Every session starts from zero. The architectural decision you made three weeks ago? Gone. The reason you ripped out the auth middleware? Forgotten. You paste the same context into every new conversation, and the AI still drifts.

**Your AI is confidently wrong.** One model, one opinion, zero perspective. It said the migration was safe. It wasn't. It said the regex covers the edge case. It didn't. You trusted it because the alternative was checking every claim yourself.

**Your workflow fractures the moment you switch tools.** Claude Code for one thing, Codex for another, Cursor for the IDE, Copilot because the enterprise forces it. Each one configured differently. Each one forgetting what the others know. Each one invisible to the others.

**Your team's AI sessions don't agree.** The senior dev's prompts produce good code. The junior dev's prompts produce code you have to rewrite. The same AI, the same repo, completely different outputs. Because nothing shared is enforced.

**You don't trust where any of it goes.** Every "memory" feature you've seen ships your code to a cloud you didn't audit. Every "plugin" asks for an account. Every "analytics" is a telemetry beacon you can't turn off.

IJFW fixes all five. One command. Local-only. Inspectable markdown. Yours.

---

## What IJFW actually does

Forget the feature list. Three capabilities:

### 1. Continuity

AI coding stops being episodic and starts being continuous.

Every decision, every pattern, every handoff persists as plain markdown in your repo. Every new session -- in any of the six supported agents -- wakes up with the full context already loaded. The BM25 memory layer surfaces the right decision from three weeks ago when you phrase a question that touches it.

Your AI stops asking "what are we building again?" It remembers.

### 2. Diverse perspectives

IJFW fires the Trident -- one OpenAI-family model, one Google-family model, and a Claude-side specialist swarm -- at any file, diff, or question you pick.

You stop getting "the AI's opinion." You start getting consensus (flagged high-priority) and contested positions (flagged as your judgment call). Blind spots don't get a free pass. Overconfident claims get challenged by a peer with a different training lineage.

One command: `ijfw cross audit <file>`. Backgrounded, logged, cached.

### 3. Discipline

AI coding fails the same way every time: skipped planning, forgotten verification, runaway scope, context lost at compaction.

IJFW ships an opinionated workflow that enforces the steps. Quick mode for small jobs: Clarify -> Plan -> Audit -> Execute -> Done check. Deep mode for real features: Discover -> Research -> Plan -> Execute -> Verify -> Ship. Every transition is narrated (Phase / Wave / Step). Every specialist dispatch is a visible task. Every audit gate has a go/no-go.

It's not a framework layered over your AI. It's a spine running through it.

---

## Who it's for

**Solo developers** who have ever re-pasted a project's context into a fresh session for the third time this week. IJFW gives you continuity and a second opinion without a second subscription.

**Teams** who have watched AI-generated code quality drift between seniors and juniors. IJFW lets you commit `.ijfw/team/` to the repo -- your architectural decisions, your review standards, your "never do X" list -- and every teammate's AI session picks them up on the first turn.

**Skeptics** who refuse to ship proprietary code to someone else's cloud for the privilege of an "AI memory" feature. IJFW is markdown files, bash hooks, and a 40KB Node MCP server. Everything is inspectable. Nothing phones home. Run `grep` on your own memory.

**Pragmatists** who don't want to pick a horse. Claude today, Codex tomorrow, whatever Anthropic ships next month. IJFW abstracts the platform so your workflow doesn't depend on any one of them.

---

## Before and after

### Debugging a production bug

**Before IJFW:** You open Claude Code. Paste the error. Paste the relevant files. Explain the architecture. Explain what you've already tried. Claude suggests a fix. You apply it. It doesn't work. You start over in a new session because the context is too big. Repeat.

**After IJFW:** You open any agent. "Why did we pick eventual consistency for the order ledger?" The agent recalls the decision you made eight weeks ago, with the tradeoff, the constraint, and the link to the ADR. "Fire Trident on the retry logic in payments.ts." Codex and Gemini audit in parallel. Two of them flag the same race condition. You fix the real bug in twenty minutes.

### Onboarding a new teammate

**Before IJFW:** Documentation is stale. The new hire reads the README, asks the seniors, pieces together the conventions, and writes code in the wrong style for three weeks before review catches it.

**After IJFW:** The repo's `.ijfw/team/` has ten curated decisions, five anti-patterns, and the stack notes. The new hire's first Claude session injects all of it automatically. Their first PR looks like the seniors wrote it.

### Switching AI platforms

**Before IJFW:** You spent six months tuning your Claude plugin. Management mandates Copilot for compliance. You start over.

**After IJFW:** `ijfw-install copilot`. Your memory, your rules, your workflow all port. Same handoff, same knowledge base, same cross-audit, different agent.

---

## Install

### One command, six platforms

```bash
npm install -g @ijfw/install && ijfw-install
```

Output:

```
  +----------------------------------------+
  |                                        |
  |  IJFW  It just f*cking works.          |
  |                                        |
  +----------------------------------------+

  Installed at  ~/.ijfw

  ==> LIVE NOW (4)
      o  Claude Code
      o  Codex
      o  Gemini
      o  Copilot

  ==> STANDING BY (2)   auto-activate on install
      o  Cursor
      o  Windsurf

  ==> ONE MORE STEP   inside Claude Code
      /plugin marketplace add ~/.ijfw/claude
      /plugin install ijfw

  Full log   ~/.ijfw/install.log
```

**Live now** are the platforms already installed on your machine -- configured immediately, MCP registered, rules placed.
**Standing by** are the platforms you haven't installed yet -- configs pre-staged, so the moment you install them later, IJFW activates automatically. No rerun.

Every change is merge-safe. Existing configs get `.bak.<timestamp>` backups. Your MCP servers, your model preferences, your per-project trust settings are preserved.

### Windows

Native PowerShell installer. No WSL required. Works on Windows PowerShell 5.1 and PowerShell 7+. Resolves Git Bash through your existing Git for Windows install -- no additional dependencies.

### Verifying

```bash
ijfw doctor    # what's reachable, what's ready
ijfw demo      # 30-second Trident tour
ijfw status    # recent runs + hero line
```

---

## The eight tools you get

A shared MCP memory server, 40KB, zero runtime dependencies, running locally over stdio -- so every platform talks to the same memory without a network hop:

| Tool | What it does |
|---|---|
| `ijfw_memory_recall` | Wake up with full project context. Decisions, handoff, journal. Cross-project via `from_project`. |
| `ijfw_memory_store` | Persist decisions, patterns, handoffs, preferences, observations. Sanitized, capped, atomic. |
| `ijfw_memory_search` | BM25-ranked search over local memory. `scope:"all"` for cross-project. |
| `ijfw_memory_status` | ~200-token project brief -- mode, pending work, last handoff, memory count. |
| `ijfw_memory_prelude` | Full first-turn memory bundle for agents that lack SessionStart hooks. |
| `ijfw_prompt_check` | Deterministic regex detector for vague prompts. Zero LLM cost. |
| `ijfw_metrics` | Tokens, cost, routing mix, session totals. |
| `ijfw_cross_project_search` | BM25 across every registered IJFW project on the machine. |

Hard cap set at 8. Every tool earns its slot or it gets cut. Scannable surface by design.

---

## The `ijfw` CLI

One binary, six verbs:

```
ijfw demo                                    # 30-second Trident tour
ijfw status                                  # hero line + recent runs
ijfw doctor                                  # CLI + API-key reachability probe
ijfw cross audit <file>                      # adversarial cross-AI review
ijfw cross research "<topic>"                # multi-source research
ijfw cross critique <range>                  # structured counter-argument
ijfw cross project-audit <rule>              # same audit across every registered project
ijfw import claude-mem [--dry-run] [--force] # migrate from claude-mem's SQLite store
```

Every command is one-shot. No REPL. No wizards. No decisions on your plate.

---

## Platform parity

| Capability     | Claude Code            | Codex CLI                     | Gemini CLI                    | Natural language          |
|----------------|------------------------|-------------------------------|-------------------------------|---------------------------|
| Status         | `/ijfw-status`         | `ijfw status`                 | `ijfw status`                 | "what's my status?"       |
| Health check   | `/ijfw-doctor`         | `ijfw doctor`                 | `ijfw doctor`                 | "run the doctor"          |
| Live demo      | `/ijfw-demo`           | `ijfw demo`                   | `ijfw demo`                   | "show me the demo"        |
| Cross-audit    | `/ijfw-cross-audit`    | `ijfw cross audit <file>`     | `ijfw cross audit <file>`     | "cross-audit this file"   |
| Cross-research | `/ijfw-cross-research` | `ijfw cross research <topic>` | `ijfw cross research <topic>` | "research this topic"     |
| Memory recall  | `/ijfw-recall`         | `ijfw recall <query>`         | `ijfw recall <query>`         | "recall my last handoff"  |

Cursor, Windsurf, Copilot get the same capabilities via their native MCP integration + rules files. Platform-native affordances, same underlying engine.

---

## Philosophy

Three principles. Every design decision traces back to one of them.

### Rory Sutherland -- smarter, not cheaper

Never position IJFW as a way to save money. Position it as the smart move. The savings are a side effect of intelligence, not the goal.

Every user-facing surface is positive-framed. No "not found." No "failed." No "error." When something is pre-staged but not yet live, it's "Standing by -- auto-activate on install." When no auditors are reachable, it's "Ready to connect auditors." Reframing anxiety as magic is a feature, not a style choice.

### Steve Krug -- don't make me think

One concept: mode. Everything else is automatic. No settings pages. No config files. No environment variables. Smart defaults for 80%+ of cases. Override via natural language, not configuration. If something is missing and safe to create, create it quietly. Never ask permission for safe actions.

### Sean Donahoe -- it just fucking works

One install. Works on session one. Self-contained. No external dependencies required. Auto-detects environment and adapts silently. If a feature can't be fully automated, it ships as a one-word command.

---

## What ships with it

- **Claude Code plugin** -- 19 slash commands, 6 hooks, 10+ skills (workflow, memory, commit, handoff, review, critique, compress, team setup, debug, cross-audit).
- **Platform configs** for Codex CLI, Gemini CLI, Cursor, Windsurf, Copilot (VS Code).
- **Universal rules file** (`universal/ijfw-rules.md`) -- paste into any agent you want to add.
- **MCP memory server** -- Node.js, zero runtime deps, 8 tools, stdio transport.
- **`ijfw` CLI** -- cross-audit, import, status, doctor, demo, project-audit.
- **`scripts/check-all.sh`** -- lint + test + installer-syntax gate the whole project runs on.
- **`bin/ijfw-dispatch-plan`** -- parses plan files, emits dispatch manifests for parallel workflow execution.
- **Importers** -- migrate from `claude-mem` (SQLite) without losing a decision.

---

## Memory architecture

Three tiers, each inspectable, each optional.

- **Hot** (plain markdown): `.ijfw/memory/knowledge.md`, `project-journal.md`, `handoff.md`. Instant reads, zero dependencies, git-friendly, human-auditable.
- **Warm** (BM25 linear scan): same files, ranked retrieval. Scales to ~10k entries before an inverted index pays off.
- **Cold** (optional vectors via `@xenova/transformers`): semantic search when you want it, off by default so the zero-dep promise holds.

Faceted global memory in `~/.ijfw/memory/global/` (preferences, patterns, stack, anti-patterns, lessons). Team memory in `.ijfw/team/` -- commit it, and your conventions travel with the repo.

---

## Privacy -- what doesn't leave your machine

Nothing. Not one byte.

- No telemetry. No analytics. No phone-home.
- No cloud account required.
- MCP server speaks stdio only. No sockets.
- Hooks are deterministic bash. No LLM calls from hooks.
- External AI calls only happen when you explicitly invoke `ijfw cross` -- and then only to the auditor CLI or API key you already configured.

Full accounting in [NO_TELEMETRY.md](NO_TELEMETRY.md). Every data path, every file location, every "does this leave your machine?" answered in a table.

---

## FAQ

**Is this a Claude Code plugin?**
Claude Code is one of six supported platforms. The plugin is richest there because Claude Code exposes the most integration points (hooks, skills, slash commands). Every capability is available on the other five through their native affordances.

**Does it require a specific AI model or provider?**
No. IJFW configures the agents you already have. Bring your own keys, bring your own CLIs. Trident uses whatever external auditors are reachable -- if you only have one, it runs with one; if you have four, it picks two by default for perspective diversity.

**What's the real cost?**
Runtime: zero npm dependencies for the server or the installer. Tokens: Trident calls use your API keys and respect a per-session spend cap (default $2, configurable via `IJFW_AUDIT_BUDGET_USD`). Memory storage: plain markdown in your repo -- measured in KB.

**Can I turn any of it off?**
Yes. Every feature is opt-in or switchable. `ijfw off` disables the core skill. Each slash command is isolated. The MCP server can be unregistered per platform. Everything is reversible.

**What about my existing memory in claude-mem or similar tools?**
`ijfw import claude-mem` round-trips the whole SQLite store into IJFW markdown without data loss. Idempotent -- safe to rerun. `--dry-run` shows you what would happen first.

**Will it slow my sessions down?**
Startup: one MCP handshake, ~50ms. Per-prompt: hooks are deterministic bash, typically <30ms total. Memory recall: BM25 scan across thousands of entries in <10ms. There is no perceptible overhead.

---

## Ship signals

- 8 MCP tools, 0 runtime dependencies.
- 6 AI coding agents configured by one command.
- 84 test files, 317+ test cases, all green.
- 70 commits between Phase 10 and v1.0.
- 7.8 kB tarball. 6 files. No bloat.

---

## Get started

```bash
npm install -g @ijfw/install && ijfw-install
ijfw demo
```

Two commands. Three seconds of setup. Then it just fucking works.

---

**By Sean Donahoe** -- [github.com/TradeCanyon/ijfw](https://github.com/TradeCanyon/ijfw)

Licensed MIT. Install it, inspect it, fork it, ship it. Your AI, your rules.
