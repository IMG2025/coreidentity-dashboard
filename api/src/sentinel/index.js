/**
 * Sentinel OS — Governance and Security Operating System
 * CoreIdentity Platform | Core Holding Corp
 *
 * Single entry point for all Sentinel OS capabilities.
 * Every execution, policy check, and security event routes through here.
 *
 * Architecture guardrail: Sentinel enforces. Sentinel does not execute.
 */
const { enforcePolicy, PolicyViolation } = require('./policyEngine');
const { activateKillSwitch, deactivateKillSwitch, isKillSwitchActive, listKillSwitches } = require('./killSwitch');
const { logSecurityEvent, getSecurityEvents, getSecuritySummary } = require('./securityEvents');
const { submitApprovalRequest, approveRequest, requiresApproval, listApprovals } = require('./approvalWorkflows');
const { writeAuditRecord, getAuditSummary } = require('./auditEngine');
const { resolveRiskTier, getTierDefinition, RISK_TIERS } = require('./riskTiers');

const SENTINEL_VERSION = '1.0.0';

async function getStatus() {
  const [securitySummary, auditSummary, activeKillSwitches, pendingApprovals] = await Promise.all([
    getSecuritySummary(),
    getAuditSummary(),
    listKillSwitches(true),
    listApprovals('PENDING')
  ]);

  return {
    system:           'Sentinel OS',
    version:          SENTINEL_VERSION,
    status:           'OPERATIONAL',
    plane:            'Control Plane',
    owner:            'CoreIdentity',
    timestamp:        new Date().toISOString(),
    security_summary: securitySummary,
    audit_summary:    auditSummary,
    active_kill_switches: activeKillSwitches.length,
    pending_approvals:    pendingApprovals.length,
    governance_health: computeGovernanceHealth(securitySummary, activeKillSwitches.length)
  };
}

function computeGovernanceHealth(securitySummary, activeKillSwitches) {
  let score = 100;
  score -= securitySummary.high_severity_24h * 5;
  score -= securitySummary.violations_24h * 2;
  score -= activeKillSwitches * 3;
  return Math.max(0, Math.min(100, score));
}

module.exports = {
  // Core enforcement
  enforcePolicy,
  PolicyViolation,
  // Kill switches
  activateKillSwitch,
  deactivateKillSwitch,
  isKillSwitchActive,
  listKillSwitches,
  // Security events
  logSecurityEvent,
  getSecurityEvents,
  getSecuritySummary,
  // Approvals
  submitApprovalRequest,
  approveRequest,
  requiresApproval,
  listApprovals,
  // Audit
  writeAuditRecord,
  getAuditSummary,
  // Risk tiers
  resolveRiskTier,
  getTierDefinition,
  RISK_TIERS,
  // Status
  getStatus,
  computeGovernanceHealth,
  SENTINEL_VERSION
};
