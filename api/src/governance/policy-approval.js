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
