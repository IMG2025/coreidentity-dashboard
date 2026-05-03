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
