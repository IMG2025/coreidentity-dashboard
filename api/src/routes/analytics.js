// Analytics Route — /api/analytics
// Script 36 — aggregates deployment + execution + agent + governance stats
const express  = require('express');
const router   = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' }));

async function safeScan(TableName, FilterExpression, ExpressionAttributeValues) {
  try {
    const params = { TableName };
    if (FilterExpression) { params.FilterExpression = FilterExpression; params.ExpressionAttributeValues = ExpressionAttributeValues; }
    const result = await ddb.send(new ScanCommand(params));
    return result.Items || [];
  } catch(e) { console.warn('[Analytics] scan failed:', TableName, e.message); return []; }
}

// GET /api/analytics
router.get('/', async (req, res) => {
  const t0 = Date.now();
  const [deployments, executions, agents, workflows] = await Promise.all([
    safeScan('coreidentity-deployments'),
    safeScan('coreidentity-executions'),
    safeScan('smartnation-agents'),
    safeScan('coreidentity-workflows'),
  ]);

  // Deployment stats
  const depByStatus = deployments.reduce((acc, d) => {
    acc[d.status || 'unknown'] = (acc[d.status || 'unknown'] || 0) + 1; return acc;
  }, {});

  const depByCategory = deployments.reduce((acc, d) => {
    acc[d.category || 'unknown'] = (acc[d.category || 'unknown'] || 0) + 1; return acc;
  }, {});

  // Execution stats
  const execByStatus = executions.reduce((acc, e) => {
    acc[e.status || 'unknown'] = (acc[e.status || 'unknown'] || 0) + 1; return acc;
  }, {});

  const execByType = executions.reduce((acc, e) => {
    acc[e.taskType || 'unknown'] = (acc[e.taskType || 'unknown'] || 0) + 1; return acc;
  }, {});

  // Recent activity — last 7 days bucketed by day
  const now = Date.now();
  const days = 7;
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(now - (days - 1 - i) * 86400000);
    return { date: d.toISOString().slice(0, 10), deployments: 0, executions: 0 };
  });

  deployments.forEach(d => {
    const date = (d.deployedAt || d.createdAt || '').slice(0, 10);
    const b = buckets.find(b => b.date === date);
    if (b) b.deployments++;
  });
  executions.forEach(e => {
    const date = (e.startedAt || e.createdAt || '').slice(0, 10);
    const b = buckets.find(b => b.date === date);
    if (b) b.executions++;
  });

  // Agent compliance summary
  const governedAgents = agents.filter(a => a.governed || a.status === 'governed').length;
  const avgRating = agents.length
    ? (agents.reduce((s, a) => s + (parseFloat(a.rating) || 4.5), 0) / agents.length).toFixed(1)
    : 4.5;

  res.json({
    success: true,
    data: {
      summary: {
        totalDeployments:  deployments.length,
        activeDeployments: depByStatus.running || depByStatus.active || 0,
        totalExecutions:   executions.length,
        successRate:       executions.length
          ? Math.round(((execByStatus.completed || 0) / executions.length) * 100)
          : 0,
        totalAgents:       agents.length,
        governedAgents,
        activeWorkflows:   workflows.filter(w => w.status === 'active').length,
        avgAgentRating:    parseFloat(avgRating),
      },
      deploymentsByStatus:   depByStatus,
      deploymentsByCategory: depByCategory,
      executionsByStatus:    execByStatus,
      executionsByType:      execByType,
      activityTimeline:      buckets,
      recentDeployments: deployments
        .sort((a, b) => (b.deployedAt || '').localeCompare(a.deployedAt || ''))
        .slice(0, 10)
        .map(d => ({ agentId: d.agentId, agentName: d.agentName, status: d.status, deployedAt: d.deployedAt, category: d.category })),
      recentExecutions: executions
        .sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''))
        .slice(0, 10)
        .map(e => ({ executionId: e.executionId, agentId: e.agentId, taskType: e.taskType, status: e.status, startedAt: e.startedAt })),
    },
    latencyMs: Date.now() - t0,
    fetchedAt: new Date().toISOString()
  });
});

module.exports = router;
