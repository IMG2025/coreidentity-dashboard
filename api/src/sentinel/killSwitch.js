/**
 * Sentinel OS — Kill Switch Registry
 * Runtime agent termination and suspension management.
 */
const { PutCommand, GetCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../utils/dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE = 'sentinel-kill-switches';

async function activateKillSwitch(agentId, activatedBy, reason) {
  const item = {
    killSwitchId:  uuidv4(),
    agentId:       String(agentId),
    activatedBy,
    reason:        reason || 'No reason provided',
    activatedAt:   new Date().toISOString(),
    status:        'ACTIVE'
  };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

async function deactivateKillSwitch(agentId, deactivatedBy) {
  // Scan for active kill switch on this agent
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'agentId = :aid AND #s = :status',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':aid': String(agentId), ':status': 'ACTIVE' }
  }));

  for (const item of (result.Items || [])) {
    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: { ...item, status: 'DEACTIVATED', deactivatedBy, deactivatedAt: new Date().toISOString() }
    }));
  }
  return { agentId, deactivated: true, deactivatedBy };
}

async function isKillSwitchActive(agentId) {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'agentId = :aid AND #s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':aid': String(agentId), ':status': 'ACTIVE' }
    }));
    return (result.Items || []).length > 0;
  } catch (err) {
    // Fail open on DynamoDB error — do not block execution for infra issues
    console.error('[Sentinel] Kill switch check failed:', err.message);
    return false;
  }
}

async function listKillSwitches(activeOnly = true) {
  const params = { TableName: TABLE };
  if (activeOnly) {
    params.FilterExpression = '#s = :status';
    params.ExpressionAttributeNames = { '#s': 'status' };
    params.ExpressionAttributeValues = { ':status': 'ACTIVE' };
  }
  const result = await docClient.send(new ScanCommand(params));
  return result.Items || [];
}

module.exports = { activateKillSwitch, deactivateKillSwitch, isKillSwitchActive, listKillSwitches };
