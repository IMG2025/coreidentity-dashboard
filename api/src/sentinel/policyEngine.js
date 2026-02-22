/**
 * Sentinel OS — Policy Engine
 * Enforces all governance policies before any execution reaches Nexus.
 * Single responsibility: answer "Is this allowed to happen?"
 */
const { resolveRiskTier, getTierDefinition } = require('./riskTiers');
const { isKillSwitchActive } = require('./killSwitch');
const { logSecurityEvent } = require('./securityEvents');
const { isPendingApproval, requiresApproval } = require('./approvalWorkflows');

class PolicyViolation extends Error {
  constructor(code, message, metadata = {}) {
    super(message);
    this.name = 'PolicyViolation';
    this.code = code;
    this.metadata = metadata;
    this.httpStatus = 403;
  }
}

async function enforcePolicy(agent, user, taskType) {
  const agentId    = String(agent.id);
  const tierId     = resolveRiskTier(agent.category, taskType);
  const tier       = getTierDefinition(tierId);
  const context    = { agentId, agentName: agent.name, userId: user.userId, role: user.role, taskType, tierId };

  // ── Check 1: Kill switch ────────────────────────────────────────────
  const killActive = await isKillSwitchActive(agentId);
  if (killActive) {
    await logSecurityEvent('KILL_SWITCH_BLOCKED', { ...context, severity: 'HIGH' });
    throw new PolicyViolation(
      'KILL_SWITCH_ACTIVE',
      `Agent ${agent.name} is currently suspended by Sentinel kill switch`,
      context
    );
  }

  // ── Check 2: Role authorization ─────────────────────────────────────
  if (!tier.allowed_roles.includes(user.role)) {
    await logSecurityEvent('ROLE_POLICY_VIOLATION', { ...context, severity: 'MEDIUM',
      required_roles: tier.allowed_roles });
    throw new PolicyViolation(
      'ROLE_NOT_AUTHORIZED',
      `Role ${user.role} is not authorized for ${tierId} operations`,
      context
    );
  }

  // ── Check 3: Task type authorization ────────────────────────────────
  if (!tier.allowed_task_types.includes(taskType)) {
    await logSecurityEvent('TASK_TYPE_POLICY_VIOLATION', { ...context, severity: 'MEDIUM',
      allowed_task_types: tier.allowed_task_types });
    throw new PolicyViolation(
      'TASK_TYPE_NOT_AUTHORIZED',
      `Task type ${taskType} is not authorized for ${tierId} agents`,
      context
    );
  }

  // ── Check 4: Approval requirement ───────────────────────────────────
  if (tier.requires_approval) {
    const approved = await requiresApproval(agentId, user.userId, taskType);
    if (!approved) {
      await logSecurityEvent('APPROVAL_REQUIRED', { ...context, severity: 'LOW' });
      throw new PolicyViolation(
        'APPROVAL_REQUIRED',
        `${tierId} operations require pre-approval. Submit an approval request to proceed.`,
        { ...context, approval_required: true }
      );
    }
  }

  // ── Policy passed — log audit event ─────────────────────────────────
  await logSecurityEvent('POLICY_ENFORCED_PASS', { ...context, severity: 'INFO', tierId });

  return { allowed: true, tierId, tier, context };
}

module.exports = { enforcePolicy, PolicyViolation };
