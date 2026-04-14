'use strict';
const { hybridKDF, sha3Digest, sha3_256Digest,
        constantTimeEqual, encryptAES256GCM, decryptAES256GCM } = require('./hybrid-kdf');
const crypto = require('crypto');

let passed = 0, failed = 0;
function check(label, result) {
  console.log(result ? 'PASS' : 'FAIL', label);
  result ? passed++ : failed++;
}

// hybridKDF — 10 determinism tests
for (let i = 0; i < 10; i++) {
  const cs   = crypto.randomBytes(32);
  const ps   = crypto.randomBytes(32);
  const salt = crypto.randomBytes(32);
  const k1   = hybridKDF(cs, ps, 'test-' + i, salt);
  const k2   = hybridKDF(cs, ps, 'test-' + i, salt);
  check('hybridKDF deterministic ' + i, k1.equals(k2) && k1.length === 32);
}

// sha3Digest
const d1 = sha3Digest('CoreIdentity');
const d2 = sha3Digest('CoreIdentity');
check('sha3Digest deterministic',  d1.equals(d2));
check('sha3Digest length 64',      d1.length === 64);
check('sha3Digest different input', !d1.equals(sha3Digest('Different')));

// sha3_256Digest
const d3 = sha3_256Digest('CoreIdentity');
check('sha3_256Digest length 32',  d3.length === 32);

// constantTimeEqual
check('constantTimeEqual same',      constantTimeEqual(Buffer.from('abc'), Buffer.from('abc')));
check('constantTimeEqual different', !constantTimeEqual(Buffer.from('abc'), Buffer.from('xyz')));
check('constantTimeEqual diff len',  !constantTimeEqual(Buffer.from('ab'), Buffer.from('abc')));

// AES-256-GCM round trips — 10 iterations
for (let i = 0; i < 10; i++) {
  const key = crypto.randomBytes(32);
  const pt  = Buffer.from('CoreIdentity-AES-test-' + i);
  const blob = encryptAES256GCM(key, pt);
  const dec  = decryptAES256GCM(key, blob);
  check('AES-256-GCM round-trip ' + i, dec.equals(pt));
}

// Tamper detection
const key  = crypto.randomBytes(32);
const blob = encryptAES256GCM(key, Buffer.from('secret'));
const tampered = Buffer.from(blob);
tampered[30] ^= 0xff;
let tamperCaught = false;
try { decryptAES256GCM(key, tampered); } catch { tamperCaught = true; }
check('AES-256-GCM tamper detected', tamperCaught);

// Wrong key
let wrongKeyCaught = false;
try { decryptAES256GCM(crypto.randomBytes(32), blob); } catch { wrongKeyCaught = true; }
check('AES-256-GCM wrong key rejected', wrongKeyCaught);

console.log('');
console.log('Results:', passed, 'passed,', failed, 'failed');
if (failed > 0) process.exit(1);
