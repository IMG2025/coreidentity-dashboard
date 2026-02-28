#!/usr/bin/env node
/**
 * Patch 31 — Fix execute.js call signatures
 *
 * BUG 1: policyEngine.enforcePolicy(agent, user, taskType) — 3 args
 *        execute.js calls Sentinel.enforcePolicy({ flat object }) — 1 arg
 *        → user = undefined → crash on user.userId
 *
 * BUG 2: agoExecutor calls agoRouter.route() but agoRouter is never required
 *        → ReferenceError: agoRouter is not defined
 *
 * FIX: Rewrite execute.js to:
 *   1. Look up agent from registry before calling Sentinel
 *   2. Call enforcePolicy(agent, req.user, taskType) correctly
 *   3. Replace agoRouter.route() with direct agoBridge.executeAgent()
 *
 * Idempotent · Zero hand edits · Ends with npm run build
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO = path.join(process.env.HOME, 'coreidentity-dashboard');
const run  = (cmd) => { console.log(`  $ ${cmd.slice(0,100)}`); execSync(cmd, { cwd: REPO, stdio: 'inherit' }); };
const wf   = (rel, c) => { fs.writeFileSync(path.join(REPO, rel), c, 'utf8'); console.log(`  ✓ wrote ${rel}`); };
const GUARD = '/* patch-31 */';

const src = fs.readFileSync(path.join(REPO, 'api/src/routes/execute.js'), 'utf8');

if (src.includes(GUARD)) {
  console.log('  ✓ already patched');
} else {
  wf('api/src/routes/execute.js', `${GUARD}
const express       = require('express');
const router        = express.Router();
const { authenticate } = require('../middleware/auth');
const Sentinel      = require('../sentinel');
const NexusOS       = require('../nexus');
const agentRegistry = require('../smartnation/agentRegistry');
const { executeAgent: agoExecuteAgent } = require('../ago/agoBridge');

// Executor passed to NexusOS — uses agoBridge directly
async function agoExecutor(agentId, taskType, inputs) {
  const agent = await agentRegistry.getAgent(String(agentId));
  if (!agent) throw new Error('Agent not found: ' + agentId);
  return agoExecuteAgent(agent, { userId: 'system', role: 'ADMIN' }, taskType, inputs || {});
}

// POST /api/execute/:agentId/execute
router.post('/:agentId/execute', authenticate, async function(req, res) {
  const { agentId } = req.params;
  const { taskType = 'ANALYZE', inputs = {}, justification } = req.body;

  try {
    // 1. Look up agent
    const agent = await agentRegistry.getAgent(String(agentId));
    const agentObj = agent || { agentId, name: 'Agent ' + agentId, category: 'General' };

    // 2. Sentinel policy enforcement — correct 3-arg signature
    const policyResult = await Sentinel.enforcePolicy(
      agentObj,
      req.user,
      taskType
    );

    if (!policyResult.approved) {
      return res.status(403).json({
        error:   'Policy violation — execution blocked by Sentinel OS',
        reason:  policyResult.reason,
        code:    'SENTINEL_BLOCKED',
        eventId: policyResult.eventId
      });
    }

    // 3. Nexus OS execution with lifecycle management
    const execution = await NexusOS.dispatch(
      agentId, taskType, inputs,
      { riskTier: policyResult.riskTier, decision: 'APPROVED', eventId: policyResult.eventId },
      agoExecutor
    );

    // 4. Update SmartNation agent metrics (non-blocking)
    agentRegistry.updateAgentMetrics(agentId, { executionResult: 'success', taskType })
      .catch(function(e) { console.warn('[Execute] Metrics update failed:', e.message); });

    res.json({
      success:     true,
      executionId: execution.executionId,
      status:      execution.status,
      result:      execution.result,
      duration:    execution.duration,
      attempts:    execution.attempts,
      riskTier:    execution.riskTier,
      nexus:       true,
      sentinel:    { approved: true, eventId: policyResult.eventId }
    });

  } catch(err) {
    console.error('[Execute] Error:', err.message);
    const isCircuitBreaker = err.message && err.message.includes('CIRCUIT_BREAKER_OPEN');
    res.status(isCircuitBreaker ? 503 : 500).json({
      error: err.message,
      code:  isCircuitBreaker ? 'CIRCUIT_BREAKER_OPEN' : 'EXECUTION_ERROR'
    });
  }
});

// GET /api/execute/nexus/status
router.get('/nexus/status', authenticate, async function(req, res) {
  try {
    const status = await NexusOS.getStatus();
    res.json({ success: true, data: status });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/execute/nexus/executions
router.get('/nexus/executions', authenticate, async function(req, res) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const executions = await NexusOS.runtime.listExecutions(limit);
    res.json({ success: true, data: executions, count: executions.length });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
`);
}

// Syntax check
const { execSync: ex } = await import('node:child_process');
run('node --check api/src/routes/execute.js');

// Verify agoBridge exports executeAgent
const bridge = fs.readFileSync(path.join(REPO, 'api/src/ago/agoBridge.js'), 'utf8');
if (!bridge.includes('executeAgent')) {
  console.warn('  ⚠ agoBridge.js does not export executeAgent — check exports');
} else {
  console.log('  ✓ agoBridge.executeAgent confirmed');
}

run('npm run build');

run('git add -A');
const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
if (dirty) {
  run('git commit -m "fix: patch 31 — execute.js correct enforcePolicy signature + agoBridge wiring"');
  run('git push origin main');
  console.log('  ✓ Pushed — GitHub Actions building');
} else {
  console.log('  ✓ Nothing to commit');
}

console.log(`
After GitHub Actions (~60s), promote ECS:
  LATEST=$(aws ecr describe-images --repository-name coreidentity-api --region us-east-2 \\
    --query 'sort_by(imageDetails,&imagePushedAt)[-1].imageTags[0]' --output text)
  aws ecs describe-task-definition --task-definition coreidentity-dev-sentinel \\
    --region us-east-2 --query 'taskDefinition' --output json \\
  | python3 -c "import sys,json; td=json.load(sys.stdin); td['containerDefinitions'][0]['image']='636058550262.dkr.ecr.us-east-2.amazonaws.com/coreidentity-api:'\$LATEST; [td.pop(k,None) for k in ['taskDefinitionArn','revision','status','requiresAttributes','compatibilities','registeredAt','registeredBy']]; print(json.dumps(td))" > ~/new-taskdef.json
  NEW=$(aws ecs register-task-definition --region us-east-2 --cli-input-json file://\$HOME/new-taskdef.json --query 'taskDefinition.taskDefinitionArn' --output text)
  aws ecs update-service --cluster coreidentity-dev --service sentinel --task-definition "\$NEW" --region us-east-2 --query 'service.taskDefinition' --output text
`);
