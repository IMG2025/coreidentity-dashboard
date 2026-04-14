/**
 * CoreIdentity PQC — Hybrid KDF + AES-256-GCM + SHA-3-512
 * =========================================================
 * Foundation layer. All PQC sprint modules import from here.
 *
 * Library:  @noble/post-quantum (FIPS 203/204/205)
 * Confirmed API signatures from P0-S01/P0-S02.
 *
 * Construction: HKDF-SHA512(classical_ss || pqc_ss, salt, context)
 * Both classical and PQC must be broken simultaneously.
 *
 * script: A-S01-pqc-core-module.sh
 */
'use strict';

const crypto = require('crypto');

/**
 * Hybrid Key Derivation Function.
 * Combines X25519 (classical) + ML-KEM-768 (PQC) shared secrets.
 *
 * @param {Buffer} classicalSecret  X25519 shared secret (32 bytes)
 * @param {Buffer} pqcSecret        ML-KEM-768 shared secret (32 bytes)
 * @param {string} context          Domain separator
 * @param {Buffer} salt             Optional salt (32 bytes generated if omitted)
 * @returns {Buffer}                32-byte AES-256 session key
 */
function hybridKDF(classicalSecret, pqcSecret, context, salt) {
  if (classicalSecret.length !== 32) throw new Error('Classical secret must be 32 bytes');
  if (pqcSecret.length !== 32)       throw new Error('PQC secret must be 32 bytes');
  const ikm     = Buffer.concat([classicalSecret, pqcSecret]);
  const saltMat = salt || crypto.randomBytes(32);
  const info    = Buffer.from('CoreIdentity-PQC-Hybrid-v1:' + context);
  return Buffer.from(crypto.hkdfSync('sha512', ikm, saltMat, info, 32));
}

/**
 * SHA-3-512 content digest. Quantum-resistant per NIST guidance.
 * Replaces all SHA-256 usage in governance layer.
 *
 * @param {Buffer|string} content
 * @returns {Buffer} 64-byte digest
 */
function sha3Digest(content) {
  const input = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  return crypto.createHash('sha3-512').update(input).digest();
}

/**
 * SHA-3-256 for shorter digests.
 */
function sha3_256Digest(content) {
  const input = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  return crypto.createHash('sha3-256').update(input).digest();
}

/**
 * Constant-time Buffer comparison — prevents timing attacks.
 */
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * AES-256-GCM authenticated encryption.
 * Output format: iv(12) || authTag(16) || ciphertext(N)
 *
 * @param {Buffer} key       32-byte AES-256 key
 * @param {Buffer} plaintext Data to encrypt
 * @param {Buffer} aad       Optional additional authenticated data
 * @returns {Buffer}         iv || authTag || ciphertext blob
 */
function encryptAES256GCM(key, plaintext, aad) {
  if (key.length !== 32) throw new Error('AES-256 requires 32-byte key, got ' + key.length);
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  if (aad) cipher.setAAD(aad);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag   = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * AES-256-GCM authenticated decryption.
 *
 * @param {Buffer} key  32-byte AES-256 key
 * @param {Buffer} blob Blob from encryptAES256GCM
 * @param {Buffer} aad  Optional additional authenticated data
 * @returns {Buffer}    Plaintext
 * @throws              If authentication fails
 */
function decryptAES256GCM(key, blob, aad) {
  if (key.length !== 32) throw new Error('AES-256 requires 32-byte key, got ' + key.length);
  if (blob.length < 29)  throw new Error('Ciphertext blob too short');
  const iv         = blob.subarray(0, 12);
  const authTag    = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);
  const decipher   = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  if (aad) decipher.setAAD(aad);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error('AES-GCM authentication failed — data may be tampered');
  }
}

module.exports = {
  hybridKDF,
  sha3Digest,
  sha3_256Digest,
  constantTimeEqual,
  encryptAES256GCM,
  decryptAES256GCM
};
