// Analytics Route — /api/analytics
// Script 36 — aggregates deployment + execution + agent + governance stats
const express  = require('express');
const router   = express.Router();
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');

const ddb = DynamoDBDocument.from(new DynamoDB({ region: process.env.AWS_REGION || 'us-east-2' }));

// SCAN_TIMEOUT_MS — hard ceiling; single-page scan with Limit avoids unbounded pagination
const SCAN_TIMEOUT_MS = 3500;
const _analyticsCache = { data: null, expires: 0 };

async function safeScan(TableName, signal) {
  try {
    const result = await ddb.send(new ScanCommand({ TableName, Limit: 500 }), { abortSignal: signal });
    return result.Items || [];
  } catch (e) {
    if (e.name === 'AbortError' || (e.message && e.message.includes('abort'))) {
      console.warn('[Analytics] scan aborted (timeout):', TableName);
    } else {
      console.warn('[Analytics] scan failed:', TableName, e.message);
    }
    return [];
  }
}

function buildFallbackData() {
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    return { date: d.toISOString().slice(0, 10), deployments: 0, executions: 0 };
  });
  return {
    summary: { totalDeployments:0, activeDeployments:0, totalExecutions:0,
      successRate:0, totalAgents:0, governedAgents:0, activeWorkflows:0, avgAgentRating:4.5 },
    deploymentsByStatus:{}, deploymentsByCategory:{}, executionsByStatus:{},
    executionsByType:{}, activityTimeline: buckets, recentDeployments:[], recentExecutions:[]
  };
}

// GET /api/analytics
router.get('/', async (req, res) => {
  const t0 = Date.now();

  if (_analyticsCache.data && Date.now() < _analyticsCache.expires) {
    return res.json({ ..._analyticsCache.data, _cache: true, latencyMs: Date.now() - t0 });
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

  let deployments, executions, agents, workflows;
  try {
    [deployments, executions, agents, workflows] = await Promise.all([
      safeScan('coreidentity-deployments', controller.signal),
      safeScan('coreidentity-executions',  controller.signal),
      safeScan('smartnation-agents',       controller.signal),
      safeScan('coreidentity-workflows',   controller.signal),
    ]);
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn('[Analytics] scan error:', e.message);
    return res.json({ success: true, data: buildFallbackData(), _error: true,
      latencyMs: Date.now() - t0, fetchedAt: new Date().toISOString() });
  }

  clearTimeout(timeoutId);

  if (controller.signal.aborted) {
    console.warn('[Analytics] DynamoDB scans timed out — returning fallback');
    return res.json({ success: true, data: buildFallbackData(), _timeout: true,
      latencyMs: Date.now() - t0, fetchedAt: new Date().toISOString() });
  }

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

  const responseBody = {
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
  };
  _analyticsCache.data = responseBody;
  _analyticsCache.expires = Date.now() + 60000;
  res.json({ ...responseBody, _cache: false, latencyMs: Date.now() - t0 });
});

module.exports = router;
