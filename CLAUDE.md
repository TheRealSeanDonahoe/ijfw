# IJFW — Project Context

Stack: Node.js / Bash / Markdown
Architecture: Plugin system — ships platform-native packages for 7 AI coding agents
Author: Sean Donahoe

## Structure
- `claude/` — Claude Code plugin (full featured: skills, hooks, agents, commands)
- `codex/` — Codex CLI config + instructions
- `gemini/` — Gemini CLI MCP config + GEMINI.md
- `cursor/` — Cursor MCP config + .cursorrules
- `windsurf/` — Windsurf MCP config + .windsurfrules
- `copilot/` — Copilot MCP config + instructions
- `universal/` — 15-line paste-anywhere rules file
- `mcp-server/` — Cross-platform MCP memory server (Node.js, zero deps)
- `docs/` — README, DESIGN.md

## Key Conventions
- Core skill (ijfw-core/SKILL.md) hard cap: **55 lines**. Single source of truth — supersedes any older 40/51 references in handoff/instructions docs. Currently 53 lines.
- On-demand skills: hot-load only when triggered, unload when done.
- Hooks: shell scripts only, deterministic, no LLM calls.
- MCP server: ≤8 tools (recall, store, search, status, prelude; Phase 3 adds metrics + prompt_check). Phase 1's cap of 4 outgrown by Phase 2/3 needs; ≤8 keeps the surface scannable while leaving room for Phase 4.
- Startup report: positive framing ONLY. No negatives, no "not found", no diagnostics.
- Platform rules files: identical core rules, adapted for platform format.
- All memory storage: plain markdown (hot), SQLite FTS5 (warm), optional vectors (cold).

## Design Principles
1. Rory Sutherland: position as "smarter" not "cheaper". Wow factor.
2. Steve Krug: don't make me think. Zero config. Smart defaults.
3. Sean Donahoe: one install, it just fucking works.

<!-- IJFW-MEMORY-START (managed — do not edit manually) -->
<ijfw-memory>
Project memory at .ijfw/memory/. Call `ijfw_memory_prelude` for full context.

Last handoff: ## Handoff: 2026-04-14T20:45
### Status
</ijfw-memory>
<!-- IJFW-MEMORY-END -->
