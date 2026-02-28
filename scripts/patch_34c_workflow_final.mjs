#!/usr/bin/env node
/**
 * Patch 34-C — Final workflow fix
 * Use a committed Python helper script instead of inline python
 * Zero YAML/quoting conflicts possible
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO = path.join(process.env.HOME, 'coreidentity-dashboard');
const run  = (cmd) => { console.log(`  $ ${cmd.slice(0,100)}`); execSync(cmd, { cwd: REPO, stdio: 'inherit' }); };
const wf   = (rel, c) => { fs.writeFileSync(path.join(REPO, rel), c, 'utf8'); console.log(`  ✓ wrote ${rel}`); };

// 1. Write the Python helper script into the repo
wf('scripts/swap-ecs-image.py',
`#!/usr/bin/env python3
"""Swap ECS task definition image. Usage: python3 swap-ecs-image.py <new-image>"""
import json, sys

new_image = sys.argv[1]
with open('/tmp/current-taskdef.json') as f:
    td = json.load(f)

td['containerDefinitions'][0]['image'] = new_image
for k in ['taskDefinitionArn','revision','status','requiresAttributes',
          'compatibilities','registeredAt','registeredBy']:
    td.pop(k, None)

with open('/tmp/new-taskdef.json', 'w') as f:
    json.dump(td, f)

print('Image set to:', new_image)
`);

// 2. Write the complete clean workflow
wf('.github/workflows/deploy-api.yml',
`name: Build & Deploy CoreIdentity API

on:
  push:
    branches: [main]
    paths:
      - 'api/**'
      - '.github/workflows/deploy-api.yml'
      - 'src/**'
      - 'dist/**'
  workflow_dispatch:

env:
  AWS_REGION: us-east-2
  ECR_REPOSITORY: coreidentity-api
  ECS_CLUSTER: coreidentity-dev
  ECS_SERVICE: sentinel
  CONTAINER_NAME: coreidentity-api

jobs:
  build-and-deploy:
    name: Build, Push, Deploy
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-2

      - name: Verify AWS identity
        run: aws sts get-caller-identity

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Create ECR repository if not exists
        run: |
          aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION 2>/dev/null || \\
          aws ecr create-repository \\
            --repository-name $ECR_REPOSITORY \\
            --image-scanning-configuration scanOnPush=true \\
            --region $AWS_REGION

      - name: Build, tag, and push Docker image
        id: build-image
        env:
          ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: \${{ github.sha }}
        run: |
          cd api
          docker build \\
            --tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \\
            --tag $ECR_REGISTRY/$ECR_REPOSITORY:latest \\
            .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Register new ECS task definition and deploy
        env:
          ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: \${{ github.sha }}
        run: |
          NEW_IMAGE="$ECR_REGISTRY/coreidentity-api:$IMAGE_TAG"
          echo "Deploying: $NEW_IMAGE"

          aws ecs describe-task-definition \\
            --task-definition coreidentity-dev-sentinel \\
            --region $AWS_REGION \\
            --query taskDefinition \\
            --output json > /tmp/current-taskdef.json

          python3 scripts/swap-ecs-image.py "$NEW_IMAGE"

          NEW_ARN=$(aws ecs register-task-definition \\
            --region $AWS_REGION \\
            --cli-input-json file:///tmp/new-taskdef.json \\
            --query taskDefinition.taskDefinitionArn \\
            --output text)
          echo "Registered: $NEW_ARN"

          aws ecs update-service \\
            --cluster $ECS_CLUSTER \\
            --service $ECS_SERVICE \\
            --task-definition "$NEW_ARN" \\
            --region $AWS_REGION \\
            --query service.taskDefinition \\
            --output text

      - name: Deployment summary
        run: |
          echo "Deployed: \${{ steps.build-image.outputs.image }}"
          echo "Commit:   \${{ github.sha }}"
`);

run('npm run build');
run('git add -A');
const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
if (dirty) {
  run('git commit -m "fix: patch 34-C — ECS promotion via committed Python helper (no inline YAML/Python)"');
  run('git push origin main');
  console.log('  ✓ Pushed');
} else {
  console.log('  ✓ Nothing to commit');
}

console.log('\nWatch: gh run list --repo IMG2025/coreidentity-dashboard --limit 3');
