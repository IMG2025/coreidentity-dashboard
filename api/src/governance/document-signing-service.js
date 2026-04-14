/**
 * CoreIdentity Governance Document Signing Service
 * ==================================================
 * SLH-DSA-128s (FIPS 205) archival-grade document signing.
 *
 * WHY SLH-DSA FOR DOCUMENTS:
 * Hash-based — security reduces to SHA-2 collision resistance only.
 * Most conservative PQC choice. Verifiable forever.
 * Used for: CIAG agreements, policy contracts, audit records,
 * institutional briefings, M&A due diligence documents.
 *
 * Signature covers: documentId || documentHash || auditChainHash
 * Binds every document to its position in the audit chain.
 *
 * Confirmed API (P0-S01/P0-S02):
 *   slh_dsa_sha2_128s.sign(message, secretKey)
 *   slh_dsa_sha2_128s.verify(signature, message, publicKey)
 *
 * script: C-S01-governance-doc-signing
 */
'use strict';

const crypto = require('crypto');
const { AlgorithmRegistry } = require('../lib/pqc/algorithm-registry');
const { sha3Digest }        = require('../lib/pqc/hybrid-kdf');

const DOCUMENT_CLASSIFICATIONS = [
  'CIAG_AGREEMENT', 'POLICY_CONTRACT', 'INSTITUTIONAL_BRIEFING',
  'AUDIT_RECORD', 'DUE_DILIGENCE', 'GOVERNANCE_POLICY', 'AGENT_AUTHORIZATION'
];

/**
 * Signs a governance document with SLH-DSA-128s (FIPS 205).
 *
 * @param {Buffer} documentBuffer    Raw document bytes
 * @param {string} documentId        Unique document identifier
 * @param {string} classification    Document type
 * @param {Buffer} signerPrivKey     SLH-DSA-128s private key
 * @param {string} signerKeyId       Key identifier
 * @param {string} auditChainHash    Current Merkle audit chain root hash
 * @returns {object} signed document record
 */
function signGovernanceDocument(documentBuffer, documentId, classification,
                                 signerPrivKey, signerKeyId, auditChainHash) {
  if (!DOCUMENT_CLASSIFICATIONS.includes(classification)) {
    throw new Error('Invalid classification: ' + classification);
  }

  const suite        = AlgorithmRegistry.current();
  const documentHash = sha3Digest(documentBuffer).toString('hex');
  const now          = Math.floor(Date.now() / 1000);

  // Signing input binds: identity + content + audit position + classification + time
  const signingInputBuffer = Buffer.concat([
    Buffer.from(documentId,    'utf8'),
    Buffer.from(':',           'utf8'),
    Buffer.from(documentHash,  'utf8'),
    Buffer.from(':',           'utf8'),
    Buffer.from(auditChainHash,'utf8'),
    Buffer.from(':',           'utf8'),
    Buffer.from(classification,'utf8'),
    Buffer.from(':',           'utf8'),
    Buffer.from(String(now),   'utf8')
  ]);

  const signingInputHash = sha3Digest(signingInputBuffer).toString('hex');
  const signingDigest    = sha3Digest(signingInputBuffer);

  // SLH-DSA-128s archival signature
  const signature = suite.archivalSignature.sign(signingDigest, signerPrivKey);

  return {
    documentId,
    documentHash,
    signingInputHash,
    algorithm:      'SLH-DSA-128s',
    fipsStandard:   'FIPS-205',
    signature,
    signatureHex:   signature.toString('hex'),
    signerKeyId,
    classification,
    signedAt:       now,
    signedAtISO:    new Date(now * 1000).toISOString(),
    auditChainHash,
    schemaVersion:  'COREIDENTITY-DOCSIG-v1'
  };
}

/**
 * Verifies a governance document signature.
 * All three checks must pass: content + signature + audit chain.
 *
 * @param {Buffer} documentBuffer  Raw document bytes
 * @param {object} sig             Signed document record
 * @param {Buffer} signerPublicKey SLH-DSA-128s public key
 * @returns {object} verification result
 */
function verifyGovernanceDocument(documentBuffer, sig, signerPublicKey) {
  const suite      = AlgorithmRegistry.current();
  const verifiedAt = new Date().toISOString();

  // Check 1: Document content integrity
  const actualDocumentHash = sha3Digest(documentBuffer).toString('hex');
  if (actualDocumentHash !== sig.documentHash) {
    return { valid: false, documentIntact: false, signatureValid: false,
             auditChainMatch: false, verifiedAt,
             failureReason: 'Document content mismatch' };
  }

  // Check 2: Reconstruct signing input and verify signature
  const signingInputBuffer = Buffer.concat([
    Buffer.from(sig.documentId,    'utf8'),
    Buffer.from(':',               'utf8'),
    Buffer.from(sig.documentHash,  'utf8'),
    Buffer.from(':',               'utf8'),
    Buffer.from(sig.auditChainHash,'utf8'),
    Buffer.from(':',               'utf8'),
    Buffer.from(sig.classification,'utf8'),
    Buffer.from(':',               'utf8'),
    Buffer.from(String(sig.signedAt), 'utf8')
  ]);

  const signingDigest  = sha3Digest(signingInputBuffer);
  const signatureValid = suite.archivalSignature.verify(
    signingDigest, sig.signature, signerPublicKey
  );

  if (!signatureValid) {
    return { valid: false, documentIntact: true, signatureValid: false,
             auditChainMatch: false, verifiedAt,
             failureReason: 'SLH-DSA-128s signature verification failed' };
  }

  // Check 3: Audit chain hash structural validity (128 hex chars = SHA-3-512)
  const auditChainMatch = sig.auditChainHash.length === 128;

  return {
    valid:          signatureValid && auditChainMatch,
    documentIntact: true,
    signatureValid: true,
    auditChainMatch,
    verifiedAt
  };
}

module.exports = {
  signGovernanceDocument,
  verifyGovernanceDocument,
  DOCUMENT_CLASSIFICATIONS
};
