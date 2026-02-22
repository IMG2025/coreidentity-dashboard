/**
 * Sentinel OS — Approval Workflow Engine
 * Manages pre-approval requirements for TIER_3 and TIER_4 operations.
 */
const { PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../utils/dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE = 'sentinel-approvals';

async function submitApprovalRequest(agentId, requestedBy, taskType, justification) {
  const item = {
    approvalId:   uuidv4(),
    agentId:      String(agentId),
    requestedBy,
    taskType,
    justification: justification || 'No justification provided',
    status:        'PENDING',
    submittedAt:   new Date().toISOString(),
    expiresAt:     new Date(Date.now() + 86400000).toISOString() // 24h TTL
  };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

async function approveRequest(approvalId, approvedBy) {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'approvalId = :id',
    ExpressionAttributeValues: { ':id': approvalId }
  }));
  const item = (result.Items || [])[0];
  if (!item) throw new Error('APPROVAL_NOT_FOUND');
  const updated = { ...item, status: 'APPROVED', approvedBy, approvedAt: new Date().toISOString() };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: updated }));
  return updated;
}

async function requiresApproval(agentId, userId, taskType) {
  // Check if there's a valid APPROVED record for this agent+user+taskType within 24h
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'agentId = :aid AND requestedBy = :uid AND taskType = :tt AND #s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':aid': String(agentId), ':uid': userId, ':tt': taskType, ':status': 'APPROVED'
      }
    }));
    const valid = (result.Items || []).filter(item =>
      new Date(item.expiresAt).getTime() > Date.now()
    );
    return valid.length > 0;
  } catch (err) {
    return false;
  }
}

async function listApprovals(status = null) {
  const params = { TableName: TABLE };
  if (status) {
    params.FilterExpression = '#s = :status';
    params.ExpressionAttributeNames = { '#s': 'status' };
    params.ExpressionAttributeValues = { ':status': status };
  }
  const result = await docClient.send(new ScanCommand(params));
  return (result.Items || []).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}

module.exports = { submitApprovalRequest, approveRequest, requiresApproval, listApprovals };
