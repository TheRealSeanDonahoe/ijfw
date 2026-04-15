# IJFW — It Just Fucking Works.

Multi-AI orchestration layer for 7 platforms. One install, zero config, persistent memory.

Three AIs review every diff. Cache-hit savings logged per run. Your memory follows you across all seven agents.

---

## 30-Second Hook

```bash
npm install -g @ijfw/install && ijfw-install && ijfw demo
```

Installs IJFW across every AI coding agent you have running, fires a live demo, and prints a health report — all without touching a config file.

---

## Demo Output

```
IJFW v1.0.0 — It Just Fucking Works.

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
Cursor ---------+---> IJFW Core (ijfw-core/SKILL.md, ~51 lines)
Windsurf -------+         |
Copilot --------+         +---> MCP Memory Server (stdio, zero deps)
Universal ------+                    |
                               +-----+------+
                               |            |
                           Hot tier      Warm tier
                         (markdown)      (SQLite)
                        .ijfw/memory/  .ijfw/db/
```

**Core layer (~51 lines, ~700 tokens):** terse output, smart model routing, context discipline, quality gates on destructive actions.

**MCP server (7 tools):** `recall`, `store`, `search`, `status`, `prelude`, `prompt_check`, `metrics` — shared across all platforms via stdio. No sockets. No cloud.

**Memory tiers:**
- Hot: plain markdown, instant reads, written on every session end
- Warm: SQLite, full-text search across sessions and projects
- Team: `.ijfw/team/` — PR-reviewed conventions shared by the whole team

---

## Why IJFW

- **Three AIs, not one.** IJFW fires the Trident -- one OpenAI model, one Google model, plus a specialist swarm -- at every cross-audit. Consensus findings jump to high-priority; blind spots never get a free pass.
- **One install, all agents.** Platform-native configs for every major AI coding tool from a single source of truth. No drift, no duplication.
- **Memory that actually works.** Decisions, patterns, and handoffs persist across sessions and travel between platforms through a shared MCP server — running locally, no account required.
- **Smarter, not cheaper.** Auto-routing sends reads to Haiku, code to Sonnet, architecture to Opus. Terse-output rules cut token waste. The result is faster answers and lower costs without you managing any of it.

---

## Privacy

IJFW does not phone home. No telemetry, no analytics, no cloud account. Every memory, metric, and auto-extracted lesson lives on your machine. The MCP server speaks stdio only. Hooks are deterministic bash scripts. See [NO_TELEMETRY.md](NO_TELEMETRY.md) for the full accounting.

---

**By Sean Donahoe** | [github.com/seandonahoe/ijfw](https://github.com/seandonahoe/ijfw)
