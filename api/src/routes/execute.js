const express  = require('express');
const router    = express.Router();
const { authenticate } = require('../middleware/auth');
const Sentinel  = require('../sentinel');
const NexusOS   = require('../nexus');
const agentRegistry = require('../smartnation/agentRegistry');

// AGO domain executor — dispatches to appropriate domain handler
async function agoExecutor(agentId, taskType, inputs) {
  const agent = await agentRegistry.getAgent(agentId);
  const name  = agent ? agent.name : 'Agent ' + agentId;
  const category = agent ? agent.category : 'General';

  // Simulate domain-specific execution
  // Session 4 wires real domain handlers per category
  const domainResults = {
    'Data Analysis':       { insights: ['Trend detected', 'Anomaly flagged'], confidence: 0.94 },
    'Research':            { findings: ['3 sources analyzed', 'Key patterns identified'], relevance: 0.89 },
    'Compliance':          { controls: ['SOC2 validated', 'GDPR check passed'], score: 98 },
    'Communication':       { sent: true, channel: 'email', deliveryRate: 0.99 },
    'Document Processing': { pages: 12, extracted: 847, confidence: 0.96 },
    'Marketing':           { reach: 12400, engagement: 0.034, conversions: 47 },
    'Integration':         { synced: true, records: 1204, errors: 0 },
    'Customer Service':    { resolved: true, sentiment: 'positive', csat: 4.8 },
    'Legal':               { reviewed: true, risks: 0, recommendations: 2 }
  };

  const domainResult = domainResults[category] || { completed: true };

  return {
    agentId:    String(agentId),
    agentName:  name,
    category,
    taskType,
    status:     'success',
    result:     domainResult,
    timestamp:  new Date().toISOString(),
    executedBy: 'Nexus OS'
  };
}

// POST /api/execute/:agentId/execute
router.post('/:agentId/execute', authenticate, async function(req, res) {
  const { agentId } = req.params;
  const { taskType = 'ANALYZE', inputs = {}, justification } = req.body;

  try {
    // 1. Sentinel policy enforcement
    const policyResult = await Sentinel.enforcePolicy({
      agentId, taskType, userId: req.user.id,
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
