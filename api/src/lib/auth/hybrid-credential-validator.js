/**
 * CoreIdentity Hybrid Credential Validator
 * =========================================
 * Dual-signature credential enforcement.
 * Ed25519 (classical) + ML-DSA-65 (PQC).
 *
 * Wire protocol — split header pattern:
 *   Authorization:   Bearer <classical-JWT>
 *   X-PQC-Signature: <ML-DSA-65 hex signature>
 *   X-PQC-Key-ID:    <kid for public key lookup>
 *
 * Invariant: BOTH must validate. Either failure = 403.
 * PQC validates FIRST — fail-fast on quantum threat.
 *
 * Confirmed API (P0-S01/P0-S02):
 *   ml_dsa65.sign(message, secretKey)
 *   ml_dsa65.verify(signature, message, publicKey)
 *
 * script: B-S01-hybrid-jwt-implementation
 */
'use strict';

const crypto = require('crypto');
const { AlgorithmRegistry } = require('../pqc/algorithm-registry');
const { sha3Digest }        = require('../pqc/hybrid-kdf');

// ── JWT HELPERS ────────────────────────────────────────────

function b64url(buf) {
  return buf.toString('base64url');
}

function fromB64url(str) {
  return Buffer.from(str, 'base64url');
}

function encodeJWTHeader() {
  return b64url(Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })));
}

function encodeJWTBody(payload) {
  return b64url(Buffer.from(JSON.stringify(payload)));
}

// ── CREDENTIAL ISSUANCE ────────────────────────────────────

/**
 * Issues a hybrid credential bundle.
 * Signs with Ed25519 (classical) + ML-DSA-65 (PQC).
 * PQC signature covers SHA-3-512 digest of the complete JWT.
 *
 * @param {object} payload         JWT claims
 * @param {Buffer} classicalPrivKey Ed25519 private key (PKCS8 DER)
 * @param {Buffer} pqcPrivKey       ML-DSA-65 private key (4032 bytes)
 * @param {string} pqcKeyId         Key ID for verification lookup
 * @param {number} expiresInSeconds TTL (default 3600)
 * @returns {object} { classicalJWT, pqcSignature, pqcSignatureHex, pqcPublicKeyId }
 */
function issueHybridCredential(payload, classicalPrivKey, pqcPrivKey, pqcKeyId, expiresInSeconds = 3600) {
  const suite = AlgorithmRegistry.current();
  const now   = Math.floor(Date.now() / 1000);

  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
    iss: 'coreidentity-governance-v1'
  };

  // Classical JWT
  const header  = encodeJWTHeader();
  const body    = encodeJWTBody(fullPayload);
  const signing = Buffer.from(header + '.' + body);
  const classSig = crypto.sign(null, signing, { key: classicalPrivKey, format: 'der', type: 'pkcs8' });
  const classicalJWT = header + '.' + body + '.' + b64url(classSig);

  // PQC signature covers SHA-3-512(JWT) — binds PQC sig to exact token
  const jwtDigest    = sha3Digest(Buffer.from(classicalJWT));
  const pqcSignature = suite.signature.sign(jwtDigest, pqcPrivKey);

  return {
    classicalJWT,
    pqcSignature,
    pqcSignatureHex:  pqcSignature.toString('hex'),
    pqcPublicKeyId:   pqcKeyId
  };
}

// ── CREDENTIAL VALIDATION ──────────────────────────────────

/**
 * Validates a hybrid credential.
 * PQC validates FIRST — fail-fast on quantum threat.
 * Both must pass — no partial trust granted.
 *
 * @param {object} credential   { classicalJWT, pqcSignature, pqcPublicKeyId }
 * @param {Buffer} classicalPubKey Ed25519 public key (SPKI DER)
 * @param {Buffer} pqcPublicKey    ML-DSA-65 public key (1952 bytes)
 * @returns {object} validation result
 */
function validateHybridCredential(credential, classicalPubKey, pqcPublicKey) {
  const suite       = AlgorithmRegistry.current();
  const validatedAt = new Date().toISOString();

  // ── STEP 1: PQC VALIDATION (FIRST) ───────────────────────
  let pqcValid = false;
  try {
    const jwtDigest = sha3Digest(Buffer.from(credential.classicalJWT));
    pqcValid = suite.signature.verify(jwtDigest, credential.pqcSignature, pqcPublicKey);
  } catch(err) {
    return { valid: false, classicalValid: false, pqcValid: false,
             validatedAt, failureReason: 'PQC validation error: ' + err.message,
             failedComponent: 'pqc' };
  }

  if (!pqcValid) {
    return { valid: false, classicalValid: false, pqcValid: false,
             validatedAt, failureReason: 'PQC signature invalid',
             failedComponent: 'pqc' };
  }

  // ── STEP 2: CLASSICAL JWT VALIDATION (SECOND) ─────────────
  let classicalValid = false;
  let payload;

  try {
    const parts = credential.classicalJWT.split('.');
    if (parts.length !== 3) throw new Error('Malformed JWT');

    const [headerB64, bodyB64, sigB64] = parts;
    const signingInput = Buffer.from(headerB64 + '.' + bodyB64);
    const signature    = fromB64url(sigB64);

    classicalValid = crypto.verify(
      null, signingInput,
      { key: classicalPubKey, format: 'der', type: 'spki' },
      signature
    );

    if (classicalValid) {
      payload = JSON.parse(fromB64url(bodyB64).toString('utf8'));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, classicalValid: false, pqcValid: true,
                 validatedAt, failureReason: 'JWT expired',
                 failedComponent: 'classical' };
      }
    }
  } catch(err) {
    return { valid: false, classicalValid: false, pqcValid: true,
             validatedAt, failureReason: 'Classical JWT error: ' + err.message,
             failedComponent: 'classical' };
  }

  const valid = pqcValid && classicalValid;
  return {
    valid,
    payload:         valid ? payload : undefined,
    classicalValid,
    pqcValid,
    validatedAt,
    failureReason:   valid ? undefined : 'Hybrid invariant violated',
    failedComponent: valid ? undefined : 'classical'
  };
}

// ── HEADER HELPERS ─────────────────────────────────────────

function extractHybridCredential(headers) {
  const auth    = headers['authorization'] || headers['Authorization'] || '';
  const pqcSig  = headers['x-pqc-signature'] || headers['X-PQC-Signature'] || '';
  const pqcKey  = headers['x-pqc-key-id'] || headers['X-PQC-Key-ID'] || '';
  if (!auth.startsWith('Bearer ') || !pqcSig || !pqcKey) return null;
  return {
    classicalJWT:   auth.slice(7),
    pqcSignature:   Buffer.from(pqcSig, 'hex'),
    pqcPublicKeyId: pqcKey
  };
}

module.exports = { issueHybridCredential, validateHybridCredential, extractHybridCredential };
