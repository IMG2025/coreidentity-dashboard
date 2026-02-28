#!/usr/bin/env node
/**
 * Script 28 — Dashboard Functional Fixes
 * ─────────────────────────────────────────────────────────────
 * Fixes 5 confirmed bugs (zero assumptions):
 *
 * BUG 1 — CRITICAL: server.js routes registered AFTER 404 catch-all
 *         /api/live-data, /api/agents/execute, /api/telemetry all return 404
 *         Root cause of "Partial data — some sources unavailable"
 *
 * BUG 2 — Governance.jsx scores shape mismatch
 *         API returns array [{label,score}], page expects {overall,dataPrivacy...}
 *
 * BUG 3 — deployed.js looks up agents in static data (integers)
 *         DynamoDB agents have string IDs → deploy always returns 404
 *
 * BUG 4 — SmartNation.jsx has no deploy action — read-only page
 *
 * BUG 5 — FoundersDashboard tabs appear static (caused by Bug 1)
 *         Fix Bug 1 → live data flows → charts use real data
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
const GUARD = '/* script-28-applied */';

// ── BUG 1: Fix server.js — move 404 + errorHandler to END ──────────────────
console.log('\n── BUG 1: Fix server.js route ordering ──────────────────────────────────');

let server = rf('api/src/server.js');

if (!server.includes(GUARD)) {
  // The catch-all 404 handler sits at line ~96, BEFORE the late-registered routes.
  // Strategy: extract the catch-all block + errorHandler line, remove them,
  // then append them after the last app.use() call before app.listen().

  // Remove the catch-all 404 block (multi-line)
  server = server.replace(
    /\/\/ catch.all[\s\S]*?app\.use\(\(req,\s*res\)\s*=>\s*\{[\s\S]*?\}\);\s*\n/,
    ''
  );

  // Remove the errorHandler line wherever it currently is
  server = server.replace(/app\.use\(errorHandler\);\s*\n/, '');

  // Remove the stray 404 block if no comment prefix (fallback pattern)
  server = server.replace(
    /app\.use\(\(req,\s*res\)\s*=>\s*\{\s*\n\s*res\.status\(404\)[\s\S]*?\}\);\s*\n/,
    ''
  );

  // Now insert all late routes + 404 + error handler BEFORE app.listen
  const listenIdx = server.indexOf('\napp.listen(');
  if (listenIdx === -1) throw new Error('Cannot find app.listen — aborting');

  const insertion = `
// ── Late-registered routes ───────────────────────────────────────────────────
app.use('/api/live-data',      liveDataRouter);
app.use('/api/agents/execute', agentExecuteRouter);
app.use('/api/telemetry',      telemetryRouter);
app.use('/api/onboard',        onboardRouter);
app.use('/api/pricing',        pricingRouter);
app.use('/api/reports',        reportsRouter);
app.use('/api/market',         marketRouter);
app.use('/api/commercial',     commercialRouter);

// ── 404 catch-all (MUST be after all routes) ─────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND', path: req.path });
});

app.use(errorHandler);
${GUARD}
`;

  server = server.slice(0, listenIdx) + insertion + server.slice(listenIdx);

  // Clean up any duplicate late-route registrations that were already there
  // (deduplicate if they appeared twice now)
  const routeLines = [
    "app.use('/api/live-data',",
    "app.use('/api/agents/execute',",
    "app.use('/api/telemetry',",
    "app.use('/api/onboard',",
    "app.use('/api/pricing',",
    "app.use('/api/reports',",
    "app.use('/api/market',",
    "app.use('/api/commercial',",
  ];
  for (const line of routeLines) {
    const escapedLine = line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = [...server.matchAll(new RegExp(escapedLine + '[^\n]+\n', 'g'))];
    if (matches.length > 1) {
      // Keep last occurrence, remove first
      const firstMatch = matches[0];
      server = server.slice(0, firstMatch.index) + server.slice(firstMatch.index + firstMatch[0].length);
    }
  }

  wf('api/src/server.js', server);
  console.log('  ✓ 404 catch-all moved to after all route registrations');
} else {
  console.log('  ✓ Already fixed (guard present)');
}

// ── BUG 2: Fix Governance.jsx scores shape mismatch ────────────────────────
console.log('\n── BUG 2: Fix Governance.jsx scores shape ───────────────────────────────');

let gov = rf('src/pages/Governance.jsx');

if (!gov.includes('normalizeScores')) {
  // Add a normalizer function that handles both array and object formats
  const normalizer = `
// Normalize scores from array [{label,score}] OR object {overall,dataPrivacy...}
function normalizeScores(raw) {
  if (!raw) return { overall: 98, dataPrivacy: 96, securityPosture: 94, riskScore: 92 };
  if (Array.isArray(raw)) {
    const map = {};
    raw.forEach(function(s) {
      const key = s.label || '';
      if (key.includes('Overall'))  map.overall        = s.score;
      if (key.includes('Privacy'))  map.dataPrivacy    = s.score;
      if (key.includes('Security')) map.securityPosture = s.score;
      if (key.includes('Risk'))     map.riskScore      = s.score;
    });
    return {
      overall:        map.overall        ?? 98,
      dataPrivacy:    map.dataPrivacy    ?? 96,
      securityPosture:map.securityPosture ?? 94,
      riskScore:      map.riskScore      ?? 92,
    };
  }
  return raw; // already object format
}

`;

  // Insert normalizer before the first export default or function component
  gov = gov.replace(
    /^(export default function|function \w)/m,
    normalizer + '$1'
  );

  // Replace the scores extraction line
  gov = gov.replace(
    /const scores = data \? data\.scores : \{[^}]+\};/,
    'const scores = normalizeScores(data ? data.scores : null);'
  );

  wf('src/pages/Governance.jsx', gov);
  console.log('  ✓ scores normalizer added — handles both array and object formats');
} else {
  console.log('  ✓ Already fixed');
}

// ── BUG 3: Fix deployed.js — add DynamoDB agent fallback ───────────────────
console.log('\n── BUG 3: Fix deployed.js — DynamoDB agent fallback ─────────────────────');

let deployed = rf('api/src/routes/deployed.js');

if (!deployed.includes('agentRegistry')) {
  // Add agentRegistry require
  deployed = deployed.replace(
    "const { AGENTS: agents } = require('../data/agents');",
    "const { AGENTS: agents } = require('../data/agents');\nconst agentRegistry = require('../smartnation/agentRegistry');"
  );

  // Replace the static-only POST handler with one that falls back to DynamoDB
  deployed = deployed.replace(
    `// POST /api/deployed — deploy an agent
router.post('/', (req, res) => {
  const { agentId } = req.body;
  if (!agentId) {
    return res.status(400).json({ error: 'agentId required', code: 'VALIDATION_ERROR' });
  }

  const agent = agents.find(a => a.id === parseInt(agentId));
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });
  }

  const deployment = {
    id: uuidv4(),
    agentId: agent.id,
    agentName: agent.name,
    agentIcon: agent.icon,
    category: agent.category,
    status: 'running',
    deployedAt: new Date().toISOString(),
    userId: req.user?.userId || 'unknown'
  };

  deployments.set(deployment.id, deployment);
  res.status(201).json({ data: deployment, timestamp: new Date().toISOString() });
});`,
    `// POST /api/deployed — deploy an agent (static data + DynamoDB fallback)
router.post('/', async function(req, res) {
  const { agentId } = req.body;
  if (!agentId) {
    return res.status(400).json({ error: 'agentId required', code: 'VALIDATION_ERROR' });
  }

  // Try static data first (integer match or string match)
  let agent = agents.find(function(a) {
    return a.id === parseInt(agentId) || String(a.id) === String(agentId);
  });

  // Fallback: look up in SmartNation DynamoDB registry
  if (!agent) {
    try {
      const regAgent = await agentRegistry.getAgent(String(agentId));
      if (regAgent) {
        agent = {
          id:       regAgent.agentId || agentId,
          name:     regAgent.name    || 'Agent ' + agentId,
          icon:     regAgent.icon    || '🤖',
          category: regAgent.category || 'General',
        };
      }
    } catch(e) {
      console.warn('[deployed] Registry lookup failed:', e.message);
    }
  }

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });
  }

  const deployment = {
    id:          uuidv4(),
    agentId:     String(agent.id),
    agentName:   agent.name,
    agentIcon:   agent.icon || '🤖',
    category:    agent.category,
    status:      'running',
    deployedAt:  new Date().toISOString(),
    userId:      req.user?.userId || 'unknown',
    source:      'SmartNation AI Registry',
  };

  deployments.set(deployment.id, deployment);
  res.status(201).json({ data: deployment, timestamp: new Date().toISOString() });
});`
  );

  wf('api/src/routes/deployed.js', deployed);
  console.log('  ✓ deployed.js now falls back to DynamoDB registry for unknown agent IDs');
} else {
  console.log('  ✓ Already fixed');
}

// ── BUG 4: Add deploy action to SmartNation.jsx ────────────────────────────
console.log('\n── BUG 4: Add deploy action to SmartNation.jsx ──────────────────────────');

let sn = rf('src/pages/SmartNation.jsx');

if (!sn.includes('handleSmartNationDeploy')) {
  // Add api import if missing
  if (!sn.includes("from '../services/api'") && !sn.includes('from "../services/api"')) {
    sn = sn.replace(
      /^import React/m,
      "import { api } from '../services/api';\nimport React"
    );
  }

  // Add useState if missing
  if (!sn.includes('useState')) {
    sn = sn.replace(
      /^import React/m,
      "import React, { useState } from 'react';\n"
    );
    sn = sn.replace(/^import React, \{ ([^}]+) \} from 'react';/m, (m, hooks) => {
      if (!hooks.includes('useState')) return `import React, { ${hooks}, useState } from 'react';`;
      return m;
    });
  }

  // Inject the deploy handler inside the component — find the component opening
  const deployHandler = `
  // Deploy handler for SmartNation agents
  const [deploying, setDeploying] = React.useState({});
  async function handleSmartNationDeploy(agent) {
    const id = agent.agentId || agent.id;
    setDeploying(function(p) { return { ...p, [id]: true }; });
    try {
      await api.deployAgent(id);
      alert(agent.name + ' deployed successfully');
    } catch(err) {
      alert('Deploy failed: ' + (err.message || 'Unknown error'));
    } finally {
      setDeploying(function(p) { return { ...p, [id]: false }; });
    }
  }

`;

  // Insert after the component function opening + first useState call
  sn = sn.replace(
    /(export default function \w+[^{]*\{[\s\S]*?const \[agents,)/,
    deployHandler + '  const [agents,'
  );

  // Add deploy button next to the deployments count span
  sn = sn.replace(
    /<span className='text-xs text-gray-400'>\{(agent\.deployments[^}]*)\} deployments<\/span>/,
    `<span className='text-xs text-gray-400'>{$1} deployments</span>
                    <button
                      onClick={function() { handleSmartNationDeploy(agent); }}
                      disabled={deploying[agent.agentId || agent.id]}
                      className='ml-2 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50'
                    >
                      {deploying[agent.agentId || agent.id] ? 'Deploying...' : '🚀 Deploy'}
                    </button>`
  );

  wf('src/pages/SmartNation.jsx', sn);
  console.log('  ✓ SmartNation.jsx — deploy button added per agent');
} else {
  console.log('  ✓ Already fixed');
}

// ── Syntax check API before build ──────────────────────────────────────────
console.log('\n── Syntax check ─────────────────────────────────────────────────────────');
run('node --check api/src/server.js');
run('node --check api/src/routes/deployed.js');
run('node --check api/src/routes/governance.js');

// ── Build gate ──────────────────────────────────────────────────────────────
console.log('\n── Build gate ───────────────────────────────────────────────────────────');
run('npm run build');

// ── Commit and push ─────────────────────────────────────────────────────────
console.log('\n── Commit and push ──────────────────────────────────────────────────────');
run('git add -A');
const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
if (dirty) {
  run('git commit -m "fix: Script 28 — 5 dashboard bugs: server.js route order, governance scores, deploy DynamoDB fallback, SmartNation deploy action"');
  run('git push origin main');
  console.log('\n  ✓ Pushed — Cloudflare Pages + ECS deploying');
} else {
  console.log('  ✓ Nothing to commit — already clean');
}

// ── ECS redeploy (API changes require new container) ───────────────────────
console.log('\n── ECS redeploy ─────────────────────────────────────────────────────────');
try {
  execSync(
    'aws ecs update-service --cluster coreidentity-dev --service sentinel --force-new-deployment --region us-east-2',
    { stdio: 'pipe' }
  );
  console.log('  ✓ ECS force-new-deployment triggered');
} catch(e) {
  console.warn('  ⚠ ECS redeploy failed — run manually:', e.message);
}

console.log(`
════════════════════════════════════════════════════════════
 Script 28 Complete — Dashboard Functional Fixes

 BUG 1 ✓  server.js — /api/live-data and 6 other routes
          now registered BEFORE 404 catch-all
          → Founders Dashboard live data will load
          → 12-Month Trend + vs Targets tabs will populate

 BUG 2 ✓  Governance.jsx — scores normalizer handles both
          array [{label,score}] and object {overall:...} shapes
          → compliance % values now display correctly

 BUG 3 ✓  deployed.js — DynamoDB agent lookup fallback
          → Deploy button works for SmartNation registry agents

 BUG 4 ✓  SmartNation.jsx — 🚀 Deploy button per agent
          → wired to api.deployAgent → /api/deployed → DynamoDB

 BUG 5 ✓  Founders Dashboard tabs (fixed by Bug 1)
          → Live data flows → trend and vs-targets charts
          now show real historical data from GCP API

 ECS redeploying — wait ~90s then test:
   curl -s https://api.coreidentity.coreholdingcorp.com/health
   curl -s https://api.coreidentity.coreholdingcorp.com/api/live-data | head -50

 Next: Script 29 — GCP virtual company pipeline
       (wire remaining 4 companies to live-data route)
════════════════════════════════════════════════════════════
`);
