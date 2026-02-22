const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');

const TABLE = 'smartnation-agents';
const client = DynamoDBDocument.from(new DynamoDB({ region: process.env.AWS_REGION || 'us-east-2' }));

const TIER_MAP = {
  'Customer Service': 'TIER_1', 'Research': 'TIER_1',
  'Communication': 'TIER_2',   'Data Analysis': 'TIER_2',
  'Document Processing': 'TIER_2', 'Marketing': 'TIER_2',
  'Integration': 'TIER_3',    'Compliance': 'TIER_3', 'Legal': 'TIER_3'
};

const COMPLIANCE_MAP = {
  'Customer Service': ['SOC2'],
  'Research':         ['SOC2', 'GDPR'],
  'Communication':    ['SOC2', 'HIPAA'],
  'Data Analysis':    ['SOC2', 'HIPAA', 'GDPR'],
  'Document Processing': ['SOC2', 'GDPR'],
  'Marketing':        ['SOC2', 'CCPA'],
  'Integration':      ['SOC2', 'ISO27001'],
  'Compliance':       ['SOC2', 'HIPAA', 'GDPR', 'CCPA', 'ISO27001'],
  'Legal':            ['SOC2', 'GDPR', 'ISO27001']
};

async function getAgent(agentId) {
  const result = await client.get({ TableName: TABLE, Key: { agentId: String(agentId) } });
  return result.Item || null;
}

async function listAgents({ category, search, limit } = {}) {
  const params = { TableName: TABLE };
  
  const result = await client.scan(params);
  let items = result.Items || [];

  if (category && category !== 'all') {
    items = items.filter(function(a) { return a.category === category; });
  }

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(function(a) {
      return (a.name && a.name.toLowerCase().includes(q)) ||
             (a.description && a.description.toLowerCase().includes(q)) ||
             (a.category && a.category.toLowerCase().includes(q));
    });
  }

  items.sort(function(a, b) { return (b.governanceScore || 0) - (a.governanceScore || 0); });

  if (limit) items = items.slice(0, limit);
  return items;
}

async function upsertAgent(agent) {
  const now = new Date().toISOString();
  const tier = TIER_MAP[agent.category] || 'TIER_2';
  const compliance = COMPLIANCE_MAP[agent.category] || ['SOC2'];
  
  const item = {
    agentId:         String(agent.id || agent.agentId),
    name:            agent.name,
    category:        agent.category,
    description:     agent.description || '',
    icon:            agent.icon || '🤖',
    tier:            agent.tier || 'Standard',
    riskTier:        tier,
    compliance:      compliance,
    status:          agent.status || 'active',
    rating:          agent.rating || 4.5,
    deployments:     agent.deployments || 0,
    governanceScore: calculateGovernanceScore(agent, tier, compliance),
    domainId:        agent.domainId || 'chc-ops',
    createdAt:       agent.createdAt || now,
    updatedAt:       now,
    version:         '1.0.0',
    registeredBy:    'SmartNation AI'
  };

  await client.put({ TableName: TABLE, Item: item });
  return item;
}

function calculateGovernanceScore(agent, tier, compliance) {
  let score = 70;
  if (tier === 'TIER_1') score += 20;
  if (tier === 'TIER_2') score += 15;
  if (tier === 'TIER_3') score += 5;
  score += Math.min(10, compliance.length * 2);
  if (agent.rating >= 4.5) score += 5;
  return Math.min(100, score);
}

async function updateAgentMetrics(agentId, { executionResult, taskType } = {}) {
  const agent = await getAgent(agentId);
  if (!agent) return;
  
  const deployments = (agent.deployments || 0) + 1;
  const successRate  = executionResult === 'success'
    ? Math.min(100, (agent.successRate || 95) * 0.9 + 10)
    : Math.max(0,   (agent.successRate || 95) * 0.9);

  await client.update({
    TableName: TABLE,
    Key: { agentId: String(agentId) },
    UpdateExpression: 'SET deployments = :d, successRate = :s, lastExecuted = :t, updatedAt = :u',
    ExpressionAttributeValues: {
      ':d': deployments,
      ':s': Math.round(successRate),
      ':t': new Date().toISOString(),
      ':u': new Date().toISOString()
    }
  });
}

async function getRegistrySummary() {
  const items = await listAgents();
  const byCategory = {};
  const byTier     = {};
  let totalScore   = 0;

  for (const agent of items) {
    byCategory[agent.category] = (byCategory[agent.category] || 0) + 1;
    byTier[agent.riskTier]     = (byTier[agent.riskTier]     || 0) + 1;
    totalScore += agent.governanceScore || 0;
  }

  return {
    totalAgents:      items.length,
    activeAgents:     items.filter(function(a) { return a.status === 'active'; }).length,
    avgGovernanceScore: items.length ? Math.round(totalScore / items.length) : 0,
    byCategory,
    byTier,
    topAgents: items.slice(0, 5).map(function(a) {
      return { agentId: a.agentId, name: a.name, governanceScore: a.governanceScore, riskTier: a.riskTier };
    })
  };
}

module.exports = { getAgent, listAgents, upsertAgent, updateAgentMetrics, getRegistrySummary, calculateGovernanceScore };
