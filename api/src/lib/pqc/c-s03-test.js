'use strict';
const { pqcMetrics, PQCMetricsCollector } = require('./observability');
const { AlgorithmRegistry } = require('./algorithm-registry');

let passed = 0, failed = 0;
function check(label, result) {
  console.log(result ? 'PASS' : 'FAIL', label);
  result ? passed++ : failed++;
}

console.log('C-S03: PQC Observability Tests');
console.log('');

// Fresh collector for each test
const m = new PQCMetricsCollector();

// Test 1: recordKeyOperation
m.recordKeyOperation('ML-KEM-768', 'keygen');
m.recordKeyOperation('ML-KEM-768', 'keygen');
m.recordKeyOperation('ML-DSA-65',  'sign');
const snap1 = m.snapshot();
check('recordKeyOperation counter increments',
  snap1.counters['pqc_key_operations_total{alg="ML-KEM-768",op="keygen"}'] === 2);
check('recordKeyOperation different alg tracked',
  snap1.counters['pqc_key_operations_total{alg="ML-DSA-65",op="sign"}'] === 1);

// Test 2: recordSignatureVerification
m.recordSignatureVerification(4.2, 'ML-DSA-65');
m.recordSignatureVerification(5.1, 'ML-DSA-65');
m.recordSignatureVerification(6.3, 'ML-DSA-65');
const snap2 = m.snapshot();
const histKey = 'pqc_signature_verification_ms{alg="ML-DSA-65"}';
check('Histogram has 3 samples',    snap2.histograms[histKey].count === 3);
check('Histogram mean reasonable',  snap2.histograms[histKey].mean_ms > 0);
check('Histogram p50 reasonable',   snap2.histograms[histKey].p50_ms > 0);
check('Verify also increments counter',
  snap2.counters['pqc_key_operations_total{alg="ML-DSA-65",op="verify"}'] === 3);

// Test 3: recordKeyRotation
m.recordKeyRotation('data-key', 'scheduled');
m.recordKeyRotation('data-key', 'manual');
m.recordKeyRotation('agent-cert', 'expiry');
const snap3 = m.snapshot();
check('Key rotation scheduled tracked',
  snap3.counters['pqc_key_rotation_events_total{type="data-key",trigger="scheduled"}'] === 1);
check('Key rotation manual tracked',
  snap3.counters['pqc_key_rotation_events_total{type="data-key",trigger="manual"}'] === 1);
check('Key rotation expiry tracked',
  snap3.counters['pqc_key_rotation_events_total{type="agent-cert",trigger="expiry"}'] === 1);

// Test 4: recordHybridFailure
m.recordHybridFailure('pqc', 'signature_invalid');
m.recordHybridFailure('pqc', 'signature_invalid');
m.recordHybridFailure('classical', 'jwt_expired');
const snap4 = m.snapshot();
check('PQC failures tracked',
  snap4.counters['pqc_hybrid_validation_failures{component="pqc"}'] === 2);
check('Classical failures tracked',
  snap4.counters['pqc_hybrid_validation_failures{component="classical"}'] === 1);

// Test 5: setCertExpiry
m.setCertExpiry('RX-COMPLY-Meridian', 86400);
m.setCertExpiry('HOSP-GUEST-Solace',  43200);
m.setCertExpiry('LEX-CONTRACT-Arbor', 0);
const snap5 = m.snapshot();
check('Cert expiry Meridian set',
  snap5.gauges['pqc_cert_expiry_seconds{agent="RX-COMPLY-Meridian"}'] === 86400);
check('Cert expiry Solace set',
  snap5.gauges['pqc_cert_expiry_seconds{agent="HOSP-GUEST-Solace"}'] === 43200);
check('Cert expiry zero clamped',
  snap5.gauges['pqc_cert_expiry_seconds{agent="LEX-CONTRACT-Arbor"}'] === 0);

// Test 6: setEntropyStatus
m.setEntropyStatus(true);
const snap6 = m.snapshot();
check('Entropy healthy = 1', snap6.gauges['pqc_entropy_validation_status'] === 1);
m.setEntropyStatus(false, 'PRNG degraded');
const snap7 = m.snapshot();
check('Entropy degraded = 0', snap7.gauges['pqc_entropy_validation_status'] === 0);

// Test 7: auditExport
const audit = m.auditExport();
check('auditExport has report_type',           audit.report_type === 'PQC_OBSERVABILITY_AUDIT_EXPORT');
check('auditExport has total_pqc_operations',  typeof audit.total_pqc_operations === 'number');
check('auditExport has failure_rate_pct',      typeof audit.failure_rate_pct === 'number');
check('auditExport has generated timestamp',   typeof audit.generated === 'string');
check('auditExport total_ops > 0',             audit.total_pqc_operations > 0);

// Test 8: instrument wrapper
async function runInstrumentTest() {
  const suite = AlgorithmRegistry.current();
  const [pk, sk] = suite.signature.generateKeypair();
  const msg = Buffer.from('CoreIdentity-observability-test');
  const sig = suite.signature.sign(msg, sk);

  const m2 = new PQCMetricsCollector();
  await m2.instrument('ML-DSA-65', 'verify', () => {
    return suite.signature.verify(msg, sig, pk);
  });

  const snap = m2.snapshot();
  check('instrument records verify counter',
    snap.counters['pqc_key_operations_total{alg="ML-DSA-65",op="verify"}'] === 1);
  check('instrument records histogram',
    snap.histograms['pqc_signature_verification_ms{alg="ML-DSA-65"}'].count === 1);
}

runInstrumentTest().then(() => {
  console.log('');
  console.log('Results:', passed, 'passed,', failed, 'failed');
  if (failed > 0) process.exit(1);
}).catch(err => {
  console.error('FAIL instrument test:', err.message);
  process.exit(1);
});
