# Polish-Pass Trident Audit (round 2)

3 parallel cross-audits on the polish pass changes (CLI, session-end,
session-start). 2 HIGH + 6 MED + 2 LOW.

## Closed inline

- **MED CLI:634** -- `ijfw receipt last` read findings from
  `last.merged?.findings`. Real receipts store at `last.findings.items`.
  Fixed in cmdReceipt; live-tested.
- **MED session-start:415** -- `awk match(s, re, arr)` 3-arg form is
  gawk-only; fails on default BSD/macOS awk. Replaced with POSIX
  `match` + `substr` + helper function.
- **MED session-start:66** -- hook tried to `export
  CLAUDE_CODE_EFFORT_LEVEL=high`, but a child process can't mutate the
  parent env. Removed the no-op; documented expected user-side env.

## Pre-existing (deferred to v1.0.x)

These were NOT introduced by the polish pass. Trident found them in
the broader codebase. Fixing them is bigger than polish scope; tracking
here so v1.0.x picks them up.

- **HIGH cross-orchestrator-cli.js:437** -- API auditors receive only
  the file-path string in `## Target`, not file contents. CLI auditors
  read disk via shell; API path doesn't. Fix: orchestrator should
  expand file targets to contents before building the prompt.
  Workaround: today, anyone using API-only auditors (no CLI) sees
  shallow audits. Most users have at least one CLI auditor.

- **HIGH session-end.sh:36** -- session number derived from file count
  in `.ijfw/sessions/`, but the same script later prunes that dir.
  Result: post-pruning sessions reuse low numbers (#1, #2, ...). Fix:
  use a counter file (`.ijfw/sessions/.counter`) that monotonically
  increments. Cosmetic only -- nothing depends on the number being
  unique outside the printf line.

- **MED CLI:520** -- `ijfw cross project-audit <rule-file>` walks
  registry and runs `ijfw cross audit <rule>` in each project. The
  rule should be an audit lens, but `cross audit` interprets its arg
  as the target. Result: every project audits the rule file from its
  cwd, which does not actually audit the project against the rule.
  Fix: rework either project-audit semantics or `cross audit` to
  separate `--lens` from `<target>`. Documented as a known semantic
  gap.

- **MED session-end.sh:256** -- truncates feedback/signals files even
  when the auto-memorize binary exits early on missing consent.
  Should only truncate after a successful run.

- **MED session-start:84** -- background local-model probe writes
  `.ijfw/.detection`; main script later moves it to
  `.detection.prev` without waiting. Race condition -- worst case
  banner is one session stale.

- **LOW session-end.sh:46** -- unbounded `cat` of stdin into a shell
  variable. Theoretically unbounded memory; in practice Stop-hook
  payload is < 10KB.

- **LOW session-start.sh:26** -- `.ijfw` existing as a file (not a
  dir) prints to stdout and exits before the JSON SessionStart output
  is built. Edge case; current behavior fails open.

## Outcome

3 polish-pass HIGH/MED closed inline. 2 HIGH + 4 MED/LOW pre-existing
deferred to v1.0.x. Suite 84/84 green. check-all.sh clean.
