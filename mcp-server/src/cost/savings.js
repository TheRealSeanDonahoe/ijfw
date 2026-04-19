/**
 * IJFW cost/savings.js
 * Computes savings from token usage + observation data.
 *
 * Savings categories (conservative, defensible):
 *   cache    -- cache_read_tokens * in_price * 0.9  (90% discount vs fresh input)
 *              SOURCE: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
 *              CONFIDENCE: high -- measured from Claude's JSONL, real token counts.
 *              Only from non-estimated turns (Codex/Gemini estimates excluded).
 *
 *   memory   -- per FIRST recall of each file per session: tokens * in_price
 *              SOURCE: ijfw_memory_recall MCP tool fires + memory file sizes
 *              CONFIDENCE: medium -- assumes user would otherwise paste context manually.
 *              Only counts first recall per file per session (subsequent recals are
 *              already in the prompt cache, so no additional savings).
 *
 *   trident  -- HIGH findings closed pre-ship * $5 (conservative rework estimate)
 *              SOURCE: cross-audit observation records (deduplicated by finding id)
 *              CONFIDENCE: medium -- $5 is conservative; rework cost studies cite
 *              $15-$75 per bug found post-ship vs pre-ship (McConnell, Code Complete).
 *              Capped at 20 per week to prevent runaway from stale/duplicate records.
 *
 *   terse    -- REMOVED. The 1.4x multiplier was a made-up heuristic with no
 *              baseline data. Removed for honesty.
 *
 * All values are non-negative. Returns structured objects with confidence metadata.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { getPricing } from './pricing.js';

// Conservative estimate: tokens in a memory file that would have been re-pasted
const MEMORY_RECALL_CONTEXT_TOKENS = 800;

// Conservative: $5 per HIGH finding pre-ship (rework cost studies cite $15-$75)
const TRIDENT_FINDING_VALUE = 5.0;

// Sanity cap: no more than 20 trident HIGH findings credited per week
const TRIDENT_WEEKLY_CAP = 20;

/**
 * Compute savings for a set of turns.
 * @param {Array} turns - from aggregator (each has platform, model, token fields)
 * @param {Array} observations - from observations.jsonl (for memory + trident events)
 * @returns structured savings object with value + metadata per component
 */
export function computeSavings(turns, observations = []) {
  // Cache savings: ONLY from non-estimated turns (real measured token counts)
  let cacheSavingsValue = 0;
  for (const turn of turns) {
    if (turn.estimated) continue; // exclude Codex/Gemini char-estimated data
    const p = getPricing(turn.model);
    cacheSavingsValue += (turn.cache_read_tokens || 0) * p.in * 0.9;
  }
  cacheSavingsValue = Math.max(0, cacheSavingsValue);

  // Memory recall savings: count only FIRST recall per file per session
  const recallObs = (observations || []).filter(o =>
    (o.tool_name || '').includes('ijfw_memory_recall') ||
    (o.tool_name || '').includes('memory_recall') ||
    (o.title    || '').toLowerCase().includes('memory recall')
  );

  // Deduplicate: first recall per (session_id, file_path or title) combination
  const seenRecalls = new Set();
  let uniqueRecalls = 0;
  for (const obs of recallObs) {
    const key = `${obs.session_id || 'session'}:${obs.file_path || obs.title || obs.id}`;
    if (!seenRecalls.has(key)) {
      seenRecalls.add(key);
      uniqueRecalls++;
    }
  }

  // Price memory savings at the most recent Claude turn's rate
  const claudeTurns = turns.filter(t => t.platform === 'claude' && !t.estimated);
  const latestModel = claudeTurns.length ? claudeTurns[claudeTurns.length - 1].model : 'claude-sonnet-4-5';
  const recallPrice = getPricing(latestModel);
  const memorySavingsValue = Math.max(0, uniqueRecalls * MEMORY_RECALL_CONTEXT_TOKENS * recallPrice.in);

  // Trident savings: deduplicated HIGH findings, capped at weekly max
  const tridentHighObs = (observations || []).filter(o =>
    ((o.type || '') === 'decision' || (o.title || '').toLowerCase().includes('trident')) &&
    (o.title || '').toLowerCase().includes('high')
  );

  // Deduplicate by finding_id if present, else by title
  const seenFindings = new Set();
  let uniqueHighFindings = 0;
  for (const obs of tridentHighObs) {
    const key = obs.finding_id || obs.id || obs.title || String(uniqueHighFindings);
    if (!seenFindings.has(key)) {
      seenFindings.add(key);
      uniqueHighFindings++;
    }
  }
  const cappedFindings = Math.min(uniqueHighFindings, TRIDENT_WEEKLY_CAP);
  const tridentSavingsValue = Math.max(0, cappedFindings * TRIDENT_FINDING_VALUE);

  const total = cacheSavingsValue + memorySavingsValue + tridentSavingsValue;

  // Cache hit rate for display (measured turns only)
  const measuredTurns = turns.filter(t => !t.estimated);
  const totalCacheRead = measuredTurns.reduce((s, t) => s + (t.cache_read_tokens || 0), 0);
  const totalInput     = measuredTurns.reduce((s, t) => s + (t.input_tokens || 0), 0);
  const hitRateDenom   = totalInput + totalCacheRead;
  const hitRatePct     = hitRateDenom > 0
    ? (totalCacheRead / hitRateDenom * 100).toFixed(1) + '%'
    : null;

  return {
    cache: {
      value: cacheSavingsValue,
      confidence: 'high',
      source: 'anthropic-pricing-docs',
      attribution: 'claude-code-automatic-caching',
      description: 'Cache-read tokens would have cost 10x more at full input price. Claude Code caches automatically; IJFW measures the effect.',
      note: 'Excludes estimated Codex/Gemini data. Real Claude JSONL only.',
      displayPrimary: hitRatePct,
      displaySecondary: cacheSavingsValue > 0
        ? '$' + cacheSavingsValue.toFixed(2) + ' at full input pricing'
        : null,
    },
    memory: {
      value: memorySavingsValue,
      confidence: 'medium',
      attribution: 'ijfw',
      description: `First recall per file per session * ${MEMORY_RECALL_CONTEXT_TOKENS} tokens * input_price`,
      source: 'ijfw_memory_recall MCP tool observations',
      note: 'Assumes user would otherwise re-paste context. Only first recall per file credited.',
    },
    trident: {
      value: tridentSavingsValue,
      confidence: 'medium',
      attribution: 'ijfw',
      description: `Unique HIGH findings pre-ship * $${TRIDENT_FINDING_VALUE} (capped at ${TRIDENT_WEEKLY_CAP}/week)`,
      source: 'cross-audit observation records (deduplicated by finding_id)',
      note: 'McConnell (Code Complete): pre-ship bug cost $5-$75 vs post-ship rework.',
    },
    // terse savings intentionally omitted -- no defensible baseline
    total,
  };
}

/**
 * Return the methodology for the /api/savings/methodology endpoint.
 */
export function getSavingsMethodology() {
  return {
    version: '2',
    updated: '2026-04-16',
    note: 'Conservative, defensible formulas. Terse savings removed (no baseline data).',
    components: {
      cache: {
        formula: 'cache_read_tokens * input_price * 0.9',
        confidence: 'high',
        source: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching',
        assumption: 'Each cached read saves 90% of what fresh input would cost (Anthropic pricing).',
        dataQuality: 'Measured -- real token counts from Claude JSONL. Estimated Codex/Gemini data excluded.',
      },
      memory: {
        formula: 'unique_first_recalls * 800 tokens * input_price',
        confidence: 'medium',
        source: 'ijfw_memory_recall MCP tool observation records',
        assumption: 'User would otherwise paste 800-token context manually. First recall per file per session only (subsequent recalls already cached).',
        dataQuality: 'Estimated -- recall count is measured, token size is conservative estimate.',
      },
      trident: {
        formula: 'unique_HIGH_findings * $5.00 (cap: 20/week)',
        confidence: 'medium',
        source: 'cross-audit observation records',
        assumption: '$5 conservative rework estimate per HIGH finding caught pre-ship. McConnell (Code Complete) cites $15-$75 range; we use the floor.',
        dataQuality: 'Estimated -- finding count is measured, dollar value is a conservative fixed estimate.',
      },
      terse: {
        formula: 'REMOVED',
        confidence: 'none',
        reason: 'Previous formula used a 1.4x baseline multiplier with no empirical basis. Removed for honesty. Will revisit when baseline A/B data is available.',
      },
    },
  };
}

/**
 * Compute subscription value-delivered and ROI for a configured tier.
 *
 * For subscription users, per-token prices are sunk cost -- "saved via cache" is
 * meaningless. What matters is PAYG-equivalent value received vs flat monthly fee.
 *
 * @param {object} tier - { tier, price_monthly_usd } from config.subscriptions
 * @param {Array} turns - annotated turns from aggregator (must have cost_usd)
 * @param {number} periodDays - days in the measurement window (default 7)
 * @returns {{ payg_equivalent, value_delivered, roi, utilization, framing, is_subscription }}
 */
export function computeValueDelivered(tier, turns, periodDays = 7) {
  if (!tier || !Array.isArray(turns)) {
    return { payg_equivalent: 0, value_delivered: 0, roi: null, utilization: null, framing: 'unconfigured', is_subscription: false };
  }

  const isSubscription = tier.tier !== 'payg' && tier.price_monthly_usd > 0;
  const payg_equivalent = turns.reduce((s, t) => s + (t.cost_usd || 0), 0);

  if (!isSubscription) {
    return { payg_equivalent, value_delivered: 0, roi: null, utilization: null, framing: 'payg', is_subscription: false };
  }

  // Pro-rate monthly price to the measurement window
  const daily_price = tier.price_monthly_usd / 30;
  const window_price = daily_price * periodDays;

  const roi = window_price > 0 ? payg_equivalent / window_price : null;
  const utilization = window_price > 0 ? Math.min(2.0, payg_equivalent / window_price) : null;
  const value_delivered = Math.max(0, payg_equivalent - window_price);

  return {
    payg_equivalent,
    value_delivered,
    roi,
    utilization,
    framing: 'delivered',
    is_subscription: true,
    window_price,
  };
}

/**
 * Load observations.jsonl from the default IJFW path.
 */
export function loadObservations(ledgerPath) {
  const path = ledgerPath || join(homedir(), '.ijfw', 'observations.jsonl');
  if (!existsSync(path)) return [];
  try {
    return readFileSync(path, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch {
    return [];
  }
}
