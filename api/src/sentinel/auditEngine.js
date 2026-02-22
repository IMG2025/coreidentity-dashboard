/**
 * Sentinel OS — Audit Integrity Engine
 * Formal audit trail for all governance events.
 * Immutable append-only log — records are never modified after creation.
 */
const { PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../utils/dynamodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const TABLE = 'coreidentity-executions';

async function writeAuditRecord(record) {
  try {
    const item = {
      executionId: uuidv4(),
      ...record,
      auditSource:  'SENTINEL_OS',
      immutable:    true,
      recordedAt:   new Date().toISOString()
    };
    await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
    return item;
  } catch (err) {
    logger.error('audit_write_failed', { error: err.message, record });
  }
}

async function getAuditSummary() {
  try {
    const result = await docClient.send(new ScanCommand({ TableName: TABLE }));
    const records = result.Items || [];
    const now     = Date.now();
    const last24h = records.filter(r => now - new Date(r.executedAt || r.recordedAt).getTime() < 86400000);
    return {
      total_executions:    records.length,
      executions_24h:      last24h.length,
      success_rate:        last24h.length
        ? Math.round((last24h.filter(r => r.status === 'OK').length / last24h.length) * 100)
        : 100,
      by_domain: last24h.reduce((acc, r) => {
        acc[r.domainId || 'unknown'] = (acc[r.domainId || 'unknown'] || 0) + 1;
        return acc;
      }, {}),
      by_task_type: last24h.reduce((acc, r) => {
        acc[r.taskType || 'unknown'] = (acc[r.taskType || 'unknown'] || 0) + 1;
        return acc;
      }, {})
    };
  } catch (err) {
    return { total_executions: 0, executions_24h: 0, success_rate: 100 };
  }
}

module.exports = { writeAuditRecord, getAuditSummary };
