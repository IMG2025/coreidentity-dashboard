const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const agoRouter = require('../ago/router');

router.get('/', authenticate, function(req, res) {
  try {
    res.json({ success: true, data: agoRouter.listVerticals(), count: agoRouter.listVerticals().length });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
