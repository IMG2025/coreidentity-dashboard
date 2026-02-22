/**
 * Execution Route — Sentinel-enforced
 * Flow: JWT auth → Sentinel.enforcePolicy() → AGO dispatch → Audit
 * Sentinel is the gate. Nothing executes without policy clearance.
 */
const express    = require('express');
const { PutCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient }  = require('../utils/dynamodb');
const Sentinel       = require('../sentinel');
const { executeAgent } = require('../ago/agoBridge');
const { AGENTS }     = require('../data/agents');
const logger         = require('../utils/logger');

const router = express.Router();
const EXECUTIONS_TABLE = 'coreidentity-executions';

router.post('/:id/execute', async (req, res) => {
  try {
    const agentId  = parseInt(req.params.id);
    const { taskType = 'ANALYZE', inputs = {} } = req.body;
    const user = req.user;

    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

    // ── SENTINEL POLICY ENFORCEMENT ─────────────────────────────────
    const policy = await Sentinel.enforcePolicy(agent, user, taskType.toUpperCase());

    // ── AGO EXECUTION (Nexus dispatch layer — Session 3) ────────────
    const result = await executeAgent(agent, user, taskType.toUpperCase(), {
      ...inputs,
      sentinel_tier_id:    policy.tierId,
      sentinel_audit_level: policy.tier.audit_level
    });

    // ── SENTINEL AUDIT RECORD ───────────────────────────────────────
    docClient.send(new PutCommand({
      TableName: EXECUTIONS_TABLE,
      Item: {
        executionId:  result.task_id,
        agentId:      agent.id,
        agentName:    agent.name,
        domainId:     result.domain_id,
        taskType:     result.task_type,
        tierId:       policy.tierId,
        auditLevel:   policy.tier.audit_level,
        status:       result.status,
        output:       JSON.stringify(result.output),
        requestedBy:  user.userId,
        executedAt:   result.executed_at,
        auditSource:  'SENTINEL_OS'
      }
    })).catch(err => logger.warn('execution_persist_failed', { error: err.message }));

    logger.info('agent_executed', {
      agentId: agent.id, taskType, domainId: result.domain_id,
      tierId: policy.tierId, status: result.status, userId: user.userId
    });

    res.json({
      data: { ...result, sentinel: { tier_id: policy.tierId, audit_level: policy.tier.audit_level, policy_enforced: true } },
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    if (err.name === 'PolicyViolation') {
      return res.status(err.httpStatus).json({
        error:   err.message,
        code:    err.code,
        metadata: err.metadata,
        sentinel: { policy_violation: true, timestamp: new Date().toISOString() }
      });
    }
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
