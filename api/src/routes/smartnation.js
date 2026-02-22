const express = require('express');
const router  = express.Router();
const SmartNation = require('../smartnation');

// GET /api/smartnation/status
router.get('/status', async function(req, res) {
  try {
    const status = await SmartNation.getStatus();
    res.json({ success: true, data: status });
  } catch(err) {
    res.status(500).json({ error: err.message, code: 'SMARTNATION_ERROR' });
  }
});

// GET /api/smartnation/summary
router.get('/summary', async function(req, res) {
  try {
    const summary = await SmartNation.registry.getRegistrySummary();
    res.json({ success: true, data: summary });
  } catch(err) {
    res.status(500).json({ error: err.message, code: 'SMARTNATION_ERROR' });
  }
});

module.exports = router;
