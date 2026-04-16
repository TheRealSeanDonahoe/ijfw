# IJFW v1.1 Research -- Codex CLI + Gemini CLI deep-dive findings

Two parallel Explore agents ran ~5-minute deep dives on each platform.
Findings consolidated below. Sources cited inline. Date: 2026-04-16.

---

## CODEX CLI (OpenAI) -- what it actually exposes

### Skills system
- `SKILL.md` + YAML frontmatter (`name`, `description`) + optional
  `scripts/`, `references/`, `assets/` subdirectories.
- Optional `agents/openai.yaml` for UI metadata, invocation policy, tool deps.
- Storage: `~/.codex/skills/` (personal), `.codex/skills/` (project),
  `.agents/skills/` (repo, scanned to root).
- Invocation: explicit (`$skill-name`, `/skills` menu, prompt mention) or
  implicit (Codex auto-selects on description match).
- Hot-reload NOT supported (CLI restart required).
- Stable.

### Hook system (7 events)
- SessionStart, UserPromptSubmit, Stop, PreToolUse, PostToolUse,
  AfterAgent, AfterToolUse.
- JSON in/out. Shared payload: `continue`, `stopReason`, `systemMessage`,
  `suppressOutput`. PostToolUse can `decision: "block"` to abort tool calls.
- Config: `~/.codex/config.toml` `[hooks]` table + `~/.codex/hooks/`
  scripts. STDIO and HTTP hook processes both supported.
- Hooks can inject context, block tool calls, alter system behavior.
- Cannot abort a turn from a hook (only PostToolUse can block tool exec).
- Stable from v0.99.0+.

### MCP support
- Codex consumes MCP servers (`[mcp_servers.<name>]` in config.toml,
  STDIO + Streamable HTTP transports).
- Codex can BE an MCP server (`codex mcp-server` mode) for parent agents.
- CLI commands: `codex mcp add/list/remove`. Auto-launches on session start.
- All three Codex surfaces (CLI / IDE extension / desktop app) share
  `~/.codex/config.toml`.

### Subagents
- Native subagent dispatch with **built-in git-worktree isolation** -- no
  branch/checkout chaos when multiple subagents work on the same repo.
- Spawned via prompt or `spawn_agents_on_csv` (one worker per row).
- OpenAI Agents SDK can drive Codex CLI via MCP for orchestrated multi-agent.
- Stable mid-2025+.

### Custom slash commands
- Hardcoded built-ins (`/review`, `/fork`, `/model`, `/diff`).
- Custom prompts (deprecated) lived in `~/.codex/prompts/` -- now use skills.
- No user-defined slash command registration API yet.

### Model selection
- gpt-5.4, gpt-5.4-mini, gpt-5.3-codex, gpt-5.3-codex-spark, gpt-5.2, plus
  any Chat Completions / Responses API model.
- `/model` slash command, `-m` CLI flag, IDE picker, `model = ...` in config.
- No extension hook to force model selection; not exposed to skills/hooks.

### Memory + persistence (v0.100.0+)
- Persistent memory under `~/.codex/memory/` as Markdown files. Loaded at
  session start.
- Sessions: `~/.codex/sessions/YYYY/MM/DD/` JSONL + SQLite metadata.
- `codex resume` reloads transcript; `codex fork` clones at a point.
- Skills/hooks read state via filesystem or MCP; no first-class state API.

### Configuration precedence
- CLI flags > project `.codex/config.toml` (only if trusted) > user
  `~/.codex/config.toml`. Closest config wins.
- `-c key=value` for one-off overrides.
- Project configs only loaded for trusted projects (sandbox-bypass safety).

### Auth
- API key in `~/.codex/auth.json` (plaintext) or OS credential store.
- Providers: OpenAI, OpenRouter, Mistral, custom endpoints (multi-provider
  support, one active at a time via `model_provider`).
- `codex login` (OAuth) or env vars (`OPENAI_API_KEY`, etc.).
- All Codex surfaces share auth.

### Permissions / sandboxing
- Sandbox modes: read-only / workspace-write / danger-full-access.
- Approval policies: untrusted / on-request / never.
- macOS Seatbelt, Linux Landlock, Windows native sandbox.
- Permission profiles via `[permissions.<name>]` tables.

### Plugin packaging (NEW -- launched March 2026)
- `.codex-plugin/plugin.json` manifest (required) + `skills/` + `.app.json`
  (optional MCP) + `.mcp.json` + `assets/`.
- Three-tier marketplace: OpenAI curated Plugin Directory > repo
  `.agents/plugins/marketplace.json` > personal `~/.agents/plugins/marketplace.json`.
- 20+ partner plugins (Slack, Figma, Notion, Sentry).
- `codex plugins` opens browse/install UI.
- `~/.codex/plugins/cache/$MARKETPLACE/$PLUGIN/$VERSION/` storage.

### OMX (Oh My Codex) -- third-party orchestration layer
- Adds: multi-agent coordination, session-level state, structured workflows,
  task routing, persistent memory across sessions.
- Soft dependency only -- Codex works without it.
- IJFW will NOT depend on OMX. We use native Codex hooks + skills.

### Other notable
- OpenTelemetry built-in (`[otel]` section). Per-session span `session_loop`.
- Web search (cached/live), image input, headless `codex exec`.
- Multi-IDE support: VS Code, Cursor, Windsurf, JetBrains all share auth +
  config + MCP.

### Sources
- https://developers.openai.com/codex/cli/features
- https://developers.openai.com/codex/skills
- https://developers.openai.com/codex/hooks
- https://developers.openai.com/codex/mcp
- https://developers.openai.com/codex/plugins
- https://developers.openai.com/codex/subagents
- https://github.com/openai/codex
- https://github.com/Yeachan-Heo/oh-my-codex

---

## GEMINI CLI (Google) -- what it actually exposes

### Extensions system
- `gemini-extension.json` manifest at extension root. Fields: `name`
  (lowercase + dashes), `version`, `description`, `mcpServers`, `excludeTools`,
  `contextFileName`, `settings`, `themes`, `plan`, `migratedTo`.
- Storage: `~/.gemini/extensions/` (user) or `.gemini/extensions/` (project).
- Bundles: MCP servers + commands + hooks + skills + agents + policies +
  themes + context files. Single package, all subsystems.
- Install via URL: `gemini extensions install <git-url>`.
- Hot-reload NOT supported (CLI restart). Dev workflow: `gemini extensions link`.
- Stable as of v0.38.1.

### Hook system (11 events -- richest of the three platforms)
- SessionStart, SessionEnd, BeforeAgent, BeforeToolSelection, BeforeTool,
  AfterTool, BeforeModel, AfterModel, AfterAgent, **PreCompress**, Notification.
- **PreCompress** matches Claude's PreCompact directly.
- BeforeModel / AfterModel intercept around the LLM call (more granular
  than Claude or Codex).
- Common payload: `session_id`, `transcript_path`, `cwd`, `hook_event_name`,
  `timestamp`. Event-specific fields per hook.
- Response: structured (exit 0 + JSON `decision: "deny"|"allow"`) or
  emergency brake (exit 2 + stderr aborts turn).
- Synchronous in agent loop (CLI waits).
- Hooks bundled in extensions via `hooks/hooks.json`.

### Custom slash commands (TOML)
- `.gemini/commands/*.toml` (project) or `~/.gemini/commands/*.toml` (user).
- Required fields: `prompt` (instruction sent to model), `description`.
- Argument interpolation: `{{args}}` placeholder.
- Namespaced: `commands/git/commit.toml` -> `/git:commit`.
- `/commands reload` applies changes mid-session (limited hot-reload).

### MCP support
- `~/.gemini/settings.json` `mcpServers` object. Schema includes `command`,
  `args`, `url` (SSE), `env` (with `${VAR}` substitution), `cwd`, `timeout`,
  `trust`, `includeTools`.
- Global `mcp.allowed` whitelist.
- `/mcp list` shows connection status.

### Subagents
- Hub-and-spoke architecture (main agent + spoke specialists).
- Definition: `.gemini/agents/*.md` (project) or `~/.gemini/agents/*.md`.
- Invocation: explicit mention or automatic delegation.
- Context isolation per subagent (saves main-loop tokens).
- Parallel execution supported.
- `RemoteAgents` feature for delegating to external agents.

### @workspace context API
- `@filename.js` or `@src/` syntax includes file/directory content.
- Git-aware (.gitignore respected).
- No formal query API; relies on CLI parsing of `@` references.
- Codebase indexing requested but not yet implemented (issue #2065).

### Model routing (built-in)
- `/model` command: Auto / Pro / Flash / Flash-Lite / Manual.
- Auto routing: Gemini 3 Flash for simple, Gemini 3 Pro for complex,
  silent fallback chain.
- Priority: `--model` flag > `GEMINI_MODEL` env > settings.json > default.
- No extension hook for model selection.

### Memory + persistence
- Session state: `~/.gemini/tmp/<project_hash>/chats/`.
- `GEMINI.md` hierarchical loading: `~/.gemini/GEMINI.md` -> workspace ->
  directory-specific. `@file.md` import syntax for modular includes.
- Configurable filename via `context.fileName` in settings.json.
- `save_memory` tool stores facts persistently across sessions.
- Checkpointing: shadow Git repo at `~/.gemini/history/<project_hash>/`
  + checkpoints at `~/.gemini/tmp/<project_hash>/checkpoints/`. Auto-saves
  before file modifications.
- `/chat save <tag>` and `/chat resume <tag>`.

### Policy engine (Claude doesn't have this natively)
- `.toml` rules under `~/.gemini/policies/` or extension `policies/`.
- Conditions: tool name, arguments, approval mode.
- Decisions: allow / deny / ask_user.
- Priority-based conflict resolution.
- Default policies ship safe-by-default.

### Configuration precedence
- (low) hardcoded -> system defaults file -> user settings -> project
  settings -> system settings -> env vars (.env chain) -> CLI args (high).
- `.env` chain: project -> parents up to `.git` or home -> `~/.env`.

### Auth
- Three options: Google OAuth (free tier, 60/min, 1k/day), Gemini API key
  (`GEMINI_API_KEY`), Vertex AI service account
  (`GOOGLE_APPLICATION_CREDENTIALS`).

### Sandboxing
- macOS Seatbelt (`permissive-open` default), Linux gVisor/runsc.
- Restrictions: file system to project dir, write outside dir blocked.
- "Sandbox Expansion Request" prompts user for temporary widened access.
- Tool whitelisting via `excludeTools`.

### Plugin packaging
- Official gallery: https://geminicli.com/extensions/browse/.
- Distribution via git repo URL (`gemini extensions install <url>`).
- Versioning: semver in manifest.
- Management: `gemini extensions list/install/link/update`.
- Official org: https://github.com/gemini-cli-extensions (40+ Google-built).

### Other notable
- OpenTelemetry foundation. Local file output to `.gemini/telemetry.log`.
- Dashboards prebuilt for monthly/daily active users, token consumption.
- `gjob` scheduler for background tasks (`gjob list/run/start`).
- IDE companion extensions (VS Code + JetBrains) share config.
- Plan Mode -- structured planning artifact for complex tasks.
- Token caching (Google API feature).

### Sources
- https://geminicli.com/docs/extensions/reference/
- https://geminicli.com/docs/hooks/reference/
- https://geminicli.com/docs/cli/custom-commands/
- https://geminicli.com/docs/tools/mcp-server/
- https://geminicli.com/docs/core/subagents/
- https://geminicli.com/docs/cli/skills/
- https://geminicli.com/docs/reference/policy-engine/
- https://github.com/google-gemini/gemini-cli
- https://github.com/gemini-cli-extensions

---

## Joint observations

1. **SKILL.md + YAML frontmatter is the cross-platform standard.**
   Claude / Codex / Gemini all accept the same shape. One source of
   truth, lightly platform-tailored.
2. **MCP is universal.** Every platform consumes MCP servers. IJFW's
   memory server already deploys on all three.
3. **Hooks differ in event count but converge on payload shape.** Claude:
   6, Codex: 7, Gemini: 11 (richest). Mappings exist for every Claude
   hook on Codex AND Gemini.
4. **Native marketplaces / galleries on both new platforms.** Codex Plugin
   Directory + Gemini Extension Gallery. Marketplace-ready format from
   day one is a near-zero-cost decision now.
5. **Gemini's policy engine has no Claude equivalent.** Bonus capability
   we can ship for Gemini users that Claude users do not get -- worth
   documenting as a Gemini-only enhancement.
6. **Codex git-worktree subagent isolation matches IJFW dispatch-planner.**
   Direct mapping. No adapter needed.
