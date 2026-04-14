'use strict';
const { AlgorithmRegistry, COREIDENTITY_PQC_V1,
        FIPS203_ML_KEM_768, FIPS204_ML_DSA_65 } = require('./algorithm-registry');
const crypto = require('crypto');

let passed = 0, failed = 0;
function check(label, result) {
  console.log(result ? 'PASS' : 'FAIL', label);
  result ? passed++ : failed++;
}

console.log('A-S03: Crypto-Agility Interface Validation');
console.log('');

// Test 1: Registry returns v1 suite by default
const suite = AlgorithmRegistry.current();
check('Registry returns COREIDENTITY-PQC-v1', suite.suiteId === 'COREIDENTITY-PQC-v1');
check('Suite has kem',              !!suite.kem);
check('Suite has signature',        !!suite.signature);
check('Suite has archivalSignature', !!suite.archivalSignature);

// Test 2: KEM via registry — caller never touches ml_kem768 directly
const [kemPk, kemSk] = suite.kem.generateKeypair();
const [ct, ss1]      = suite.kem.encapsulate(kemPk);
const ss2            = suite.kem.decapsulate(ct, kemSk);
check('KEM via registry round-trip',     ss1.equals(ss2));
check('KEM pk size via registry',        kemPk.length === FIPS203_ML_KEM_768.pk);
check('KEM sk size via registry',        kemSk.length === FIPS203_ML_KEM_768.sk);
check('KEM ct size via registry',        ct.length    === FIPS203_ML_KEM_768.ct);
check('KEM ss size via registry',        ss1.length   === FIPS203_ML_KEM_768.ss);

// Test 3: Signature via registry
const [sigPk, sigSk] = suite.signature.generateKeypair();
const msg    = Buffer.from('CoreIdentity-agility-test');
const tamper = Buffer.from('TAMPERED');
const sig    = suite.signature.sign(msg, sigSk);
check('Sig via registry valid',          suite.signature.verify(msg, sig, sigPk));
check('Sig via registry tamper reject',  !suite.signature.verify(tamper, sig, sigPk));
check('Sig pk size via registry',        sigPk.length === FIPS204_ML_DSA_65.pk);
check('Sig sk size via registry',        sigSk.length === FIPS204_ML_DSA_65.sk);
check('Sig size via registry',           sig.length   === FIPS204_ML_DSA_65.sig);

// Test 4: Archival signature via registry
const [archPk, archSk] = suite.archivalSignature.generateKeypair();
const archSig = suite.archivalSignature.sign(msg, archSk);
check('Archival sig valid',         suite.archivalSignature.verify(msg, archSig, archPk));
check('Archival sig tamper reject', !suite.archivalSignature.verify(tamper, archSig, archPk));

// Test 5: Mock suite swap — proves crypto-agility
const mockSuite = {
  suiteId:  'MOCK-FUTURE-PQC-v2',
  version:  2,
  notes:    'Mock future NIST successor',
  kem: {
    algorithm: 'MOCK-KEM-v2',
    generateKeypair: () => [crypto.randomBytes(32), crypto.randomBytes(32)],
    encapsulate:     (pk) => [crypto.randomBytes(32), crypto.randomBytes(32)],
    decapsulate:     (ct, sk) => crypto.randomBytes(32)
  },
  signature: {
    algorithm: 'MOCK-SIG-v2',
    generateKeypair: () => [crypto.randomBytes(32), crypto.randomBytes(32)],
    sign:   (msg, sk) => crypto.createHmac('sha256', sk).update(msg).digest(),
    verify: (msg, sig, pk) => sig.length === 32
  },
  archivalSignature: {
    algorithm: 'MOCK-ARCH-v2',
    generateKeypair: () => [crypto.randomBytes(32), crypto.randomBytes(32)],
    sign:   (msg, sk) => crypto.createHmac('sha256', sk).update(msg).digest(),
    verify: (msg, sig, pk) => sig.length === 32
  }
};

AlgorithmRegistry.register(mockSuite);
AlgorithmRegistry.setActive('MOCK-FUTURE-PQC-v2');

const mockActive = AlgorithmRegistry.current();
check('Mock suite registered and active', mockActive.suiteId === 'MOCK-FUTURE-PQC-v2');

// Same caller code works identically with mock suite
const [mockPk, mockSk] = mockActive.kem.generateKeypair();
const [mockCt, mockSs] = mockActive.kem.encapsulate(mockPk);
check('Mock KEM caller code unchanged', mockCt.length > 0 && mockSs.length > 0);

const [mSigPk, mSigSk] = mockActive.signature.generateKeypair();
const mSig = mockActive.signature.sign(msg, mSigSk);
check('Mock sig caller code unchanged', mockActive.signature.verify(msg, mSig, mSigPk));

// Test 6: Restore v1 and verify
AlgorithmRegistry.setActive('COREIDENTITY-PQC-v1');
check('Restore v1 suite', AlgorithmRegistry.current().suiteId === 'COREIDENTITY-PQC-v1');
check('listSuites includes both', AlgorithmRegistry.listSuites().length >= 2);

console.log('');
console.log('Results:', passed, 'passed,', failed, 'failed');
if (failed > 0) process.exit(1);
