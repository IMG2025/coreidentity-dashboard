#!/usr/bin/env node
/**
 * Patch 33 — Wire real notification system in App.jsx
 *
 * ROOT CAUSE: NotificationContext.Provider has hardcoded stub:
 *   value={{ notifications: [], addNotification: () => {} }}
 *   All button feedback silently discarded.
 *
 * FIX: Replace stub with real useState-backed implementation
 *   + Toast renderer in App.jsx
 *   + Handle SENTINEL_BLOCKED with approval prompt in AgentCatalog
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
const GUARD = '/* patch-33 */';

// ── App.jsx — replace stub NotificationContext with real implementation ─────
console.log('\n── App.jsx — wire real notification system ──────────────────────────────');

let app = rf('src/App.jsx');

if (!app.includes(GUARD)) {
  // 1. Add useState to React import if not present
  if (!app.includes('useState')) {
    app = app.replace(
      /import React([^;]*) from 'react';/,
      "import React, { useState$1 } from 'react';"
    );
    // Handle case where hooks are already imported
    app = app.replace(
      /import \{ ([^}]*) \} from 'react';/,
      (m, hooks) => hooks.includes('useState') ? m : `import { ${hooks}, useState } from 'react';`
    );
  }

  // 2. Replace the stub NotificationContext definition with real one
  app = app.replace(
    `const NotificationContext = createContext({ notifications: [], addNotification: () => {} });`,
    `${GUARD}
const NotificationContext = createContext({ notifications: [], addNotification: () => {}, removeNotification: () => {} });`
  );

  // 3. Replace the stub Provider value with real useState implementation
  // Find the Provider line and replace just the value prop
  app = app.replace(
    `<NotificationContext.Provider value={{ notifications: [], addNotification: () => {} }}>`,
    `<NotificationContextWrapper>`
  );
  app = app.replace(
    `</NotificationContext.Provider>`,
    `</NotificationContextWrapper>`
  );

  // 4. Add NotificationContextWrapper component before the main export
  const wrapperComponent = `
// ── Real notification system ─────────────────────────────────────────────────
const TOAST_COLORS = {
  success: { bg: '#166534', border: '#22c55e', icon: '✓' },
  error:   { bg: '#7f1d1d', border: '#ef4444', icon: '✕' },
  warning: { bg: '#78350f', border: '#f59e0b', icon: '⚠' },
  info:    { bg: '#1e3a5f', border: '#3b82f6', icon: 'ℹ' },
};

function NotificationContextWrapper({ children }) {
  const [notifications, setNotifications] = React.useState([]);

  function addNotification(message, type = 'info') {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => removeNotification(id), type === 'error' ? 6000 : 4000);
  }

  function removeNotification(id) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: 20, right: 16, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        maxWidth: 'calc(100vw - 32px)', width: 340,
        pointerEvents: 'none'
      }}>
        {notifications.map(n => {
          const s = TOAST_COLORS[n.type] || TOAST_COLORS.info;
          return (
            <div key={n.id} style={{
              background: s.bg, border: '1px solid ' + s.border,
              borderRadius: 8, padding: '10px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              pointerEvents: 'auto', cursor: 'pointer',
              color: '#fff', fontSize: 13, lineHeight: 1.4,
              animation: 'slideIn 0.2s ease'
            }} onClick={() => removeNotification(n.id)}>
              <span style={{ fontSize: 14, fontWeight: 700, flexShrink: 0, color: s.border }}>{s.icon}</span>
              <span>{n.message}</span>
            </div>
          );
        })}
      </div>
      <style>{'\`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }\`'}</style>
    </NotificationContext.Provider>
  );
}

`;

  // Insert wrapper before the default export function
  app = app.replace(
    /\nexport default function /,
    wrapperComponent + '\nexport default function '
  );

  wf('src/App.jsx', app);
  console.log('  ✓ NotificationContextWrapper with real useState + toast renderer');
} else {
  console.log('  ✓ already patched');
}

// ── AgentCatalog.jsx — handle SENTINEL_BLOCKED with approval prompt ─────────
console.log('\n── AgentCatalog.jsx — SENTINEL_BLOCKED approval prompt ─────────────────');

let ac = rf('src/pages/AgentCatalog.jsx');

if (!ac.includes('SENTINEL_BLOCKED')) {
  // Replace the execute error handler to surface Sentinel blocks clearly
  ac = ac.replace(
    `if (msg && msg.includes('approval')) {
        addNotification('Approval required for ' + agent.name + ' — submit via Sentinel OS', 'warning');
      } else {
        addNotification(msg || 'Execution failed', 'error');
      }`,
    `const isSentinel = err.response?.data?.code === 'SENTINEL_BLOCKED' || (msg && msg.includes('Sentinel'));
      const isApproval = msg && msg.includes('approval');
      if (isSentinel || isApproval) {
        addNotification('⚖ Sentinel blocked: ' + (err.response?.data?.reason || msg || 'Policy violation') + ' — submit approval in Sentinel OS', 'warning');
      } else {
        addNotification(msg || 'Execution failed', 'error');
      }`
  );
  wf('src/pages/AgentCatalog.jsx', ac);
  console.log('  ✓ SENTINEL_BLOCKED surfaces policy reason in toast');
} else {
  console.log('  ✓ already patched');
}

// ── Build ───────────────────────────────────────────────────────────────────
console.log('\n── Build ────────────────────────────────────────────────────────────────');
run('npm run build');

// ── Commit + push ───────────────────────────────────────────────────────────
run('git add -A');
const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
if (dirty) {
  run('git commit -m "fix: patch 33 — real notification toasts (stub was silently discarding all feedback)"');
  run('git push origin main');
  console.log('  ✓ Pushed — live immediately via Cloudflare Pages (no ECS needed)');
} else {
  console.log('  ✓ Nothing to commit');
}

console.log(`
════════════════════════════════════════════════════════════
 Patch 33 Complete — Frontend only, live immediately

 ✓ Notification toasts now render bottom-right
 ✓ Success (green), Error (red), Warning (amber), Info (blue)
 ✓ Auto-dismiss: 4s normal, 6s errors
 ✓ Click to dismiss
 ✓ Sentinel blocks show policy reason + "submit in Sentinel OS"

 Test immediately on portal — no ECS needed:
   - Deploy button → green toast "Agent deployed successfully"
   - Execute → amber toast with Sentinel policy reason
   - Failed requests → red toast with error message
════════════════════════════════════════════════════════════
`);
