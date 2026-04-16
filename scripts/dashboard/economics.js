#!/usr/bin/env node
/**
 * IJFW Dashboard -- Context Economics calculator.
 * Computes token savings from the observation index vs work investment.
 * Pure function. No I/O, no deps.
 */

// Approximate tokens per observation record when loaded (title + metadata).
const TOKENS_PER_OBS = 40;

// Approximate tokens per work-investment unit (each full tool invocation).
const TOKENS_PER_WORK_EVENT = 800;

/**
 * Compute economics block from observation array.
 *
 * @param {object[]} observations
 * @returns {{ loadCost: number, workInvestment: number, savingsPct: number }}
 */
export function computeEconomics(observations) {
  const obs = observations || [];

  // Load cost: reading the semantic index (title, type, files) for each obs.
  const loadCost = obs.length * TOKENS_PER_OBS;

  // Work investment: tokens spent producing each observation.
  // Use token_cost field when available; fall back to heuristic.
  let workInvestment = 0;
  for (const o of obs) {
    const explicit = (o.token_cost || 0) + (o.work_tokens || 0);
    workInvestment += explicit > 0 ? explicit : TOKENS_PER_WORK_EVENT;
  }

  // Savings %: how much cheaper re-using the index vs re-doing the work.
  const savingsPct = workInvestment > 0
    ? Math.round((1 - loadCost / workInvestment) * 100)
    : 0;

  return { loadCost, workInvestment, savingsPct: Math.max(0, savingsPct) };
}
