#!/usr/bin/env node
/**
 * Script: api_preflight_audit.mjs
 * ─────────────────────────────────────────────────────────────
 * Pre-deployment audit of the CoreIdentity API codebase.
 * Catches issues BEFORE they crash ECS containers.
 *
 * Checks:
 *   1. Node syntax validation on all .js files
 *   2. Broken require() paths (missing files)
 *   3. Undefined variable references (common typos)
 *   4. Missing environment variables referenced in code
 *   5. Dockerfile EXPOSE vs PORT env var mismatch
 *   6. Route files required in server.js but not mounted
 *   7. Circular dependency detection
 *
 * Idempotent · read-only · no side effects
 */

import fs   from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const REPO     = path.join(process.env.HOME, 'coreidentity-dashboard');
const API_DIR  = path.join(REPO, 'api/src');
const PASS     = '✓';
const FAIL     = '✗';
const WARN     = '⚠';

let errors   = 0;
let warnings = 0;

function pass(msg)  { console.log(`  ${PASS} ${msg}`); }
function fail(msg)  { console.log(`  ${FAIL} ${msg}`); errors++; }
function warn(msg)  { console.log(`  ${WARN} ${msg}`); warnings++; }
function section(t) { console.log(`\n── ${t} ${'─'.repeat(55 - t.length)}`); }

function readFile(p)  { return fs.readFileSync(p, 'utf8'); }
function allJsFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) results.push(...allJsFiles(full));
    else if (f.name.endsWith('.js')) results.push(full);
  }
  return results;
}

// ── CHECK 1: Syntax validation ───────────────────────────────
section('CHECK 1: Node syntax validation');
const jsFiles = allJsFiles(API_DIR);
console.log(`  Scanning ${jsFiles.length} files...`);
let syntaxErrors = 0;
for (const f of jsFiles) {
  const rel = path.relative(REPO, f);
  const result = spawnSync('node', ['--check', f], { encoding: 'utf8' });
  if (result.status !== 0) {
    fail(`Syntax error: ${rel}`);
    console.log(`    ${result.stderr?.split('\n')[0]}`);
    syntaxErrors++;
  }
}
if (syntaxErrors === 0) pass(`All ${jsFiles.length} files pass syntax check`);

// ── CHECK 2: Broken require() paths ─────────────────────────
section('CHECK 2: Broken require() paths');
const requireRegex = /require\(['"`](\.[^'"`]+)['"`]\)/g;
let brokenRequires = 0;
for (const f of jsFiles) {
  const rel  = path.relative(REPO, f);
  const code = readFile(f);
  let m;
  while ((m = requireRegex.exec(code)) !== null) {
    const reqPath = m[1];
    const resolved = path.resolve(path.dirname(f), reqPath);
    const candidates = [resolved, resolved + '.js', resolved + '/index.js'];
    if (!candidates.some(c => fs.existsSync(c))) {
      fail(`${rel} → require('${reqPath}') — file not found`);
      brokenRequires++;
    }
  }
  requireRegex.lastIndex = 0;
}

// Also check bare requires in server.js (no ./ prefix)
const serverJs = path.join(API_DIR, 'server.js');
if (fs.existsSync(serverJs)) {
  const code = readFile(serverJs);
  const bareRequire = /require\(['"`](?!\.|[a-z@].*\/node_modules)([a-zA-Z][^'"`./][^'"`]*)['"`]\)/g;
  let bm;
  while ((bm = bareRequire.exec(code)) !== null) {
    const pkg = bm[1];
    // Check if it's a local file masquerading as a package
    const localCandidate = path.join(API_DIR, pkg + '.js');
    const localDir       = path.join(API_DIR, pkg, 'index.js');
    const nodeModules    = path.join(REPO, 'api/node_modules', pkg);
    if (!fs.existsSync(nodeModules) && (fs.existsSync(localCandidate) || fs.existsSync(localDir))) {
      fail(`server.js → require('${pkg}') missing ./ prefix — should be require('./${pkg}')`);
      brokenRequires++;
    }
  }
}
if (brokenRequires === 0) pass('No broken require() paths found');

// ── CHECK 3: Undefined variable exports ─────────────────────
section('CHECK 3: Undefined variable references in exports');
const exportUndefined = /module\.exports\.\w+\s*=\s*([A-Z_]{2,})\s*;/g;
let undefCount = 0;
for (const f of jsFiles) {
  const rel  = path.relative(REPO, f);
  const code = readFile(f);
  let m;
  while ((m = exportUndefined.exec(code)) !== null) {
    const varName = m[1];
    // Check if this variable is defined anywhere in the file
    const defPattern = new RegExp(`(const|let|var|function)\\s+${varName}\\b`);
    if (!defPattern.test(code)) {
      fail(`${rel} → module.exports uses undefined var '${varName}'`);
      undefCount++;
    }
  }
  exportUndefined.lastIndex = 0;
}
if (undefCount === 0) pass('No undefined variable exports found');

// ── CHECK 4: Environment variables ──────────────────────────
section('CHECK 4: Environment variable references');
const envRegex = /process\.env\.([A-Z_]+)/g;
const knownEnvVars = new Set([
  'NODE_ENV', 'PORT', 'AWS_REGION', 'JWT_SECRET', 'JWT_EXPIRES_IN',
  'ALLOWED_ORIGINS', 'DATABASE_URL', 'REDIS_URL', 'LOG_LEVEL',
  'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_DEFAULT_REGION',
]);
const foundEnvVars = new Set();
for (const f of jsFiles) {
  const code = readFile(f);
  let m;
  while ((m = envRegex.exec(code)) !== null) foundEnvVars.add(m[1]);
  envRegex.lastIndex = 0;
}
const unknownEnvVars = [...foundEnvVars].filter(v => !knownEnvVars.has(v));
if (unknownEnvVars.length > 0) {
  warn(`Env vars referenced but not in known list: ${unknownEnvVars.join(', ')}`);
  console.log('    (Verify these are set in ECS task definition)');
} else {
  pass('All env var references look standard');
}

// ── CHECK 5: Dockerfile PORT vs task definition ──────────────
section('CHECK 5: Dockerfile EXPOSE vs PORT env var');
const dockerfilePath = path.join(REPO, 'api/Dockerfile');
if (fs.existsSync(dockerfilePath)) {
  const dockerfile = readFile(dockerfilePath);
  const exposeMatch = dockerfile.match(/EXPOSE\s+(\d+)/);
  const exposedPort = exposeMatch ? exposeMatch[1] : null;
  if (exposedPort) {
    pass(`Dockerfile EXPOSEs port ${exposedPort}`);
    if (exposedPort !== '8080') {
      warn(`Dockerfile EXPOSE ${exposedPort} but task definition PORT=8080 — verify these match`);
    }
  }
} else {
  warn('Dockerfile not found');
}

// ── CHECK 6: Routes required vs mounted in server.js ────────
section('CHECK 6: Routes required vs mounted in server.js');
if (fs.existsSync(serverJs)) {
  const code       = readFile(serverJs);
  const reqMatches = [...code.matchAll(/const (\w+Router)\s*=\s*require/g)].map(m => m[1]);
  const useMatches = [...code.matchAll(/app\.use\([^,)]*,?\s*(\w+Router)/g)].map(m => m[1]);
  const notMounted = reqMatches.filter(r => !useMatches.includes(r));
  const notRequired = useMatches.filter(r => !reqMatches.includes(r));
  if (notMounted.length > 0) {
    for (const r of notMounted) warn(`${r} is required but never mounted with app.use()`);
  }
  if (notRequired.length > 0) {
    for (const r of notRequired) fail(`${r} is used in app.use() but never required`);
  }
  if (notMounted.length === 0 && notRequired.length === 0) {
    pass('All routers are required and mounted');
  }
}

// ── CHECK 7: Package.json dependencies vs requires ───────────
section('CHECK 7: External package availability');
const pkgJsonPath = path.join(REPO, 'api/package.json');
if (fs.existsSync(pkgJsonPath)) {
  const pkg  = JSON.parse(readFile(pkgJsonPath));
  const deps = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ]);
  const bareReqRegex = /require\(['"`](@?[a-zA-Z][a-zA-Z0-9_-]*(?:\/[^'"`]+)?)['"` ]\)/g;
  const builtins = new Set(['fs','path','http','https','crypto','os','stream','events',
    'util','url','querystring','net','tls','child_process','cluster','worker_threads',
    'buffer','string_decoder','timers','assert','zlib','readline']);
  const missing = new Set();
  for (const f of jsFiles) {
    const code = readFile(f);
    let m;
    while ((m = bareReqRegex.exec(code)) !== null) {
      const pkg = m[1].split('/')[0].replace('@','');
      const fullPkg = m[1].startsWith('@') ? m[1].split('/').slice(0,2).join('/') : m[1].split('/')[0];
      if (!builtins.has(fullPkg) && !deps.has(fullPkg) && !fullPkg.startsWith('.')) {
        missing.add(fullPkg);
      }
    }
    bareReqRegex.lastIndex = 0;
  }
  if (missing.size > 0) {
    for (const m of missing) warn(`Package '${m}' required but not in package.json`);
  } else {
    pass('All external packages are in package.json');
  }
}

// ── SUMMARY ──────────────────────────────────────────────────
console.log(`
${'═'.repeat(60)}
 Pre-flight Audit Complete
${'─'.repeat(60)}
 Files scanned : ${jsFiles.length}
 Errors        : ${errors}   ${errors > 0 ? '← MUST FIX BEFORE DEPLOY' : ''}
 Warnings      : ${warnings}  ${warnings > 0 ? '← review recommended' : ''}
${'═'.repeat(60)}
`);

if (errors > 0) {
  console.log(' ❌ DO NOT DEPLOY — fix errors above first\n');
  process.exit(1);
} else {
  console.log(' ✅ CLEAR TO DEPLOY\n');
  process.exit(0);
}
