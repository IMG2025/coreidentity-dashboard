#!/usr/bin/env node
/**
 * Patch 28-A — Fix server.js stray });
 * Removes the orphaned }); left by Script 28's regex on line 96.
 * Idempotent · Zero hand edits · Ends with npm run build
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO = path.join(process.env.HOME, 'coreidentity-dashboard');
const run  = (cmd) => { console.log(`  $ ${cmd.slice(0,100)}`); execSync(cmd, { cwd: REPO, stdio: 'inherit' }); };
const fp   = path.join(REPO, 'api/src/server.js');

let src = fs.readFileSync(fp, 'utf8');

// The stray pattern: a line that is ONLY `});` immediately after the
// ── 404 ── comment, with nothing before it opening a block.
// Confirmed from file: lines 95-97 are:
//   // ── 404 ──...
//   });
//   (blank)
// Remove the comment line + the stray });
const stray = /\/\/ ── 404 ──[^\n]*\n\}\);\n/;

if (stray.test(src)) {
  src = src.replace(stray, '');
  fs.writeFileSync(fp, src, 'utf8');
  console.log('  ✓ Removed stray }); from server.js line 96');
} else {
  console.log('  ✓ Stray }); not found — already clean');
}

// Verify
run('node --check api/src/server.js');
run('npm run build');

// Commit and push
run('git add -A');
const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
if (dirty) {
  run('git commit -m "fix: patch 28-A — remove stray }); from server.js"');
  run('git push origin main');
  console.log('  ✓ Pushed — Cloudflare Pages deploying');
} else {
  console.log('  ✓ Already clean');
}

// ECS redeploy
try {
  execSync('aws ecs update-service --cluster coreidentity-dev --service sentinel --force-new-deployment --region us-east-2', { stdio: 'pipe' });
  console.log('  ✓ ECS force-new-deployment triggered — wait ~90s');
} catch(e) {
  console.warn('  ⚠ ECS redeploy failed:', e.message);
}

console.log('\n  ✓ Patch 28-A complete\n');
