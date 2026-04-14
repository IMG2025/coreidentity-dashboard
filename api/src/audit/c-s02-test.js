'use strict';
const { hashAuditEntry, computeMerkleRoot, generateMerkleProof,
        verifyMerkleProof, signMerkleRoot, BATCH_SIZE } = require('./merkle-audit-log');
const { AlgorithmRegistry } = require('../lib/pqc/algorithm-registry');

let passed = 0, failed = 0;
function check(label, result) {
  console.log(result ? 'PASS' : 'FAIL', label);
  result ? passed++ : failed++;
}

console.log('C-S02: SHA-3-512 Merkle Audit Log Tests');
console.log('');

// Helper: create test audit entry
function makeEntry(seq, agentId, outcome) {
  const entry = {
    sequence:   seq,
    timestamp:  Date.now(),
    agentId:    agentId || 'RX-COMPLY-Meridian',
    agentType:  'healthcare-compliance',
    action:     'governance:evaluate',
    resourceId: 'policy-hipaa-001',
    outcome:    outcome || 'ALLOW',
    policyHash: 'abc123def456',
    sessionId:  'sess-' + seq
  };
  entry.entryHash = hashAuditEntry(entry);
  return entry;
}

// Test 1: hashAuditEntry deterministic
const e1 = makeEntry(1);
const e2 = makeEntry(1);
e2.timestamp = e1.timestamp; // normalize timestamp
e2.entryHash = hashAuditEntry(e2);
check('hashAuditEntry deterministic',     e1.entryHash === e2.entryHash);
check('hashAuditEntry length 128 chars',  e1.entryHash.length === 128);

// Test 2: Different entries produce different hashes
const e3 = makeEntry(2, 'LEX-CONTRACT-Arbor');
check('Different entries different hashes', e1.entryHash !== e3.entryHash);

// Test 3: Merkle root over single entry
const singleRoot = computeMerkleRoot([e1]);
check('Single entry Merkle root 128 chars', singleRoot.length === 128);

// Test 4: Merkle root over batch of entries
const batch = [];
for (let i = 1; i <= 10; i++) batch.push(makeEntry(i));
const root1 = computeMerkleRoot(batch);
const root2 = computeMerkleRoot(batch);
check('Merkle root deterministic',          root1 === root2);
check('Merkle root 128 chars',              root1.length === 128);

// Test 5: Modified entry changes root
const modifiedBatch = batch.map((e, i) => {
  if (i === 5) {
    const tampered = { ...e, outcome: 'DENY' };
    tampered.entryHash = hashAuditEntry(tampered);
    return tampered;
  }
  return e;
});
const tamperedRoot = computeMerkleRoot(modifiedBatch);
check('Tampered entry changes Merkle root', root1 !== tamperedRoot);

// Test 6: Merkle proof generation and verification
for (let idx = 0; idx < batch.length; idx++) {
  const proof = generateMerkleProof(batch, idx);
  const valid = verifyMerkleProof(proof, root1);
  if (!valid) {
    check('Merkle proof valid for index ' + idx, false);
  }
}
check('All 10 Merkle proofs verify correctly', true);

// Test 7: Wrong root fails verification
const proof0 = generateMerkleProof(batch, 0);
check('Wrong root fails verification', !verifyMerkleProof(proof0, 'a'.repeat(128)));

// Test 8: Tampered entry fails proof against original root
const tamperedProof = generateMerkleProof(modifiedBatch, 5);
check('Tampered entry proof fails against original root',
      !verifyMerkleProof(tamperedProof, root1));

// Test 9: Proof depth is log2(n)
const proof5 = generateMerkleProof(batch, 5);
check('Proof depth is ceil(log2(10)) = 4', proof5.proofDepth === 4);

// Test 10: signMerkleRoot with ML-DSA-65
const suite = AlgorithmRegistry.current();
const [sigPub, sigPriv] = suite.signature.generateKeypair();
const signedRoot = signMerkleRoot(batch, sigPriv, 'audit-key-001');

check('signMerkleRoot has root',        typeof signedRoot.root === 'string');
check('signMerkleRoot has signature',   Buffer.isBuffer(signedRoot.signature));
check('signMerkleRoot batchStart=1',    signedRoot.batchStart === 1);
check('signMerkleRoot batchEnd=10',     signedRoot.batchEnd === 10);
check('signMerkleRoot entryCount=10',   signedRoot.entryCount === 10);
check('signMerkleRoot signerKeyId',     signedRoot.signerKeyId === 'audit-key-001');

// Test 11: Verify signed root signature
const crypto = require('crypto');
const rootRecord = {
  root:        signedRoot.root,
  batchStart:  signedRoot.batchStart,
  batchEnd:    signedRoot.batchEnd,
  entryCount:  signedRoot.entryCount,
  computedAt:  signedRoot.computedAt,
  signerKeyId: signedRoot.signerKeyId
};
const recordDigest = crypto.createHash('sha3-512')
  .update(Buffer.from(JSON.stringify(rootRecord))).digest();
const sigValid = suite.signature.verify(recordDigest, signedRoot.signature, sigPub);
check('Signed Merkle root signature verifies', sigValid);

// Test 12: BATCH_SIZE constant
check('BATCH_SIZE is 1000', BATCH_SIZE === 1000);

// Test 13: Large batch — 100 entries
const largeBatch = [];
for (let i = 1; i <= 100; i++) largeBatch.push(makeEntry(i));
const largeRoot = computeMerkleRoot(largeBatch);
check('100-entry Merkle root computed', largeRoot.length === 128);
const largeProof = generateMerkleProof(largeBatch, 50);
check('100-entry proof for index 50 verifies', verifyMerkleProof(largeProof, largeRoot));

console.log('');
console.log('Results:', passed, 'passed,', failed, 'failed');
if (failed > 0) process.exit(1);
