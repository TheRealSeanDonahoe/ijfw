# IJFW -- It Just Fucking Works.

Multi-AI orchestration layer for 6 native platforms + universal paste-anywhere rules. One install, zero config, persistent memory.

Three AIs review every diff. Cache-hit savings logged per run. Your memory follows you across all seven agents.

---

## 30-Second Hook

```bash
npm install -g @ijfw/install && ijfw-install && ijfw demo
```

Installs IJFW across every AI coding agent you have running, fires a live demo, and prints a health report -- all without touching a config file.

---

## Demo Output

```
# sample output -- your platform list and memory count will vary
IJFW -- It Just Fucking Works.

Platforms detected:   Claude Code, Codex, Gemini CLI, Cursor
Memory:               247 entries across 4 projects
MCP server:           running (stdio)
Mode:                 smart (auto-routing on)

Session start: 3 patterns loaded, last handoff restored.
Routing: Haiku -> reads | Sonnet -> code | Opus -> architecture

All checks passed.
```

---

## What It Is

IJFW is a multi-AI orchestration layer that makes every AI coding agent smarter without you lifting a finger. It ships platform-native packages for Claude Code, Codex, Gemini CLI, Cursor, Windsurf, Copilot, and a universal paste-anywhere rules file. One shared MCP memory server keeps decisions, patterns, and handoffs in sync across all of them. Auto-routing picks the right model for the right task. Context discipline keeps sessions lean and handoffs clean.

---

## Installation

### npm (recommended)

```bash
npm install -g @ijfw/install && ijfw-install
```

### Claude Code

```bash
/plugin install ijfw
```

### Codex

```bash
ijfw-install codex
```

### Gemini CLI

```bash
ijfw-install gemini
```

### Cursor

```bash
ijfw-install cursor
```

### Windsurf

```bash
ijfw-install windsurf
```

### Copilot

```bash
ijfw-install copilot
```

### Universal (any agent)

Paste `universal/ijfw-rules.md` into your agent's system prompt or rules file. No installer needed.

---

## Architecture

```
Claude Code ----+
Codex ----------+
Gemini CLI -----+
Cursor ---------+---> IJFW Core (ijfw-core/SKILL.md, ~53 lines)
Windsurf -------+         |
Copilot --------+         +---> MCP Memory Server (stdio, zero deps)
Universal ------+                    |
                               +-----+------+
                               |            |
                           Hot tier      Warm tier
                         (markdown)      (SQLite)
                        .ijfw/memory/  .ijfw/db/
```

**Core layer (~53 lines, ~700 tokens):** terse output, smart model routing, context discipline, quality gates on destructive actions.

**MCP server (8 tools):** `recall`, `store`, `search`, `status`, `prelude`, `prompt_check`, `metrics`, `cross_project_search` -- shared across all platforms via stdio. No sockets. No cloud.

**Memory tiers:**
- Hot: plain markdown, instant reads, written on every session end
- Warm: SQLite, full-text search across sessions and projects
- Team: `.ijfw/team/` -- PR-reviewed conventions shared by the whole team

---

## Cross-Platform Invocation

Every IJFW capability is available on every platform -- each via its native interaction pattern.

| Capability      | Claude Code              | Codex CLI                          | Gemini CLI                        | Natural language              |
|-----------------|--------------------------|------------------------------------|-----------------------------------|-------------------------------|
| Status          | `/ijfw-status`           | `ijfw status`                      | `ijfw status`                     | "what's my status?"           |
| Health check    | `/ijfw-doctor`           | `ijfw doctor`                      | `ijfw doctor`                     | "run the doctor"              |
| Live demo       | `/ijfw-demo`             | `ijfw demo`                        | `ijfw demo`                       | "show me the demo"            |
| Cross-audit     | `/ijfw-cross-audit`      | `ijfw cross audit <file>`          | `ijfw cross audit <file>`         | "cross-audit this file"       |
| Cross-research  | `/ijfw-cross-research`   | `ijfw cross research <topic>`      | `ijfw cross research <topic>`     | "research this topic"         |
| Cross-critique  | `/ijfw-cross-critique`   | `ijfw cross critique <file>`       | `ijfw cross critique <file>`      | "critique this approach"      |
| Memory recall   | `/ijfw-recall`           | `ijfw recall <query>`              | `ijfw recall <query>`             | "recall my last handoff"      |

Claude Code: slash commands via the plugin. Shell CLIs: `ijfw` binary directly. Gemini: intent phrases route through the MCP tools and `ijfw` CLI automatically.

---

## Why IJFW

- **Three AIs, not one.** IJFW fires the Trident -- one OpenAI model, one Google model, plus a specialist swarm -- at every cross-audit. Consensus findings jump to high-priority; blind spots never get a free pass.
- **One install, all agents.** Platform-native configs for every major AI coding tool from a single source of truth. No drift, no duplication.
- **Memory that actually works.** Decisions, patterns, and handoffs persist across sessions and travel between platforms through a shared MCP server -- running locally, no account required.
- **Smarter, not cheaper.** Auto-routing sends reads to Haiku, code to Sonnet, architecture to Opus. Terse-output rules cut token waste. The result is faster answers and lower costs without you managing any of it.

---

## Privacy

IJFW does not phone home. No telemetry, no analytics, no cloud account. Every memory, metric, and auto-extracted lesson lives on your machine. The MCP server speaks stdio only. Hooks are deterministic bash scripts. See [NO_TELEMETRY.md](NO_TELEMETRY.md) for the full accounting.

---

**By Sean Donahoe** | [github.com/seandonahoe/ijfw](https://github.com/seandonahoe/ijfw)
