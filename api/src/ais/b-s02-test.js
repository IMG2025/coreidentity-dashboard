'use strict';
const { provisionAgentCertificate, verifyAgentCertificate,
        generateAgentSessionKeys, needsRenewal,
        CERT_TTL_SECONDS } = require('./pqc-cert-provisioner');
const { AlgorithmRegistry } = require('../lib/pqc/algorithm-registry');

let passed = 0, failed = 0;
function check(label, result) {
  console.log(result ? 'PASS' : 'FAIL', label);
  result ? passed++ : failed++;
}

console.log('B-S02: AIS PQC Certificate Provisioner Tests');
console.log('');

// Generate Root CA keypair
const suite = AlgorithmRegistry.current();
const [caPub, caPriv] = suite.signature.generateKeypair();
const caKeyId = 'cidg-root-ca-test-001';

// Test 1: Provision agent certificate
const salPolicy = Buffer.from('{"policy":"default-deny","version":"1.0"}');
const { certificate, agentPrivateKey } = provisionAgentCertificate(
  'RX-COMPLY-Meridian', 'healthcare-compliance',
  ['governance:read', 'audit:write'], 'T2',
  salPolicy, caPriv, caKeyId
);

check('Certificate has agentId',        certificate.agentId === 'RX-COMPLY-Meridian');
check('Certificate has agentType',      certificate.agentType === 'healthcare-compliance');
check('Certificate has publicKey',      Buffer.isBuffer(certificate.publicKey));
check('Certificate pk size 1952',       certificate.publicKey.length === 1952);
check('Certificate has serialNumber',   typeof certificate.serialNumber === 'string');
check('Certificate has issuedAt',       typeof certificate.issuedAt === 'number');
check('Certificate has expiresAt',      certificate.expiresAt === certificate.issuedAt + CERT_TTL_SECONDS);
check('Certificate has issuerKeyId',    certificate.issuerKeyId === caKeyId);
check('Certificate has salPolicyHash',  typeof certificate.salPolicyHash === 'string');
check('Certificate has fingerprint',    typeof certificate.certFingerprint === 'string');
check('Certificate schemaVersion',      certificate.schemaVersion === 'COREIDENTITY-PQC-CERT-v1');
check('AgentPrivateKey size 4032',      agentPrivateKey.length === 4032);

// Test 2: Verify valid certificate
const verifyResult = verifyAgentCertificate(certificate, caPub);
check('Valid cert verifies',            verifyResult.valid);
check('Valid cert no reason',           !verifyResult.reason);

// Test 3: Wrong CA key fails verification
const [wrongCaPub] = suite.signature.generateKeypair();
const wrongCA = verifyAgentCertificate(certificate, wrongCaPub);
check('Wrong CA key rejected',          !wrongCA.valid);
check('Wrong CA failure reason',        wrongCA.reason === 'Issuer signature verification failed');

// Test 4: Tampered certificate rejected
const tampered = { ...certificate };
tampered.agentId = 'ATTACKER';
const tamperedResult = verifyAgentCertificate(tampered, caPub);
check('Tampered cert rejected',         !tamperedResult.valid);

// Test 5: Agent can sign with provisioned private key
const msg = Buffer.from('CoreIdentity-agent-governance-request');
const agentSig = suite.signature.sign(msg, agentPrivateKey);
const agentSigValid = suite.signature.verify(msg, agentSig, certificate.publicKey);
check('Agent can sign with provisioned key',   agentSigValid);
check('Agent sig is ML-DSA-65 size',           agentSig.length === 3309);

// Test 6: Provision 5 agents — all unique
const agents = [];
for (let i = 0; i < 5; i++) {
  const { certificate: c } = provisionAgentCertificate(
    'TEST-AGENT-' + i, 'test', ['governance:read'], 'T1',
    salPolicy, caPriv, caKeyId
  );
  agents.push(c);
}
const fingerprints = new Set(agents.map(a => a.certFingerprint));
check('5 agents all unique fingerprints',      fingerprints.size === 5);
const serials = new Set(agents.map(a => a.serialNumber));
check('5 agents all unique serials',           serials.size === 5);

// Test 7: Session keys
const session = generateAgentSessionKeys('RX-COMPLY-Meridian');
check('Session kemPublicKey size 1184',        session.kemPublicKey.length === 1184);
check('Session kemPrivateKey size 2400',       session.kemPrivateKey.length === 2400);
check('Session has sessionId',                 typeof session.sessionId === 'string');
check('Session expiresAt is 1h from now',      session.expiresAt - session.createdAt === 3600);

// Test 8: Session key establishes shared secret
const [ct, ss1] = suite.kem.encapsulate(session.kemPublicKey);
const ss2 = suite.kem.decapsulate(ct, session.kemPrivateKey);
check('Session key KEM round-trip',            ss1.equals(ss2));

// Test 9: needsRenewal
check('Fresh cert does not need renewal',      !needsRenewal(certificate));
const expiredCert = { ...certificate, expiresAt: Math.floor(Date.now() / 1000) + 3600 };
check('Cert < 4h needs renewal',               needsRenewal(expiredCert));

console.log('');
console.log('Results:', passed, 'passed,', failed, 'failed');
if (failed > 0) process.exit(1);
