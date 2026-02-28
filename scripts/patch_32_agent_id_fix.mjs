#!/usr/bin/env node
/**
 * Patch 32 — Fix agent.id → agent.agentId || agent.id
 *
 * DynamoDB agents use agentId as primary key (string).
 * AgentCatalog.jsx uses agent.id everywhere → undefined for all DynamoDB agents
 * → execute/deploy buttons call /api/execute/undefined/execute → 500
 *
 * Also fixes agoBridge.js which uses agent.id in task inputs and return value.
 *
 * Idempotent · Zero hand edits · Ends with npm run build
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO = path.join(process.env.HOME, 'coreidentity-dashboard');
const run  = (cmd) => { console.log(`  $ ${cmd.slice(0,100)}`); execSync(cmd, { cwd: REPO, stdio: 'inherit' }); };
const rf   = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
const wf   = (rel, c) => { fs.writeFileSync(path.join(REPO, rel), c, 'utf8'); console.log(`  ✓ wrote ${rel}`); };
const GUARD = '/* patch-32 */';

// ── AgentCatalog.jsx — replace all agent.id with agentId() helper ──────────
console.log('\n── AgentCatalog.jsx — agent.id → normalized id ──────────────────────────');

let ac = rf('src/pages/AgentCatalog.jsx');

if (!ac.includes(GUARD)) {
  // Add a one-liner helper at top of file after imports
  ac = ac.replace(
    /^(import[^\n]+\n)(?=\n*(const|function|export))/m,
    `$1${GUARD}\nconst agentId = (a) => a.agentId || a.id || String(a.agentId || a.id || '');\n`
  );

  // Replace all agent.id references with agentId(agent)
  ac = ac
    .replace(/agent\.id \+ '-' \+ taskType/g, "agentId(agent) + '-' + taskType")
    .replace(/api\.executeAgent\(agent\.id,/g, 'api.executeAgent(agentId(agent),')
    .replace(/api\.deployAgent\(agent\.id\)/g, 'api.deployAgent(agentId(agent))')
    .replace(/deploying\[agent\.id\]/g, 'deploying[agentId(agent)]')
    .replace(/\{ \[agent\.id\]: true \}/g, '{ [agentId(agent)]: true }')
    .replace(/\{ \[agent\.id\]: false \}/g, '{ [agentId(agent)]: false }')
    .replace(/key={agent\.id}/g, 'key={agentId(agent)}');

  wf('src/pages/AgentCatalog.jsx', ac);
  console.log('  ✓ all agent.id references normalized');
} else {
  console.log('  ✓ already patched');
}

// ── agoBridge.js — normalize agent.id in task + return value ───────────────
console.log('\n── agoBridge.js — normalize agent.id ───────────────────────────────────');

let bridge = rf('api/src/ago/agoBridge.js');

if (!bridge.includes('patch-32-bridge')) {
  bridge = bridge
    .replace(
      "inputs: { agentId: agent.id,",
      "inputs: { agentId: agent.agentId || agent.id,"
    )
    .replace(
      "agent_id:     agent.id,",
      "agent_id:     agent.agentId || agent.id,"
    );
  // Add guard comment
  bridge = '/* patch-32-bridge */\n' + bridge;
  wf('api/src/ago/agoBridge.js', bridge);
  console.log('  ✓ agoBridge.js agent.id normalized');
} else {
  console.log('  ✓ already patched');
}

// ── Syntax + build ──────────────────────────────────────────────────────────
console.log('\n── Syntax + build ───────────────────────────────────────────────────────');
run('node --check api/src/ago/agoBridge.js');
run('npm run build');

// ── Commit + push ───────────────────────────────────────────────────────────
console.log('\n── Commit + push ────────────────────────────────────────────────────────');
run('git add -A');
const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
if (dirty) {
  run('git commit -m "fix: patch 32 — normalize agent.id → agentId for DynamoDB agents"');
  run('git push origin main');
  console.log('  ✓ Pushed — frontend fix live immediately via Cloudflare Pages');
  console.log('  ✓ API fix needs ECS promotion after GitHub Actions (~60s)');
} else {
  console.log('  ✓ Nothing to commit');
}

console.log(`
════════════════════════════════════════════════════════════
 Patch 32 Complete

 Frontend fix (AgentCatalog.jsx) — LIVE immediately
   Deploy/Execute/Analyze/Escalate buttons now pass
   correct agentId to API calls

 API fix (agoBridge.js) — needs ECS promotion
   After GitHub Actions (~60s):

   LATEST=$(aws ecr describe-images --repository-name coreidentity-api \\
     --region us-east-2 \\
     --query 'sort_by(imageDetails,&imagePushedAt)[-1].imageTags[0]' \\
     --output text)
   aws ecs describe-task-definition \\
     --task-definition coreidentity-dev-sentinel \\
     --region us-east-2 --query 'taskDefinition' --output json \\
   | python3 -c "import sys,json; td=json.load(sys.stdin); \\
     td['containerDefinitions'][0]['image']='636058550262.dkr.ecr.us-east-2.amazonaws.com/coreidentity-api:'\$LATEST; \\
     [td.pop(k,None) for k in ['taskDefinitionArn','revision','status','requiresAttributes','compatibilities','registeredAt','registeredBy']]; \\
     print(json.dumps(td))" > ~/new-taskdef.json
   NEW=$(aws ecs register-task-definition --region us-east-2 \\
     --cli-input-json file://\$HOME/new-taskdef.json \\
     --query 'taskDefinition.taskDefinitionArn' --output text)
   aws ecs update-service --cluster coreidentity-dev \\
     --service sentinel --task-definition "\$NEW" --region us-east-2 \\
     --query 'service.taskDefinition' --output text
════════════════════════════════════════════════════════════
`);
