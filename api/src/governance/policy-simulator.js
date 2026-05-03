'use strict';
/**
 * PolicySimulator — PLGS Sprint 2
 * ==================================
 *
 * // STUB — Sprint 3 replaces this with a real rule-replay engine.
 * // This stub generates deterministic pseudo-random metrics derived
 * // from the policy's id and rules, producing realistic-looking
 * // simulation output without executing against live data.
 *
 * simulate(policy, options) accepts { sampleSize: number } in options.
 * Returns a simulation_result JSONB object suitable for storing in the
 * policies.simulation_result column.
 *
 * APPROVE threshold:  decisions_changed_pct < 10  AND  false_positive_rate < 0.05
 * REVIEW  threshold:  anything outside APPROVE bounds
 */

const crypto = require('crypto');

// STUB — Sprint 3 replaces this ─────────────────────────────────────────────
function deterministicFloat(seed, salt, min, max) {
  const h = crypto.createHash('sha256')
    .update(seed + ':' + salt)
    .digest();
  const fraction = h.readUInt32BE(0) / 0xffffffff;
  return min + fraction * (max - min);
}

class PolicySimulator {
  /**
   * simulate(policy, options)
   *
   * // STUB — Sprint 3 replaces this with real replay engine
   *
   * @param {object} policy   Full policy object (uses id + rules for seed)
   * @param {object} options  { sampleSize?: number }
   * @returns {object}        simulation_result
   */
  simulate(policy, options = {}) {
    // STUB — Sprint 3 replaces this ─────────────────────────────────────
    const sampleSize = Math.max(1, Math.floor(options.sampleSize || 1000));
    const seed       = String(policy.id || 'no-id');

    // Deterministic pseudo-random metrics seeded from policy id
    // STUB: real engine replays rules against historical decision log
    const decisions_changed_pct = parseFloat(
      deterministicFloat(seed, 'decisions_changed_pct', 0, 18).toFixed(2)
    );
    const false_positive_rate = parseFloat(
      deterministicFloat(seed, 'false_positive_rate', 0, 0.12).toFixed(4)
    );
    const risk_delta = parseFloat(
      deterministicFloat(seed, 'risk_delta', -0.15, 0.15).toFixed(4)
    );

    const recommendation =
      decisions_changed_pct < 10 && false_positive_rate < 0.05 ? 'APPROVE' : 'REVIEW';
    const passed = recommendation === 'APPROVE';

    return {
      // STUB — Sprint 3 replaces this ───────────────────────────────────
      stub:                  true,
      sprint3_replaces_this: 'Real replay engine against historical decision log',
      simulated_at:          new Date().toISOString(),
      sample_size:           sampleSize,
      decisions_changed_pct,
      false_positive_rate,
      risk_delta,
      recommendation,
      passed,
    };
  }
}

module.exports = new PolicySimulator();
