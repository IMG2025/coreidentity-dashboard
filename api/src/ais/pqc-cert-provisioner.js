/**
 * CoreIdentity AIS PQC Certificate Provisioner
 * ==============================================
 * ML-DSA-65 agent certificates — 24h TTL.
 * ML-KEM-768 ephemeral session keys per agent session.
 * Forward secrecy enforced — new KEM keypair per session.
 *
 * Certificate chain:
 *   CoreIdentity Root CA (ML-DSA-65)
 *     └─ Agent Leaf Certificate (ML-DSA-65, 24h TTL)
 *
 * Confirmed API (P0-S01/P0-S02):
 *   ml_dsa65.sign(message, secretKey)
 *   ml_dsa65.verify(signature, message, publicKey)
 *
 * script: B-S02-ais-agent-cert-pqc
 */
'use strict';

const crypto = require('crypto');
const { AlgorithmRegistry } = require('../lib/pqc/algorithm-registry');
const { sha3Digest }        = require('../lib/pqc/hybrid-kdf');

const CERT_TTL_SECONDS     = 86400;  // 24 hours
const RENEWAL_BUFFER_SECS  = 14400;  // 4 hours

/**
 * Provisions a new ML-DSA-65 agent certificate.
 *
 * @param {string}   agentId         Unique agent identifier
 * @param {string}   agentType       Agent classification
 * @param {string[]} governanceScope Authorized actions
 * @param {string}   trustLevel      T1-T4
 * @param {Buffer}   salPolicy       Raw SAL policy governing this agent
 * @param {Buffer}   caPrivKey       Root CA ML-DSA-65 private key
 * @param {string}   caKeyId         CA key identifier
 * @returns {{ certificate, agentPrivateKey }}
 */
function provisionAgentCertificate(agentId, agentType, governanceScope, trustLevel, salPolicy, caPrivKey, caKeyId) {
  const suite = AlgorithmRegistry.current();
  const now   = Math.floor(Date.now() / 1000);

  // Generate agent signing keypair
  const [publicKey, agentPrivateKey] = suite.signature.generateKeypair();
  const salPolicyHash  = sha3Digest(salPolicy).toString('hex');
  const serialNumber   = crypto.randomUUID().replace(/-/g, '').toUpperCase();

  // Cert body — everything except issuer signature
  const certBody = JSON.stringify({
    agentId, agentType, serialNumber,
    publicKeyHex:    publicKey.toString('hex'),
    issuedAt:        now,
    expiresAt:       now + CERT_TTL_SECONDS,
    issuerKeyId:     caKeyId,
    governanceScope,
    trustLevel,
    salPolicyHash,
    schemaVersion:  'COREIDENTITY-PQC-CERT-v1'
  });

  const certBodyBuffer = Buffer.from(certBody, 'utf8');
  const certBodyHash   = sha3Digest(certBodyBuffer).toString('hex');
  const certBodyDigest = sha3Digest(certBodyBuffer);

  // Root CA signs the SHA-3-512 digest of cert body
  const issuerSignature = suite.signature.sign(certBodyDigest, caPrivKey);

  // Fingerprint covers body + signature
  const certFingerprint = sha3Digest(
    Buffer.concat([certBodyBuffer, issuerSignature])
  ).toString('hex');

  const certificate = {
    agentId, agentType,
    publicKey,
    publicKeyHex:    publicKey.toString('hex'),
    serialNumber,
    issuedAt:        now,
    expiresAt:       now + CERT_TTL_SECONDS,
    issuerKeyId:     caKeyId,
    governanceScope,
    trustLevel,
    salPolicyHash,
    certBodyHash,
    issuerSignature,
    certFingerprint,
    schemaVersion:  'COREIDENTITY-PQC-CERT-v1'
  };

  return { certificate, agentPrivateKey };
}

/**
 * Verifies an agent certificate against the issuing CA public key.
 */
function verifyAgentCertificate(cert, caPublicKey) {
  const suite = AlgorithmRegistry.current();
  const now   = Math.floor(Date.now() / 1000);

  if (cert.expiresAt < now) {
    return { valid: false, reason: 'Certificate expired at ' + cert.expiresAt };
  }

  const certBody = JSON.stringify({
    agentId:        cert.agentId,
    agentType:      cert.agentType,
    serialNumber:   cert.serialNumber,
    publicKeyHex:   cert.publicKeyHex,
    issuedAt:       cert.issuedAt,
    expiresAt:      cert.expiresAt,
    issuerKeyId:    cert.issuerKeyId,
    governanceScope: cert.governanceScope,
    trustLevel:     cert.trustLevel,
    salPolicyHash:  cert.salPolicyHash,
    schemaVersion:  'COREIDENTITY-PQC-CERT-v1'
  });

  const certBodyDigest = sha3Digest(Buffer.from(certBody, 'utf8'));
  const sigValid = suite.signature.verify(certBodyDigest, cert.issuerSignature, caPublicKey);

  if (!sigValid) {
    return { valid: false, reason: 'Issuer signature verification failed' };
  }
  return { valid: true };
}

/**
 * Generates ephemeral ML-KEM-768 session keys.
 * New keypair per session — forward secrecy enforced.
 * Expires after 1 hour.
 */
function generateAgentSessionKeys(agentId) {
  const suite = AlgorithmRegistry.current();
  const [kemPublicKey, kemPrivateKey] = suite.kem.generateKeypair();
  const now = Math.floor(Date.now() / 1000);
  return {
    kemPublicKey, kemPrivateKey,
    sessionId:  crypto.randomUUID(),
    agentId,
    createdAt:  now,
    expiresAt:  now + 3600
  };
}

/**
 * Returns true if certificate needs renewal (< 4h remaining).
 */
function needsRenewal(cert) {
  const now = Math.floor(Date.now() / 1000);
  return (cert.expiresAt - now) < RENEWAL_BUFFER_SECS;
}

module.exports = {
  provisionAgentCertificate,
  verifyAgentCertificate,
  generateAgentSessionKeys,
  needsRenewal,
  CERT_TTL_SECONDS,
  RENEWAL_BUFFER_SECS
};
