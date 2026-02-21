const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    data: {
      scores: [
        { label: 'Overall Compliance', score: 98, description: 'Across all frameworks' },
        { label: 'Data Privacy',       score: 96, description: 'GDPR + CCPA' },
        { label: 'Security Posture',   score: 94, description: 'SOC2 controls' },
        { label: 'Risk Score',         score: 92, description: 'Enterprise risk' }
      ],
      frameworks: [
        { name: 'SOC2 Type II',  status: 'compliant', score: 98, description: 'Last audit: Jan 2026' },
        { name: 'HIPAA',         status: 'compliant', score: 96, description: 'PHI controls active' },
        { name: 'GDPR',          status: 'compliant', score: 94, description: 'EU data residency enforced' },
        { name: 'CCPA',          status: 'warning',   score: 87, description: '2 controls need review' },
        { name: 'ISO 27001',     status: 'compliant', score: 91, description: 'Certified through 2027' }
      ],
      alerts: []
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
