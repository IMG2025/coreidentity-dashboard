const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const agentRegistry    = require('../smartnation/agentRegistry');

// GET /api/agents — list from SmartNation registry
router.get('/', authenticate, async function(req, res) {
  try {
    const { category, search, limit, offset } = req.query;
    const agents = await agentRegistry.listAgents({
      category: category || 'all',
      search:   search   || '',
      limit:    limit  ? parseInt(limit)  : 50,
      offset:   offset ? parseInt(offset) : 0,
    });
    res.json({ success: true, data: agents, count: agents.length, limit: parseInt(limit||50), offset: parseInt(offset||0), source: 'SmartNation AI Registry' });
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

// POST /api/agents/:id/deploy — deploy an agent
router.post('/:id/deploy', authenticate, async function(req, res) {
  try {
    const agentId = req.params.id;
    const agent = await agentRegistry.getAgent(agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

    // Record deployment in coreidentity-deployments table
    const { DynamoDB } = require('@aws-sdk/client-dynamodb');
    const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
    const client = DynamoDBDocument.from(new DynamoDB({ region: process.env.AWS_REGION || 'us-east-2' }));
    const deploymentId = require('crypto').randomUUID();
    const now = new Date().toISOString();

    await client.put({
      TableName: 'coreidentity-deployments',
      Item: {
        deploymentId,
        agentId: agentId,
        agentName: agent.name,
        vertical: agent.vertical || agent.verticalKey || 'unknown',
        category: agent.category || 'unknown',
        riskTier: agent.riskTier || 'TIER_2',
        governanceScore: agent.governanceScore || 0,
        status: 'active',
        deployedBy: req.user?.email || 'admin',
        deployedAt: now,
        updatedAt: now,
        complianceFrameworks: agent.complianceFrameworks || [],
      }
    });

    res.json({
      success: true,
      data: { deploymentId, agentId, agentName: agent.name, status: 'active', deployedAt: now },
      message: `Agent ${agent.name} deployed successfully`
    });
  } catch(err) {
    console.error('[Agents] Deploy error:', err);
    res.status(500).json({ error: 'Deployment failed', code: 'DEPLOY_ERROR', details: err.message });
  }
});

module.exports = router;
