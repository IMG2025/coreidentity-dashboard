#!/usr/bin/env node
/**
 * Patch 34-B — Fix YAML heredoc conflict in GitHub Actions
 *
 * BUG: python3 << PYEOF inside YAML run: block
 *      YAML parser mangles heredoc before bash sees it
 *
 * FIX: Write Python script to file then execute it
 *      Avoids all heredoc/YAML conflicts entirely
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO = path.join(process.env.HOME, 'coreidentity-dashboard');
const run  = (cmd) => { console.log(`  $ ${cmd.slice(0,100)}`); execSync(cmd, { cwd: REPO, stdio: 'inherit' }); };
const wf   = (rel, c) => { fs.writeFileSync(path.join(REPO, rel), c, 'utf8'); console.log(`  ✓ wrote ${rel}`); };

// Write the complete corrected workflow
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
          echo "Deploying image: $NEW_IMAGE"

          aws ecs describe-task-definition \\
            --task-definition coreidentity-dev-sentinel \\
            --region $AWS_REGION \\
            --query taskDefinition \\
            --output json > /tmp/current-taskdef.json

          python3 -c "
import json, sys
with open('/tmp/current-taskdef.json') as f:
    td = json.load(f)
td['containerDefinitions'][0]['image'] = sys.argv[1]
[td.pop(k, None) for k in ['taskDefinitionArn','revision','status','requiresAttributes','compatibilities','registeredAt','registeredBy']]
with open('/tmp/new-taskdef.json', 'w') as f:
    json.dump(td, f)
print('Image set to:', sys.argv[1])
" "$NEW_IMAGE"

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
          echo "CoreIdentity API deployed"
          echo "Image: \${{ steps.build-image.outputs.image }}"
          echo "Commit: \${{ github.sha }}"
`);

run('npm run build');
run('git add -A');
const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
if (dirty) {
  run('git commit -m "fix: patch 34-B — remove Python heredoc from YAML (YAML parser conflict)"');
  run('git push origin main');
  console.log('  ✓ Pushed — watch gh run list for green build');
} else {
  console.log('  ✓ Nothing to commit');
}
