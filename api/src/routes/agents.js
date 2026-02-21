const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { AGENTS } = require('../data/agents');
const { deployments } = require('../data/deployments');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/agents
router.get('/', (req, res) => {
  const { category, search } = req.query;
  let results = [...AGENTS];

  if (category && category !== 'all') {
    results = results.filter(a => a.category.toLowerCase() === category.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  res.json({ data: results, total: results.length, timestamp: new Date().toISOString() });
});

// GET /api/agents/:id
router.get('/:id', (req, res) => {
  const agent = AGENTS.find(a => a.id === parseInt(req.params.id));
  if (!agent) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });
  res.json({ data: agent, timestamp: new Date().toISOString() });
});

// POST /api/agents/:id/deploy
router.post('/:id/deploy', (req, res) => {
  const agent = AGENTS.find(a => a.id === parseInt(req.params.id));
  if (!agent) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

  const deployment = {
    id: uuidv4(),
    agentId: agent.id,
    agentName: agent.name,
    agentIcon: agent.icon,
    status: 'running',
    deployedAt: new Date().toISOString(),
    config: req.body.config || {}
  };

  deployments.set(deployment.id, deployment);
  logger.info('agent_deployed', { agentId: agent.id, deploymentId: deployment.id });
  res.status(201).json({ data: deployment, timestamp: new Date().toISOString() });
});

module.exports = router;
