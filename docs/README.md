# IJFW -- "It Just Fucking Works"
### AI Efficiency Framework by Sean Donahoe

One install. Zero config. Makes your AI coding agent smarter, more efficient, and gives it persistent memory across sessions and platforms.

**What it does:**
- **Smarter output** -- no filler, no preamble, no narration. Lead with the answer.
- **Smart routing** -- right model for the right task. Haiku for reads, Sonnet for code, Opus for architecture.
- **Persistent memory** -- remembers decisions, patterns, and context across sessions and platforms.
- **Auto-configuration** -- detects your environment, fixes bad defaults, optimizes project context.
- **Context discipline** -- targeted reads, input stripping, smart compaction, session handoff.
- **Cross-platform** -- one MCP memory server shared across Claude Code, Codex, Gemini CLI, Cursor, Windsurf, Copilot.

---

## Install

### Claude Code (Full Plugin -- Recommended)

```bash
# From the plugin marketplace
/plugin marketplace add seandonahoe/ijfw
/plugin install ijfw

# Or manually
git clone https://github.com/seandonahoe/ijfw.git
cd ijfw/claude
claude plugin install .
```

### Codex CLI

```bash
# Add MCP memory server
codex mcp add ijfw-memory -- node ./node_modules/@ijfw/memory-server/src/server.js

# Copy instructions
cp codex/instructions.md ~/.codex/instructions.md
```

### Gemini CLI

```bash
# Copy MCP config to your Gemini settings
# Add the ijfw-memory server block from gemini/.gemini/settings.json
# to your ~/.gemini/settings.json

# Copy context file
cp gemini/GEMINI.md ./GEMINI.md
```

### Cursor

```bash
# Copy MCP config
cp cursor/.cursor/mcp.json .cursor/mcp.json

# Copy rules
cp cursor/.cursorrules .cursorrules
```

### Windsurf

```bash
# Copy MCP config and rules
cp windsurf/mcp_config.json ~/.codeium/windsurf/mcp_config.json
cp windsurf/.windsurfrules .windsurfrules
```

### Copilot (VS Code)

```bash
# Copy MCP config
cp copilot/.vscode/mcp.json .vscode/mcp.json

# Copy instructions
cp copilot/copilot-instructions.md .github/copilot-instructions.md
```

### Any Other Agent

Paste the contents of `universal/ijfw-rules.md` into your agent's system prompt or rules file. 15 lines. Works everywhere.

---

## Usage

IJFW works automatically after install. No configuration needed.

### Modes

| Mode | What it does |
|------|-------------|
| **smart** (default) | Auto-routes models, effort, verbosity by task type |
| **fast** | Maximum efficiency -- cheapest models, ultra-terse |
| **deep** | Maximum quality -- best models, self-verification, plan-then-execute |
| **manual** | All automation off -- you control everything |

Switch: `/mode fast` or just say "go fast" / "think deeper"

### Commands

| Command | What it does |
|---------|-------------|
| `/mode` | Switch between smart/fast/deep/manual |
| `/compress <file>` | Compress a file into terse form (saves 40-50% tokens) |
| `/ijfw-status` | Show current mode, routing, memory, context health |
| `/handoff` | Create or resume a session handoff |
| `/consolidate` | Run memory dream cycle (promote, prune, reconcile) |

### Memory

IJFW remembers automatically. Decisions, patterns, handoffs -- all captured and injected without you doing anything. Memory persists across sessions and works across platforms via the MCP server.

---

## How It Works

### Startup

On session start, IJFW silently:
1. Detects your environment (OpenRouter, Ollama, local models)
2. Loads project memory and last session handoff
3. Checks and optimizes settings (effort level, project context)
4. Shows a clean, positive startup summary

### Per Turn

The always-on core skill (~40 lines, ~600 tokens) ensures:
- Terse, efficient output
- Smart agent delegation
- Context discipline
- Quality gates on destructive actions

### Session End

Hooks automatically:
- Compress the session into a journal entry
- Generate a structured handoff for next session
- Flag when memory consolidation is due

---

## Architecture

```
ijfw/
├── claude/          Claude Code plugin (full featured)
├── codex/           Codex CLI config + instructions
├── gemini/          Gemini CLI config + GEMINI.md
├── cursor/          Cursor MCP + .cursorrules
├── windsurf/        Windsurf MCP + rules
├── copilot/         Copilot MCP + instructions
├── universal/       15-line paste-anywhere rules
├── mcp-server/      Cross-platform MCP memory server
└── docs/            Documentation
```

---

## Credits

IJFW builds on the work of:
- **caveman** by JuliusBrussee -- proved terse output works
- **claude-mem** by thedotmack -- pioneered persistent memory
- **claude-router** by 0xrdan -- proved model routing saves costs
- **Memorix** by AVIDS2 -- cross-agent memory concept
- **MemPalace** by Milla Jovovich & Ben Sigman -- structured memory metaphor

IJFW is the first framework to coordinate all layers into a single, zero-config system.

---

**By Sean Donahoe** | "It Just Fucking Works"
