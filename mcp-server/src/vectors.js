// --- Vector embeddings (W3.3 / H5a-b-c) ---
//
// Thin wrapper around @xenova/transformers. Lazily imports the library on
// first use so the zero-deps default install path is unaffected — users who
// don't enable vectors never pay the ~5MB bundle cost, and the 23MB model
// download only happens when the first embedding query fires.
//
// Environment control:
//   IJFW_VECTORS=off  — disable vectors entirely (BM25-only)
//   IJFW_VECTORS=on   — enable (default if the library is present)
//   IJFW_VECTORS_MODEL — override the embedding model (default: Xenova/all-MiniLM-L6-v2, ~23MB)
//
// Fallback: if @xenova/transformers isn't installed, vectors silently
// disable and callers get an `{ available: false, reason }` from getEmbedder().

const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2';

// X3/S8 — model integrity pin. When IJFW_VECTORS_MODEL_SHA256 is set, we
// SHA-256 the loaded model.onnx after download and refuse the embedder if
// the hash doesn't match. Empty (default) allows any — documented as opt-in
// in NO_TELEMETRY.md. Implemented in Phase 6 after the audit found the var
// was read but never enforced.

let _pipelinePromise = null;

async function verifyModelSha(env, modelId) {
  const expected = process.env.IJFW_VECTORS_MODEL_SHA256;
  if (!expected) return { ok: true };
  try {
    const { createReadStream } = await import('node:fs');
    const { createHash } = await import('node:crypto');
    const { join: pjoin } = await import('node:path');
    // transformers.js caches to env.cacheDir (default ~/.cache/huggingface/).
    const cacheDir = env.cacheDir || (process.env.HOME ? pjoin(process.env.HOME, '.cache', 'huggingface') : '');
    if (!cacheDir) return { ok: false, reason: 'no-cache-dir-for-hash-verification' };
    const modelPath = pjoin(cacheDir, modelId.replace('/', '_'), 'onnx', 'model.onnx');
    await new Promise((resolve, reject) => {
      const h = createHash('sha256');
      const s = createReadStream(modelPath);
      s.on('error', reject);
      s.on('data', (c) => h.update(c));
      s.on('end', () => {
        const got = h.digest('hex');
        if (got === expected.toLowerCase()) resolve();
        else reject(new Error(`sha256 mismatch: expected ${expected}, got ${got}`));
      });
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: `sha-verify-failed: ${e.message}` };
  }
}

async function loadPipeline() {
  if (_pipelinePromise) return _pipelinePromise;
  _pipelinePromise = (async () => {
    try {
      const lib = await import('@xenova/transformers');
      const { pipeline, env } = lib;
      // Models cache locally under $XDG_CACHE_HOME or ~/.cache/xenova/.
      env.localModelPath = process.env.IJFW_VECTORS_CACHE || undefined;
      env.allowRemoteModels = true;
      const model = process.env.IJFW_VECTORS_MODEL || DEFAULT_MODEL;
      const extractor = await pipeline('feature-extraction', model);
      // X3/S8 — verify pinned SHA256 after load (post-download if remote).
      const sha = await verifyModelSha(env, model);
      if (!sha.ok) return { ok: false, reason: sha.reason };
      return { ok: true, extractor, model };
    } catch (e) {
      return { ok: false, reason: e.code === 'ERR_MODULE_NOT_FOUND'
        ? 'transformers-not-installed'
        : `load-failed: ${e.message}` };
    }
  })();
  return _pipelinePromise;
}

export function vectorsEnabled() {
  const v = (process.env.IJFW_VECTORS || 'on').toLowerCase();
  return v !== 'off' && v !== '0' && v !== 'false';
}

// Returns { available: true, embed(text) → Float32Array } or
//         { available: false, reason }.
export async function getEmbedder() {
  if (!vectorsEnabled()) return { available: false, reason: 'disabled-by-env' };
  const loaded = await loadPipeline();
  if (!loaded.ok) return { available: false, reason: loaded.reason };
  return {
    available: true,
    model: loaded.model,
    embed: async (text) => {
      const out = await loaded.extractor(text, { pooling: 'mean', normalize: true });
      return Array.from(out.data);
    },
  };
}

// Cosine similarity on two equal-length Float32 arrays (or plain arrays).
// Both inputs should already be L2-normalized (our embedder's normalize: true
// guarantees that) so this reduces to a dot product.
export function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// Hybrid rerank: BM25 scores + vector cosine. Mixes with weights.
//   bm25Results: [{ id, score, ... }]
//   vectorMatches: Map<id, cosine>
// Returns merged, resorted list.
export function hybridRerank(bm25Results, vectorScores, opts = {}) {
  const wBm25 = opts.wBm25 ?? 0.6;
  const wVec = opts.wVec ?? 0.4;
  // Normalize BM25 scores to 0..1 by dividing by max.
  const maxB = Math.max(0.0001, ...bm25Results.map(r => r.score));
  return bm25Results
    .map(r => {
      const vec = vectorScores.get(r.id) ?? 0;
      const merged = (r.score / maxB) * wBm25 + vec * wVec;
      return { ...r, bm25_score: r.score, vector_score: vec, score: merged };
    })
    .sort((a, b) => b.score - a.score);
}
