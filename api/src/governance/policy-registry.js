'use strict';
/**
 * PolicyRegistry — PLGS Sprint 1
 * ================================
 * First-class governance subsystem for policy lifecycle management.
 * Every state transition is signed with SLH-DSA-128s (FIPS 205).
 * All mutations go through this class. Audit log is append-only.
 *
 * Methods:
 *   register(policy, author)          DRAFT created + signed
 *   deploy(policyId, actor)           DRAFT → ACTIVE (requires simulation_result)
 *   deprecate(policyId, actor, reason) ACTIVE → DEPRECATED
 *   rollback(policyId, version, actor) prior version → ACTIVE, current → ROLLED_BACK
 *   getActive(policyType)             all ACTIVE for a type
 *   getHistory(policyId)              full audit trail
 */

const { v4: uuidv4 }             = require('uuid');
const crypto                      = require('crypto');
const pool                        = require('../db/pool');
const { signGovernanceDocument }  = require('./document-signing-service');
const { AlgorithmRegistry }       = require('../lib/pqc/algorithm-registry');
const { sha3Digest }              = require('../lib/pqc/hybrid-kdf');
const logger                      = require('../utils/logger');
const approval   = require('./policy-approval'); /* plgs-002-approval-require */


// ── Signing keypair ───────────────────────────────────────────────────────────
// Sourced from env PLGS_SIGN_SK_HEX / PLGS_SIGN_PK_HEX (64/32 bytes hex).
// In dev/test: ephemeral keypair generated at startup with a warning.
let _kp = null;

function keypair() {
  if (_kp) return _kp;
  const suite = AlgorithmRegistry.current();
  const skHex = process.env.PLGS_SIGN_SK_HEX;
  const pkHex = process.env.PLGS_SIGN_PK_HEX;
  if (skHex && pkHex) {
    _kp = {
      sk:    Buffer.from(skHex, 'hex'),
      pk:    Buffer.from(pkHex, 'hex'),
      keyId: 'PLGS-SLH-DSA-128s-v1',
    };
    logger.info('plgs_signing_key_loaded', { keyId: _kp.keyId });
  } else {
    const [pk, sk] = suite.archivalSignature.generateKeypair();
    _kp = { sk, pk, keyId: 'PLGS-SLH-DSA-128s-ephemeral-' + Date.now() };
    logger.warn('plgs_ephemeral_keypair', {
      keyId:        _kp.keyId,
      publicKeyHex: pk.toString('hex'),
      note:         'Set PLGS_SIGN_SK_HEX + PLGS_SIGN_PK_HEX for production',
    });
  }
  return _kp;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function canonicalize(obj) {
  return Buffer.from(JSON.stringify(obj, Object.keys(obj).sort()), 'utf8');
}

// SHA-3-512 of last audit row for this policy; genesis = 128 zeros.
async function chainHash(client, policyId) {
  const { rows } = await client.query(
    `SELECT signature, created_at, event_type, actor, metadata
       FROM policy_audit_log
      WHERE policy_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [policyId]
  );
  if (!rows.length) return '0'.repeat(128);
  return sha3Digest(Buffer.from(JSON.stringify(rows[0]))).toString('hex');
}

function signPolicy(policyId, payload, auditChainHash) {
  const kp  = keypair();
  const doc = canonicalize(payload);
  return signGovernanceDocument(
    doc, policyId, 'GOVERNANCE_POLICY',
    kp.sk, kp.keyId, auditChainHash
  );
}

async function writeAuditEntry(client, policyId, eventType, actor, metadata, signatureHex) {
  const { rows } = await client.query(
    `INSERT INTO policy_audit_log
       (id, policy_id, event_type, actor, metadata, signature)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [uuidv4(), policyId, eventType, actor, JSON.stringify(metadata), signatureHex]
  );
  return rows[0];
}

// ── PolicyRegistry ────────────────────────────────────────────────────────────

class PolicyRegistry {

  /**
   * register(policy, author)
   * Creates a new policy in DRAFT status, signs it, writes the CREATED audit entry.
   * @param {object} policy  { name, version, policy_type, rules, simulation_result? }
   * @param {string} author
   * @returns {object} created policy row
   */
  async register(policy, author) {
    const { name, version, policy_type, rules = {}, simulation_result = null } = policy; /* plgs-002-optional-id */
    if (!name || !version || !policy_type)
      throw Object.assign(new Error('name, version, and policy_type are required'), { code: 'VALIDATION_ERROR' });

    const id     = policy.id || uuidv4(); /* plgs-002-use-provided-id */
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [row] } = await client.query(
        `INSERT INTO policies
           (id, name, version, status, policy_type, rules, author, simulation_result)
         VALUES ($1,$2,$3,'DRAFT',$4,$5,$6,$7)
         RETURNING *`,
        [id, name, version, policy_type, JSON.stringify(rules), author,
         simulation_result ? JSON.stringify(simulation_result) : null]
      );

      const chain = await chainHash(client, id);
      const sig   = signPolicy(id, { id, name, version, policy_type, rules, author, status: 'DRAFT' }, chain);

      const { rows: [updated] } = await client.query(
        `UPDATE policies SET signature = $1 WHERE id = $2 RETURNING *`,
        [sig.signatureHex, id]
      );

      await writeAuditEntry(client, id, 'CREATED', author,
        { name, version, policy_type, signerKeyId: sig.signerKeyId, algorithm: sig.algorithm },
        sig.signatureHex);

      await client.query('COMMIT');
      logger.info('policy_registered', { id, name, version, policy_type, author });
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * deploy(policyId, actor)
   * Transitions DRAFT → ACTIVE. Requires simulation_result to be present.
   */
  async deploy(policyId, actor) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query('SELECT * FROM policies WHERE id = $1 FOR UPDATE', [policyId]);
      if (!rows.length) throw Object.assign(new Error('Policy not found'), { code: 'NOT_FOUND' });
      const p = rows[0];
      if (p.status !== 'DRAFT')
        throw Object.assign(new Error(`Cannot deploy policy in status '${p.status}'`), { code: 'INVALID_TRANSITION' });
      if (!p.simulation_result)
        throw Object.assign(new Error('simulation_result must be present before deploying'), { code: 'PRECONDITION_FAILED' });
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


      const { rows: [updated] } = await client.query(
        `UPDATE policies SET status = 'ACTIVE', deployed_at = NOW() WHERE id = $1 RETURNING *`,
        [policyId]
      );

      const chain = await chainHash(client, policyId);
      const sig   = signPolicy(policyId,
        { id: policyId, name: p.name, version: p.version, status: 'ACTIVE', actor, deployed_at: updated.deployed_at },
        chain);

      await client.query('UPDATE policies SET signature = $1 WHERE id = $2', [sig.signatureHex, policyId]);

      await writeAuditEntry(client, policyId, 'DEPLOYED', actor,
        { previous_status: 'DRAFT', signerKeyId: sig.signerKeyId, algorithm: sig.algorithm },
        sig.signatureHex);

      await client.query('COMMIT');
      logger.info('policy_deployed', { id: policyId, actor });
      return { ...updated, signature: sig.signatureHex };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * deprecate(policyId, actor, reason)
   * Transitions ACTIVE → DEPRECATED.
   */
  async deprecate(policyId, actor, reason = '') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query('SELECT * FROM policies WHERE id = $1 FOR UPDATE', [policyId]);
      if (!rows.length) throw Object.assign(new Error('Policy not found'), { code: 'NOT_FOUND' });
      const p = rows[0];
      if (p.status !== 'ACTIVE')
        throw Object.assign(new Error(`Cannot deprecate policy in status '${p.status}'`), { code: 'INVALID_TRANSITION' });

      const { rows: [updated] } = await client.query(
        `UPDATE policies SET status = 'DEPRECATED', deprecated_at = NOW() WHERE id = $1 RETURNING *`,
        [policyId]
      );

      const chain = await chainHash(client, policyId);
      const sig   = signPolicy(policyId,
        { id: policyId, name: p.name, version: p.version, status: 'DEPRECATED', actor, reason },
        chain);

      await client.query('UPDATE policies SET signature = $1 WHERE id = $2', [sig.signatureHex, policyId]);

      await writeAuditEntry(client, policyId, 'DEPRECATED', actor,
        { reason, signerKeyId: sig.signerKeyId, algorithm: sig.algorithm },
        sig.signatureHex);

      await client.query('COMMIT');
      logger.info('policy_deprecated', { id: policyId, actor, reason });
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * rollback(policyId, version, actor)
   * Sets current ACTIVE policy to ROLLED_BACK, activates the prior version.
   * policyId: the currently ACTIVE policy (same name) being rolled back from.
   * version:  the semver of the prior version to restore.
   */
  async rollback(policyId, version, actor) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock current active policy
      const { rows: currentRows } = await client.query(
        'SELECT * FROM policies WHERE id = $1 FOR UPDATE', [policyId]);
      if (!currentRows.length) throw Object.assign(new Error('Policy not found'), { code: 'NOT_FOUND' });
      const current = currentRows[0];
      if (current.status !== 'ACTIVE')
        throw Object.assign(new Error(`Policy is not ACTIVE (status: '${current.status}')`), { code: 'INVALID_TRANSITION' });

      // Find prior version by name + version
      const { rows: priorRows } = await client.query(
        'SELECT * FROM policies WHERE name = $1 AND version = $2 FOR UPDATE',
        [current.name, version]);
      if (!priorRows.length)
        throw Object.assign(new Error(`No policy '${current.name}' at version '${version}'`), { code: 'NOT_FOUND' });
      const prior = priorRows[0];
      if (prior.id === policyId)
        throw Object.assign(new Error('Cannot rollback to the same version'), { code: 'INVALID_TRANSITION' });

      // Roll back current
      await client.query(
        `UPDATE policies SET status = 'ROLLED_BACK' WHERE id = $1`, [policyId]);

      const chainCurrent = await chainHash(client, policyId);
      const sigCurrent   = signPolicy(policyId,
        { id: policyId, status: 'ROLLED_BACK', actor, rolled_back_to: version }, chainCurrent);
      await client.query('UPDATE policies SET signature = $1 WHERE id = $2', [sigCurrent.signatureHex, policyId]);
      await writeAuditEntry(client, policyId, 'ROLLED_BACK', actor,
        { rolled_back_to_version: version, prior_id: prior.id,
          signerKeyId: sigCurrent.signerKeyId, algorithm: sigCurrent.algorithm },
        sigCurrent.signatureHex);

      // Activate prior version
      const { rows: [restored] } = await client.query(
        `UPDATE policies SET status = 'ACTIVE', deployed_at = NOW() WHERE id = $1 RETURNING *`,
        [prior.id]);

      const chainPrior = await chainHash(client, prior.id);
      const sigPrior   = signPolicy(prior.id,
        { id: prior.id, status: 'ACTIVE', actor, restored_from: policyId }, chainPrior);
      await client.query('UPDATE policies SET signature = $1 WHERE id = $2', [sigPrior.signatureHex, prior.id]);
      await writeAuditEntry(client, prior.id, 'DEPLOYED', actor,
        { restored_from_version: current.version, from_id: policyId,
          signerKeyId: sigPrior.signerKeyId, algorithm: sigPrior.algorithm },
        sigPrior.signatureHex);

      await client.query('COMMIT');
      logger.info('policy_rolled_back', { from: policyId, to: prior.id, version, actor });
      return { rolledBack: current, restored };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }


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

  /**
   * getActive(policyType) → Policy[]
   * Returns all ACTIVE policies for a given type.
   */
  async getActive(policyType) {
    const { rows } = await pool.query(
      `SELECT * FROM policies WHERE policy_type = $1 AND status = 'ACTIVE' ORDER BY deployed_at DESC`,
      [policyType]
    );
    return rows;
  }

  /**
   * getHistory(policyId) → AuditEntry[]
   * Full audit trail for a policy, oldest first.
   */
  async getHistory(policyId) {
    const { rows } = await pool.query(
      `SELECT * FROM policy_audit_log WHERE policy_id = $1 ORDER BY created_at ASC`,
      [policyId]
    );
    return rows;
  }
}

module.exports = new PolicyRegistry();
