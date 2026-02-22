const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE   = 'nexus-executions';
const client  = DynamoDBDocument.from(new DynamoDB({ region: process.env.AWS_REGION || 'us-east-2' }));

// Concurrency limits per risk tier
const TIER_LIMITS = { TIER_1: 50, TIER_2: 20, TIER_3: 5, TIER_4: 1 };

// Retry config per risk tier
const RETRY_CONFIG = {
  TIER_1: { maxRetries: 3, baseDelay: 500  },
  TIER_2: { maxRetries: 2, baseDelay: 1000 },
  TIER_3: { maxRetries: 1, baseDelay: 2000 },
  TIER_4: { maxRetries: 0, baseDelay: 0    }
};

// Circuit breaker state (in-memory, resets on container restart)
const circuitBreakers = {};

function getCircuitBreaker(agentId) {
  if (!circuitBreakers[agentId]) {
    circuitBreakers[agentId] = { failures: 0, state: 'CLOSED', openedAt: null };
  }
  return circuitBreakers[agentId];
}

function checkCircuitBreaker(agentId) {
  const cb = getCircuitBreaker(agentId);
  if (cb.state === 'OPEN') {
    const elapsed = Date.now() - cb.openedAt;
    if (elapsed > 60000) {
      cb.state = 'HALF_OPEN';
      return { allowed: true, state: 'HALF_OPEN' };
    }
    return { allowed: false, state: 'OPEN', reason: 'Circuit breaker open — agent suspended for 60s' };
  }
  return { allowed: true, state: cb.state };
}

function recordCircuitResult(agentId, success) {
  const cb = getCircuitBreaker(agentId);
  if (success) {
    cb.failures = 0;
    cb.state = 'CLOSED';
  } else {
    cb.failures++;
    if (cb.failures >= 3) {
      cb.state = 'OPEN';
      cb.openedAt = Date.now();
      console.warn('[Nexus] Circuit breaker OPENED for agent:', agentId);
    }
  }
}

async function createExecution(agentId, taskType, inputs, sentinelContext) {
  const executionId = uuidv4();
  const now = new Date().toISOString();

  const item = {
    executionId,
    agentId:         String(agentId),
    taskType:        taskType || 'ANALYZE',
    inputs:          inputs || {},
    status:          'QUEUED',
    riskTier:        sentinelContext ? sentinelContext.riskTier : 'TIER_2',
    policyDecision:  sentinelContext ? sentinelContext.decision : 'APPROVED',
    retryCount:      0,
    maxRetries:      RETRY_CONFIG[sentinelContext ? sentinelContext.riskTier : 'TIER_2'].maxRetries,
    createdAt:       now,
    updatedAt:       now,
    telemetry: {
      queuedAt:     now,
      startedAt:    null,
      completedAt:  null,
      duration:     null
    }
  };

  await client.put({ TableName: TABLE, Item: item });
  return item;
}

async function updateExecution(executionId, updates) {
  const expressions = [];
  const values      = {};
  const names       = {};

  Object.keys(updates).forEach(function(key, i) {
    const alias = '#k' + i;
    const val   = ':v' + i;
    names[alias] = key;
    values[val]  = updates[key];
    expressions.push(alias + ' = ' + val);
  });
  values[':u'] = new Date().toISOString();
  expressions.push('#updatedAt = :u');
  names['#updatedAt'] = 'updatedAt';

  await client.update({
    TableName: TABLE,
    Key: { executionId },
    UpdateExpression: 'SET ' + expressions.join(', '),
    ExpressionAttributeNames:  names,
    ExpressionAttributeValues: values
  });
}

async function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function dispatch(agentId, taskType, inputs, sentinelContext, agoHandler) {
  const riskTier = sentinelContext ? sentinelContext.riskTier : 'TIER_2';
  const retryConfig = RETRY_CONFIG[riskTier] || RETRY_CONFIG.TIER_2;

  // Circuit breaker check
  const cbCheck = checkCircuitBreaker(agentId);
  if (!cbCheck.allowed) {
    throw new Error('CIRCUIT_BREAKER_OPEN: ' + cbCheck.reason);
  }

  // Create execution record
  const execution = await createExecution(agentId, taskType, inputs, sentinelContext);
  const { executionId } = execution;

  // Mark as running
  const startedAt = new Date().toISOString();
  await updateExecution(executionId, {
    status:    'RUNNING',
    'telemetry.startedAt': startedAt
  });

  let lastError = null;
  let attempt   = 0;

  while (attempt <= retryConfig.maxRetries) {
    try {
      // Dispatch to AGO handler
      const result = await agoHandler(agentId, taskType, inputs);

      // Success
      const completedAt = new Date().toISOString();
      const duration    = Date.now() - new Date(startedAt).getTime();

      await updateExecution(executionId, {
        status:               'COMPLETED',
        result:               result,
        'telemetry.completedAt': completedAt,
        'telemetry.duration': duration,
        'telemetry.attempts': attempt + 1
      });

      recordCircuitResult(agentId, true);

      return {
        executionId,
        status:  'COMPLETED',
        result,
        duration,
        attempts: attempt + 1,
        riskTier,
        nexus: true
      };

    } catch (err) {
      lastError = err;
      attempt++;
      console.warn('[Nexus] Attempt ' + attempt + ' failed for agent ' + agentId + ': ' + err.message);

      if (attempt <= retryConfig.maxRetries) {
        const delay = retryConfig.baseDelay * Math.pow(2, attempt - 1);
        console.log('[Nexus] Retrying in ' + delay + 'ms...');
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  recordCircuitResult(agentId, false);
  await updateExecution(executionId, {
    status:      'FAILED',
    error:       lastError ? lastError.message : 'Unknown error',
    'telemetry.attempts': attempt
  });

  throw lastError || new Error('Execution failed after ' + attempt + ' attempts');
}

async function getExecution(executionId) {
  const result = await client.get({ TableName: TABLE, Key: { executionId } });
  return result.Item || null;
}

async function listExecutions(limit) {
  const result = await client.scan({ TableName: TABLE, Limit: limit || 50 });
  const items = result.Items || [];
  items.sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
  return items;
}

async function getExecutionStats() {
  const items = await listExecutions(200);
  const stats = {
    total:     items.length,
    completed: items.filter(function(i) { return i.status === 'COMPLETED'; }).length,
    failed:    items.filter(function(i) { return i.status === 'FAILED'; }).length,
    running:   items.filter(function(i) { return i.status === 'RUNNING'; }).length,
    queued:    items.filter(function(i) { return i.status === 'QUEUED'; }).length,
    circuitBreakers: Object.keys(circuitBreakers).map(function(id) {
      return { agentId: id, state: circuitBreakers[id].state, failures: circuitBreakers[id].failures };
    }).filter(function(cb) { return cb.state !== 'CLOSED'; })
  };

  const completed = items.filter(function(i) { return i.status === 'COMPLETED' && i.telemetry && i.telemetry.duration; });
  stats.avgDuration = completed.length
    ? Math.round(completed.reduce(function(sum, i) { return sum + i.telemetry.duration; }, 0) / completed.length)
    : 0;
  stats.successRate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 100;

  return stats;
}

module.exports = { dispatch, createExecution, updateExecution, getExecution, listExecutions, getExecutionStats, checkCircuitBreaker, getCircuitBreaker };
