'use strict';
const https  = require('https');
const http   = require('http');
const crypto = require('crypto');

const SAL_KERNEL_URL = process.env.SAL_KERNEL_URL || 'http://sal-kernel.coreidentity-production.svc.cluster.local:8443';
const SAL_TIMEOUT_MS = parseInt(process.env.SAL_TIMEOUT_MS || '10000');
const SAL_DEV_MODE   = process.env.SAL_DEV_MODE === 'true';

function buildPayload(agent, user, taskType, sentinelResult, req) {
  const actionMap = { ANALYZE: 'MaskedRead', EXECUTE: 'BoundedWrite', STOP: 'DestructiveWrite', ESCALATE: 'AuditWrite' };
  const verticalId = (agent && agent.verticalId) || 'default';
  const riskMap    = { LOW: 0.1, MEDIUM: 0.4, HIGH: 0.7, CRITICAL: 0.9 };
  return {
    request_id: crypto.randomUUID(),
    proxy_id: 'proxy-mcp-ecs-sentinel',
    timestamp_utc: new Date().toISOString(),
    identity: {
      agent_id: 'agent-' + (agent ? (agent.agentId || agent.id || 'unknown') : 'unknown'),
      cert_fingerprint: user ? crypto.createHash('sha256').update(user.userId||'').digest('hex').slice(0,16) : 'no-cert',
      cert_expiry: '2099-01-01T00:00:00Z'
    },
    intent: { declared: taskType + '_v1', inferred_tool: agent ? agent.name : 'UnknownAgent' },
    asset: { resource_uri: 'agent://' + verticalId + '/' + (agent ? (agent.agentId||agent.id||'unknown') : 'unknown'), normalized_id: verticalId + '.agents.' + ((agent && agent.category)||'general').toLowerCase().replace(/\s+/g,'_') },
    action: { mcp_method: 'agents/' + taskType.toLowerCase(), classification: actionMap[taskType.toUpperCase()] || 'MaskedRead' },
    context: { source_ip: (req&&req.ip)||'0.0.0.0', session_id: crypto.randomUUID(), risk_score: riskMap[(sentinelResult&&sentinelResult.riskTier)||'LOW']||0.1, system_time: new Date().toISOString() }
  };
}

async function arbitrate(agent, user, taskType, sentinelResult, req) {
  const payload = buildPayload(agent, user, taskType, sentinelResult, req);
  if (SAL_DEV_MODE) {
    console.log('[SAL] DEV MODE — ALLOW');
    return { allowed: true, token: { token_id: 'dev-token', nonce: 'dev-nonce', expires_at: new Date(Date.now()+30000).toISOString() }, proofPackId: 'dev-proof-' + Date.now(), requestId: payload.request_id };
  }
  try {
    const resp = await httpPost(SAL_KERNEL_URL + '/v1/arbitrate', JSON.stringify({ request_id: payload.request_id, proxy_id: payload.proxy_id, iiaac_payload: payload }), SAL_TIMEOUT_MS);
    if (resp.decision === 'ALLOW') {
      if (new Date(resp.capability_token.expires_at) < new Date()) return { allowed: false, reason: 'Token expired', errorCode: 'SAL-4006', proofPackId: resp.proof_pack_id };
      return { allowed: true, token: resp.capability_token, proofPackId: resp.proof_pack_id, requestId: payload.request_id };
    }
    if (resp.decision === 'ESCALATE') return { allowed: false, reason: resp.reason_code, errorCode: resp.reason_code, proofPackId: resp.proof_pack_id, escalated: true };
    return { allowed: false, reason: resp.reason_code, errorCode: resp.reason_code, proofPackId: resp.proof_pack_id };
  } catch(err) {
    console.error('[SAL] Kernel unreachable — fail-closed:', err.message);
    return { allowed: false, reason: 'SAL Kernel unreachable — fail-closed', errorCode: 'SAL-5001' };
  }
}

function httpPost(url, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const p = new URL(url);
    const lib = p.protocol === 'https:' ? https : http;
    const req = lib.request({ hostname: p.hostname, port: p.port||(p.protocol==='https:'?443:80), path: p.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: timeoutMs }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(new Error('Invalid JSON: ' + d.slice(0,100))); } });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('SAL timeout after ' + timeoutMs + 'ms')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { arbitrate };
