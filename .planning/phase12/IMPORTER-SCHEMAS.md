# Phase 12 / Wave 12C -- IMPORTER-SCHEMAS.md

Source-of-truth for the claude-mem + RTK importers. Sourced from an Explore
agent pass over the upstream repos + docs (2026-04-15).

## claude-mem

- **Upstream:** https://github.com/thedotmack/claude-mem  (npm: `@thedotmack/claude-mem`)
- **Storage:** SQLite 3 at `~/.claude-mem/claude-mem.db` (WAL mode).
  Alt candidate paths: `~/.config/claude-mem/claude-mem.db`.
- **Config:** `~/.claude-mem/settings.json`.

### Primary table: `observations`

| Column             | Type     | Notes                                                      |
|--------------------|----------|------------------------------------------------------------|
| `id`               | INTEGER  | PK                                                         |
| `session_id`       | TEXT     | claude-mem session                                         |
| `sdk_session_id`   | TEXT     | foreign key to `sdk_sessions`                              |
| `claude_session_id`| TEXT     | Claude Code session                                        |
| `project`          | TEXT     | absolute project path                                      |
| `prompt_number`    | INTEGER  |                                                            |
| `tool_name`        | TEXT     |                                                            |
| `correlation_id`   | TEXT     |                                                            |
| `title`            | TEXT     | ~80 char summary                                           |
| `subtitle`         | TEXT     |                                                            |
| `type`             | TEXT     | `decision` | `bugfix` | `feature` | `refactor` | `discovery` | `change` |
| `narrative`        | TEXT     | main body                                                  |
| `facts`            | TEXT     | JSON array of strings                                      |
| `concepts`         | TEXT     | JSON array of strings (tags)                               |
| `files_read`       | TEXT     | JSON array of paths                                        |
| `files_modified`   | TEXT     | JSON array of paths                                        |
| `text`             | TEXT     | raw text (rarely populated)                                |
| `created_at`       | TEXT     | ISO-8601 UTC                                               |
| `created_at_epoch` | INTEGER  | Unix ms                                                    |

There is an FTS5 virtual table `observations_fts` covering (title, subtitle,
narrative, facts, concepts). Importer ignores it -- we re-tokenize into the
IJFW BM25 layer on the way in.

### Field mapping -> IJFW entry

| claude-mem              | IJFW entry shape                                   |
|-------------------------|----------------------------------------------------|
| `title`                 | `summary` (80-char cap)                            |
| `narrative`             | `content`                                          |
| `type` = `decision`     | IJFW `type: decision`                              |
| `type` in {feature, refactor, change, bugfix} | IJFW `type: pattern` |
| `type` = `discovery`    | IJFW `type: observation`                           |
| other                   | IJFW `type: observation` (fallback)                |
| `concepts` (JSON array) | `tags` (capped at 20)                              |
| `facts` (JSON array)    | appended to `content` as bullets                   |
| `files_modified`        | mentioned in `content` trailer when non-empty      |
| `created_at`            | written as `importedAt` in writer                  |
| `project` + `session_id`| provenance line appended to `content`              |

### Gotchas

- SQLite dep: importer uses Node's built-in `node:sqlite` (Node 22.5+).
  On older Node the importer emits a positive-framed upgrade message and
  exits non-fatally (other importers still run).
- Private content: users wrap sensitive data in `<private>` tags
  client-side; claude-mem strips them before storage, so the importer
  does not re-scan.
- `facts` and `concepts` are stringified JSON. Parse defensively, tolerate
  malformed rows by degrading to raw text.

## RTK (Rust Token Killer)

- **Upstream:** https://github.com/rtk-ai/rtk  (not on npm -- Rust binary)
- **Storage:** SQLite 3 at `~/.local/share/rtk/history.db`.
- **Config:** `~/.config/rtk/config.toml` (Linux/Win) or
  `~/Library/Application Support/rtk/config.toml` (macOS).

### Tables

`commands` (token-savings metrics per wrapped invocation):
- `timestamp`, `original_cmd`, `rtk_cmd`, `project_path`,
  `input_tokens`, `output_tokens`, `saved_tokens`, `savings_pct`,
  `exec_time_ms`.

`parse_failures` (diagnostic):
- `timestamp`, `raw_command`, `error_message`, `fallback_succeeded`.

### Decision: supplementary only

RTK is **metrics-only** -- it does not persist semantic memory (decisions,
patterns, narrative). Importing every row as an IJFW observation would
flood project-journal.md with command invocations that add no recall value.

**Policy:** RTK importer is scaffolded but **disabled by default**. User
opts in with `ijfw import rtk --include-metrics`. Default `ijfw import rtk`
emits a one-liner explaining RTK is metrics-only and recommends
claude-mem as the memory source.

### Field mapping (opt-in path)

| RTK                  | IJFW entry shape                               |
|----------------------|------------------------------------------------|
| `timestamp`          | derived into observation header                |
| `original_cmd`       | `content` (single-line)                        |
| `project_path`       | tag: `project:<basename>`                      |
| `savings_pct`        | tag: `saved:<pct>%`                            |
| `exec_time_ms`       | content trailer                                |
| all entries          | IJFW `type: observation`                       |
