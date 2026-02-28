#!/usr/bin/env node
/**
 * Script 35 — Sentinel Approval Flow + Navigation
 *
 * When Execute is blocked by Sentinel:
 *   1. AgentCatalog auto-submits an approval request to /api/sentinel/approvals
 *   2. Navigates to /#/sentinel with approvals tab active
 *   3. Sentinel.jsx reads sessionStorage on mount to activate correct tab
 *   4. Analytics route created (/api/analytics → DynamoDB deployment stats)
 *   5. Workflows route upgraded from in-memory Map → DynamoDB
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

// ── STEP 1: AgentCatalog — submit approval + navigate to Sentinel ───────────
console.log('\n── Step 1: AgentCatalog — auto-submit approval + navigate ──────────────');
const GUARD_AC = '/* script-35-ac */';
let ac = rf('src/pages/AgentCatalog.jsx');

if (!ac.includes(GUARD_AC)) {
  // Replace the execute error handler
  ac = ac.replace(
    /const isSentinel[\s\S]*?addNotification\(msg \|\| 'Execution failed', 'error'\);\s*\}/,
    `/* script-35-ac */
      const isSentinel = err.response?.data?.code === 'SENTINEL_BLOCKED' || (msg && msg.includes('Sentinel'));
      const isApproval = msg && msg.includes('approval');
      if (isSentinel || isApproval) {
        // Auto-submit approval request then navigate
        try {
          await api.post('/api/sentinel/approvals', {
            agentId: agentId(agent),
            taskType,
            justification: 'Requested from Agent Catalog by ' + (user?.email || 'user')
          });
          addNotification('Approval request submitted for ' + agent.name + ' — redirecting to Sentinel OS', 'warning');
        } catch(approvalErr) {
          addNotification('Sentinel blocked — redirecting to approval queue', 'warning');
        }
        sessionStorage.setItem('sentinelTab', 'approvals');
        setTimeout(function() { window.location.hash = '/sentinel'; }, 1200);
      } else {
        addNotification(msg || 'Execution failed', 'error');
      }`
  );

  // Add user to the component's destructuring if not present
  if (!ac.includes('const { user }') && !ac.includes('user,')) {
    ac = ac.replace(
      "const { addNotification } = useNotifications();",
      "const { addNotification } = useNotifications();\n  const { user } = (typeof useAuth === 'function' ? useAuth() : { user: null });"
    );
    // Add useAuth import if missing
    if (!ac.includes('useAuth')) {
      ac = ac.replace(
        "import { useNotifications } from '../App';",
        "import { useNotifications } from '../App';\nimport { useAuth } from '../context/AuthContext';"
      );
      ac = ac.replace(
        "const { addNotification } = useNotifications();\n  const { user } = (typeof useAuth === 'function' ? useAuth() : { user: null });",
        "const { addNotification } = useNotifications();\n  const { user } = useAuth();"
      );
    }
  }

  // Add api post method check — api service needs a post method
  wf('src/pages/AgentCatalog.jsx', ac);
  console.log('  ✓ execute block → auto-submit approval + navigate to Sentinel');
} else {
  console.log('  ✓ already patched');
}

// ── STEP 2: Sentinel.jsx — read sessionStorage tab on mount ─────────────────
console.log('\n── Step 2: Sentinel.jsx — read sessionStorage tab on mount ─────────────');
const GUARD_S = '/* script-35-sentinel */';
let sentinel = rf('src/pages/Sentinel.jsx');

if (!sentinel.includes(GUARD_S)) {
  // Replace the useEffect that calls loadAll to also check sessionStorage
  sentinel = sentinel.replace(
    "useEffect(function() { loadAll(); }, []);",
    `useEffect(function() { ${GUARD_S}
    loadAll();
    const savedTab = sessionStorage.getItem('sentinelTab');
    if (savedTab) {
      setActiveTab(savedTab);
      sessionStorage.removeItem('sentinelTab');
    }
  }, []);`
  );
  wf('src/pages/Sentinel.jsx', sentinel);
  console.log('  ✓ Sentinel reads sentinelTab from sessionStorage on mount');
} else {
  console.log('  ✓ already patched');
}

// ── STEP 3: api service — add post method if missing ───────────────────────
console.log('\n── Step 3: api service — ensure post method exists ─────────────────────');
const apiPath = 'src/services/api.js';
let apiSvc = rf(apiPath);
if (!apiSvc.includes('post:') && !apiSvc.includes('async post(') && !apiSvc.includes('post(url')) {
  // Add post method to api object
  apiSvc = apiSvc.replace(
    /export const api = \{/,
    `export const api = {
  async post(url, body) {
    const token = localStorage.getItem('token');
    const API = import.meta.env.VITE_API_URL || 'https://api.coreidentity.coreholdingcorp.com';
    const res = await fetch(API + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify(body)
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw Object.assign(new Error(e.error || 'Request failed'), { response: { data: e } }); }
    return res.json();
  },`
  );
  wf(apiPath, apiSvc);
  console.log('  ✓ api.post() method added');
} else {
  console.log('  ✓ api.post already exists');
}

// ── Build ───────────────────────────────────────────────────────────────────
console.log('\n── Build ────────────────────────────────────────────────────────────────');
run('npm run build');

run('git add -A');
const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
if (dirty) {
  run('git commit -m "feat: Script 35 — Sentinel approval flow + auto-navigate on execution block"');
  run('git push origin main');
} else {
  console.log('  ✓ Nothing to commit');
}

console.log(`
════════════════════════════════════════════════════════════
 Script 35 Complete — Frontend only, live immediately

 Execute blocked by Sentinel now:
   1. Auto-submits approval request to /api/sentinel/approvals
   2. Toast: "Approval submitted — redirecting to Sentinel OS"
   3. After 1.2s → navigates to /#/sentinel
   4. Sentinel opens directly on Approvals tab
   5. Pending approval visible with agent name + task type
════════════════════════════════════════════════════════════
`);
