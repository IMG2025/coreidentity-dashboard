#!/usr/bin/env node
/**
 * Patch: Portal default route fix
 * At portal.coreholdingcorp.com, redirect / → /#/dashboard
 * Idempotent · ends with npm run build
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO = path.join(process.env.HOME, 'coreidentity-dashboard');
const run = cmd => { console.log(`  $ ${cmd}`); execSync(cmd, { cwd: REPO, stdio: 'inherit' }); };
const rf  = rel => fs.readFileSync(path.join(REPO, rel), 'utf8');
const wf  = (rel, c) => { fs.writeFileSync(path.join(REPO, rel), c, 'utf8'); console.log(`  ✓ ${rel}`); };

console.log('\n── Patch: Portal default route ──────────────────────────────');
let app = rf('src/App.jsx');

if (!app.includes('portal.coreholdingcorp.com')) {
  // After the getRoute() function, add portal redirect logic
  app = app.replace(
    'function getRoute() {',
    `function isPortalDomain() {
  return window.location.hostname === 'portal.coreholdingcorp.com';
}

function getRoute() {`
  );

  // In getRoute(), redirect portal root to dashboard
  app = app.replace(
    `function getRoute() {
  const hash = window.location.hash || '';
  if (!hash || hash === '#') return '/';`,
    `function getRoute() {
  const hash = window.location.hash || '';
  if ((!hash || hash === '#') && isPortalDomain()) {
    window.location.replace('/#/dashboard');
    return '/#/dashboard';
  }
  if (!hash || hash === '#') return '/';`
  );

  wf('src/App.jsx', app);
} else {
  console.log('  ✓ portal redirect already in place');
}

run('npm run build');
run('git add -A');
const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
if (dirty) {
  run('git commit -m "fix: redirect portal root to dashboard, skip MarketingPage"');
  run('git push origin main');
  console.log('\n  ✓ Pushed — Cloudflare Pages deploying now');
} else {
  console.log('  ✓ Already clean');
}
console.log('\n✓ Portal default route fixed');
