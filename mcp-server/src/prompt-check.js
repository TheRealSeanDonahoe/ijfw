/**
 * IJFW prompt-check -- deterministic vague-prompt detector.
 *
 * Pure functions, no I/O. Safe to call from MCP tool handler or import into
 * a hook script. Returns { vague, signals, suggestion, bypass_reason? }.
 *
 * Design constraints (per AUDIT.md):
 *   - No LLM calls, no network. Pure regex.
 *   - Fire only when >=2 signals trip AND prompt is short AND has no target.
 *   - Single-signal trips are silent (low FP rate).
 *   - Override: leading `*` or substring "ijfw off" bypasses entirely.
 *   - Positive framing in any user-visible suggestion.
 */

// 7-rule vagueness taxonomy from research (rule 3).
const RULES = [
  {
    id: 'bare_verb',
    // Bare imperative + no object. Token count <6 reduces FP on real questions.
    test: (text) => {
      const t = text.trim().toLowerCase();
      const tokens = t.split(/\s+/);
      if (tokens.length >= 6) return false;
      return /^(fix|refactor|improve|clean\s*up|optimi[sz]e|update|review|check|test|debug|analy[sz]e|handle|sort\s*out|tidy)\b/.test(t);
    }
  },
  {
    id: 'unresolved_anaphora',
    // "this/that/it" sentence-start. Hook can't see prior turns reliably,
    // so this is heuristic -- combined with no_target it's a strong signal.
    test: (text) => /^(this|that|it|these|those|the\s+(bug|issue|file|code|function|error|problem))\b/i.test(text.trim())
  },
  {
    id: 'abstract_goal',
    // "make it better" / "production-ready" / etc. without acceptance criteria.
    test: (text) => {
      const hasAbstract = /\b(better|cleaner|nicer|more\s+robust|production[\s-]?ready|proper|correct|good|nice|right)\b/i.test(text);
      if (!hasAbstract) return false;
      // Mitigates: contains a metric or test/path reference.
      const hasMetric = /\d+\s*(ms|%|x|kb|mb|sec|s\b|tests?\b|users?\b)/i.test(text);
      const hasPath = /[\w./-]+\.\w{1,5}(\b|:)|src\/|tests?\//i.test(text);
      return !hasMetric && !hasPath;
    }
  },
  {
    id: 'no_target',
    // No file path, no identifier (CamelCase / snake_case >=2 chars), no line number.
    test: (text) => {
      if (/[\w./-]+\.\w{1,5}(\b|:)/.test(text)) return false;       // file path
      if (/:\d+/.test(text)) return false;                           // line number
      if (/\b(src|lib|app|tests?|spec|docs?)\//i.test(text)) return false; // dir
      // Identifier: snake_case, UpperCamelCase, or lowerCamelCase (>=2 segments)
      if (/\b([a-z]+_[a-z][\w_]*|[A-Z][a-z]+[A-Z]\w*|[a-z]+[A-Z]\w*)\b/.test(text)) return false;
      return true;
    }
  },
  {
    id: 'scope_plural',
    test: (text) => /\b(the\s+tests|all\s+the\s+(things|stuff|files)|everything|stuff|things)\b/i.test(text)
  },
  {
    id: 'polysemous',
    // Bare polysemous coding terms standing alone (no object/qualifier).
    test: (text) => {
      const t = text.trim().toLowerCase();
      return /^(source|build|run|deploy|ship|release|setup|set\s*up)\.?\s*$/.test(t);
    }
  },
  {
    id: 'missing_constraint',
    // No constraint terms AND no numeric threshold AND text is non-trivial.
    test: (text) => {
      if (text.trim().split(/\s+/).length < 4) return false; // very short = skip rule
      const hasConstraint = /\b(must|should|when|if|until|without|only|always|never|except)\b/i.test(text);
      const hasNumber = /\b\d+\b/.test(text);
      return !hasConstraint && !hasNumber;
    }
  }
];

// Bypass conditions -- match severity1 plugin convention plus IJFW override.
function bypassReason(text) {
  if (typeof text !== 'string') return 'non-string';
  const t = text.trim();
  if (t.length === 0) return 'empty';
  if (t.startsWith('*'))  return 'asterisk-prefix';
  if (t.startsWith('/'))  return 'slash-command';
  if (t.startsWith('#'))  return 'memorize-prefix';
  if (/\bijfw\s+off\b/i.test(t)) return 'override-keyword';
  // Pasted code/stack trace (very long or fenced) -- assume user knows the target.
  if (t.length > 4000) return 'long-prompt';
  if (/^```/m.test(t))  return 'fenced-code';
  return null;
}

function checkPrompt(text) {
  const bypass = bypassReason(text);
  if (bypass) {
    return { vague: false, signals: [], suggestion: '', bypass_reason: bypass };
  }

  const tokens = text.trim().split(/\s+/);
  const signals = [];
  for (const rule of RULES) {
    try {
      if (rule.test(text)) signals.push(rule.id);
    } catch { /* never break the hook */ }
  }

  // Fire only when >=2 signals tripped AND prompt is short AND no target found.
  // Threshold tuned for low false-positive rate per research (UX section).
  const short = tokens.length < 30;
  const noTarget = signals.includes('no_target');
  const vague = signals.length >= 2 && short && noTarget;

  // Positive-framed suggestion. Never says "your prompt is vague."
  let suggestion = '';
  if (vague) {
    if (signals.includes('bare_verb') && noTarget) {
      suggestion = 'Sharpening your aim -- which file, function, or symbol? e.g. src/auth.py:145, getUserById, the failing test name.';
    } else if (signals.includes('unresolved_anaphora')) {
      suggestion = 'Anchoring the reference -- which file or recent code do you mean?';
    } else {
      suggestion = 'Pinning the target -- naming the file, symbol, or expected behavior will sharpen the edit.';
    }
  }

  // W2.2/A2 -- structured question pack the agent can surface verbatim
  // when vague. Each question maps to a signal that fired. Keeps to
  // ≤3 questions (Krug: don't make me answer 10).
  const rewrite = vague ? buildQuestionPack(signals) : null;

  return { vague, signals, suggestion, rewrite };
}

// Map signals → clarifying questions, deduped and capped at 3.
function buildQuestionPack(signals) {
  const qs = [];
  const seen = new Set();
  const add = (q) => { if (!seen.has(q)) { seen.add(q); qs.push(q); } };
  for (const sig of signals) {
    if (qs.length >= 3) break;
    switch (sig) {
      case 'bare_verb':
      case 'no_target':
        add('Which file, function, or line number is the target?');
        break;
      case 'unresolved_anaphora':
        add('What does "this/that" refer to -- a file, a symptom, a prior message?');
        break;
      case 'abstract_goal':
        add('What specifically would "done" look like -- a metric, a test passing, or observable behavior?');
        break;
      case 'scope_plural':
        add('Which of "all the X" -- do you want every instance, or a specific subset?');
        break;
      case 'missing_constraint':
        add('Any constraints I should respect -- don\'t touch X, must run in <Y ms, preserve behavior Z?');
        break;
      case 'polysemous':
        add('Which meaning -- e.g. "deploy" could mean build, release, push, or run locally?');
        break;
    }
  }
  if (qs.length === 0) {
    qs.push('What file, function, or acceptance criterion pins the target?');
  }
  return qs.slice(0, 3);
}

export { checkPrompt, RULES, bypassReason, buildQuestionPack };
