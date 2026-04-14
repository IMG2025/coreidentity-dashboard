/**
 * CoreIdentity SHA-3-512 Merkle Tamper-Evident Audit Log
 * =======================================================
 * Append-only, ordered, verifiable audit trail.
 * Root hash signed with ML-DSA-65 every BATCH_SIZE entries.
 * Any entry provable without revealing full log.
 *
 * Properties:
 *   Append-only:   entries cannot be modified without detection
 *   Ordered:       sequence numbers enforce entry ordering
 *   Verifiable:    any entry provable via Merkle proof
 *   Quantum-safe:  SHA-3-512 provides 256-bit PQ security margin
 *
 * script: C-S02-merkle-audit-log
 */
'use strict';

const crypto = require('crypto');
const { AlgorithmRegistry } = require('../lib/pqc/algorithm-registry');

const BATCH_SIZE = 1000;

function sha3_512(data) {
  return crypto.createHash('sha3-512').update(data).digest();
}

/**
 * Computes SHA-3-512 entry hash for an audit entry.
 * Hash covers all fields except entryHash itself.
 */
function hashAuditEntry(entry) {
  const content = JSON.stringify({
    sequence:   entry.sequence,
    timestamp:  entry.timestamp,
    agentId:    entry.agentId,
    agentType:  entry.agentType,
    action:     entry.action,
    resourceId: entry.resourceId,
    outcome:    entry.outcome,
    policyHash: entry.policyHash,
    sessionId:  entry.sessionId
  });
  return sha3_512(Buffer.from(content, 'utf8')).toString('hex');
}

/**
 * Computes SHA-3-512 Merkle root over a batch of entries.
 * Leaf nodes: SHA-3-512(entryHash)
 * Internal:   SHA-3-512(left || right)
 * Odd nodes:  duplicate rightmost leaf
 */
function computeMerkleRoot(entries) {
  if (entries.length === 0) throw new Error('Cannot compute Merkle root of empty batch');

  let layer = entries.map(e => sha3_512(Buffer.from(e.entryHash, 'hex')));

  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left  = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : layer[i];
      next.push(sha3_512(Buffer.concat([left, right])));
    }
    layer = next;
  }

  return layer[0].toString('hex');
}

/**
 * Generates a Merkle proof for a single entry within a batch.
 * Allows verification of any entry without revealing all entries.
 */
function generateMerkleProof(entries, targetIndex) {
  if (targetIndex < 0 || targetIndex >= entries.length) {
    throw new Error('Target index out of range: ' + targetIndex);
  }

  const leaves = entries.map(e => sha3_512(Buffer.from(e.entryHash, 'hex')));
  const proof  = [];
  let   idx    = targetIndex;
  let   layer  = [...leaves];

  while (layer.length > 1) {
    const siblingIdx = idx % 2 === 0
      ? Math.min(idx + 1, layer.length - 1)
      : idx - 1;
    proof.push(layer[siblingIdx].toString('hex'));

    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const l = layer[i];
      const r = i + 1 < layer.length ? layer[i + 1] : layer[i];
      next.push(sha3_512(Buffer.concat([l, r])));
    }
    layer = [...next];
    idx   = Math.floor(idx / 2);
  }

  return {
    entryHash:  entries[targetIndex].entryHash,
    entryIndex: targetIndex,
    proof,
    root:       layer[0].toString('hex'),
    proofDepth: proof.length
  };
}

/**
 * Verifies a Merkle proof against a known root.
 */
function verifyMerkleProof(proof, knownRoot) {
  let current = sha3_512(Buffer.from(proof.entryHash, 'hex'));
  let idx     = proof.entryIndex;

  for (const sibling of proof.proof) {
    const siblingBuf = Buffer.from(sibling, 'hex');
    const combined   = idx % 2 === 0
      ? Buffer.concat([current, siblingBuf])
      : Buffer.concat([siblingBuf, current]);
    current = sha3_512(combined);
    idx     = Math.floor(idx / 2);
  }

  return current.toString('hex') === knownRoot;
}

/**
 * Signs a Merkle root batch record with ML-DSA-65.
 * Called every BATCH_SIZE entries.
 */
function signMerkleRoot(entries, signerKey, signerKeyId) {
  const suite  = AlgorithmRegistry.current();
  const root   = computeMerkleRoot(entries);
  const now    = Date.now();

  const rootRecord = {
    root,
    batchStart:  entries[0].sequence,
    batchEnd:    entries[entries.length - 1].sequence,
    entryCount:  entries.length,
    computedAt:  now,
    signerKeyId
  };

  const recordBuffer = Buffer.from(JSON.stringify(rootRecord), 'utf8');
  const recordDigest = crypto.createHash('sha3-512').update(recordBuffer).digest();
  const signature    = suite.signature.sign(recordDigest, signerKey);

  return { ...rootRecord, signature, signatureHex: signature.toString('hex') };
}

module.exports = {
  hashAuditEntry,
  computeMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  signMerkleRoot,
  BATCH_SIZE
};
