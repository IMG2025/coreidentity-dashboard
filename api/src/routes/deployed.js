const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { deployments } = require('../data/deployments');
const { AGENTS: agents } = require('../data/agents');
const agentRegistry = require('../smartnation/agentRegistry');
const router = express.Router();

// GET /api/deployed
router.get('/', (req, res) => {
  const results = Array.from(deployments.values());
  res.json({ data: results, total: results.length, timestamp: new Date().toISOString() });
});

// POST /api/deployed — deploy an agent (static data + DynamoDB fallback)
router.post('/', async function(req, res) {
  const { agentId } = req.body;
  if (!agentId) {
    return res.status(400).json({ error: 'agentId required', code: 'VALIDATION_ERROR' });
  }

  // Try static data first (integer match or string match)
  let agent = agents.find(function(a) {
    return a.id === parseInt(agentId) || String(a.id) === String(agentId);
  });

  // Fallback: look up in SmartNation DynamoDB registry
  if (!agent) {
    try {
      const regAgent = await agentRegistry.getAgent(String(agentId));
      if (regAgent) {
        agent = {
          id:       regAgent.agentId || agentId,
          name:     regAgent.name    || 'Agent ' + agentId,
          icon:     regAgent.icon    || '🤖',
          category: regAgent.category || 'General',
        };
      }
    } catch(e) {
      console.warn('[deployed] Registry lookup failed:', e.message);
    }
  }

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });
  }

  const deployment = {
    id:          uuidv4(),
    agentId:     String(agent.id),
    agentName:   agent.name,
    agentIcon:   agent.icon || '🤖',
    category:    agent.category,
    status:      'running',
    deployedAt:  new Date().toISOString(),
    userId:      req.user?.userId || 'unknown',
    source:      'SmartNation AI Registry',
  };

  deployments.set(deployment.id, deployment);
  res.status(201).json({ data: deployment, timestamp: new Date().toISOString() });
});

// POST /api/deployed/:id/stop
router.post('/:id/stop', (req, res) => {
  const deployment = deployments.get(req.params.id);
  if (!deployment) {
    return res.status(404).json({ error: 'Deployment not found', code: 'NOT_FOUND' });
  }
  deployment.status = 'stopped';
  deployment.stoppedAt = new Date().toISOString();
  deployments.set(deployment.id, deployment);
  res.json({ data: deployment, timestamp: new Date().toISOString() });
});

module.exports = router;
