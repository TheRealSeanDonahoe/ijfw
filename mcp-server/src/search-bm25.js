// BM25 search over memory files (W3.1 / H4).
// Pure-JS Okapi BM25 (k1=1.2, b=0.75). FTS5-equivalent ranking + phrase
// matching without a native SQLite dependency. Linear-scan at query time;
// scales to ~10k entries before an inverted-index cache would pay off.

const STOPWORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','do','does','did',
  'of','in','on','at','to','for','with','by','from','as','that','this','it',
  'and','or','but','if','so','not','no','yes','we','i','you','they','he','she',
]);

export function tokenize(s) {
  if (typeof s !== 'string' || !s) return [];
  return s.toLowerCase()
    .replace(/[^a-z0-9_\-.\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t && t.length >= 2 && !STOPWORDS.has(t));
}

function extractPhrases(query) {
  const phrases = [];
  const re = /"([^"]+)"/g;
  let m;
  while ((m = re.exec(query)) !== null) phrases.push(m[1].toLowerCase());
  return phrases;
}

// Okapi BM25 over a document array.
//   docs: [{ id, text, meta? }]
//   returns [{ id, score, meta, snippet }]
export function searchCorpus(query, docs, opts = {}) {
  const k1 = opts.k1 ?? 1.2;
  const b = opts.b ?? 0.75;
  const limit = opts.limit ?? 10;
  if (!query || !docs || docs.length === 0) return [];

  const phrases = extractPhrases(query);
  const qBare = query.replace(/"[^"]+"/g, ' ');
  const qTokens = tokenize(qBare);
  if (qTokens.length === 0 && phrases.length === 0) return [];

  const docTokens = docs.map(d => tokenize(d.text));
  const docLens = docTokens.map(ts => ts.length);
  const avgDl = docLens.reduce((s, n) => s + n, 0) / Math.max(1, docLens.length);

  const df = new Map();
  for (const t of qTokens) {
    if (df.has(t)) continue;
    let n = 0;
    for (const doc of docTokens) if (doc.includes(t)) n++;
    df.set(t, n);
  }
  const N = docs.length;

  const scored = [];
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const lowerText = doc.text.toLowerCase();
    let phraseOk = true;
    for (const p of phrases) {
      if (!lowerText.includes(p)) { phraseOk = false; break; }
    }
    if (!phraseOk) continue;

    const dLen = docLens[i];
    let score = 0;
    const tf = new Map();
    for (const t of docTokens[i]) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of qTokens) {
      const f = tf.get(t);
      if (!f) continue;
      const n = df.get(t) || 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      const denom = f + k1 * (1 - b + (b * dLen) / (avgDl || 1));
      score += idf * ((f * (k1 + 1)) / denom);
    }
    for (const p of phrases) {
      const phraseTokens = tokenize(p);
      for (const t of phraseTokens) {
        const n = df.get(t) ?? docTokens.reduce((s, d) => s + (d.includes(t) ? 1 : 0), 0);
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        score += idf * 0.5;
      }
    }
    if (score > 0) {
      scored.push({ id: doc.id, score, meta: doc.meta, snippet: snippet(doc.text, qTokens, 160) });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function snippet(text, qTokens, width) {
  if (!text) return '';
  const lower = text.toLowerCase();
  let bestPos = -1;
  for (const t of qTokens) {
    const p = lower.indexOf(t);
    if (p >= 0 && (bestPos < 0 || p < bestPos)) bestPos = p;
  }
  if (bestPos < 0) return text.slice(0, width).replace(/\s+/g, ' ');
  const start = Math.max(0, bestPos - 40);
  const end = Math.min(text.length, start + width);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return prefix + text.slice(start, end).replace(/\s+/g, ' ') + suffix;
}
