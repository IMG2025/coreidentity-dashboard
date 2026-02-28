const express  = require('express');
const router    = express.Router();
const { authenticate } = require('../middleware/auth');
const Sentinel  = require('../sentinel');
const NexusOS   = require('../nexus');
const agentRegistry = require('../smartnation/agentRegistry');

async function agoExecutor(agentId, taskType, inputs) {
  const agent = await agentRegistry.getAgent(agentId);
  const name  = agent ? agent.name : 'Agent ' + agentId;
  const category   = agent ? agent.category : 'General';
  const verticalId = (inputs && inputs.verticalId) || (agent && agent.verticalId) || 'hospitality';
  return agoRouter.route(String(agentId), name, category, taskType, inputs || {}, verticalId);
}

// POST /api/execute/:agentId/execute
router.post('/:agentId/execute', authenticate, async function(req, res) {
  const { agentId } = req.params;
  const { taskType = 'ANALYZE', inputs = {}, justification } = req.body;

  try {
    // 1. Sentinel policy enforcement
    const policyResult = await Sentinel.enforcePolicy({
      agentId, taskType, userId: req.user.userId,
      userRole: req.user.role, inputs, justification
    });

    if (!policyResult.approved) {
      return res.status(403).json({
        error:   'Policy violation — execution blocked by Sentinel OS',
        reason:  policyResult.reason,
        code:    'SENTINEL_BLOCKED',
        eventId: policyResult.eventId
      });
    }

    // 2. Nexus OS execution with lifecycle management
    const execution = await NexusOS.dispatch(
      agentId, taskType, inputs,
      { riskTier: policyResult.riskTier, decision: 'APPROVED', eventId: policyResult.eventId },
      agoExecutor
    );

    // 3. Update SmartNation agent metrics
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
    console.error('[Execute] Error:', err);
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
