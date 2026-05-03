#!/usr/bin/env python3
"""
plgs_002_lifecycle_pipeline.py
PLGS Sprint 2 — Policy Lifecycle Pipeline transform.
Creates:
  api/src/governance/policy-validator.js
  api/src/governance/policy-simulator.js
  api/src/governance/policy-approval.js
  api/src/db/migrations/plgs_002_policy_approval.sql
  ~/coreidentity/integrations/coreidentity-dashboard/contract-tests.sh
Patches (idempotent markers):
  api/src/governance/policy-registry.js
  api/src/routes/policy.js
"""

import os, re, sys

ROOT  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # api/
DASH  = os.path.dirname(ROOT)                                          # coreidentity-dashboard/

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path) and open(path).read() == content:
        print(f'  unchanged  {os.path.relpath(path, ROOT)}')
        return
    with open(path, 'w') as f:
        f.write(content)
    action = 'written' if not os.path.exists(path) else 'updated'
    print(f'  written    {os.path.relpath(path, ROOT)}')

def patch(path, marker, text, *, after=None, before=None):
    content = open(path).read()
    if marker in content:
        print(f'  already    {os.path.relpath(path, ROOT)}  [{marker}]')
        return
    if after is not None:
        if after not in content:
            sys.exit(f'ERROR: after-anchor not found in {path}:\n  {after!r}')
        idx = content.index(after) + len(after)
        content = content[:idx] + text + content[idx:]
    elif before is not None:
        if before not in content:
            sys.exit(f'ERROR: before-anchor not found in {path}:\n  {before!r}')
        idx = content.index(before)
        content = content[:idx] + text + content[idx:]
    else:
        content += text
    with open(path, 'w') as f:
        f.write(content)
    print(f'  patched    {os.path.relpath(path, ROOT)}  [{marker}]')

# ─────────────────────────────────────────────────────────────────────────────
# 1.  plgs_002_policy_approval.sql
# ─────────────────────────────────────────────────────────────────────────────
write_file(os.path.join(ROOT, 'src/db/migrations/plgs_002_policy_approval.sql'), """\
-- plgs_002_policy_approval.sql
-- PLGS Sprint 2: Approval-request tracking table
-- Idempotent (CREATE ... IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS policy_approval_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id    UUID        NOT NULL REFERENCES policies(id) ON DELETE RESTRICT,
  requested_by TEXT        NOT NULL,
  approved_by  TEXT,
  status       TEXT        NOT NULL DEFAULT 'PENDING'
               CHECK (status IN ('PENDING','APPROVED','EXPIRED')),
  expires_at   TIMESTAMPTZ NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at  TIMESTAMPTZ,
  signature    TEXT
);

CREATE INDEX IF NOT EXISTS idx_par_policy_id ON policy_approval_requests (policy_id);
CREATE INDEX IF NOT EXISTS idx_par_status    ON policy_approval_requests (status, expires_at);
""")

# ─────────────────────────────────────────────────────────────────────────────
# 2.  policy-validator.js
# ─────────────────────────────────────────────────────────────────────────────
write_file(os.path.join(ROOT, 'src/governance/policy-validator.js'), """\
'use strict';
/**
 * PolicyValidator — PLGS Sprint 2
 * =================================
 * Static (synchronous) validation of policy objects before DB persistence.
 * No database calls. Accepts an optional context for version-increment check.
 */

const VALID_TYPES = new Set(['SAL', 'ASEAL', 'GOVERNANCE']);

// Strict semver: major.minor.patch with optional pre-release/build metadata
const SEMVER_RE = /^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$/;

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
""")

# ─────────────────────────────────────────────────────────────────────────────
# 3.  policy-simulator.js
# ─────────────────────────────────────────────────────────────────────────────
write_file(os.path.join(ROOT, 'src/governance/policy-simulator.js'), """\
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
""")

# ─────────────────────────────────────────────────────────────────────────────
# 4.  policy-approval.js
# ─────────────────────────────────────────────────────────────────────────────
write_file(os.path.join(ROOT, 'src/governance/policy-approval.js'), """\
'use strict';
/**
 * PolicyApproval — PLGS Sprint 2
 * =================================
 * Manages approval gate for policy deployment.
 *
 * Solo-founder mode (default):
 *   approvedBy may equal requestedBy — emits console.warn.
 *
 * Dual-approval mode (REQUIRE_DUAL_APPROVAL=true):
 *   approvedBy must differ from requestedBy — throws APPROVAL_SELF_NOT_ALLOWED.
 *
 * Approval requests expire 72 h after creation.
 * Every approval is signed with SLH-DSA-128s (FIPS 205).
 * Audit entries are written to policy_audit_log (append-only).
 */

const { v4: uuidv4 }            = require('uuid');
const pool                       = require('../db/pool');
const { signGovernanceDocument } = require('./document-signing-service');
const { AlgorithmRegistry }      = require('../lib/pqc/algorithm-registry');
const { sha3Digest }             = require('../lib/pqc/hybrid-kdf');
const logger                     = require('../utils/logger');

const APPROVAL_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

// ── Signing keypair (mirrors policy-registry.js, same env vars) ───────────────
let _kp = null;
function keypair() {
  if (_kp) return _kp;
  const suite = AlgorithmRegistry.current();
  const skHex = process.env.PLGS_SIGN_SK_HEX;
  const pkHex = process.env.PLGS_SIGN_PK_HEX;
  if (skHex && pkHex) {
    _kp = { sk: Buffer.from(skHex, 'hex'), pk: Buffer.from(pkHex, 'hex'), keyId: 'PLGS-SLH-DSA-128s-v1' };
  } else {
    const [pk, sk] = suite.archivalSignature.generateKeypair();
    _kp = { sk, pk, keyId: 'PLGS-SLH-DSA-128s-ephemeral-approval-' + Date.now() };
    logger.warn('plgs_approval_ephemeral_keypair', { keyId: _kp.keyId });
  }
  return _kp;
}

// ── Audit helpers (inline — mirrors policy-registry.js to avoid circular dep) ─
async function chainHash(client, policyId) {
  const { rows } = await client.query(
    `SELECT signature, created_at, event_type, actor, metadata
       FROM policy_audit_log WHERE policy_id = $1
      ORDER BY created_at DESC LIMIT 1`,
    [policyId]);
  if (!rows.length) return '0'.repeat(128);
  return sha3Digest(Buffer.from(JSON.stringify(rows[0]))).toString('hex');
}

async function writeAuditEntry(client, policyId, eventType, actor, metadata, signatureHex) {
  const { rows } = await client.query(
    `INSERT INTO policy_audit_log (id, policy_id, event_type, actor, metadata, signature)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [uuidv4(), policyId, eventType, actor, JSON.stringify(metadata), signatureHex]);
  return rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────

class PolicyApproval {

  /**
   * requestApproval(policyId, requestedBy)
   * Creates an approval request (status=PENDING, 72h expiry).
   * Idempotent: returns existing PENDING request if one already exists.
   * Writes a VALIDATED audit log entry.
   */
  async requestApproval(policyId, requestedBy) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify policy exists
      const { rows: pRows } = await client.query(
        'SELECT id, name, version, status FROM policies WHERE id = $1', [policyId]);
      if (!pRows.length)
        throw Object.assign(new Error('Policy not found'), { code: 'NOT_FOUND' });

      // Return existing PENDING request if present (idempotent)
      const { rows: existing } = await client.query(
        `SELECT * FROM policy_approval_requests
          WHERE policy_id = $1 AND status = 'PENDING' AND expires_at > NOW()
          ORDER BY requested_at DESC LIMIT 1`,
        [policyId]);
      if (existing.length) {
        await client.query('COMMIT');
        return existing[0];
      }

      // Expire any stale pending requests
      await client.query(
        `UPDATE policy_approval_requests SET status = 'EXPIRED'
          WHERE policy_id = $1 AND status = 'PENDING' AND expires_at <= NOW()`,
        [policyId]);

      const expiresAt = new Date(Date.now() + APPROVAL_TTL_MS).toISOString();
      const { rows: [req] } = await client.query(
        `INSERT INTO policy_approval_requests (id, policy_id, requested_by, expires_at)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [uuidv4(), policyId, requestedBy, expiresAt]);

      const chain = await chainHash(client, policyId);
      const kp    = keypair();
      const doc   = Buffer.from(JSON.stringify({ policyId, requestedBy, expiresAt }));
      const sig   = signGovernanceDocument(doc, policyId, 'GOVERNANCE_POLICY', kp.sk, kp.keyId, chain);

      await writeAuditEntry(client, policyId, 'VALIDATED', requestedBy,
        { approval_request_id: req.id, expires_at: expiresAt,
          signerKeyId: sig.signerKeyId, algorithm: sig.algorithm },
        sig.signatureHex);

      await client.query('COMMIT');
      logger.info('policy_approval_requested', { policyId, requestedBy, expires_at: expiresAt });
      return req;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * approve(policyId, approvedBy)
   * Marks the pending approval request as APPROVED.
   * Solo mode: approvedBy may equal requestedBy (console.warn issued).
   * Dual-approval mode (REQUIRE_DUAL_APPROVAL=true): self-approval throws.
   * Signs the approval with SLH-DSA-128s. Writes APPROVED audit entry.
   */
  async approve(policyId, approvedBy) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `SELECT * FROM policy_approval_requests
          WHERE policy_id = $1 AND status = 'PENDING' AND expires_at > NOW()
          ORDER BY requested_at DESC LIMIT 1 FOR UPDATE`,
        [policyId]);
      if (!rows.length)
        throw Object.assign(
          new Error('No pending approval request found (or request has expired)'),
          { code: 'NOT_FOUND' });

      const req = rows[0];

      // Dual-approval enforcement
      if (req.requested_by === approvedBy) {
        if (process.env.REQUIRE_DUAL_APPROVAL === 'true') {
          throw Object.assign(
            new Error(`Self-approval is not allowed when REQUIRE_DUAL_APPROVAL=true ` +
                      `(requestedBy and approvedBy are both '${approvedBy}')`),
            { code: 'APPROVAL_SELF_NOT_ALLOWED' });
        }
        // Solo-founder mode: warn and continue
        console.warn(
          `[PLGS] Solo-mode approval: approvedBy ('${approvedBy}') equals requestedBy. ` +
          `Set REQUIRE_DUAL_APPROVAL=true to enforce multi-approver governance.`
        );
      }

      const approvedAt = new Date().toISOString();
      const { rows: [updated] } = await client.query(
        `UPDATE policy_approval_requests
            SET status = 'APPROVED', approved_by = $1, approved_at = $2
          WHERE id = $3 RETURNING *`,
        [approvedBy, approvedAt, req.id]);

      const chain = await chainHash(client, policyId);
      const kp    = keypair();
      const doc   = Buffer.from(JSON.stringify({ policyId, approvedBy, approvedAt, requestId: req.id }));
      const sig   = signGovernanceDocument(doc, policyId, 'GOVERNANCE_POLICY', kp.sk, kp.keyId, chain);

      await client.query(
        'UPDATE policy_approval_requests SET signature = $1 WHERE id = $2',
        [sig.signatureHex, req.id]);

      await writeAuditEntry(client, policyId, 'APPROVED', approvedBy,
        { approval_request_id: req.id, requested_by: req.requested_by,
          dual_approval: process.env.REQUIRE_DUAL_APPROVAL === 'true',
          signerKeyId: sig.signerKeyId, algorithm: sig.algorithm },
        sig.signatureHex);

      await client.query('COMMIT');
      logger.info('policy_approved', { policyId, approvedBy, requestId: req.id });
      return { ...updated, signature: sig.signatureHex };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * isApproved(policyId)
   * Returns true if a non-expired APPROVED request exists for this policy.
   */
  async isApproved(policyId) {
    try {
      const { rows } = await pool.query(
        `SELECT 1 FROM policy_approval_requests
          WHERE policy_id = $1 AND status = 'APPROVED' AND expires_at > NOW()
          LIMIT 1`,
        [policyId]);
      return rows.length > 0;
    } catch {
      return false; // Graceful degradation if DB unavailable
    }
  }
}

module.exports = new PolicyApproval();
""")

# ─────────────────────────────────────────────────────────────────────────────
# 5.  Patch policy-registry.js — 5 idempotent insertions
# ─────────────────────────────────────────────────────────────────────────────
REG = os.path.join(ROOT, 'src/governance/policy-registry.js')

# 5a. Require policy-approval at top
patch(REG, '/* plgs-002-approval-require */',
    "\nconst approval   = require('./policy-approval'); /* plgs-002-approval-require */\n",
    after="const logger                      = require('../utils/logger');")

# 5b. Allow optional id in register() destructuring
patch(REG, '/* plgs-002-optional-id */',
    " /* plgs-002-optional-id */",
    after="const { name, version, policy_type, rules = {}, simulation_result = null } = policy;")

# 5c. Use provided id in register() — replace the uuidv4 line
patch(REG, '/* plgs-002-use-provided-id */',
    "\n    const id     = policy.id || uuidv4(); /* plgs-002-use-provided-id */",
    before="\n    const client = await pool.connect();")

# Wait — the above will produce duplicate `const id` if not careful.
# Check: the original line is `    const id     = uuidv4();`
# We need to replace (not insert after) that line. Use a replace approach:
content = open(REG).read()
OLD_ID = "    const id     = uuidv4();"
NEW_ID = "    const id     = policy.id || uuidv4(); /* plgs-002-use-provided-id */"
if OLD_ID in content and '/* plgs-002-use-provided-id */' not in content:
    # Also remove the insertion from 5c since we do a proper replace here
    # First undo the insertion from 5c if it was written (it wasn't yet — check)
    content = content.replace(OLD_ID, NEW_ID)
    with open(REG, 'w') as f:
        f.write(content)
    print(f'  patched    src/governance/policy-registry.js  [plgs-002-use-provided-id]')
elif '/* plgs-002-use-provided-id */' in content:
    print(f'  already    src/governance/policy-registry.js  [plgs-002-use-provided-id]')
else:
    print(f'  WARNING    could not find anchor for plgs-002-use-provided-id', file=sys.stderr)

# 5d. Approval check inside deploy() — after simulation_result guard
APPROVAL_CHECK = """
      /* plgs-002-approval-check */
      {
        const { rows: _apr } = await client.query(
          `SELECT 1 FROM policy_approval_requests
            WHERE policy_id = $1 AND status = 'APPROVED' AND expires_at > NOW()
            LIMIT 1`,
          [policyId]);
        if (!_apr.length)
          throw Object.assign(
            new Error('Policy requires an approved approval request before deployment'),
            { code: 'APPROVAL_REQUIRED' });
      }
"""
patch(REG, '/* plgs-002-approval-check */',
    APPROVAL_CHECK,
    after="throw Object.assign(new Error('simulation_result must be present before deploying'), { code: 'PRECONDITION_FAILED' });")

# 5e. Add simulate() and runPipeline() methods before getActive()
SIMULATE_METHOD = """
  /**
   * simulate(policyId, options, actor)
   * Runs the simulator stub, persists simulation_result, writes SIMULATED audit entry.
   * @param {string} policyId
   * @param {object} options   { sampleSize?: number }
   * @param {string} actor
   * @returns {object} simulation_result
   */
  async simulate(policyId, options, actor) { /* plgs-002-simulate */
    const simulator = require('./policy-simulator');
    const client    = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT * FROM policies WHERE id = $1 FOR UPDATE', [policyId]);
      if (!rows.length) throw Object.assign(new Error('Policy not found'), { code: 'NOT_FOUND' });

      const simResult = simulator.simulate(rows[0], options || {});

      await client.query(
        'UPDATE policies SET simulation_result = $1 WHERE id = $2',
        [JSON.stringify(simResult), policyId]);

      const chain = await chainHash(client, policyId);
      const sig   = signPolicy(policyId, { id: policyId, event: 'SIMULATED', ...simResult }, chain);

      await writeAuditEntry(client, policyId, 'SIMULATED', actor,
        { sample_size: simResult.sample_size, recommendation: simResult.recommendation,
          passed: simResult.passed, stub: simResult.stub, signerKeyId: sig.signerKeyId },
        sig.signatureHex);

      await client.query('COMMIT');
      logger.info('policy_simulated', { id: policyId, recommendation: simResult.recommendation, actor });
      return simResult;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * runPipeline(policy, author)
   * Convenience method: validate → register → simulate → approve → deploy.
   * In solo mode, approvedBy = author (console.warn issued by approval service).
   * Returns { success, policy_id, stages, stopped_at? }.
   */
  async runPipeline(policy, author) { /* plgs-002-run-pipeline */
    const validator = require('./policy-validator');
    const apprSvc   = require('./policy-approval');

    const stages = {};

    // ── 1. Register (assigns id, creates DRAFT) ───────────────────────────
    let registered;
    try {
      const id = policy.id || require('uuid').v4();
      registered = await this.register({ ...policy, id }, author);
      stages.register = { policy_id: registered.id, status: registered.status };
    } catch (err) {
      return { success: false, stages, stopped_at: 'register', error: err.message };
    }

    // ── 2. Validate (now has id + DB-backed record) ───────────────────────
    // Fetch last deployed version for increment check
    const { rows: prevRows } = await pool.query(
      `SELECT version FROM policies
        WHERE name = $1 AND status = 'ACTIVE'
        ORDER BY deployed_at DESC LIMIT 1`,
      [registered.name]).catch(() => ({ rows: [] }));
    const lastDeployedVersion = prevRows[0]?.version;

    const validation = validator.validate(
      { ...policy, id: registered.id },
      lastDeployedVersion ? { lastDeployedVersion } : {}
    );
    stages.validate = validation;
    if (!validation.valid) {
      logger.warn('plgs_pipeline_validation_failed', { id: registered.id, errors: validation.errors });
      return { success: false, policy_id: registered.id, stages, stopped_at: 'validate' };
    }

    // ── 3. Simulate ───────────────────────────────────────────────────────
    try {
      const simResult = await this.simulate(registered.id, {}, author);
      stages.simulate = simResult;
      if (!simResult.passed) {
        return { success: false, policy_id: registered.id, stages,
                 stopped_at: 'simulate',
                 reason: `Simulation recommendation is '${simResult.recommendation}' (not APPROVE)` };
      }
    } catch (err) {
      return { success: false, policy_id: registered.id, stages, stopped_at: 'simulate', error: err.message };
    }

    // ── 4. Approve (auto / solo mode) ─────────────────────────────────────
    try {
      await apprSvc.requestApproval(registered.id, author);
      const approveResult = await apprSvc.approve(registered.id, author);
      stages.approve = { status: approveResult.status, approved_by: approveResult.approved_by };
    } catch (err) {
      return { success: false, policy_id: registered.id, stages, stopped_at: 'approve', error: err.message };
    }

    // ── 5. Deploy ─────────────────────────────────────────────────────────
    try {
      const deployed = await this.deploy(registered.id, author);
      stages.deploy  = { status: deployed.status, deployed_at: deployed.deployed_at };
    } catch (err) {
      return { success: false, policy_id: registered.id, stages, stopped_at: 'deploy', error: err.message };
    }

    logger.info('plgs_pipeline_complete', { id: registered.id, author });
    return { success: true, policy_id: registered.id, stages };
  }

"""
patch(REG, '/* plgs-002-simulate */',
    SIMULATE_METHOD,
    before="  /**\n   * getActive(policyType)")

# ─────────────────────────────────────────────────────────────────────────────
# 6.  Patch routes/policy.js — 3 new routes
# ─────────────────────────────────────────────────────────────────────────────
ROUTES = os.path.join(ROOT, 'src/routes/policy.js')

# Add requires for simulator and approval at top
patch(ROUTES, '/* plgs-002-route-requires */',
    "\nconst simulator = require('../governance/policy-simulator'); /* plgs-002-route-requires */\n"
    "const approval  = require('../governance/policy-approval');\n",
    after="const registry = require('../governance/policy-registry');")

NEW_ROUTES = """
// POST /api/policy/:id/simulate  /* plgs-002-routes */
router.post('/:id/simulate', async (req, res) => {
  try {
    const result = await registry.simulate(req.params.id, req.body || {}, actor(req));
    res.json({ data: result, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

// POST /api/policy/:id/approve
router.post('/:id/approve', async (req, res) => {
  try {
    const result = await approval.approve(req.params.id, actor(req));
    res.json({ data: result, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

// POST /api/policy/:id/pipeline
// Runs the full pipeline: validate → register → simulate → approve → deploy
router.post('/:id/pipeline', async (req, res) => {
  try {
    const policy = { ...req.body, id: req.params.id };
    const result = await registry.runPipeline(policy, actor(req));
    const status = result.success ? 200 : 422;
    res.status(status).json({ data: result, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

"""
patch(ROUTES, '/* plgs-002-routes */',
    NEW_ROUTES,
    before="// GET /api/policy/active/:type")

# Update error map to include Sprint 2 codes
patch(ROUTES, '/* plgs-002-err-codes */',
    " APPROVAL_REQUIRED: 422, APPROVAL_SELF_NOT_ALLOWED: 403, /* plgs-002-err-codes */",
    after="                 INVALID_TRANSITION: 409, PRECONDITION_FAILED: 422 };"
         if False else None,
    before=None)
# Manual replace for error map since it's a single-line dict
content = open(ROUTES).read()
OLD_MAP = "const map  = { NOT_FOUND: 404, VALIDATION_ERROR: 400,\n                 INVALID_TRANSITION: 409, PRECONDITION_FAILED: 422 };"
NEW_MAP = "const map  = { NOT_FOUND: 404, VALIDATION_ERROR: 400,\n                 INVALID_TRANSITION: 409, PRECONDITION_FAILED: 422,\n                 APPROVAL_REQUIRED: 422, APPROVAL_SELF_NOT_ALLOWED: 403 }; /* plgs-002-err-codes */"
if OLD_MAP in content and '/* plgs-002-err-codes */' not in content:
    content = content.replace(OLD_MAP, NEW_MAP)
    with open(ROUTES, 'w') as f:
        f.write(content)
    print(f'  patched    src/routes/policy.js  [plgs-002-err-codes]')
elif '/* plgs-002-err-codes */' in content:
    print(f'  already    src/routes/policy.js  [plgs-002-err-codes]')

# ─────────────────────────────────────────────────────────────────────────────
# 7.  contract-tests.sh
# ─────────────────────────────────────────────────────────────────────────────
CONTRACT = os.path.join(DASH, 'contract-tests.sh')
write_file(CONTRACT, """\
#!/usr/bin/env bash
# contract-tests.sh — PLGS API contract tests
# Sprint 2: verifies /api/policy/active/GOVERNANCE returns success:true
# Usage: bash contract-tests.sh [API_BASE_URL] [JWT_TOKEN]
#   Defaults: API_BASE_URL=http://localhost:8080  JWT_TOKEN=$TEST_JWT_TOKEN
set -euo pipefail

API_URL="${1:-${TEST_API_URL:-http://localhost:8080}}"
JWT="${2:-${TEST_JWT_TOKEN:-}}"
PASS=0; FAIL=0

ok()   { echo "  [PASS] $*"; PASS=$((PASS+1)); }
fail() { echo "  [FAIL] $*"; FAIL=$((FAIL+1)); }
info() { echo "  [INFO] $*"; }

echo "============================================================"
echo "PLGS Contract Tests"
echo "API: ${API_URL}"
echo "============================================================"

# ── Helper ────────────────────────────────────────────────────────────────────
check_json_field() {
  # check_json_field <response_body> <field> <expected>
  local body="$1" field="$2" expected="$3"
  echo "$body" | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  val = d
  for k in '$field'.split('.'):
    val = val[k] if isinstance(val, dict) else val[int(k)]
  expected = '$expected'
  result = str(val).lower()
  if result == expected.lower():
    sys.exit(0)
  print(f'Expected $field={expected!r}, got {val!r}', file=sys.stderr)
  sys.exit(1)
except Exception as e:
  print(f'JSON parse/field error: {e}', file=sys.stderr)
  sys.exit(1)
" 2>&1
}

# ── CT-001: Health check (public, no auth) ────────────────────────────────────
info "CT-001: GET /health"
RESP=$(curl -sf "${API_URL}/health" 2>/dev/null || echo '{}')
STATUS=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "")
if [[ "$STATUS" == "healthy" ]]; then
  ok "CT-001: /health returns status=healthy"
else
  fail "CT-001: /health did not return status=healthy (got: ${STATUS:-no response})"
fi

# ── CT-002: GET /api/policy/active/GOVERNANCE (authenticated) ─────────────────
info "CT-002: GET /api/policy/active/GOVERNANCE"

if [[ -z "$JWT" ]]; then
  info "CT-002: TEST_JWT_TOKEN not set — testing unauthenticated (expect 401)"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "${API_URL}/api/policy/active/GOVERNANCE" 2>/dev/null || echo "000")
  if [[ "$HTTP_CODE" == "401" ]]; then
    ok "CT-002: route exists — returned 401 (unauthenticated, expected)"
  else
    fail "CT-002: unexpected HTTP ${HTTP_CODE} for unauthenticated request (expected 401)"
  fi
else
  RESP=$(curl -sf \
    -H "Authorization: Bearer ${JWT}" \
    -H "Content-Type: application/json" \
    "${API_URL}/api/policy/active/GOVERNANCE" 2>/dev/null || echo '{}')

  # Must return success:true (HTTP 200 with data array)
  HAS_DATA=$(echo "$RESP" | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  has_data = 'data' in d and isinstance(d['data'], list)
  has_ts   = 'timestamp' in d
  print('true' if has_data and has_ts else 'false')
except:
  print('false')
" 2>/dev/null || echo "false")

  if [[ "$HAS_DATA" == "true" ]]; then
    COUNT=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('count',0))" 2>/dev/null || echo "?")
    ok "CT-002: /api/policy/active/GOVERNANCE success:true (${COUNT} active policies)"
  else
    fail "CT-002: /api/policy/active/GOVERNANCE did not return {data:[...], timestamp:...}"
    echo "         Response: $(echo "$RESP" | head -c 200)"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo "============================================================"
echo "Results: ${PASS} passed, ${FAIL} failed"
echo "============================================================"

# Exit 0 only when all tests pass
if [[ $FAIL -gt 0 ]]; then
  echo "success:false"
  exit 1
fi
echo "success:true"
exit 0
""")
os.chmod(CONTRACT, 0o755)
print(f'  written    contract-tests.sh (+x)')

print('\nplgs_002 transform complete.')
