# IJFW — "It Just Fucking Works"
### AI Efficiency Framework by Sean Donahoe

One install. Zero config. Makes your AI coding agent smarter, more efficient, and gives it persistent memory across sessions and platforms.

**Measured impact** ([full report](core/benchmarks/REPORT-001.md)):
- **−41% cost** per session (Arm C vs unconstrained baseline)
- **−20% output tokens** (terse output rules on by default)
- **−51% cache-creation tokens** (context discipline)

Measured on `claude-sonnet-4-5` fixing a single-file bug. n=1, directional — full suite in Phase 3.5.

**What it does:**
- **Smarter output** — no filler, no preamble, no narration. Lead with the answer.
- **Smart routing** — right model for the right task. Haiku for reads, Sonnet for code, Opus for architecture.
- **Persistent memory** — remembers decisions, patterns, and context across sessions and platforms.
- **Auto-configuration** — detects your environment, fixes bad defaults, optimises project context.
- **Context discipline** — targeted reads, input stripping, smart compaction, session handoff.
- **Cross-platform** — one MCP memory server shared across Claude Code, Codex, Gemini CLI, Cursor, Windsurf, Copilot.

---

## Install

```bash
git clone https://github.com/seandonahoe/ijfw.git ~/.ijfw
cd ~/.ijfw
bash scripts/install.sh                  # all platforms
# or:
bash scripts/install.sh codex cursor     # only the platforms you use
```

The installer resolves the absolute path to the bundled MCP launcher and writes platform-native configs with that path baked in. No env vars, no manual JSON editing.

Verify everything's healthy:

```bash
bash scripts/check-all.sh
# Should show: All checks passed.
```

### Claude Code

Inside Claude Code:

```
/plugin marketplace add ~/.ijfw/claude
/plugin install ijfw
```

### Any other agent

Paste the contents of `universal/ijfw-rules.md` into your agent's system prompt or rules file.

---

## Usage

IJFW works automatically after install. No configuration needed.

### Modes

| Mode | What it does |
|------|-------------|
| **smart** (default) | Auto-routes models, effort, verbosity by task type |
| **fast** | Maximum efficiency — cheapest models, ultra-terse |
| **deep** | Maximum quality — best models, self-verification, plan-then-execute |
| **manual** | All automation off — you control everything |

Switch: `/mode fast` or just say "go fast" / "think deeper"

### Commands

| Command | What it does |
|---------|-------------|
| `/mode` | Switch between smart/fast/deep/manual |
| `/compress <file>` | Compress a file into terse form (saves 40-50% tokens) |
| `/ijfw-status` | Show current mode, routing, memory, context health |
| `/handoff` | Create or resume a session handoff |
| `/consolidate` | Run memory dream cycle (promote, prune, reconcile) |
| `/cross-audit` | Generate audit doc for Multi-AI Quality Trident review |

### Memory

IJFW remembers automatically. Decisions, patterns, handoffs — all captured and injected without you doing anything. Memory persists across sessions and works across platforms via the MCP server.

---

## How It Works

### Startup

On session start, IJFW silently:
1. Detects your environment (OpenRouter, Ollama, local models)
2. Loads project memory and last session handoff
3. Checks and optimises settings (effort level, project context)
4. Shows a clean, positive startup summary

### Per Turn

The always-on core skill (~51 lines, ~700 tokens) ensures:
- Terse, efficient output
- Smart agent delegation
- Context discipline
- Quality gates on destructive actions

### Session End

Hooks automatically:
- Compress the session into a journal entry
- Generate a structured handoff for next session
- Flag when memory consolidation is due

### Team Memory (optional)

For shared, PR-reviewed conventions across a team, drop markdown into
`.ijfw/team/` and commit it:

```
.ijfw/team/decisions.md   # team-wide architectural calls
.ijfw/team/patterns.md    # coding standards everyone follows
.ijfw/team/stack.md       # approved tech choices
.ijfw/team/members.md     # ownership map
```

Team memory ranks **above** personal memory in search and at the top of every
session's prelude, so shared decisions never get lost behind individual notes.
Empty by default — create the folder when you're ready.

---

## Architecture

```
ijfw/
├── claude/          Claude Code plugin (full featured)
├── codex/           Codex CLI config + instructions
├── gemini/          Gemini CLI config + GEMINI.md
├── cursor/          Cursor MCP + .cursorrules + .cursor/rules
├── windsurf/        Windsurf MCP + rules
├── copilot/         Copilot MCP + instructions
├── universal/       Paste-anywhere rules
├── mcp-server/      Cross-platform MCP memory server (Node.js, zero deps)
└── docs/            Documentation
```

---

## Privacy

**IJFW doesn't phone home.** No telemetry, no analytics, no cloud account. Every memory, metric, and auto-extracted lesson lives on your machine. The MCP server speaks stdio only (no sockets). Hooks are deterministic bash. See [NO_TELEMETRY.md](NO_TELEMETRY.md) for the full accounting — what gets stored, where, and the handful of operations that touch the network (installer clones, optional vector-model download, optional LLM auto-memorize), plus how to turn each off.

---

## Credits

IJFW builds on the work of:
- **caveman** — proved terse output works
- **claude-mem** — pioneered persistent memory
- **claude-router** — proved model routing saves costs
- **Memorix** — cross-agent memory concept
- **MemPalace** — structured memory metaphor
- **Superpowers** & **GSD** — workflow patterns

IJFW is the first framework to coordinate all layers into a single, zero-config system.

---

**By Sean Donahoe** | "It Just Fucking Works"
