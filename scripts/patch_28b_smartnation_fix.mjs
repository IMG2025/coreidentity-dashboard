#!/usr/bin/env node
/**
 * Patch 28-B — SmartNation.jsx deploy button (precise injection)
 * Idempotent · Zero hand edits · Ends with npm run build
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO = path.join(process.env.HOME, 'coreidentity-dashboard');
const run  = (cmd) => { console.log(`  $ ${cmd.slice(0,100)}`); execSync(cmd, { cwd: REPO, stdio: 'inherit' }); };
const fp   = path.join(REPO, 'src/pages/SmartNation.jsx');

let src = fs.readFileSync(fp, 'utf8');

if (src.includes('handleSmartNationDeploy')) {
  console.log('  ✓ Already patched');
} else {
  // 1. Inject deploy state + handler on the first line INSIDE the component body.
  //    Anchor: the line immediately after `export default function SmartNationAI() {`
  const ANCHOR = 'export default function SmartNationAI() {';
  const idx = src.indexOf(ANCHOR);
  if (idx === -1) throw new Error('Cannot find component declaration — aborting');

  const insertAfter = idx + ANCHOR.length;
  const handler = `
  // ── Deploy handler ──────────────────────────────────────────────────────
  const [deploying, setDeploying] = React.useState({});
  async function handleSmartNationDeploy(agent) {
    const id = agent.agentId || agent.id;
    setDeploying(p => ({ ...p, [id]: true }));
    try {
      await api.deployAgent(id);
      alert(agent.name + ' deployed successfully');
    } catch(err) {
      alert('Deploy failed: ' + (err.message || 'Unknown error'));
    } finally {
      setDeploying(p => ({ ...p, [id]: false }));
    }
  }
`;

  src = src.slice(0, insertAfter) + handler + src.slice(insertAfter);

  // 2. Add Deploy button after the deployments count span.
  //    Exact anchor from confirmed file content:
  const SPAN_ANCHOR = `<span className='text-xs text-gray-400'>{(agent.deployments || 0).toLocaleString()} deployments</span>`;
  if (!src.includes(SPAN_ANCHOR)) throw new Error('Cannot find deployments span — aborting');

  const DEPLOY_BTN = `<span className='text-xs text-gray-400'>{(agent.deployments || 0).toLocaleString()} deployments</span>
                    <button
                      onClick={function() { handleSmartNationDeploy(agent); }}
                      disabled={deploying[agent.agentId || agent.id]}
                      className='px-2 py-0.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 ml-1'
                    >
                      {deploying[agent.agentId || agent.id] ? '...' : '🚀 Deploy'}
                    </button>`;

  src = src.replace(SPAN_ANCHOR, DEPLOY_BTN);

  fs.writeFileSync(fp, src, 'utf8');
  console.log('  ✓ SmartNation.jsx — handler injected at component top, deploy button added');
}

run('npm run build');

run('git add -A');
const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
if (dirty) {
  run('git commit -m "fix: patch 28-B — SmartNation deploy button (precise injection)"');
  run('git push origin main');
  console.log('  ✓ Pushed');
} else {
  console.log('  ✓ Nothing to commit');
}

try {
  execSync('aws ecs update-service --cluster coreidentity-dev --service sentinel --force-new-deployment --region us-east-2', { stdio: 'pipe' });
  console.log('  ✓ ECS redeploy triggered — wait ~90s then test portal');
} catch(e) {
  console.warn('  ⚠ ECS redeploy failed:', e.message);
}

console.log('\n  ✓ Patch 28-B complete\n');
