// --- dispatch-planner: decides shared-branch vs worktree-isolated parallelism ---
//
// Parses a plan markdown document, finds sub-wave `Files:` declarations, and
// computes a dispatch manifest: each sub-wave is either SHARED (no file overlap
// with peers in the same wave) or WORKTREE (overlaps -> needs isolation).
//
// Pure + synchronous. ESM. Zero deps. Filesystem only touched by caller.

const WAVE_HEADER = /^###\s+Wave\s+([0-9]+[A-Z])(?:-([A-Za-z0-9_+]+))?\b/;
const FILES_LINE  = /^\s*[*-]?\s*\*{0,2}Files:\*{0,2}\s*(.+?)\s*$/i;

// Parse a plan markdown string into an array of sub-waves.
// Shape: [{ wave: '12A', sub: '12A-foo' | null, files: string[] }]
// A sub-wave without a Files: line gets files: [] (treated as "unknown").
export function parsePlan(markdown) {
  const lines = markdown.split(/\r?\n/);
  const subwaves = [];
  let current = null;

  for (const line of lines) {
    const h = line.match(WAVE_HEADER);
    if (h) {
      if (current) subwaves.push(current);
      const wave = h[1];
      const sub  = h[2] ? `${wave}-${h[2]}` : null;
      current = { wave, sub, files: [] };
      continue;
    }
    if (!current) continue;
    const f = line.match(FILES_LINE);
    if (f) {
      current.files = f[1]
        .split(/[,\s]+/)
        .map((s) => s.replace(/^`|`$/g, '').trim())
        .filter(Boolean);
    }
  }
  if (current) subwaves.push(current);
  return subwaves;
}

// Compute pairwise file-set overlap within the same wave.
// Returns a map: subId -> string[] of peer subIds it conflicts with.
export function computeOverlaps(subwaves) {
  const byWave = new Map();
  for (const sw of subwaves) {
    if (!byWave.has(sw.wave)) byWave.set(sw.wave, []);
    byWave.get(sw.wave).push(sw);
  }

  const overlaps = new Map();
  for (const group of byWave.values()) {
    for (const sw of group) overlaps.set(idOf(sw), []);
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j];
        if (intersects(a.files, b.files)) {
          overlaps.get(idOf(a)).push(idOf(b));
          overlaps.get(idOf(b)).push(idOf(a));
        }
      }
    }
  }
  return overlaps;
}

// Build the dispatch manifest.
// options: { override: 'all-worktree' | 'all-shared' | null }
// Rules:
//   1. override 'all-worktree' -> every sub-wave WORKTREE.
//   2. override 'all-shared'   -> every sub-wave SHARED (caller took the risk).
//   3. sub-wave missing Files: declaration -> WORKTREE (safe default).
//   4. sub-wave with overlap against peer  -> WORKTREE.
//   5. otherwise SHARED.
export function buildManifest(subwaves, options = {}) {
  const override = options.override || null;
  const overlaps = computeOverlaps(subwaves);

  return subwaves.map((sw) => {
    const id = idOf(sw);
    const peers = overlaps.get(id) || [];
    let mode;
    let reason;

    if (override === 'all-worktree') {
      mode = 'worktree';
      reason = 'override:all-worktree';
    } else if (override === 'all-shared') {
      mode = 'shared';
      reason = 'override:all-shared';
    } else if (sw.files.length === 0) {
      mode = 'worktree';
      reason = 'no-files-declared';
    } else if (peers.length > 0) {
      mode = 'worktree';
      reason = `overlap:${peers.join(',')}`;
    } else {
      mode = 'shared';
      reason = 'disjoint';
    }

    return {
      id,
      wave: sw.wave,
      sub: sw.sub,
      files: sw.files.slice(),
      mode,
      reason,
      overlaps_with: peers.slice(),
    };
  });
}

// One-line human summary for the workflow skill to echo before dispatch.
// Example: "Wave 12A: 3 shared + 2 worktree (overlap: 12A-mcp <-> 12A-cmd)."
export function manifestSummary(manifest) {
  if (manifest.length === 0) return 'Wave: no sub-waves found.';
  const byWave = new Map();
  for (const m of manifest) {
    if (!byWave.has(m.wave)) byWave.set(m.wave, []);
    byWave.get(m.wave).push(m);
  }
  const parts = [];
  for (const [wave, entries] of byWave) {
    const shared   = entries.filter((e) => e.mode === 'shared').length;
    const worktree = entries.filter((e) => e.mode === 'worktree').length;
    const pairs = new Set();
    for (const e of entries) {
      for (const peer of e.overlaps_with) {
        const key = [e.id, peer].sort().join(' <-> ');
        pairs.add(key);
      }
    }
    const tail = pairs.size > 0 ? ` (overlap: ${[...pairs].join('; ')})` : '';
    parts.push(`Wave ${wave}: ${shared} shared + ${worktree} worktree${tail}.`);
  }
  return parts.join(' ');
}

// Topologically ordered merge plan for worktree sub-waves.
// Current convention: merge in the order sub-waves were declared in the plan
// (no explicit `Depends:` declaration yet). Shared sub-waves are skipped since
// they already committed to the parent branch.
export function mergeOrder(manifest) {
  return manifest
    .filter((m) => m.mode === 'worktree')
    .map((m) => m.id);
}

function idOf(sw) { return sw.sub || sw.wave; }

function intersects(a, b) {
  if (a.length === 0 || b.length === 0) return false;
  const set = new Set(a);
  for (const f of b) if (set.has(f)) return true;
  return false;
}
