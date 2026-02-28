#!/usr/bin/env node
/**
 * Patch 34-A — Fix GitHub Actions ECS promotion step
 *
 * BUG: Python -c string uses single quotes → $ECR_REGISTRY/$IMAGE_TAG
 *      not expanded by bash → invalid JSON → CLI fails
 *      Also: file:///dev/stdin unreliable in GitHub Actions runner
 *
 * FIX: Write task def to /tmp/taskdef.json (writable in Actions runner)
 *      Use shell variable expansion outside Python string
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

const WORKFLOW_PATH = '.github/workflows/deploy-api.yml';

// Replace the entire broken step with a working version
const BROKEN_STEP_START = '      - name: Register new ECS task definition and deploy # script-34-auto-promote';
const WORKING_STEP = `      - name: Register new ECS task definition and deploy # script-34-auto-promote
        env:
          ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: \${{ github.sha }}
        run: |
          NEW_IMAGE="$ECR_REGISTRY/coreidentity-api:$IMAGE_TAG"
          echo "Deploying image: $NEW_IMAGE"

          # Fetch current task definition and write to file
          aws ecs describe-task-definition \\
            --task-definition coreidentity-dev-sentinel \\
            --region $AWS_REGION \\
            --query 'taskDefinition' \\
            --output json > /tmp/current-taskdef.json

          # Swap image using python, write to new file
          python3 << PYEOF
import json
with open('/tmp/current-taskdef.json') as f:
    td = json.load(f)
td['containerDefinitions'][0]['image'] = '$NEW_IMAGE'
for k in ['taskDefinitionArn','revision','status','requiresAttributes',
          'compatibilities','registeredAt','registeredBy']:
    td.pop(k, None)
with open('/tmp/new-taskdef.json', 'w') as f:
    json.dump(td, f)
print("Task def written with image:", td['containerDefinitions'][0]['image'])
PYEOF

          # Register new task definition revision
          NEW_ARN=$(aws ecs register-task-definition \\
            --region $AWS_REGION \\
            --cli-input-json file:///tmp/new-taskdef.json \\
            --query 'taskDefinition.taskDefinitionArn' \\
            --output text)
          echo "Registered: $NEW_ARN"

          # Update ECS service to use new revision
          aws ecs update-service \\
            --cluster $ECS_CLUSTER \\
            --service $ECS_SERVICE \\
            --task-definition "$NEW_ARN" \\
            --region $AWS_REGION \\
            --query 'service.taskDefinition' \\
            --output text`;

let workflow = rf(WORKFLOW_PATH);

// Find and replace the broken step
const brokenStepRegex = /      - name: Register new ECS task definition and deploy # script-34-auto-promote[\s\S]*?--output text$/m;

if (brokenStepRegex.test(workflow)) {
  workflow = workflow.replace(brokenStepRegex, WORKING_STEP);
  wf(WORKFLOW_PATH, workflow);
  console.log('  ✓ ECS promotion step fixed — variables now expand correctly');
} else {
  console.log('  ⚠ Step pattern not found — checking current state');
  const lines = workflow.split('\n').filter(l => l.includes('Register new ECS'));
  console.log('  Found lines:', lines);
}

run('npm run build');

run('git add -A');
const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
if (dirty) {
  run('git commit -m "fix: patch 34-A — GitHub Actions ECS promotion variable expansion fix"');
  run('git push origin main');
  console.log('  ✓ Pushed — watch gh run list for green build');
} else {
  console.log('  ✓ Nothing to commit');
}

console.log(`
After ~3min watch:
  gh run list --repo IMG2025/coreidentity-dashboard --limit 3
  Expected: ✓ green on all 3 columns
`);
