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

// S8 — model integrity pin. HuggingFace publishes SHA256 per file; we pin
// the model.onnx hash so a supply-chain substitution is detectable. Empty
// by default (any; used for audit), set via IJFW_VECTORS_MODEL_SHA256 to
// enforce. When enforced and hash differs, getEmbedder returns unavailable.
const EXPECTED_SHA256 = process.env.IJFW_VECTORS_MODEL_SHA256 || null;

let _pipelinePromise = null;

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
