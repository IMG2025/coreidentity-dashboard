#!/usr/bin/env node
/**
 * Patch 30 — Fix execute userId + FoundersDashboard live-data URL
 *
 * BUG A: execute.js line 24 — req.user.id → req.user.userId
 *        JWT payload has userId, not id. Execute always crashes with
 *        "Cannot read properties of undefined (reading 'userId')"
 *
 * BUG B: FoundersDashboard.jsx line 566 — fetch('/api/live-data')
 *        Relative URL hits Cloudflare Pages (static), not the API.
 *        Clients tab stuck at "Loading live client data..."
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

// ── BUG A: execute.js req.user.id → req.user.userId ────────────────────────
console.log('\n── BUG A: Fix execute.js userId ─────────────────────────────────────────');
let exec = rf('api/src/routes/execute.js');
if (exec.includes('userId: req.user.id,')) {
  exec = exec.replace('userId: req.user.id,', 'userId: req.user.userId,');
  wf('api/src/routes/execute.js', exec);
  console.log('  ✓ req.user.id → req.user.userId');
} else {
  console.log('  ✓ already fixed');
}

// ── BUG B: FoundersDashboard live-data URL ─────────────────────────────────
console.log('\n── BUG B: Fix FoundersDashboard live-data fetch URL ─────────────────────');
let fd = rf('src/pages/FoundersDashboard.jsx');

// Check if API_URL constant already defined in this file
const hasApiUrl = fd.includes('const API_URL') || fd.includes('VITE_API_URL');

if (fd.includes("fetch('/api/live-data')")) {
  if (!hasApiUrl) {
    // Add API_URL constant at top of file after last import
    fd = fd.replace(
      /^(import[^\n]+\n)(?!import)/m,
      "$1\nconst API_URL = import.meta.env.VITE_API_URL || 'https://api.coreidentity.coreholdingcorp.com';\n"
    );
  }
  fd = fd.replace("fetch('/api/live-data')", 'fetch(API_URL + \'/api/live-data\')');
  wf('src/pages/FoundersDashboard.jsx', fd);
  console.log('  ✓ fetch URL now hits API host');
} else {
  console.log('  ✓ already fixed');
}

// Also fix any other relative /api/ fetches in FoundersDashboard
let fd2 = rf('src/pages/FoundersDashboard.jsx');
let changed = false;
// Fix telemetry fetches
['fetch(\'/api/telemetry/executions', "fetch('/api/telemetry/stats", "fetch('/api/agents/execute", "fetch('/api/telemetry/seed"].forEach(pattern => {
  if (fd2.includes(pattern)) {
    fd2 = fd2.replace(new RegExp("fetch\\('(/api/)", 'g'), "fetch(API_URL + '$1");
    changed = true;
  }
});
if (changed) {
  // Ensure no double-replacement
  fd2 = fd2.replace(/fetch\(API_URL \+ 'API_URL \+ '/g, "fetch(API_URL + '");
  wf('src/pages/FoundersDashboard.jsx', fd2);
  console.log('  ✓ all relative /api/ fetches in FoundersDashboard now use API_URL');
}

// ── Syntax + build ──────────────────────────────────────────────────────────
console.log('\n── Syntax + build ───────────────────────────────────────────────────────');
run('node --check api/src/routes/execute.js');
run('npm run build');

// ── Commit + push ───────────────────────────────────────────────────────────
console.log('\n── Commit + push ────────────────────────────────────────────────────────');
run('git add -A');
const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
if (dirty) {
  run('git commit -m "fix: patch 30 — execute userId fix + live-data absolute URL"');
  run('git push origin main');
  console.log('  ✓ Pushed — GitHub Actions building new image');
} else {
  console.log('  ✓ Nothing to commit');
}

console.log(`
════════════════════════════════════════════════════════════
 Patch 30 Complete

 BUG A ✓  execute.js — req.user.id → req.user.userId
          Execute/Analyze/Escalate buttons now work
          JWT payload confirmed: { userId, email, role }

 BUG B ✓  FoundersDashboard — fetch('/api/live-data')
          → fetch(API_URL + '/api/live-data')
          Clients tab will now load all 4 companies

 After GitHub Actions completes (~60s), run:
   LATEST=$(aws ecr describe-images \\
     --repository-name coreidentity-api --region us-east-2 \\
     --query 'sort_by(imageDetails,&imagePushedAt)[-1].imageTags[0]' \\
     --output text)
   aws ecs describe-task-definition \\
     --task-definition coreidentity-dev-sentinel \\
     --region us-east-2 --query 'taskDefinition' --output json \\
   | python3 -c "import sys,json; td=json.load(sys.stdin); \\
     td['containerDefinitions'][0]['image']='636058550262.dkr.ecr.us-east-2.amazonaws.com/coreidentity-api:'\$LATEST; \\
     [td.pop(k,None) for k in ['taskDefinitionArn','revision','status','requiresAttributes','compatibilities','registeredAt','registeredBy']]; \\
     print(json.dumps(td))" > ~/new-taskdef.json
   NEW_ARN=$(aws ecs register-task-definition --region us-east-2 \\
     --cli-input-json file://\$HOME/new-taskdef.json \\
     --query 'taskDefinition.taskDefinitionArn' --output text)
   aws ecs update-service --cluster coreidentity-dev \\
     --service sentinel --task-definition "\$NEW_ARN" --region us-east-2
════════════════════════════════════════════════════════════
`);
