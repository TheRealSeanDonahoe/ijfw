/**
 * test-cost-savings.js
 * Savings formula tests with synthetic data.
 * Updated for v2 conservative formulas: terse removed, structured savings objects.
 */

import { computeSavings, getSavingsMethodology } from './src/cost/savings.js';
import { computeCost, getPricing } from './src/cost/pricing.js';

let pass = 0, fail = 0;
function ok(label, cond, detail) {
  if (cond) {
    console.log('  ok ' + label);
    pass++;
  } else {
    console.error('  FAIL ' + label + (detail !== undefined ? ' -- got: ' + detail : ''));
    fail++;
  }
}
function approx(a, b, tol = 0.00001) { return Math.abs(a - b) < tol; }

// ---- pricing tests ----
console.log('\n-- pricing --');
{
  const p = getPricing('claude-sonnet-4-5');
  ok('claude-sonnet-4-5 has in price',  p.in > 0,   p.in);
  ok('claude-sonnet-4-5 has out price', p.out > 0,  p.out);
  ok('cache_read < in',                 p.cache_read < p.in);
  ok('cache_create_5m > in',            p.cache_create_5m > p.in);
  ok('cache_create_1h > cache_create_5m', p.cache_create_1h > p.cache_create_5m);

  // Unknown model should not crash
  const unk = getPricing('mystery-model-9999');
  ok('unknown model returns fallback',  unk.in > 0);
}

// ---- computeCost tests ----
console.log('\n-- computeCost --');
{
  const model = 'claude-sonnet-4-5';
  const p = getPricing(model);

  // Pure input tokens
  const c1 = computeCost(model, { input_tokens: 1000, output_tokens: 0 });
  ok('input-only cost', approx(c1, 1000 * p.in), c1);

  // Cache read: should be cheaper than same tokens as input
  const c2 = computeCost(model, { input_tokens: 0, cache_read_tokens: 1000 });
  const c3 = computeCost(model, { input_tokens: 1000 });
  ok('cache_read cheaper than fresh input', c2 < c3);

  // 5m cache create: 1.25x input
  const c4 = computeCost(model, { cache_create_tokens_5m: 1000 });
  ok('cache_create_5m is 1.25x input', approx(c4, 1000 * p.in * 1.25, 1e-9), c4);

  // 1h cache create: 2x input
  const c5 = computeCost(model, { cache_create_tokens_1h: 1000 });
  ok('cache_create_1h is 2x input', approx(c5, 1000 * p.in * 2.0, 1e-9), c5);
}

// ---- computeSavings tests ----
console.log('\n-- computeSavings --');
{
  const model = 'claude-sonnet-4-5';
  const p = getPricing(model);

  const turns = [
    {
      platform: 'claude', model,
      input_tokens: 2000, output_tokens: 500,
      cache_create_tokens_5m: 1000, cache_create_tokens_1h: 500,
      cache_read_tokens: 8000,
      cost_usd: computeCost(model, { input_tokens: 2000, output_tokens: 500,
        cache_create_tokens_5m: 1000, cache_create_tokens_1h: 500, cache_read_tokens: 8000 }),
    },
  ];

  const s1 = computeSavings(turns, []);
  ok('cache.value > 0', s1.cache.value > 0, s1.cache.value);
  const expectedCache = 8000 * p.in * 0.9;
  ok('cache.value = cache_read * in * 0.9', approx(s1.cache.value, expectedCache, 1e-8), s1.cache.value);
  ok('cache confidence is high', s1.cache.confidence === 'high', s1.cache.confidence);
  ok('total >= cache.value', s1.total >= s1.cache.value - 1e-10);
  // Attribution: cache savings are from Claude Code, not IJFW
  ok('cache attribution is claude-code-automatic-caching', s1.cache.attribution === 'claude-code-automatic-caching', s1.cache.attribution);
  ok('cache has description', typeof s1.cache.description === 'string' && s1.cache.description.length > 0);
  ok('cache displayPrimary is hit rate string', typeof s1.cache.displayPrimary === 'string', s1.cache.displayPrimary);
  ok('cache displaySecondary includes dollar figure', typeof s1.cache.displaySecondary === 'string' && s1.cache.displaySecondary.includes('$'), s1.cache.displaySecondary);

  // terse savings REMOVED -- assert it is NOT present
  ok('terse savings removed from output', !('terse' in s1), Object.keys(s1).join(','));

  // Memory savings from observation records -- first recall per file per session
  const obs = [
    { id: 1, session_id: 'sess1', tool_name: 'ijfw_memory_recall', title: 'memory_file_a.md', type: 'note' },
    { id: 2, session_id: 'sess1', tool_name: 'ijfw_memory_recall', title: 'memory_file_a.md', type: 'note' }, // duplicate -- same file same session
    { id: 3, session_id: 'sess2', tool_name: 'ijfw_memory_recall', title: 'memory_file_a.md', type: 'note' }, // different session -- counts
  ];
  const s2 = computeSavings(turns, obs);
  ok('memorySavings > 0 with recalls', s2.memory.value > 0, s2.memory.value);
  // Should count 2 unique (sess1:file_a + sess2:file_a), not 3
  const expectedMemory2 = 2 * 800 * p.in;
  ok('memory deduplication: 2 unique recalls counted', approx(s2.memory.value, expectedMemory2, 1e-9), s2.memory.value);
  ok('memory confidence is medium', s2.memory.confidence === 'medium', s2.memory.confidence);
  ok('memory attribution is ijfw', s2.memory.attribution === 'ijfw', s2.memory.attribution);

  // Trident savings -- deduplication
  const tridentObs = [
    { id: 3, finding_id: 'FIND-001', type: 'decision', title: 'trident HIGH finding closed pre-ship' },
    { id: 4, finding_id: 'FIND-001', type: 'decision', title: 'trident HIGH finding closed pre-ship' }, // duplicate
    { id: 5, finding_id: 'FIND-002', type: 'decision', title: 'trident HIGH finding closed pre-ship' },
  ];
  const s3 = computeSavings(turns, tridentObs);
  ok('trident deduplication: 2 unique findings = $10', approx(s3.trident.value, 10.0), s3.trident.value);
  ok('trident confidence is medium', s3.trident.confidence === 'medium', s3.trident.confidence);
  ok('trident attribution is ijfw', s3.trident.attribution === 'ijfw', s3.trident.attribution);

  // Trident weekly cap at 20
  const manyFindings = Array.from({ length: 30 }, (_, i) => ({
    id: i, finding_id: `FIND-${i}`, type: 'decision', title: 'trident HIGH finding closed pre-ship',
  }));
  const s3b = computeSavings(turns, manyFindings);
  ok('trident capped at 20/week = $100', approx(s3b.trident.value, 100.0), s3b.trident.value);

  // No negative savings
  const s4 = computeSavings([], []);
  ok('zero turns produces zero savings, not negative', s4.total >= 0, s4.total);
  ok('zero turns cache value is zero', s4.cache.value === 0, s4.cache.value);

  // CRITICAL: estimated turns (Codex/Gemini) MUST NOT contribute to cache savings
  const estimatedTurns = [{
    platform: 'codex', model: 'gpt-4o',
    input_tokens: 5000, output_tokens: 1000,
    cache_read_tokens: 1000, // fabricated -- should be excluded
    estimated: true,
  }];
  const s5 = computeSavings(estimatedTurns, []);
  ok('estimated turns excluded from cache savings', s5.cache.value === 0, s5.cache.value);

  // Mixed: estimated + real -- only real contributes to cache savings
  const mixedTurns = [
    { platform: 'claude', model, input_tokens: 100, output_tokens: 50, cache_read_tokens: 5000, estimated: false },
    { platform: 'codex', model: 'gpt-4o', input_tokens: 5000, output_tokens: 1000, cache_read_tokens: 9000, estimated: true },
  ];
  const s6 = computeSavings(mixedTurns, []);
  const expectedMixed = 5000 * p.in * 0.9;
  ok('mixed turns: only real claude cache_read counts', approx(s6.cache.value, expectedMixed, 1e-8), s6.cache.value);

  // SANITY CAP: savings.total should not exceed 2x actual cost
  // (any result where savings > 2x cost flags a formula problem)
  const realTurns = [
    { platform: 'claude', model, input_tokens: 1000, output_tokens: 500, cache_read_tokens: 2000,
      cost_usd: computeCost(model, { input_tokens: 1000, output_tokens: 500, cache_read_tokens: 2000 }) },
  ];
  const s7 = computeSavings(realTurns, []);
  const s7Cost = realTurns.reduce((sum, t) => sum + t.cost_usd, 0);
  ok('sanity cap: savings <= 2x cost for normal usage', s7.total <= s7Cost * 2 + 0.001, `savings=${s7.total.toFixed(6)} cost=${s7Cost.toFixed(6)}`);
}

// ---- methodology ----
console.log('\n-- methodology --');
{
  const m = getSavingsMethodology();
  ok('methodology has version', typeof m.version === 'string');
  ok('methodology has cache component', m.components.cache && m.components.cache.confidence === 'high');
  ok('methodology has memory component', m.components.memory && m.components.memory.confidence === 'medium');
  ok('methodology has trident component', m.components.trident && m.components.trident.confidence === 'medium');
  ok('methodology marks terse as REMOVED', m.components.terse.formula === 'REMOVED');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
