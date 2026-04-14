---
description: "Two-phase multi-model research. Phase A fans codex+gemini in parallel (benchmarks + citations angles); Phase B synthesises via fresh Claude session. Usage: /cross-research [--with <id> | list | compare] <target>"
allowed-tools: ["Read", "Write", "Bash", "Grep"]
---

Deep-research triangulation from multiple agents. Solves "a single model's training
data is a single lens." Parallel fan-out collects independent claim sets, then a
synthesis pass merges them into a consensus/contested/unique matrix with open
questions surfaced. All three requests, responses, and the merged output archive
automatically.

## Subcommands

| Form | Behavior |
|------|----------|
| `/cross-research`                     | **Zero-arg auto-pick.** Detect target from git state (staged → unstaged → last commit). Pick default roster (Codex=benchmarks, Gemini=citations). Generate Phase A requests. |
| `/cross-research <target>`            | Same auto-pick, named target. |
| `/cross-research --with <id> [target]` | Override an auditor slot: `codex`, `gemini`, `opencode`, `aider`, `copilot`. Target optional. |
| `/cross-research list`                | Show roster with self marker. No requests generated. |
| `/cross-research compare`             | Read Phase A responses, build Phase B synthesis request, fire it, render matrix, archive. |

## Smart target auto-detection (bare `/cross-research`)

When invoked without a target, run this detection cascade and use the first
non-empty result:

1. **Staged changes** — `git diff --cached --name-only`
2. **Unstaged changes** — `git diff --name-only`
3. **Last commit** — `git diff HEAD~1 --name-only`
4. If all empty: print the roster and ask "what topic would you like researched?"

Report which step succeeded:

```
Cross-research target auto-detected: 2 staged file(s)
  mcp-server/src/cross-dispatcher.js
  mcp-server/test-cross-dispatcher.js
(Override with /cross-research <path> or /cross-research --with <id> <path>.)
```

If >5 files, group in request body but list all paths. If a single file >2000 lines,
use the diff hunks rather than the full file.

The natural-language phrase **"research this across models"** / **"multi-model
research"** fires the intent router (`mcp-server/src/intent-router.js`), which
nudges Claude to invoke `/cross-research` automatically — same auto-detect flow runs.

## Default flow — Donahoe Trident (don't make me think)

Caller is one perspective. **Default is two independent research streams feeding
one synthesis.** The Trident yields: independent evidence collection in parallel,
then a single merge pass that exposes what each model knew, what they agreed on,
and where they diverge.

When invoked, do this in order:

1. **Probe roster.** Call `pickAuditors({ count: 2, env: process.env })` from
   `audit-roster.js`. Returns `{ picks, missing, note }` — picks are installed
   AND non-self.

2. **Show a TODO surface** in chat:

   ```
   Cross-research plan
     [ ] Generate Phase A requests (codex=benchmarks, gemini=citations)
     [ ] Fire codex in background
     [ ] Fire gemini in background
     [ ] Wait for both completions
     [ ] Generate Phase B synthesis request (claude=synthesis)
     [ ] Fire synthesis
     [ ] Render consensus/contested/unique matrix
     [ ] Archive all requests + responses + merge
   ```

3. **Ask the user once** which combo to run:

   ```
   Auditors detected and ready: codex, gemini.
   Run cross-research:
     [A] codex only (benchmarks angle)
     [B] gemini only (citations angle)
     [C] Both — recommended (Donahoe Trident, enables full synthesis)
     [D] Cancel / pick custom
   ```

   Default suggestion: **C (Both)** when ≥2 installed. Synthesis (Phase B) requires
   both Phase A responses; if only one auditor runs, Phase B renders a partial
   synthesis and flags the gap.

4. **If only one installed:**

   > "Only `<id>` is installed locally. The full Trident shines here — two
   > independent research streams remove single-model blind spots before synthesis.
   > Install one of the available auditors (opencode, aider, etc.) to unlock the
   > complete picture."

   Then offer to run the single-auditor partial flow.

5. **Fire Phase A in background** (see Phase A section below).

6. **After Phase A completes**, run `/cross-research compare` (or fire it
   automatically when both background jobs notify).

7. **Fire Phase B synthesis** via fresh Claude session (see Phase B section below).

8. **Render matrix** from `mergeResponses('research', responses)`.

9. **Archive** all files to `.ijfw/cross-audit/archive/<ts>-research/`.

## Auditor picking

```bash
node --input-type=module -e "import('./mcp-server/src/audit-roster.js').then(m => console.log(m.formatRoster()))"
```

Default pick order (first non-self): `codex → gemini → opencode → aider → copilot → claude`.

Research role assignment is mode-aware via `assignRoles('research', roster, self)` in
`cross-dispatcher.js`:
- `codex` → `benchmarks` angle
- `gemini` → `citations` angle
- Synthesis always goes to a **fresh Claude session via `claude -p`** — never the
  caller's own session, even if self=claude, to prevent circularity.

---

## Phase A — Parallel fan-out

### Step 1 — Generate Phase A requests via the dispatcher

Run one node call per auditor:

```bash
node --input-type=module -e "
import('./mcp-server/src/cross-dispatcher.js').then(m =>
  m.buildRequest('research', '<target>', 'codex', 'benchmarks')
   .then(r => process.stdout.write(r))
)" > .ijfw/cross-audit/request-research-codex.md
```

```bash
node --input-type=module -e "
import('./mcp-server/src/cross-dispatcher.js').then(m =>
  m.buildRequest('research', '<target>', 'gemini', 'citations')
   .then(r => process.stdout.write(r))
)" > .ijfw/cross-audit/request-research-gemini.md
```

Replace `<target>` with the detected or specified target string.

### Step 2 — Fire auditors in background

**Auto-fire is required.** Do NOT stop at "request written — paste it into Codex."
Only fall back to human paste when `command -v <auditor>` fails AND the roster
probe returns the auditor as missing.

Fire each in background via Bash tool with `run_in_background:true`:

```bash
cat .ijfw/cross-audit/request-research-codex.md | codex exec - > .ijfw/cross-audit/response-research-codex.md
```

```bash
cat .ijfw/cross-audit/request-research-gemini.md | gemini - > .ijfw/cross-audit/response-research-gemini.md
```

Both run simultaneously. Wait for both completion notifications before proceeding
to Phase B. Update the TODO surface to `in_progress` then `completed` per auditor.

**Missing auditor fallback (positive framing only):**
If `command -v codex` (or `gemini`) fails, surface:

> "Codex isn't installed locally — paste `request-research-codex.md` into
> https://platform.openai.com/playground and save the response as
> `.ijfw/cross-audit/response-research-codex.md`, then re-run
> `/cross-research compare`."

---

## Phase B — Synthesis (sequential, after Phase A)

### Step 1 — Generate the synthesis request

Read both Phase A responses and feed them as `priorResponses` to the dispatcher:

```bash
node --input-type=module -e "
import('./mcp-server/src/cross-dispatcher.js').then(async m => {
  const fs = await import('fs');
  const codex = fs.readFileSync('.ijfw/cross-audit/response-research-codex.md','utf8');
  const gemini = fs.readFileSync('.ijfw/cross-audit/response-research-gemini.md','utf8');
  const req = await m.buildRequest('research', '<target>', 'claude', 'synthesis', [codex, gemini]);
  process.stdout.write(req);
})" > .ijfw/cross-audit/request-research-synthesis.md
```

### Step 2 — Fire synthesis via fresh Claude session

**Auto-fire is required.** Fire via Bash tool with `run_in_background:true`:

```bash
cat .ijfw/cross-audit/request-research-synthesis.md | claude -p > .ijfw/cross-audit/response-research-synthesis.md
```

A fresh `claude -p` session is used even when the caller is Claude, to prevent
the synthesis from being coloured by the caller's in-session context.

### Step 3 — Render matrix

Once the synthesis response lands, call `mergeResponses` to build the final matrix:

```bash
node --input-type=module -e "
import('./mcp-server/src/cross-dispatcher.js').then(async m => {
  const fs = await import('fs');
  const responses = ['codex','gemini','synthesis'].map(id =>
    fs.readFileSync(\`.ijfw/cross-audit/response-research-\${id}.md\`,'utf8')
  );
  const merged = m.mergeResponses('research', responses);
  process.stdout.write(JSON.stringify(merged, null, 2));
})"
```

Render the merged result as:

```
## Research matrix — <target>

### Consensus (≥2 sources agree)
| Claim | Evidence | Sources | Confidence |
|-------|----------|---------|------------|
| ...   | ...      | ...     | high       |

### Contested (sources disagree)
| Claim | Codex says | Gemini says | Delta |
|-------|-----------|-------------|-------|

### Unique (single-source, investigate)
| Claim | Source | Flag |
|-------|--------|------|

### Open questions
- ...
```

### Step 4 — Archive

Move all six files (3 requests + 3 responses) plus the merged JSON to:

```
.ijfw/cross-audit/archive/<YYYY-MM-DDTHHMM>-research/
  request-research-codex.md
  request-research-gemini.md
  request-research-synthesis.md
  response-research-codex.md
  response-research-gemini.md
  response-research-synthesis.md
  merge.json
```

## Notes

- Phase A is always parallel; Phase B is always sequential (depends on Phase A).
- The synthesis angle always runs in a fresh `claude -p` session — never the caller's
  own context.
- `audit-roster.js` detection is conservative: if the caller cannot be identified,
  all options are shown rather than guessing.
- Positive framing throughout: no "missing auditor error" — "install to unlock the
  full Trident."
