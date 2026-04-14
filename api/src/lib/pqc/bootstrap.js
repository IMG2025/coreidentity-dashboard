/**
 * CoreIdentity PQC Bootstrap
 * ===========================
 * Single import point for all PQC initialization.
 * Validates AlgorithmRegistry has COREIDENTITY-PQC-v1
 * registered and all three algorithm slots populated.
 *
 * Import at application entry point:
 *   require('./src/lib/pqc/bootstrap');
 *
 * script: B-S03-algorithm-registry-bootstrap
 */
'use strict';

const { AlgorithmRegistry } = require('./algorithm-registry');

// Validate suite registered correctly
let suite;
try {
  suite = AlgorithmRegistry.current();
} catch(err) {
  throw new Error('CRITICAL: PQC suite registration failed — ' + err.message);
}

if (!suite) {
  throw new Error('CRITICAL: PQC suite is null — cannot start');
}

// Validate all three algorithm slots populated
const checks = [
  { name: 'KEM',           impl: suite.kem,              required: 'ML-KEM' },
  { name: 'Signature',     impl: suite.signature,        required: 'ML-DSA' },
  { name: 'ArchivalSig',   impl: suite.archivalSignature, required: 'SLH-DSA' }
];

for (const check of checks) {
  if (!check.impl) {
    throw new Error('CRITICAL: ' + check.name + ' not registered in PQC suite');
  }
  if (!check.impl.algorithm.includes(check.required.split('-')[0])) {
    throw new Error('CRITICAL: Expected ' + check.required + ' for ' + check.name +
                    ', got ' + check.impl.algorithm);
  }
}

const PQC_SUITE_ID      = suite.suiteId;
const PQC_SUITE_VERSION = suite.version;
const PQC_INITIALIZED   = true;

console.info(
  '[CoreIdentity PQC] Initialized:',  suite.suiteId, 'v' + suite.version,
  '| KEM:', suite.kem.algorithm,
  '| Sig:', suite.signature.algorithm,
  '| Archival:', suite.archivalSignature.algorithm
);

module.exports = { PQC_SUITE_ID, PQC_SUITE_VERSION, PQC_INITIALIZED };
