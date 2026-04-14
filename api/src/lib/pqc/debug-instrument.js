'use strict';
const { PQCMetricsCollector } = require('./observability');
const { AlgorithmRegistry }   = require('./algorithm-registry');

async function run() {
  const suite = AlgorithmRegistry.current();
  const [pk, sk] = suite.signature.generateKeypair();
  const msg = Buffer.from('CoreIdentity-debug');
  const sig = suite.signature.sign(msg, sk);

  const m = new PQCMetricsCollector();
  const result = await m.instrument('ML-DSA-65', 'verify', () => {
    return suite.signature.verify(msg, sig, pk);
  });

  const snap = m.snapshot();
  console.log('All counters:', JSON.stringify(snap.counters, null, 2));
  console.log('All histograms:', JSON.stringify(Object.keys(snap.histograms), null, 2));
  console.log('Result of verify:', result);
}

run().catch(console.error);
