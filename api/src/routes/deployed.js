const express = require('express');
const { deployments } = require('../data/deployments');
const router = express.Router();

// GET /api/deployed
router.get('/', (req, res) => {
  const results = Array.from(deployments.values());
  res.json({ data: results, total: results.length, timestamp: new Date().toISOString() });
});

// POST /api/deployed/:id/stop
router.post('/:id/stop', (req, res) => {
  const deployment = deployments.get(req.params.id);
  if (!deployment) return res.status(404).json({ error: 'Deployment not found', code: 'NOT_FOUND' });
  deployment.status = 'stopped';
  deployment.stoppedAt = new Date().toISOString();
  deployments.set(deployment.id, deployment);
  res.json({ data: deployment, timestamp: new Date().toISOString() });
});

module.exports = router;

// POST /api/deployed/:id/stop
router.post('/:id/stop', async (req, res) => {
  try {
    const deployments = require('../data/deployments');
    const deployment = deployments.find(d => d.id === parseInt(req.params.id));
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found', code: 'NOT_FOUND' });
    }
    deployment.status = 'stopped';
    res.json({ data: deployment, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to stop agent', code: 'INTERNAL_ERROR' });
  }
});
