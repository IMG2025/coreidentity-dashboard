/**
 * CoreIdentity PQC — Crypto-Agility Algorithm Registry
 * ======================================================
 * Algorithm-agnostic interface layer. Algorithms are plugins.
 * All callers program to AlgorithmRegistry.current() only.
 *
 * Current suite: COREIDENTITY-PQC-v1
 *   KEM:          ML-KEM-768     (FIPS 203)
 *   Signature:    ML-DSA-65      (FIPS 204)
 *   Archival:     SLH-DSA-128s   (FIPS 205)
 *
 * To upgrade to a future NIST successor:
 *   1. Implement the interface
 *   2. Register new suite
 *   3. Set COREIDENTITY_PQC_SUITE env var
 *   4. Deploy — zero caller code changes
 *
 * Confirmed API signatures (P0-S01/P0-S02):
 *   ml_kem768:        encapsulate(publicKey) / decapsulate(cipherText, secretKey)
 *   ml_dsa65:         sign(message, secretKey) / verify(signature, message, publicKey)
 *   slh_dsa_sha2_128s: sign(message, secretKey) / verify(signature, message, publicKey)
 *
 * script: A-S03-crypto-agility-interface
 */
'use strict';

const { ml_kem768 }         = require('@noble/post-quantum/ml-kem.js');
const { ml_dsa65 }          = require('@noble/post-quantum/ml-dsa.js');
const { slh_dsa_sha2_128s } = require('@noble/post-quantum/slh-dsa.js');

// ── FIPS SIZE CONSTANTS ────────────────────────────────────

const FIPS203_ML_KEM_768 = { pk: 1184, sk: 2400, ct: 1088, ss: 32 };
const FIPS204_ML_DSA_65  = { pk: 1952, sk: 4032, sig: 3309 };
const FIPS205_SLH_DSA    = { pk: 32,   sk: 64 };

// ── SUITE IMPLEMENTATIONS ──────────────────────────────────

const ML_KEM_768_IMPL = {
  algorithm:         'ML-KEM-768',
  fipsStandard:      'FIPS-203',
  publicKeyBytes:    FIPS203_ML_KEM_768.pk,
  privateKeyBytes:   FIPS203_ML_KEM_768.sk,
  ciphertextBytes:   FIPS203_ML_KEM_768.ct,
  sharedSecretBytes: FIPS203_ML_KEM_768.ss,

  generateKeypair() {
    const keys = ml_kem768.keygen();
    return [Buffer.from(keys.publicKey), Buffer.from(keys.secretKey)];
  },
  encapsulate(publicKey) {
    const { cipherText, sharedSecret } = ml_kem768.encapsulate(publicKey);
    return [Buffer.from(cipherText), Buffer.from(sharedSecret)];
  },
  decapsulate(ciphertext, privateKey) {
    return Buffer.from(ml_kem768.decapsulate(ciphertext, privateKey));
  }
};

const ML_DSA_65_IMPL = {
  algorithm:       'ML-DSA-65',
  fipsStandard:    'FIPS-204',
  publicKeyBytes:  FIPS204_ML_DSA_65.pk,
  privateKeyBytes: FIPS204_ML_DSA_65.sk,
  signatureBytes:  FIPS204_ML_DSA_65.sig,

  generateKeypair() {
    const keys = ml_dsa65.keygen();
    return [Buffer.from(keys.publicKey), Buffer.from(keys.secretKey)];
  },
  // sign(message, secretKey) — message first
  sign(message, privateKey) {
    return Buffer.from(ml_dsa65.sign(message, privateKey));
  },
  // verify(signature, message, publicKey)
  verify(message, signature, publicKey) {
    return ml_dsa65.verify(signature, message, publicKey);
  }
};

const SLH_DSA_128S_IMPL = {
  algorithm:       'SLH-DSA-128s',
  fipsStandard:    'FIPS-205',
  oqsName:         'SPHINCS+-SHA2-128s-simple',
  publicKeyBytes:  FIPS205_SLH_DSA.pk,
  privateKeyBytes: FIPS205_SLH_DSA.sk,

  generateKeypair() {
    const keys = slh_dsa_sha2_128s.keygen();
    return [Buffer.from(keys.publicKey), Buffer.from(keys.secretKey)];
  },
  // sign(message, secretKey) — message first
  sign(message, privateKey) {
    return Buffer.from(slh_dsa_sha2_128s.sign(message, privateKey));
  },
  // verify(signature, message, publicKey)
  verify(message, signature, publicKey) {
    return slh_dsa_sha2_128s.verify(signature, message, publicKey);
  }
};

// ── ALGORITHM SUITE ────────────────────────────────────────

const COREIDENTITY_PQC_V1 = {
  suiteId:          'COREIDENTITY-PQC-v1',
  version:          1,
  notes:            'NIST FIPS 203/204/205. @noble/post-quantum. Validated April 2026.',
  kem:              ML_KEM_768_IMPL,
  signature:        ML_DSA_65_IMPL,
  archivalSignature: SLH_DSA_128S_IMPL
};

// ── ALGORITHM REGISTRY ─────────────────────────────────────

const _suites = new Map();
let   _activeId = 'COREIDENTITY-PQC-v1';

// Auto-register v1 suite
_suites.set(COREIDENTITY_PQC_V1.suiteId, COREIDENTITY_PQC_V1);

const AlgorithmRegistry = {
  register(suite) {
    _suites.set(suite.suiteId, suite);
  },

  setActive(suiteId) {
    if (!_suites.has(suiteId)) throw new Error('Suite not registered: ' + suiteId);
    _activeId = suiteId;
  },

  current() {
    const id    = process.env.COREIDENTITY_PQC_SUITE || _activeId;
    const suite = _suites.get(id);
    if (!suite) throw new Error('Suite not available: ' + id);
    return suite;
  },

  resolve(suiteId) {
    const suite = _suites.get(suiteId);
    if (!suite) throw new Error('Suite not registered: ' + suiteId);
    return suite;
  },

  listSuites() {
    return Array.from(_suites.keys());
  }
};

module.exports = { AlgorithmRegistry, COREIDENTITY_PQC_V1,
                   ML_KEM_768_IMPL, ML_DSA_65_IMPL, SLH_DSA_128S_IMPL,
                   FIPS203_ML_KEM_768, FIPS204_ML_DSA_65, FIPS205_SLH_DSA };
