/**
 * CoreIdentity PQC Observability Layer
 * ======================================
 * Six canonical metrics routed to governance dashboard.
 * Live telemetry that answers the CIAG question:
 * "How do we know your cryptography is operating correctly?"
 *
 * Metrics:
 *   pqc_key_operations_total       Counter  — by algorithm + operation
 *   pqc_signature_verification_ms  Histogram — p50/p95/p99 continuous
 *   pqc_key_rotation_events_total  Counter  — by key type + trigger
 *   pqc_hybrid_validation_failures Counter  — classical vs pqc breakdown
 *   pqc_cert_expiry_seconds        Gauge    — AIS agent cert TTL
 *   pqc_entropy_validation_status  Gauge    — PRNG health (1=ok, 0=degraded)
 *
 * script: C-S03-pqc-observability
 */
'use strict';

class PQCMetricsCollector {
  constructor() {
    this.counters   = new Map();
    this.histograms = new Map();
    this.gauges     = new Map();
  }

  // METRIC 1: Key Operations Counter
  recordKeyOperation(algorithm, operation) {
    const key = `pqc_key_operations_total{alg="${algorithm}",op="${operation}"}`;
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  // METRIC 2: Signature Verification Latency
  recordSignatureVerification(durationMs, algorithm) {
    const key = `pqc_signature_verification_ms{alg="${algorithm}"}`;
    if (!this.histograms.has(key)) {
      this.histograms.set(key, { values: [], maxSamples: 10000 });
    }
    const bucket = this.histograms.get(key);
    bucket.values.push(durationMs);
    if (bucket.values.length > bucket.maxSamples) {
      bucket.values.splice(0, bucket.values.length - bucket.maxSamples);
    }
    this.recordKeyOperation(algorithm, 'verify');
  }

  // METRIC 3: Key Rotation Events
  recordKeyRotation(keyType, trigger) {
    const key = `pqc_key_rotation_events_total{type="${keyType}",trigger="${trigger}"}`;
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  // METRIC 4: Hybrid Validation Failures
  recordHybridFailure(failedComponent, reason) {
    const key = `pqc_hybrid_validation_failures{component="${failedComponent}"}`;
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
    if (reason) {
      const rKey = `pqc_hybrid_failure_reasons{component="${failedComponent}",reason="${String(reason).slice(0, 64)}"}`;
      this.counters.set(rKey, (this.counters.get(rKey) || 0) + 1);
    }
  }

  // METRIC 5: Certificate Expiry
  setCertExpiry(agentId, secondsRemaining) {
    const key = `pqc_cert_expiry_seconds{agent="${agentId}"}`;
    this.gauges.set(key, Math.max(0, secondsRemaining));
  }

  // METRIC 6: Entropy Validation Status
  setEntropyStatus(healthy, detail) {
    this.gauges.set('pqc_entropy_validation_status', healthy ? 1 : 0);
    if (!healthy && detail) {
      this.gauges.set('pqc_entropy_last_failure_ts', Date.now());
    }
  }

  // Histogram stats helper
  _histogramStats(values) {
    if (!values || values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const len    = sorted.length;
    const pct    = p => parseFloat((sorted[Math.min(Math.floor(len * p), len - 1)] || 0).toFixed(3));
    const mean   = parseFloat((sorted.reduce((s, v) => s + v, 0) / len).toFixed(3));
    return {
      count:   len,
      mean_ms: mean,
      p50_ms:  pct(0.50),
      p95_ms:  pct(0.95),
      p99_ms:  pct(0.99),
      max_ms:  parseFloat((sorted[len - 1] || 0).toFixed(3))
    };
  }

  // Point-in-time snapshot
  snapshot() {
    const histogramStats = {};
    for (const [key, bucket] of this.histograms.entries()) {
      const stats = this._histogramStats(bucket.values);
      if (stats) histogramStats[key] = stats;
    }
    return {
      timestamp:  new Date().toISOString(),
      counters:   Object.fromEntries(this.counters),
      histograms: histogramStats,
      gauges:     Object.fromEntries(this.gauges)
    };
  }

  // CIAG audit artifact export
  auditExport() {
    const snap = this.snapshot();
    const totalOps = [...this.counters.entries()]
      .filter(([k]) => k.startsWith('pqc_key_operations_total'))
      .reduce((sum, [, v]) => sum + v, 0);
    const totalFailures = [...this.counters.entries()]
      .filter(([k]) => k.startsWith('pqc_hybrid_validation_failures'))
      .reduce((sum, [, v]) => sum + v, 0);
    return {
      report_type:           'PQC_OBSERVABILITY_AUDIT_EXPORT',
      generated:             snap.timestamp,
      total_pqc_operations:  totalOps,
      total_hybrid_failures: totalFailures,
      failure_rate_pct:      totalOps > 0
        ? parseFloat(((totalFailures / totalOps) * 100).toFixed(4))
        : 0,
      ...snap
    };
  }

  // Instrument an async PQC operation with timing
  async instrument(algorithm, operation, fn) {
    const start = process.hrtime.bigint();
    try {
      const result = await fn();
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      if (operation === 'verify') {
        this.recordSignatureVerification(durationMs, algorithm);
      } else {
        this.recordKeyOperation(algorithm, operation);
      }
      return result;
    } catch(err) {
      this.recordKeyOperation(algorithm, operation);
      throw err;
    }
  }

  reset() {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }
}

// Singleton
const pqcMetrics = new PQCMetricsCollector();

module.exports = { pqcMetrics, PQCMetricsCollector };
