# PHASE 3 — Verification Log

## Item #3 — Plugin merge re-verify (Cursor / Windsurf / Copilot)

Date: 2026-04-14
Method: isolated `HOME=$(mktemp -d)`, seeded each platform's MCP config with a
fake pre-existing entry, ran `bash scripts/install.sh`, inspected output.

### Setup
- Windsurf: `~/.codeium/windsurf/mcp_config.json` seeded with `user-existing`
- Cursor: `<proj>/.cursor/mcp.json` seeded with `user-cursor-srv`
- Copilot: `<proj>/.vscode/mcp.json` seeded with `user-copilot-srv`

### Result
All three configs post-install contained BOTH the seeded user entry AND the
new `ijfw-memory` entry. No overwrite. Atomic write via `.tmp` + rename.
`install.sh` exit 0.

### Verdict
**PASS** — Phase 2 claim verified. No code change required.

Confirms research finding (`research-codebase.md` §INSPECTION 1): all 6
platforms use the same node JSON merge primitive (or awk TOML-block primitive
for Codex). User configs preserved; backups written as `.bak.<timestamp>`.
