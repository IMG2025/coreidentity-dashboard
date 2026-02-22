const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const agentRegistry    = require('../smartnation/agentRegistry');

// GET /api/agents — list from SmartNation registry
router.get('/', authenticate, async function(req, res) {
  try {
    const { category, search, limit } = req.query;
    const agents = await agentRegistry.listAgents({
      category: category || 'all',
      search:   search   || '',
      limit:    limit ? parseInt(limit) : undefined
    });
    res.json({ success: true, data: agents, count: agents.length, source: 'SmartNation AI Registry' });
  } catch(err) {
    console.error('[Agents] List error:', err);
    res.status(500).json({ error: 'Failed to fetch agents', code: 'REGISTRY_ERROR' });
  }
});

// GET /api/agents/:id — get single agent
router.get('/:id', authenticate, async function(req, res) {
  try {
    const agent = await agentRegistry.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });
    res.json({ success: true, data: agent });
  } catch(err) {
    console.error('[Agents] Get error:', err);
    res.status(500).json({ error: 'Failed to fetch agent', code: 'REGISTRY_ERROR' });
  }
});

// GET /api/agents/registry/summary — SmartNation intelligence summary
router.get('/registry/summary', authenticate, async function(req, res) {
  try {
    const summary = await agentRegistry.getRegistrySummary();
    res.json({ success: true, data: summary });
  } catch(err) {
    res.status(500).json({ error: 'Registry summary failed', code: 'REGISTRY_ERROR' });
  }
});

module.exports = router;
