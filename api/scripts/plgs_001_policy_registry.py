#!/usr/bin/env python3
"""
plgs_001_policy_registry.py
PLGS Sprint 1 — Policy Registry transform.
Creates:
  api/src/db/pool.js
  api/src/db/migrate.js
  api/src/db/migrations/plgs_001_policy_registry.sql
  api/src/governance/policy-registry.js
  api/src/routes/policy.js
Patches:
  api/src/server.js   (policy router + migration runner)
  api/package.json    (adds pg dependency)
Idempotent: each step checks before writing/patching.
"""

import os, json, sys, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # api/

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        if open(path).read() == content:
            print(f'  unchanged  {os.path.relpath(path, ROOT)}')
            return
    with open(path, 'w') as f:
        f.write(content)
    print(f'  written    {os.path.relpath(path, ROOT)}')

def patch_file(path, marker, insertion, after=None, before=None):
    """Insert `insertion` into file if `marker` not already present."""
    content = open(path).read()
    if marker in content:
        print(f'  already    {os.path.relpath(path, ROOT)}  [{marker[:40]}]')
        return
    if after:
        idx = content.find(after)
        if idx == -1:
            print(f'  ERROR: anchor not found in {path}: {after[:60]}', file=sys.stderr)
            sys.exit(1)
        idx += len(after)
        content = content[:idx] + insertion + content[idx:]
    elif before:
        idx = content.find(before)
        if idx == -1:
            print(f'  ERROR: anchor not found in {path}: {before[:60]}', file=sys.stderr)
            sys.exit(1)
        content = content[:idx] + insertion + content[idx:]
    else:
        content += insertion
    with open(path, 'w') as f:
        f.write(content)
    print(f'  patched    {os.path.relpath(path, ROOT)}')

# ─────────────────────────────────────────────────────────────────────────────
# 1. api/src/db/pool.js
# ─────────────────────────────────────────────────────────────────────────────
write_file(os.path.join(ROOT, 'src/db/pool.js'), """\
'use strict';
// Postgres connection pool — PLGS policy registry backend
const { Pool } = require('pg');
const logger   = require('../utils/logger');

const pool = new Pool({
  host:                    process.env.PGHOST     || 'localhost',
  port:                    parseInt(process.env.PGPORT || '5432', 10),
  database:                process.env.PGDATABASE || 'coreidentity',
  user:                    process.env.PGUSER     || 'postgres',
  password:                process.env.PGPASSWORD || '',
  ssl:                     process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  max:                     10,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => logger.error('pg_pool_error', { error: err.message }));

module.exports = pool;
""")

# ─────────────────────────────────────────────────────────────────────────────
# 2. api/src/db/migrate.js
# ─────────────────────────────────────────────────────────────────────────────
write_file(os.path.join(ROOT, 'src/db/migrate.js'), """\
'use strict';
// Inline migration runner — scans src/db/migrations/*.sql, applies in order.
// Idempotent: tracks applied files in schema_migrations table.
const fs     = require('fs');
const path   = require('path');
const pool   = require('./pool');
const logger = require('../utils/logger');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations() {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    logger.warn('plgs_migration_skipped_no_db', { error: err.message });
    return;
  }
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
      if (rows.length > 0) { logger.info('migration_already_applied', { file }); continue; }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info('migration_applied', { file });
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error('migration_failed', { file, error: err.message });
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
""")

# ─────────────────────────────────────────────────────────────────────────────
# 3. api/src/db/migrations/plgs_001_policy_registry.sql
# ─────────────────────────────────────────────────────────────────────────────
write_file(os.path.join(ROOT, 'src/db/migrations/plgs_001_policy_registry.sql'), """\
-- plgs_001_policy_registry.sql
-- PLGS Sprint 1: Policy Registry tables
-- Idempotent (CREATE ... IF NOT EXISTS)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── policies ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policies (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT         NOT NULL,
  version           TEXT         NOT NULL,
  status            TEXT         NOT NULL DEFAULT 'DRAFT'
                                 CHECK (status IN ('DRAFT','ACTIVE','DEPRECATED','ROLLED_BACK')),
  policy_type       TEXT         NOT NULL
                                 CHECK (policy_type IN ('SAL','ASEAL','GOVERNANCE')),
  rules             JSONB        NOT NULL DEFAULT '{}',
  author            TEXT         NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deployed_at       TIMESTAMPTZ,
  deprecated_at     TIMESTAMPTZ,
  signature         TEXT,
  simulation_result JSONB,
  UNIQUE (name, version)
);

CREATE INDEX IF NOT EXISTS idx_policies_type_status ON policies (policy_type, status);
CREATE INDEX IF NOT EXISTS idx_policies_name        ON policies (name);
CREATE INDEX IF NOT EXISTS idx_policies_status      ON policies (status);

-- ── policy_audit_log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policy_audit_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id  UUID        NOT NULL REFERENCES policies(id) ON DELETE RESTRICT,
  event_type TEXT        NOT NULL
             CHECK (event_type IN (
               'CREATED','VALIDATED','SIMULATED','APPROVED',
               'DEPLOYED','DEPRECATED','ROLLED_BACK')),
  actor      TEXT        NOT NULL,
  metadata   JSONB       NOT NULL DEFAULT '{}',
  signature  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pal_policy_id  ON policy_audit_log (policy_id);
CREATE INDEX IF NOT EXISTS idx_pal_event_type ON policy_audit_log (event_type);
CREATE INDEX IF NOT EXISTS idx_pal_created_at ON policy_audit_log (created_at);

-- ── Append-only enforcement via rewrite rules ─────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_rules
    WHERE tablename = 'policy_audit_log' AND rulename = 'policy_audit_log_no_update'
  ) THEN
    EXECUTE 'CREATE RULE policy_audit_log_no_update
             AS ON UPDATE TO policy_audit_log DO INSTEAD NOTHING';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_rules
    WHERE tablename = 'policy_audit_log' AND rulename = 'policy_audit_log_no_delete'
  ) THEN
    EXECUTE 'CREATE RULE policy_audit_log_no_delete
             AS ON DELETE TO policy_audit_log DO INSTEAD NOTHING';
  END IF;
END;
$$;
""")

# ─────────────────────────────────────────────────────────────────────────────
# 4. api/src/governance/policy-registry.js
# ─────────────────────────────────────────────────────────────────────────────
write_file(os.path.join(ROOT, 'src/governance/policy-registry.js'), """\
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
    const { name, version, policy_type, rules = {}, simulation_result = null } = policy;
    if (!name || !version || !policy_type)
      throw Object.assign(new Error('name, version, and policy_type are required'), { code: 'VALIDATION_ERROR' });

    const id     = uuidv4();
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
""")

# ─────────────────────────────────────────────────────────────────────────────
# 5. api/src/routes/policy.js
# ─────────────────────────────────────────────────────────────────────────────
write_file(os.path.join(ROOT, 'src/routes/policy.js'), """\
'use strict';
// PLGS Sprint 1 — Policy Registry routes
// All routes require JWT authentication (wired in server.js).
//
// POST /api/policy/register
// POST /api/policy/:id/deploy
// POST /api/policy/:id/deprecate
// POST /api/policy/:id/rollback
// GET  /api/policy/active/:type
// GET  /api/policy/:id/history

const express  = require('express');
const registry = require('../governance/policy-registry');
const logger   = require('../utils/logger');

const router = express.Router();

function actor(req) {
  return req.user?.userId || req.user?.sub || 'unknown';
}

function handleErr(res, err) {
  const code = err.code || 'INTERNAL_ERROR';
  const map  = { NOT_FOUND: 404, VALIDATION_ERROR: 400,
                 INVALID_TRANSITION: 409, PRECONDITION_FAILED: 422 };
  const status = map[code] || 500;
  if (status >= 500) logger.error('policy_route_error', { error: err.message, code });
  res.status(status).json({ error: err.message, code });
}

// POST /api/policy/register
router.post('/register', async (req, res) => {
  try {
    const { name, version, policy_type, rules, simulation_result } = req.body;
    const policy = await registry.register(
      { name, version, policy_type, rules, simulation_result },
      actor(req)
    );
    res.status(201).json({ data: policy, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

// POST /api/policy/:id/deploy
router.post('/:id/deploy', async (req, res) => {
  try {
    const policy = await registry.deploy(req.params.id, actor(req));
    res.json({ data: policy, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

// POST /api/policy/:id/deprecate
router.post('/:id/deprecate', async (req, res) => {
  try {
    const policy = await registry.deprecate(req.params.id, actor(req), req.body.reason);
    res.json({ data: policy, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

// POST /api/policy/:id/rollback
router.post('/:id/rollback', async (req, res) => {
  try {
    const { version } = req.body;
    if (!version) return res.status(400).json({ error: 'version is required', code: 'VALIDATION_ERROR' });
    const result = await registry.rollback(req.params.id, version, actor(req));
    res.json({ data: result, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

// GET /api/policy/active/:type
router.get('/active/:type', async (req, res) => {
  try {
    const policies = await registry.getActive(req.params.type);
    res.json({ data: policies, count: policies.length, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

// GET /api/policy/:id/history
router.get('/:id/history', async (req, res) => {
  try {
    const history = await registry.getHistory(req.params.id);
    res.json({ data: history, count: history.length, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

module.exports = router;
""")

# ─────────────────────────────────────────────────────────────────────────────
# 6. Patch api/src/server.js — require + app.use + migration runner
# ─────────────────────────────────────────────────────────────────────────────
SERVER = os.path.join(ROOT, 'src/server.js')

REQUIRE_MARKER = "/* plgs-001-require */"
patch_file(
    SERVER,
    REQUIRE_MARKER,
    f"\nconst policyRouter = require('./routes/policy'); {REQUIRE_MARKER}\n",
    after="const dpoRouter         = require('./routes/dpo');"
)

ROUTE_MARKER = "/* plgs-001-route */"
patch_file(
    SERVER,
    ROUTE_MARKER,
    f"\napp.use('/api/policy', authenticate, policyRouter); {ROUTE_MARKER}\n",
    after="app.use('/api/ago/dpo', authenticate, dpoRouter);"
)

MIGRATE_MARKER = "/* plgs-001-migrate */"
patch_file(
    SERVER,
    MIGRATE_MARKER,
    f"""
const {{ runMigrations }} = require('./db/migrate'); {MIGRATE_MARKER}
runMigrations().catch(err =>
  logger.warn('plgs_migration_startup_error', {{ err: err.message }})
);
""",
    after="demoOnboardRouter.ensureGovernanceProfilesTable().catch(err =>\n  logger.warn('ensureGovernanceProfilesTable failed', { err: err.message })\n);"
)

# ─────────────────────────────────────────────────────────────────────────────
# 7. Patch api/package.json — add pg dependency
# ─────────────────────────────────────────────────────────────────────────────
PKG = os.path.join(ROOT, 'package.json')
with open(PKG) as f:
    pkg = json.load(f)

if 'pg' not in pkg.get('dependencies', {}):
    pkg.setdefault('dependencies', {})['pg'] = '^8.13.3'
    pkg['dependencies'] = dict(sorted(pkg['dependencies'].items()))
    with open(PKG, 'w') as f:
        json.dump(pkg, f, indent=2)
        f.write('\n')
    print(f'  patched    package.json  (added pg ^8.13.3)')
else:
    print(f'  already    package.json  (pg present)')

print('\nplgs_001 transform complete.')
