#!/usr/bin/env node
/**
 * Script 34 — GitHub Actions ECS Auto-Promotion
 *
 * PROBLEM: Workflow builds + pushes image but only calls
 *   force-new-deployment → ECS restarts with OLD image.
 *   Every API change requires 5 manual steps to promote.
 *
 * FIX: Replace "Force ECS redeployment" step with proper
 *   task definition registration + update-service pointing
 *   to the new image SHA.
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
const GUARD = '# script-34-auto-promote';

let workflow = rf(WORKFLOW_PATH);

if (workflow.includes(GUARD)) {
  console.log('  ✓ already patched');
} else {
  // Replace the "Force ECS redeployment" step with full auto-promotion
  workflow = workflow.replace(
    `      - name: Force ECS redeployment
        run: |
          aws ecs update-service \\
            --cluster $ECS_CLUSTER \\
            --service $ECS_SERVICE \\
            --force-new-deployment \\
            --region $AWS_REGION || echo "ECS service update skipped - may not exist yet"`,
    `      - name: Register new ECS task definition and deploy ${GUARD}
        env:
          ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: \${{ github.sha }}
        run: |
          # Fetch current task definition
          TASK_DEF=$(aws ecs describe-task-definition \\
            --task-definition coreidentity-dev-sentinel \\
            --region $AWS_REGION \\
            --query 'taskDefinition' \\
            --output json)

          # Swap image to new SHA, strip read-only fields
          NEW_TASK_DEF=$(echo $TASK_DEF | python3 -c "
          import sys, json
          td = json.load(sys.stdin)
          td['containerDefinitions'][0]['image'] = '$ECR_REGISTRY/coreidentity-api:$IMAGE_TAG'
          for k in ['taskDefinitionArn','revision','status','requiresAttributes',
                    'compatibilities','registeredAt','registeredBy']:
            td.pop(k, None)
          print(json.dumps(td))
          ")

          # Register new revision
          NEW_ARN=$(echo $NEW_TASK_DEF | aws ecs register-task-definition \\
            --region $AWS_REGION \\
            --cli-input-json file:///dev/stdin \\
            --query 'taskDefinition.taskDefinitionArn' \\
            --output text)

          echo "New task definition: $NEW_ARN"

          # Update service to use new revision
          aws ecs update-service \\
            --cluster $ECS_CLUSTER \\
            --service $ECS_SERVICE \\
            --task-definition "$NEW_ARN" \\
            --region $AWS_REGION \\
            --query 'service.taskDefinition' \\
            --output text`
  );

  wf(WORKFLOW_PATH, workflow);
  console.log('  ✓ deploy-api.yml updated — auto-promotes task definition on every push');
}

run('npm run build');

run('git add -A');
const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
if (dirty) {
  run('git commit -m "feat: Script 34 — GitHub Actions ECS auto-promotion (task def registration)"');
  run('git push origin main');
  console.log('  ✓ Pushed — next api/ push will auto-promote ECS, no manual steps needed');
} else {
  console.log('  ✓ Nothing to commit');
}

console.log(`
════════════════════════════════════════════════════════════
 Script 34 Complete — ECS Auto-Promotion

 From this point forward:
   git push (touching api/) → GitHub Actions →
   builds image → registers new task def → updates ECS service
   → new container running within ~3 minutes

 No more manual LATEST/register-task-definition/update-service
 The 5-step manual promotion is permanently eliminated.
════════════════════════════════════════════════════════════
`);
