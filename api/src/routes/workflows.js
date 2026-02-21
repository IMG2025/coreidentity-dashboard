const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const workflows = new Map();

// Seed one workflow
workflows.set('wf-001', {
  id: 'wf-001', name: 'Compliance Audit Pipeline',
  agents: [5, 9], status: 'active',
  createdAt: new Date().toISOString(), lastRun: new Date().toISOString()
});

router.get('/', (req, res) => {
  res.json({ data: Array.from(workflows.values()), timestamp: new Date().toISOString() });
});

router.post('/', (req, res) => {
  const workflow = {
    id: `wf-${uuidv4().slice(0, 8)}`,
    ...req.body,
    status: 'active',
    createdAt: new Date().toISOString(),
    lastRun: null
  };
  workflows.set(workflow.id, workflow);
  res.status(201).json({ data: workflow, timestamp: new Date().toISOString() });
});

module.exports = router;
