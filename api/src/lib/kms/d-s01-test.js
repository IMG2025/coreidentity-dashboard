'use strict';
const { PQCSoftwareKeyManager, PQCTestKeyManager } = require('./pqc-key-manager');
const crypto = require('crypto');

let passed = 0, failed = 0;
function check(label, result) {
  console.log(result ? 'PASS' : 'FAIL', label);
  result ? passed++ : failed++;
}

console.log('D-S01: PQC KMS Wrapper Tests');
console.log('');

const kms = new PQCTestKeyManager();

// Test 1: generateDataKey
const dk = kms.generateDataKey();
check('generateDataKey plaintext 32 bytes',    dk.plaintext.length === 32);
check('generateDataKey ciphertext 1088 bytes', dk.ciphertext_blob.length === 1088);
check('generateDataKey has key_id',            typeof dk.key_id === 'string');
check('generateDataKey algorithm ML-KEM-768',  dk.algorithm === 'ML-KEM-768');
check('generateDataKey has generated_at',      typeof dk.generated_at === 'string');

// Test 2: decrypt round-trip
const dec = kms.decrypt(dk.ciphertext_blob, dk.key_id);
check('decrypt recovers plaintext',            dec.plaintext.equals(dk.plaintext));
check('decrypt returns key_id',                dec.key_id === dk.key_id);

// Test 3: AES-256-GCM with PQC-derived key
const key = dk.plaintext;
const iv  = crypto.randomBytes(12);
const pt  = Buffer.from('CoreIdentity-KMS-governance-payload');
const c   = crypto.createCipheriv('aes-256-gcm', key, iv);
const ct  = Buffer.concat([c.update(pt), c.final()]);
const tag = c.getAuthTag();
const d   = crypto.createDecipheriv('aes-256-gcm', key, iv);
d.setAuthTag(tag);
const recovered = Buffer.concat([d.update(ct), d.final()]);
check('AES-256-GCM round-trip with PQC key',  recovered.equals(pt));

// Test 4: describeKey
const meta = kms.describeKey(dk.key_id);
check('describeKey key_id matches',            meta.key_id === dk.key_id);
check('describeKey algorithm correct',         meta.algorithm === 'ML-KEM-768');
check('describeKey status ENABLED',            meta.status === 'ENABLED');
check('describeKey has created_at',            typeof meta.created_at === 'string');

// Test 5: rotateKey
const rot = kms.rotateKey(dk.key_id);
check('rotateKey returns new_key_id',          typeof rot.new_key_id === 'string');
check('rotateKey returns previous_key_id',     rot.previous_key_id === dk.key_id);
check('rotateKey new differs from old',        rot.new_key_id !== dk.key_id);
check('rotateKey has rotated_at',              typeof rot.rotated_at === 'string');

// Test 6: old key disabled after rotation
const oldMeta = kms.describeKey(dk.key_id);
check('Old key status DISABLED after rotation', oldMeta.status === 'DISABLED');

// Test 7: old key still decrypts existing ciphertexts
const oldDec = kms.decrypt(dk.ciphertext_blob, dk.key_id);
check('Old key retained for existing ciphertexts', oldDec.plaintext.equals(dk.plaintext));

// Test 8: new key generates independent data keys
const newDk = kms.generateDataKey(rot.new_key_id);
check('New key generates independent plaintext', !newDk.plaintext.equals(dk.plaintext));
check('New key ciphertext different',            !newDk.ciphertext_blob.equals(dk.ciphertext_blob));

// Test 9: new key decrypt round-trip
const newDec = kms.decrypt(newDk.ciphertext_blob, rot.new_key_id);
check('New key decrypt round-trip',              newDec.plaintext.equals(newDk.plaintext));

// Test 10: unknown key throws
let threw = false;
try { kms.generateDataKey('nonexistent-key'); } catch { threw = true; }
check('Unknown key throws',                      threw);

// Test 11: PQC_KMS_BACKEND env var
const backend = process.env.PQC_KMS_BACKEND || 'software-secrets-manager';
check('PQC_KMS_BACKEND readable',               typeof backend === 'string');

// Test 12: Multiple independent data keys from same master key
const keys = [];
for (let i = 0; i < 5; i++) {
  const k = kms.generateDataKey(rot.new_key_id);
  keys.push(k.plaintext.toString('hex'));
}
const uniqueKeys = new Set(keys);
check('5 data keys all unique',                  uniqueKeys.size === 5);

console.log('');
console.log('Results:', passed, 'passed,', failed, 'failed');
if (failed > 0) process.exit(1);
