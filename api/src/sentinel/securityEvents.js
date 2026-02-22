/**
 * Sentinel OS — Security Event Aggregation
 * All security events across the platform flow through here.
 * Non-fatal: event logging never blocks execution.
 */
const { PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../utils/dynamodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const TABLE = 'sentinel-security-events';

const SEVERITY_LEVELS = { FORENSIC: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };

async function logSecurityEvent(eventType, metadata = {}) {
  try {
    const item = {
      eventId:    uuidv4(),
      eventType,
      severity:   metadata.severity || 'INFO',
      agentId:    metadata.agentId || null,
      agentName:  metadata.agentName || null,
      userId:     metadata.userId || null,
      role:       metadata.role || null,
      taskType:   metadata.taskType || null,
      tierId:     metadata.tierId || null,
      metadata:   JSON.stringify(metadata),
      timestamp:  new Date().toISOString(),
      source:     'SENTINEL_OS'
    };
    await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  } catch (err) {
    // Non-fatal — log locally but never throw
    logger.warn('sentinel_event_log_failed', { eventType, error: err.message });
  }
}

async function getSecurityEvents(limit = 50, severityFilter = null) {
  const params = { TableName: TABLE };
  if (severityFilter) {
    params.FilterExpression = 'severity = :sev';
    params.ExpressionAttributeValues = { ':sev': severityFilter };
  }
  const result = await docClient.send(new ScanCommand(params));
  const items  = result.Items || [];
  return items
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

async function getSecuritySummary() {
  const result = await docClient.send(new ScanCommand({ TableName: TABLE }));
  const events = result.Items || [];
  const now    = Date.now();
  const last24h = events.filter(e => now - new Date(e.timestamp).getTime() < 86400000);

  const bySeverity = {};
  for (const e of last24h) {
    bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
  }

  return {
    total_events_24h:    last24h.length,
    high_severity_24h:   (bySeverity.HIGH || 0) + (bySeverity.FORENSIC || 0),
    violations_24h:      last24h.filter(e => e.eventType.includes('VIOLATION')).length,
    policy_enforced_24h: last24h.filter(e => e.eventType === 'POLICY_ENFORCED_PASS').length,
    kill_switch_events:  last24h.filter(e => e.eventType === 'KILL_SWITCH_BLOCKED').length,
    by_severity:         bySeverity
  };
}

module.exports = { logSecurityEvent, getSecurityEvents, getSecuritySummary };
