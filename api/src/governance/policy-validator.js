'use strict';
/**
 * PolicyValidator — PLGS Sprint 2
 * =================================
 * Static (synchronous) validation of policy objects before DB persistence.
 * No database calls. Accepts an optional context for version-increment check.
 */

const VALID_TYPES = new Set(['SAL', 'ASEAL', 'GOVERNANCE']);

// Strict semver: major.minor.patch with optional pre-release/build metadata
const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Parse semver string to comparable tuple [major, minor, patch].
 * Pre-release/build metadata ignored for ordering.
 */
function parseSemver(v) {
  const m = SEMVER_RE.exec(v);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

/**
 * Returns true if version a is strictly greater than version b.
 */
function semverGt(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return false;
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return true;
    if (pa[i] < pb[i]) return false;
  }
  return false; // equal
}

class PolicyValidator {
  /**
   * validate(policy, context)
   *
   * @param {object} policy   Policy object to validate
   * @param {object} context  Optional: { lastDeployedVersion: string }
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(policy = {}, context = {}) {
    const errors = [];

    // ── Required fields ───────────────────────────────────────────────────
    if (!policy.id)   errors.push('id is required');
    if (!policy.name) errors.push('name is required');

    // version: required + valid semver
    if (!policy.version) {
      errors.push('version is required');
    } else if (!SEMVER_RE.test(policy.version)) {
      errors.push(`version '${policy.version}' must be valid semver (e.g. 1.0.0)`);
    }

    // policy_type: required + enum
    if (!policy.policy_type) {
      errors.push('policy_type is required');
    } else if (!VALID_TYPES.has(policy.policy_type)) {
      errors.push(`policy_type must be one of: ${[...VALID_TYPES].join(', ')}`);
    }

    // rules: required + array with ≥1 item, each with effect + action
    if (policy.rules === undefined || policy.rules === null) {
      errors.push('rules is required');
    } else if (!Array.isArray(policy.rules)) {
      errors.push('rules must be an array');
    } else if (policy.rules.length < 1) {
      errors.push('rules must contain at least one item');
    } else {
      for (let i = 0; i < policy.rules.length; i++) {
        const r = policy.rules[i];
        if (!r || typeof r !== 'object') { errors.push(`rules[${i}] must be an object`); continue; }
        if (!r.effect) errors.push(`rules[${i}] is missing required field: effect`);
        if (!r.action) errors.push(`rules[${i}] is missing required field: action`);
      }
    }

    // ── Version increment check (context-dependent) ───────────────────────
    if (context.lastDeployedVersion && policy.version && SEMVER_RE.test(policy.version)) {
      if (!semverGt(policy.version, context.lastDeployedVersion)) {
        errors.push(
          `version '${policy.version}' must be greater than last deployed ` +
          `version '${context.lastDeployedVersion}'`
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

module.exports = new PolicyValidator();
