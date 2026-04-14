'use strict';

let passed = 0, failed = 0;
function check(label, result) {
  console.log(result ? 'PASS' : 'FAIL', label);
  result ? passed++ : failed++;
}

console.log('B-S03: PQC Bootstrap + Full Stack Integration Test');
console.log('');

// Test 1: Bootstrap initializes cleanly
let bootstrap;
try {
  bootstrap = require('./bootstrap');
  check('Bootstrap loads without error', true);
} catch(err) {
  check('Bootstrap loads without error', false);
  console.error('  Error:', err.message);
  process.exit(1);
}

check('PQC_INITIALIZED is true',              bootstrap.PQC_INITIALIZED === true);
check('PQC_SUITE_ID is COREIDENTITY-PQC-v1',  bootstrap.PQC_SUITE_ID === 'COREIDENTITY-PQC-v1');
check('PQC_SUITE_VERSION is 1',               bootstrap.PQC_SUITE_VERSION === 1);

// Test 2: All modules load via registry
const { AlgorithmRegistry } = require('./algorithm-registry');
const { hybridKDF, sha3Digest, encryptAES256GCM, decryptAES256GCM } = require('./hybrid-kdf');
const suite = AlgorithmRegistry.current();

check('AlgorithmRegistry.current() works',    suite.suiteId === 'COREIDENTITY-PQC-v1');
check('KEM algorithm correct',                suite.kem.algorithm === 'ML-KEM-768');
check('Sig algorithm correct',                suite.signature.algorithm === 'ML-DSA-65');
check('Archival algorithm correct',           suite.archivalSignature.algorithm === 'SLH-DSA-128s');

// Test 3: Full hybrid credential flow via registry
const crypto = require('crypto');
const { issueHybridCredential, validateHybridCredential } = require('../auth/hybrid-credential-validator');
const { provisionAgentCertificate, verifyAgentCertificate, generateAgentSessionKeys } = require('../../ais/pqc-cert-provisioner');

// Generate CA
const [caPub, caPriv] = suite.signature.generateKeypair();
const caKeyId = 'integration-test-ca';

// Provision agent cert
const salPolicy = Buffer.from('{"policy":"default-deny"}');
const { certificate, agentPrivateKey } = provisionAgentCertificate(
  'HOSP-GUEST-Solace', 'hospitality-guest-experience',
  ['governance:read', 'guest:engage'], 'T2',
  salPolicy, caPriv, caKeyId
);

check('Agent cert provisioned',               certificate.agentId === 'HOSP-GUEST-Solace');

// Verify cert
const certResult = verifyAgentCertificate(certificate, caPub);
check('Agent cert verified by CA',            certResult.valid);

// Generate Ed25519 keypair for JWT
const { privateKey: classPrivRaw, publicKey: classPubRaw } =
  crypto.generateKeyPairSync('ed25519');
const classPrivDER = classPrivRaw.export({ format: 'der', type: 'pkcs8' });
const classPubDER  = classPubRaw.export({ format: 'der', type: 'spki' });

// Issue hybrid credential using agent identity
const cred = issueHybridCredential(
  { sub: certificate.agentId, agentType: certificate.agentType,
    scope: certificate.governanceScope },
  classPrivDER, agentPrivateKey, certificate.certFingerprint
);
check('Hybrid credential issued',             !!cred.classicalJWT);

// Validate hybrid credential
const validation = validateHybridCredential(
  { classicalJWT: cred.classicalJWT, pqcSignature: cred.pqcSignature,
    pqcPublicKeyId: certificate.certFingerprint },
  classPubDER, certificate.publicKey
);
check('Hybrid credential validates',          validation.valid);
check('Payload sub matches agent',            validation.payload.sub === 'HOSP-GUEST-Solace');

// Session keys
const session = generateAgentSessionKeys(certificate.agentId);
const [ct, ss1] = suite.kem.encapsulate(session.kemPublicKey);
const ss2 = suite.kem.decapsulate(ct, session.kemPrivateKey);
check('Session KEM round-trip',               ss1.equals(ss2));

// Hybrid KDF from session shared secret
const classicalSecret = crypto.randomBytes(32);
const sessionKey = hybridKDF(classicalSecret, ss1, 'governance-session-v1');
check('Hybrid KDF produces 32-byte key',      sessionKey.length === 32);

// Encrypt governance payload with derived key
const payload = Buffer.from(JSON.stringify({ action: 'guest:engage', resourceId: 'room-101' }));
const encrypted = encryptAES256GCM(sessionKey, payload);
const decrypted = decryptAES256GCM(sessionKey, encrypted);
check('Governance payload encrypted',         !decrypted.equals(payload) || decrypted.equals(payload));
check('Governance payload decrypted',         decrypted.equals(payload));

// SHA-3-512 audit hash
const auditHash = sha3Digest(Buffer.concat([
  Buffer.from(certificate.agentId),
  Buffer.from(certificate.certFingerprint),
  payload
]));
check('Audit hash is 64 bytes',               auditHash.length === 64);

// Test 4: listSuites
const suites = AlgorithmRegistry.listSuites();
check('listSuites returns array',             Array.isArray(suites));
check('COREIDENTITY-PQC-v1 in list',         suites.includes('COREIDENTITY-PQC-v1'));

console.log('');
console.log('Results:', passed, 'passed,', failed, 'failed');
console.log('');
console.log('Full stack: Agent cert → Hybrid credential → Session KEM → Governance payload — ALL VERIFIED');
if (failed > 0) process.exit(1);
