const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// In-memory store (replace with DynamoDB in next iteration)
const workflows = new Map();

// GET /api/workflows
router.get('/', (req, res) => {
  const results = Array.from(workflows.values());
  res.json({ data: results, total: results.length, timestamp: new Date().toISOString() });
});

// POST /api/workflows
router.post('/', (req, res) => {
  const { name, description, trigger } = req.body;
  if (!name) return res.status(400).json({ error: 'name required', code: 'VALIDATION_ERROR' });

  const workflow = {
    id: uuidv4(),
    name,
    description: description || '',
    trigger: trigger || 'manual',
    status: 'active',
    createdAt: new Date().toISOString(),
    createdBy: req.user?.userId || 'unknown'
  };

  workflows.set(workflow.id, workflow);
  res.status(201).json({ data: workflow, timestamp: new Date().toISOString() });
});

module.exports = router;
