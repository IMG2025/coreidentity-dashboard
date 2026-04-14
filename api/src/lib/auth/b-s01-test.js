'use strict';
const crypto = require('crypto');
const { issueHybridCredential, validateHybridCredential, extractHybridCredential } = require('./hybrid-credential-validator');
const { AlgorithmRegistry } = require('../pqc/algorithm-registry');

let passed = 0, failed = 0;
function check(label, result) {
  console.log(result ? 'PASS' : 'FAIL', label);
  result ? passed++ : failed++;
}

console.log('B-S01: Hybrid Credential Validator Tests');
console.log('');

// Generate Ed25519 keypair (classical)
const { privateKey: classPrivRaw, publicKey: classPubRaw } =
  crypto.generateKeyPairSync('ed25519');
const classPrivDER = classPrivRaw.export({ format: 'der', type: 'pkcs8' });
const classPubDER  = classPubRaw.export({ format: 'der', type: 'spki' });

// Generate ML-DSA-65 keypair (PQC)
const suite = AlgorithmRegistry.current();
const [pqcPub, pqcPriv] = suite.signature.generateKeypair();
const pqcKeyId = 'test-key-001';

// Test 1: Issue hybrid credential
const payload = { sub: 'agent-001', agentType: 'sentinel', scope: ['governance:read'] };
const cred = issueHybridCredential(payload, classPrivDER, pqcPriv, pqcKeyId);
check('issueHybridCredential returns classicalJWT',    typeof cred.classicalJWT === 'string');
check('issueHybridCredential returns pqcSignature',    Buffer.isBuffer(cred.pqcSignature));
check('issueHybridCredential returns pqcSignatureHex', typeof cred.pqcSignatureHex === 'string');
check('JWT has 3 parts',                               cred.classicalJWT.split('.').length === 3);
check('PQC signature is ML-DSA-65 size',               cred.pqcSignature.length === 3309);

// Test 2: Valid credential validates
const credential = {
  classicalJWT:   cred.classicalJWT,
  pqcSignature:   cred.pqcSignature,
  pqcPublicKeyId: pqcKeyId
};
const result = validateHybridCredential(credential, classPubDER, pqcPub);
check('Valid credential: valid=true',          result.valid);
check('Valid credential: pqcValid=true',       result.pqcValid);
check('Valid credential: classicalValid=true', result.classicalValid);
check('Valid credential: payload returned',    result.payload && result.payload.sub === 'agent-001');

// Test 3: PQC validates FIRST — tampered PQC sig rejected before classical check
const tamperedPQC = Buffer.from(cred.pqcSignature);
tamperedPQC[0] ^= 0xff;
const pqcTampered = validateHybridCredential(
  { ...credential, pqcSignature: tamperedPQC }, classPubDER, pqcPub
);
check('Tampered PQC sig: valid=false',           !pqcTampered.valid);
check('Tampered PQC sig: failedComponent=pqc',   pqcTampered.failedComponent === 'pqc');
check('Tampered PQC sig: classicalValid=false',  !pqcTampered.classicalValid);

// Test 4: Wrong PQC public key rejected
const [wrongPub] = suite.signature.generateKeypair();
const wrongPQC = validateHybridCredential(credential, classPubDER, wrongPub);
check('Wrong PQC key: valid=false',          !wrongPQC.valid);
check('Wrong PQC key: failedComponent=pqc',  wrongPQC.failedComponent === 'pqc');

// Test 5: Tampered classical JWT rejected (PQC passes, classical fails)
const parts   = cred.classicalJWT.split('.');
const badBody = Buffer.from(JSON.stringify({ sub: 'ATTACKER', exp: 9999999999, iat: 0, iss: 'coreidentity-governance-v1' })).toString('base64url');
const tamperedJWT = parts[0] + '.' + badBody + '.' + parts[2];
// Reissue PQC sig over tampered JWT so PQC passes
const [, freshPqcPriv] = [pqcPub, pqcPriv];
const { sha3Digest } = require('../pqc/hybrid-kdf');
const freshPqcSig = suite.signature.sign(sha3Digest(Buffer.from(tamperedJWT)), pqcPriv);
const classicalTampered = validateHybridCredential(
  { classicalJWT: tamperedJWT, pqcSignature: freshPqcSig, pqcPublicKeyId: pqcKeyId },
  classPubDER, pqcPub
);
check('Tampered classical JWT rejected',              !classicalTampered.valid);
check('Tampered classical: failedComponent=classical', classicalTampered.failedComponent === 'classical');

// Test 6: extractHybridCredential from headers
const headers = {
  'authorization':    'Bearer ' + cred.classicalJWT,
  'x-pqc-signature':  cred.pqcSignatureHex,
  'x-pqc-key-id':     pqcKeyId
};
const extracted = extractHybridCredential(headers);
check('extractHybridCredential returns object',       extracted !== null);
check('extractHybridCredential JWT matches',          extracted.classicalJWT === cred.classicalJWT);
check('extractHybridCredential sig matches',          extracted.pqcSignature.equals(cred.pqcSignature));
check('extractHybridCredential keyId matches',        extracted.pqcPublicKeyId === pqcKeyId);

// Test 7: Missing headers returns null
check('Missing PQC headers returns null', extractHybridCredential({ authorization: 'Bearer test' }) === null);
check('Missing auth returns null',        extractHybridCredential({ 'x-pqc-signature': 'abc' }) === null);

console.log('');
console.log('Results:', passed, 'passed,', failed, 'failed');
if (failed > 0) process.exit(1);
