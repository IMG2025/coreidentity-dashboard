/* patch-31 */
const express       = require('express');
const router        = express.Router();
const { authenticate } = require('../middleware/auth');
const Sentinel      = require('../sentinel');
const NexusOS       = require('../nexus');
const agentRegistry = require('../smartnation/agentRegistry');
const { executeAgent: agoExecuteAgent } = require('../ago/agoBridge');
const { arbitrate: salArbitrate } = require('../sal/salClient');

// Executor passed to NexusOS — uses agoBridge directly
async function agoExecutor(agentId, taskType, inputs) {
  const agent = await agentRegistry.getAgent(String(agentId));
  if (!agent) throw new Error('Agent not found: ' + agentId);
  return agoExecuteAgent(agent, { userId: 'system', role: 'ADMIN' }, taskType, inputs || {});
}

// POST /api/execute/:agentId/execute
router.post('/:agentId/execute', authenticate, async function(req, res) {
  const { agentId } = req.params;
  const { taskType = 'ANALYZE', inputs = {}, justification } = req.body;

  try {
    // 1. Look up agent
    const agent = await agentRegistry.getAgent(String(agentId));
    const agentObj = agent || { agentId, name: 'Agent ' + agentId, category: 'General' };

    // 2. Sentinel policy enforcement — correct 3-arg signature
    const policyResult = await Sentinel.enforcePolicy(
      agentObj,
      req.user,
      taskType
    );

    if (!policyResult.allowed) {
      return res.status(403).json({
        error:   'Policy violation — execution blocked by Sentinel OS',
        reason:  policyResult.reason,
        code:    'SENTINEL_BLOCKED',
        eventId: policyResult.eventId
      });
    }

    // 3. Nexus OS execution with lifecycle management
    // ── SAL KERNEL ARBITRATION — IIAAC Five-Dimension Evaluation ─────────
    /* sal-integration-v1 */
    const salResult = await salArbitrate(
      agentObj || agent,
      req.user,
      taskType,
      policyResult,
      req
    );

    if (!salResult.allowed) {
      const isSalEscalated = salResult.escalated === true;
      return res.status(isSalEscalated ? 202 : 403).json({
        error:       isSalEscalated
                       ? 'Execution escalated for human review — SAL governance gate'
                       : 'Execution blocked by SAL governance gate',
        reason:      salResult.reason,
        code:        salResult.errorCode || 'SAL_BLOCKED',
        proof_pack_id: salResult.proofPackId,
        sal:         { blocked: true, escalated: isSalEscalated, timestamp: new Date().toISOString() }
      });
    }
    // ── END SAL GATE ───────────────────────────────────────────────────────


    const execution = await NexusOS.dispatch(
      agentId, taskType, inputs,
      { riskTier: policyResult.tierId, decision: 'APPROVED', eventId: policyResult.eventId },
      agoExecutor
    );

    // 4. Update SmartNation agent metrics (non-blocking)
    agentRegistry.updateAgentMetrics(agentId, { executionResult: 'success', taskType })
      .catch(function(e) { console.warn('[Execute] Metrics update failed:', e.message); });

    res.json({
      success:     true,
      executionId: execution.executionId,
      status:      execution.status,
      result:      execution.result,
      duration:    execution.duration,
      attempts:    execution.attempts,
      riskTier:    execution.riskTier,
      nexus:       true,
      sentinel:    { approved: true, eventId: policyResult.eventId }
    });

  } catch(err) {
    console.error('[Execute] Error:', err.message);
    const isCircuitBreaker = err.message && err.message.includes('CIRCUIT_BREAKER_OPEN');
    res.status(isCircuitBreaker ? 503 : 500).json({
      error: err.message,
      code:  isCircuitBreaker ? 'CIRCUIT_BREAKER_OPEN' : 'EXECUTION_ERROR'
    });
  }
});

// GET /api/execute/nexus/status
router.get('/nexus/status', authenticate, async function(req, res) {
  try {
    const status = await NexusOS.getStatus();
    res.json({ success: true, data: status });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/execute/nexus/executions
router.get('/nexus/executions', authenticate, async function(req, res) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const executions = await NexusOS.runtime.listExecutions(limit);
    res.json({ success: true, data: executions, count: executions.length });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
