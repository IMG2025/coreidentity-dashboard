const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    data: {
      complianceScore: 94.2,
      policiesEnforced: 47,
      violations: 3,
      activeAudits: 2,
      frameworks: [
        { name: "SOC 2 Type II", status: "compliant", score: 98 },
        { name: "HIPAA",         status: "compliant", score: 96 },
        { name: "GDPR",          status: "warning",   score: 87 },
        { name: "CCPA",          status: "compliant", score: 95 },
        { name: "NYC LL144",     status: "compliant", score: 91 }
      ],
      lastAudit: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
