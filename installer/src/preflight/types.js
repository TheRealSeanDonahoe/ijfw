// JSDoc type definitions for the preflight pipeline.

/**
 * @typedef {'PASS'|'FAIL'|'WARN'|'SKIP'} GateStatus
 */

/**
 * @typedef {Object} GateResult
 * @property {string} name       - Gate identifier (e.g. 'shellcheck')
 * @property {GateStatus} status
 * @property {string} message    - Human-readable one-liner
 * @property {string[]} details  - Extra lines (findings, hints)
 * @property {number} durationMs
 */

/**
 * @typedef {Object} Gate
 * @property {string} name
 * @property {'blocking'|'warn'} severity
 * @property {boolean} [parallel]  - safe to run in parallel with other parallel gates
 * @property {(ctx: PreflightCtx) => Promise<GateResult>} run
 */

/**
 * @typedef {Object} PreflightCtx
 * @property {string} repoRoot
 * @property {Record<string, string>} versions   - pinned tool versions
 * @property {boolean} json                      - --json flag
 * @property {boolean} failFast                  - --fail-fast flag
 */

/**
 * @typedef {Object} PreflightReport
 * @property {string} version
 * @property {string} timestamp
 * @property {GateResult[]} gates
 * @property {'pass'|'fail'} outcome
 * @property {number} totalMs
 */

export {};
