#!/usr/bin/env node
/**
 * Patch 26-A Build Fix v1
 * 1. Re-export useNotifications from App.jsx (stub — AgentCatalog needs it)
 * 2. Fix DocsPage.jsx duplicate style keys
 * Idempotent · ends with npm run build
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO = path.join(process.env.HOME, 'coreidentity-dashboard');
const run = cmd => { console.log(`  $ ${cmd}`); execSync(cmd, { cwd: REPO, stdio: 'inherit' }); };
const rf = rel => fs.readFileSync(path.join(REPO, rel), 'utf8');
const wf = (rel, c) => { fs.writeFileSync(path.join(REPO, rel), c, 'utf8'); console.log(`  ✓ ${rel}`); };

// Fix 1: Add useNotifications export to App.jsx
console.log('\n── Fix 1: Export useNotifications from App.jsx ──────────────');
let app = rf('src/App.jsx');
if (!app.includes('export const useNotifications')) {
  // Add after the imports block, before the NAV_ITEMS const
  app = app.replace(
    '// ── Sidebar nav items',
    `// ── Notifications context (consumed by AgentCatalog + others)
const NotificationContext = React.createContext({ notifications: [], addNotification: () => {} });
export const useNotifications = () => React.useContext(NotificationContext);

// ── Sidebar nav items`
  );
  // Wrap PortalLayout children in provider
  app = app.replace(
    '<PortalLayout route={route} setRoute={setRoute}>',
    `<NotificationContext.Provider value={{ notifications: [], addNotification: () => {} }}>
      <PortalLayout route={route} setRoute={setRoute}>`
  );
  app = app.replace(
    '</PortalLayout>\n  );\n}',
    `</PortalLayout>
    </NotificationContext.Provider>
  );
}`
  );
  wf('src/App.jsx', app);
} else {
  console.log('  ✓ already exported');
}

// Fix 2: Remove duplicate keys in DocsPage.jsx
console.log('\n── Fix 2: Fix DocsPage.jsx duplicate style keys ─────────────');
let docs = rf('src/pages/DocsPage.jsx');
if (docs.includes('overflowX:\'hidden\',maxWidth:\'100vw\',overflowX:\'hidden\',maxWidth:\'100vw\'')) {
  docs = docs.replace(
    /overflowX:'hidden',maxWidth:'100vw',overflowX:'hidden',maxWidth:'100vw'/g,
    "overflowX:'hidden',maxWidth:'100vw'"
  );
  wf('src/pages/DocsPage.jsx', docs);
} else {
  // Try broader pattern
  docs = docs.replace(
    /(overflowX:'hidden',maxWidth:'100vw',){2}/g,
    "overflowX:'hidden',maxWidth:'100vw',"
  );
  wf('src/pages/DocsPage.jsx', docs);
}

// Build gate
console.log('\n── Build gate ────────────────────────────────────────────────');
run('npm run build');

// Commit + push
console.log('\n── Commit + push ─────────────────────────────────────────────');
run('git add -A');
const dirty = execSync('git status --porcelain', { cwd: REPO }).toString().trim();
if (dirty) {
  run('git commit -m "fix: 26-A build — useNotifications export + DocsPage duplicate keys"');
  run('git push origin main');
}
console.log('\n✓ Patch 26-A complete — build passing, pushed');
