'use strict';
const { signGovernanceDocument, verifyGovernanceDocument,
        DOCUMENT_CLASSIFICATIONS } = require('./document-signing-service');
const { AlgorithmRegistry } = require('../lib/pqc/algorithm-registry');
const { sha3Digest } = require('../lib/pqc/hybrid-kdf');
const crypto = require('crypto');

let passed = 0, failed = 0;
function check(label, result) {
  console.log(result ? 'PASS' : 'FAIL', label);
  result ? passed++ : failed++;
}

console.log('C-S01: Governance Document Signing Tests');
console.log('Note: SLH-DSA is slow — allow 30-60 seconds');
console.log('');

const suite = AlgorithmRegistry.current();
const [signerPub, signerPriv] = suite.archivalSignature.generateKeypair();
const signerKeyId     = 'cidg-docsig-key-001';
const auditChainHash  = sha3Digest(Buffer.from('genesis')).toString('hex');

// Test 1: Sign a CIAG agreement
const ciagDoc = Buffer.from(JSON.stringify({
  title: 'CoreIdentity CIAG Phase 0 Governance Diagnostic',
  client: 'CVS Health',
  value: '$450,000',
  date: '2026-07-01'
}));

const signed = signGovernanceDocument(
  ciagDoc, 'DOC-001', 'CIAG_AGREEMENT',
  signerPriv, signerKeyId, auditChainHash
);

check('Signed doc has documentId',      signed.documentId === 'DOC-001');
check('Signed doc has documentHash',    typeof signed.documentHash === 'string');
check('Signed doc algorithm correct',   signed.algorithm === 'SLH-DSA-128s');
check('Signed doc fips correct',        signed.fipsStandard === 'FIPS-205');
check('Signed doc has signature',       Buffer.isBuffer(signed.signature));
check('Signed doc has signatureHex',    typeof signed.signatureHex === 'string');
check('Signed doc classification',      signed.classification === 'CIAG_AGREEMENT');
check('Signed doc has auditChainHash',  signed.auditChainHash === auditChainHash);
check('Signed doc schemaVersion',       signed.schemaVersion === 'COREIDENTITY-DOCSIG-v1');
check('Signed doc has signedAtISO',     typeof signed.signedAtISO === 'string');

// Test 2: Verify valid document
const verifyResult = verifyGovernanceDocument(ciagDoc, signed, signerPub);
check('Valid doc: valid=true',          verifyResult.valid);
check('Valid doc: documentIntact=true', verifyResult.documentIntact);
check('Valid doc: signatureValid=true', verifyResult.signatureValid);

// Test 3: Tampered document content rejected
const tamperedDoc = Buffer.from('TAMPERED CONTENT');
const tamperedResult = verifyGovernanceDocument(tamperedDoc, signed, signerPub);
check('Tampered content: valid=false',          !tamperedResult.valid);
check('Tampered content: documentIntact=false', !tamperedResult.documentIntact);

// Test 4: Wrong signer key rejected
const [wrongPub] = suite.archivalSignature.generateKeypair();
const wrongKeyResult = verifyGovernanceDocument(ciagDoc, signed, wrongPub);
check('Wrong key: valid=false',          !wrongKeyResult.valid);
check('Wrong key: signatureValid=false', !wrongKeyResult.signatureValid);

// Test 5: All classification types accepted
const classifications = ['POLICY_CONTRACT', 'INSTITUTIONAL_BRIEFING',
                          'AUDIT_RECORD', 'DUE_DILIGENCE',
                          'GOVERNANCE_POLICY', 'AGENT_AUTHORIZATION'];
let classOk = true;
for (const cls of classifications) {
  try {
    const s = signGovernanceDocument(
      ciagDoc, 'DOC-CLS-' + cls, cls,
      signerPriv, signerKeyId, auditChainHash
    );
    if (!s.signature) classOk = false;
  } catch(e) { classOk = false; }
}
check('All 7 classification types sign successfully', classOk);

// Test 6: Invalid classification rejected
let invalidCaught = false;
try {
  signGovernanceDocument(ciagDoc, 'DOC-BAD', 'INVALID_TYPE',
    signerPriv, signerKeyId, auditChainHash);
} catch(e) { invalidCaught = true; }
check('Invalid classification rejected', invalidCaught);

// Test 7: Document hash is deterministic
const hash1 = sha3Digest(ciagDoc).toString('hex');
const hash2 = sha3Digest(ciagDoc).toString('hex');
check('Document hash deterministic', hash1 === hash2);
check('Document hash length 128 chars', hash1.length === 128);

// Test 8: Different documents produce different hashes
const doc2 = Buffer.from('Different governance document content');
const hash3 = sha3Digest(doc2).toString('hex');
check('Different docs different hashes', hash1 !== hash3);

console.log('');
console.log('Results:', passed, 'passed,', failed, 'failed');
if (failed > 0) process.exit(1);
