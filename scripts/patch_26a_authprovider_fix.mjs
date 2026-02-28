#!/usr/bin/env node
/**
 * Patch: Wrap App in AuthProvider in main.jsx
 * Idempotent · ends with npm run build
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO = path.join(process.env.HOME, 'coreidentity-dashboard');
const run = cmd => { console.log(`  $ ${cmd}`); execSync(cmd, { cwd: REPO, stdio: 'inherit' }); };
const rf  = rel => fs.readFileSync(path.join(REPO, rel), 'utf8');
const wf  = (rel, c) => { fs.writeFileSync(path.join(REPO, rel), c, 'utf8'); console.log(`  ✓ ${rel}`); };

console.log('\n── Fix: Wrap App in AuthProvider ────────────────────────────');
let main = rf('src/main.jsx');

if (!main.includes('AuthProvider')) {
  const fixed = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
`;
  wf('src/main.jsx', fixed);
} else {
  console.log('  ✓ AuthProvider already in main.jsx');
}

run('npm run build');
run('git add -A');
const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
if (dirty) {
  run('git commit -m "fix: wrap App in AuthProvider — fixes blank page crash"');
  run('git push origin main');
  console.log('\n  ✓ Pushed — Cloudflare Pages deploying');
} else {
  console.log('  ✓ Already clean');
}
console.log('\n✓ AuthProvider fix complete');
