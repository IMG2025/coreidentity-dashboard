'use strict';
// PLGS Sprint 1 — Policy Registry routes
// All routes require JWT authentication (wired in server.js).
//
// POST /api/policy/register
// POST /api/policy/:id/deploy
// POST /api/policy/:id/deprecate
// POST /api/policy/:id/rollback
// GET  /api/policy/active/:type
// GET  /api/policy/:id/history

const express  = require('express');
const registry = require('../governance/policy-registry');
const simulator = require('../governance/policy-simulator'); /* plgs-002-route-requires */
const approval  = require('../governance/policy-approval');

const logger   = require('../utils/logger');

const router = express.Router();

function actor(req) {
  return req.user?.userId || req.user?.sub || 'unknown';
}

function handleErr(res, err) {
  const code = err.code || 'INTERNAL_ERROR';
  const map  = { NOT_FOUND: 404, VALIDATION_ERROR: 400,
                 INVALID_TRANSITION: 409, PRECONDITION_FAILED: 422,
                 APPROVAL_REQUIRED: 422, APPROVAL_SELF_NOT_ALLOWED: 403 }; /* plgs-002-err-codes */
  const status = map[code] || 500;
  if (status >= 500) logger.error('policy_route_error', { error: err.message, code });
  res.status(status).json({ error: err.message, code });
}

// POST /api/policy/register
router.post('/register', async (req, res) => {
  try {
    const { name, version, policy_type, rules, simulation_result } = req.body;
    const policy = await registry.register(
      { name, version, policy_type, rules, simulation_result },
      actor(req)
    );
    res.status(201).json({ data: policy, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

// POST /api/policy/:id/deploy
router.post('/:id/deploy', async (req, res) => {
  try {
    const policy = await registry.deploy(req.params.id, actor(req));
    res.json({ data: policy, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

// POST /api/policy/:id/deprecate
router.post('/:id/deprecate', async (req, res) => {
  try {
    const policy = await registry.deprecate(req.params.id, actor(req), req.body.reason);
    res.json({ data: policy, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

// POST /api/policy/:id/rollback
router.post('/:id/rollback', async (req, res) => {
  try {
    const { version } = req.body;
    if (!version) return res.status(400).json({ error: 'version is required', code: 'VALIDATION_ERROR' });
    const result = await registry.rollback(req.params.id, version, actor(req));
    res.json({ data: result, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});


// POST /api/policy/:id/simulate  /* plgs-002-routes */
router.post('/:id/simulate', async (req, res) => {
  try {
    const result = await registry.simulate(req.params.id, req.body || {}, actor(req));
    res.json({ data: result, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

// POST /api/policy/:id/approve
router.post('/:id/approve', async (req, res) => {
  try {
    const result = await approval.approve(req.params.id, actor(req));
    res.json({ data: result, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

// POST /api/policy/:id/pipeline
// Runs the full pipeline: validate → register → simulate → approve → deploy
router.post('/:id/pipeline', async (req, res) => {
  try {
    const policy = { ...req.body, id: req.params.id };
    const result = await registry.runPipeline(policy, actor(req));
    const status = result.success ? 200 : 422;
    res.status(status).json({ data: result, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

// GET /api/policy/active/:type
router.get('/active/:type', async (req, res) => {
  try {
    const policies = await registry.getActive(req.params.type);
    res.json({ data: policies, count: policies.length, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

// GET /api/policy/:id/history
router.get('/:id/history', async (req, res) => {
  try {
    const history = await registry.getHistory(req.params.id);
    res.json({ data: history, count: history.length, timestamp: new Date().toISOString() });
  } catch (err) { handleErr(res, err); }
});

module.exports = router;