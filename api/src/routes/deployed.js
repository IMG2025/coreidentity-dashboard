const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { deployments } = require('../data/deployments');
const { agents } = require('../data/agents');
const router = express.Router();

// GET /api/deployed
router.get('/', (req, res) => {
  const results = Array.from(deployments.values());
  res.json({ data: results, total: results.length, timestamp: new Date().toISOString() });
});

// POST /api/deployed — deploy an agent
router.post('/', (req, res) => {
  const { agentId } = req.body;
  if (!agentId) {
    return res.status(400).json({ error: 'agentId required', code: 'VALIDATION_ERROR' });
  }

  const agent = agents.find(a => a.id === parseInt(agentId));
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });
  }

  const deployment = {
    id: uuidv4(),
    agentId: agent.id,
    agentName: agent.name,
    agentIcon: agent.icon,
    category: agent.category,
    status: 'running',
    deployedAt: new Date().toISOString(),
    userId: req.user?.userId || 'unknown'
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
