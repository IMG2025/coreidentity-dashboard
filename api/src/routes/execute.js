const express = require('express');
const { PutCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../utils/dynamodb');
const { executeAgent } = require('../ago/agoBridge');
const { AGENTS } = require('../data/agents');
const logger = require('../utils/logger');

const router = express.Router();
const EXECUTIONS_TABLE = 'coreidentity-executions';

// POST /api/agents/:id/execute
router.post('/:id/execute', async (req, res) => {
  try {
    const agentId  = parseInt(req.params.id);
    const { taskType = 'ANALYZE', inputs = {} } = req.body;
    const user = req.user;

    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

    const result = await executeAgent(agent, user, taskType.toUpperCase(), inputs);

    // Persist to DynamoDB — non-fatal if fails
    docClient.send(new PutCommand({
      TableName: EXECUTIONS_TABLE,
      Item: {
        executionId:  result.task_id,
        agentId:      agent.id,
        agentName:    agent.name,
        domainId:     result.domain_id,
        taskType:     result.task_type,
        status:       result.status,
        output:       JSON.stringify(result.output),
        requestedBy:  user.userId,
        executedAt:   result.executed_at
      }
    })).catch(err => logger.warn('execution_persist_failed', { error: err.message }));

    logger.info('agent_executed', { agentId: agent.id, taskType, domainId: result.domain_id, status: result.status, userId: user.userId });
    res.json({ data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    const isForbidden = err.message.includes('cannot perform');
    res.status(isForbidden ? 403 : 500).json({
      error: err.message,
      code:  isForbidden ? 'FORBIDDEN' : 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
