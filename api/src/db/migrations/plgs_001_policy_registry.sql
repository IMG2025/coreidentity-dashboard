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
