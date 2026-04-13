# IJFW Phase 3: Codebase Research

## INSPECTION 1: Plugin Merge Logic — Install Strategy

**File**: `/Users/seandonahoe/dev/ijfw/scripts/install.sh` (lines 1–163)

### Current State: All 6 Platforms Merge (No Overwrites)

The install script explicitly uses merge strategies for all platforms, never overwrites:

| Platform | Config File | Strategy | Details |
|----------|------------|----------|---------|
| Claude Code | N/A (plugin) | Manual command | Uses `/plugin marketplace add` and `/plugin install ijfw` — no file merge needed. Auto-registers MCP. |
| Codex | `~/.codex/config.toml` | TOML merge (awk) | Lines 79–102: Removes only `[mcp_servers.ijfw-memory]` block, preserves all other content. Appends fresh block with `command`, `args`, `enabled`, timeout settings. |
| Gemini CLI | `~/.gemini/settings.json` | JSON merge (node) | Lines 47–72: Parses existing JSON, sets `doc.mcpServers['ijfw-memory']`, writes atomically via `.tmp` rename. Preserves all other keys. |
| Cursor | `.cursor/mcp.json` | JSON merge (project-local) | Line 137: Relative path `.cursor/mcp.json`. Uses same node merge as Gemini. Copies rule to `.cursor/rules/ijfw.mdc`. |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | JSON merge (home-based) | Line 145: Absolute home path. Same node merge logic as Gemini/Cursor. |
| Copilot (VS Code) | `.vscode/mcp.json` | JSON merge (project-local) | Line 151: Relative path `.vscode/mcp.json`. Same node merge as Cursor. |

### Backup Behavior

- **Timestamp**: `TS=$(date +%Y%m%d-%H%M%S)` (line 32)
- **Format**: `<config>.bak.<timestamp>` (line 41)
- **When**: Before merge; only if file exists (line 40)
- **Example**: `~/.codex/config.toml.bak.20260414-071500`

### JSON Merge Implementation (lines 47–72)

```javascript
// Guarantees existing doc.mcpServers entries are preserved:
doc.mcpServers = doc.mcpServers || {};
doc.mcpServers["ijfw-memory"] = { command, args: [], env: {} };
// All other keys in doc remain untouched
fs.writeFileSync(path + ".tmp", JSON.stringify(doc, null, 2) + "\n");
fs.renameSync(path + ".tmp", path);  // atomic
```

**Key property**: Only the `ijfw-memory` key is written; all user's other `mcpServers` (e.g., Anthropic API, Jina, etc.) survive.

### TOML Merge Implementation (lines 79–102)

```bash
# Step 1: Remove any existing [mcp_servers.ijfw-memory] block using awk
awk '
  BEGIN { skip = 0 }
  /^\[mcp_servers\.ijfw-memory\][[:space:]]*$/ { skip = 1; next }
  skip && /^\[/ && !/^\[mcp_servers\.ijfw-memory\]/ { skip = 0 }
  !skip { print }
' "$dst" > "$dst.tmp" && mv "$dst.tmp" "$dst"

# Step 2: Append fresh block
{
  printf '\n[mcp_servers.ijfw-memory]\n'
  printf 'command = "%s"\n' "$launcher"
  printf 'args = []\n'
  printf 'enabled = true\n'
  printf 'startup_timeout_sec = 10\n'
  printf 'tool_timeout_sec = 30\n'
} >> "$dst"
```

**Key property**: Targets only the `[mcp_servers.ijfw-memory]` section bracket; all other `[sections]` and their keys remain. Append-only (no edit in place during append).

### Verdict: Phase 2 Claim Verified

Codex and Gemini CLI both merge cleanly. Cursor, Windsurf, and Copilot are **already merging correctly** via the same JSON merge logic. No overwrites anywhere in the codebase.

### Minor Improvement (Not Required)

The Codex instructions (lines 120–126) are append-only: `instructions.md` is never overwritten if it exists. This is intentional and matches the merge philosophy.

---

## INSPECTION 2: Token Usage Dashboard — Metrics Schema & Sources

**File**: `/Users/seandonahoe/dev/ijfw/claude/hooks/scripts/session-end.sh` (lines 1–89)

### JSONL Schema (Current Implementation)

The hook writes one line per session to `.ijfw/metrics/sessions.jsonl` using Node.js JSON encoding (lines 42–59):

```javascript
{
  "v": 1,                          // schema version
  "timestamp": "2026-04-14T07:15:30Z",  // ISO 8601 UTC
  "session": 1,                    // monotonic session number
  "mode": "smart",                 // IJFW_MODE env var (default: "smart")
  "effort": "high",                // CLAUDE_CODE_EFFORT_LEVEL (default: "high")
  "routing": "native",             // "native" | "OpenRouter" | "smart-routing"
  "memory_stores": 5,              // count of memory updates (from project-journal.md)
  "handoff": true                  // boolean: was handoff.md present?
}
```

**File location**: `.ijfw/metrics/sessions.jsonl` (line 18)  
**Directory creation**: `mkdir -p "$IJFW_DIR/metrics"` (line 16)

### Input/Output Tokens: NOT Currently Captured

The hook currently captures NO token counts. Env vars available in the hook context that *could* be used:
- `CLAUDE_CODE_INPUT_TOKENS` (if exported by Claude Code) — **not verified in hook**
- `CLAUDE_CODE_OUTPUT_TOKENS` (if exported by Claude Code) — **not verified in hook**
- Hook payload from Claude Code (if available) — **not documented in hook**

**What would need to be added:**
1. Check if Claude Code exports `CLAUDE_CODE_INPUT_TOKENS` and `CLAUDE_CODE_OUTPUT_TOKENS` as env vars at session-end.
2. If not exported, request Claude Code hook payload to include token counts in the script's argv.
3. Add `input_tokens` and `output_tokens` fields to the JSONL schema (v2).
4. Node line would become:
```javascript
const o = {
  v: 2,
  timestamp: ...,
  session: ...,
  input_tokens: Number(process.argv[8]) || 0,   // NEW
  output_tokens: Number(process.argv[9]) || 0,  // NEW
  ...
};
```

### Metrics Directory: Not in Repo Initially

The `.ijfw-gitignore` file (checked into repo at `/Users/seandonahoe/dev/ijfw/.ijfw-gitignore`) explicitly ignores:
```
.ijfw/metrics/
```

This means `.ijfw/metrics/` is created at first session-end (line 16) but never committed. The directory only exists after the first session ends.

### Existing Status Command (Closest to Dashboard)

Function `handleStatus()` in `/Users/seandonahoe/dev/ijfw/mcp-server/src/server.js` (lines 741–765):

```javascript
function handleStatus() {
  const sessionCount = getSessionCount();      // count .md files in sessions/
  const decisionCount = getDecisionCount();    // count journal entries
  const hasKnowledge = existsSync(...);
  const hasHandoff = existsSync(...);
  const hasGlobal = readGlobalKnowledge().trim().length > 0;
  
  // Outputs: "Knowledge: 15 entries", "History: 8 sessions, 12 decisions", etc.
  return { text: parts.join('\n') };
}
```

This is text-based status. No aggregation; no time-series; no token sums.

### Aggregation Primitives Needed for `/ijfw-metrics`

To implement a token dashboard, we need:

| Operation | Source Data | Complexity | Notes |
|-----------|-------------|-----------|-------|
| Sum tokens by day | `.ijfw/metrics/sessions.jsonl` | Low | Group by `timestamp.slice(0,10)`, sum `input_tokens` + `output_tokens` |
| Count sessions | `.ijfw/metrics/sessions.jsonl` | Low | Line count or unique `session` values |
| Decisions delta over time | `.ijfw/memory/project-journal.md` + hourly snapshots | Medium | Requires either `decisions_before` field in JSONL or separate decision-count snapshots |
| Routing-savings calc | `.ijfw/metrics/sessions.jsonl` | Medium | Calculate cost(OpenRouter) vs cost(native). Requires token counts + pricing table. |
| Mode distribution | `.ijfw/metrics/sessions.jsonl` | Low | Count occurrences of each unique `mode` value |

**Proposed `/ijfw-metrics` tool handler** (sketch):
```javascript
function handleMetrics({ period = 'today', metric = 'tokens' }) {
  const lines = readOr('.ijfw/metrics/sessions.jsonl')
    .split('\n')
    .filter(l => l.trim())
    .map(l => JSON.parse(l));
  
  if (metric === 'tokens') {
    const groups = {};
    for (const entry of lines) {
      const day = entry.timestamp.slice(0, 10);
      groups[day] ??= 0;
      groups[day] += (entry.input_tokens || 0) + (entry.output_tokens || 0);
    }
    return { text: Object.entries(groups).map(([k, v]) => `${k}: ${v}`).join('\n') };
  }
  // ...
}
```

---

## INSPECTION 3: Team Memory Tier — Architecture & .gitignore

**File**: `/Users/seandonahoe/dev/ijfw/mcp-server/src/server.js` (lines 48–67, 302–342, 425–439)

### Current Directory Structure

**Personal (project-local, gitignored):**
```
.ijfw/
├── memory/                      (committed: knowledge.md, handoff.md, project-journal.md)
├── sessions/                    (gitignored: session_*.md)
├── metrics/                     (gitignored: sessions.jsonl)
└── ...
```

**Cross-project global (home-based):**
```
~/.ijfw/
├── memory/
│   ├── global-knowledge.md      (legacy single-file)
│   ├── global/                  (Phase 2: faceted)
│   │   ├── preferences.md       (team-level? user-level?)
│   │   ├── patterns.md
│   │   ├── stack.md
│   │   ├── anti-patterns.md
│   │   └── lessons.md
│   └── registry.md              (cross-project index)
└── ...
```

**Claude Code native:**
```
~/.claude/projects/<project-hash>/memory/
├── <auto-generated>.md          (Claude's native auto-memory)
```

### Proposed: Team Tier Placement

Team memory should slot **between personal and global**:

```
.ijfw/
├── memory/                      (personal, committed)
├── team/                        (NEW: team-shared, committed)
│   ├── decisions.md             (architectural, team-wide)
│   ├── patterns.md              (team coding standards)
│   ├── stack.md                 (approved tech decisions)
│   └── members.md               (team roster / ownership map)
├── sessions/                    (gitignored)
├── metrics/                     (gitignored)
```

**Reasoning for location:**
- Project-local (like `.ijfw/memory/`) so all team members see it via git
- Separate subdirectory (`.ijfw/team/`) distinguishes shared vs. personal memory
- Higher precedence than global (team > personal > global) for scope conflicts
- Uses same faceted `.md` approach as global for clarity and git-friendliness

### Implementation: `readTeamKnowledge()` Function

Parallel to existing `readGlobalKnowledge()` (lines 302–325):

```javascript
function readTeamKnowledge() {
  const sources = [];
  const TEAM_DIR = join(IJFW_DIR, 'team');
  const TEAM_FACETS = ['decisions', 'patterns', 'stack', 'members'];
  
  if (existsSync(TEAM_DIR)) {
    for (const facet of TEAM_FACETS) {
      const p = join(TEAM_DIR, `${facet}.md`);
      const raw = readOr(p);
      if (raw) sources.push(`### ${facet} (team)\n${raw}`);
    }
  }
  
  return sources.join('\n\n');
}
```

### Should Team Be a 4th Source in `searchMemory()`?

**Current sources** (line 433–439):
```javascript
const sources = [
  { name: 'knowledge', content: readKnowledgeBase() },        // personal
  { name: 'journal', content: readOr(...project-journal.md) },
  { name: 'handoff', content: readHandoff() },
  { name: 'global', content: readGlobalKnowledge() },         // cross-project
  { name: 'claude-native', content: readNativeClaudeMemory() }
];
```

**Verdict: YES, team should be 4th source.**

**Reasoning:**
1. **Precedence matters**: Team > Personal > Global (shared team context should rank above user prefs).
2. **Scope clarity**: Tag results with `[team:decisions]` vs. `[global:preferences]` so agent understands authority level.
3. **Search balance**: Without team, agents might miss important shared architectural decisions baked into global.md by mistake.

**Addition:**
```javascript
const sources = [
  { name: 'knowledge', content: readKnowledgeBase() },      // personal
  { name: 'team', content: readTeamKnowledge() },           // NEW: shared
  { name: 'journal', content: readOr(...) },
  { name: 'handoff', content: readHandoff() },
  { name: 'global', content: readGlobalKnowledge() },       // cross-project
  { name: 'claude-native', content: readNativeClaudeMemory() }
];
```

### Prelude Tool: Does It Surface Global? Would It Surface Team?

**Current prelude** (lines 669–720):
- Calls `readGlobalKnowledge()` (line 712) and includes up to 10 lines in output
- Summary: "### Project preferences" (line 715)
- Does NOT filter facets; just truncates

**Modification for team:**

```javascript
function handlePrelude({ detail_level = 'summary' } = {}) {
  const KB_LINES = detail_level === 'full' ? 200 : 80;
  // ... (unchanged)
  
  const parts = ['<ijfw-memory>'];
  // ... (knowledge, handoff, journal as before)
  
  // NEW: Team
  const team = readTeamKnowledge();
  if (team) {
    const teamLines = team.split('\n').slice(0, 20).join('\n').trim();
    if (teamLines) parts.push(`## Team Knowledge\n${teamLines}`);
  }
  
  // Existing: Global
  const global = readGlobalKnowledge();
  if (global) {
    const globalLines = global.split('\n').slice(0, 10).join('\n').trim();
    if (globalLines) parts.push(`## Preferences\n${globalLines}`);
  }
  
  // ...
  return { text: parts.join('\n\n') || '...' };
}
```

**Yes, prelude will need to surface team** — agents won't know to search for it otherwise at session start.

### .gitignore Implications

**Current `.ijfw-gitignore`** (checked into repo, applied by users):
```
# Ephemeral, per-session data — don't commit
.ijfw/sessions/
.ijfw/index/
.ijfw/metrics/
.ijfw/.startup-flags
.ijfw/.migrated

# Audit outputs
.ijfw/audits/

# ALLOW (uncommented to enable):
# .ijfw/agents/         — team definitions (commented out)
# .ijfw/memory/knowledge.md — architectural decisions (commented out)
```

**With team tier, .ijfw-gitignore should:**
1. Keep `.ijfw/memory/` committed (personal knowledge, handoff, journal)
2. Add `.ijfw/team/` committed (shared team decisions, patterns, stack)
3. Keep `.ijfw/sessions/` and `.ijfw/metrics/` gitignored (ephemeral)

**Updated line:**
```
# IJFW — shared team memory (commit these)
# .ijfw/team/decisions.md
# .ijfw/team/patterns.md
# .ijfw/team/stack.md

# IJFW — session data (don't commit)
.ijfw/sessions/
.ijfw/metrics/
.ijfw/.startup-flags
```

**Current status**: `.ijfw/team/` is **not yet in .gitignore** (neither committed nor ignored), so it would be tracked by default once created. This is correct for Phase 3 (team is committed by design).

---

## Summary: Readiness for Phase 3 Implementation

| Component | Status | Notes |
|-----------|--------|-------|
| Install merge logic | READY | All platforms merge; backups in place; no breaking changes needed. |
| Metrics schema | PARTIAL | JSONL structure exists; tokens not captured; aggregation functions missing. |
| Team memory architecture | NOT STARTED | Directory structure, readTeamKnowledge(), and prelude integration all needed. |
| .gitignore clarity | MINOR | Already ignores sessions/metrics; team/ will be committed by default (correct). |
