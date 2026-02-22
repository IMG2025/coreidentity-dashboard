/**
 * Sentinel OS — API Routes
 * Exposes Sentinel OS capabilities to authenticated clients.
 * ADMIN only for all write operations. READ available to all authenticated users.
 */
const express  = require('express');
const Sentinel = require('../sentinel');
const logger   = require('../utils/logger');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'ADMIN role required', code: 'FORBIDDEN' });
  }
  next();
}

// GET /api/sentinel/status — Sentinel OS health and summary
router.get('/status', async (req, res) => {
  try {
    const status = await Sentinel.getStatus();
    res.json({ data: status, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'SENTINEL_ERROR' });
  }
});

// GET /api/sentinel/risk-tiers — All risk tier definitions
router.get('/risk-tiers', (req, res) => {
  res.json({ data: Sentinel.RISK_TIERS, timestamp: new Date().toISOString() });
});

// GET /api/sentinel/security-events — Recent security events
router.get('/security-events', async (req, res) => {
  try {
    const limit    = parseInt(req.query.limit) || 50;
    const severity = req.query.severity || null;
    const events   = await Sentinel.getSecurityEvents(limit, severity);
    res.json({ data: events, count: events.length, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'SENTINEL_ERROR' });
  }
});

// GET /api/sentinel/kill-switches — Active kill switches
router.get('/kill-switches', async (req, res) => {
  try {
    const activeOnly = req.query.all !== 'true';
    const switches   = await Sentinel.listKillSwitches(activeOnly);
    res.json({ data: switches, count: switches.length, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'SENTINEL_ERROR' });
  }
});

// POST /api/sentinel/kill-switches — Activate kill switch (ADMIN)
router.post('/kill-switches', requireAdmin, async (req, res) => {
  try {
    const { agentId, reason } = req.body;
    if (!agentId) return res.status(400).json({ error: 'agentId required', code: 'BAD_REQUEST' });
    const result = await Sentinel.activateKillSwitch(agentId, req.user.userId, reason);
    await Sentinel.logSecurityEvent('KILL_SWITCH_ACTIVATED', {
      agentId: String(agentId), userId: req.user.userId, reason, severity: 'HIGH' });
    logger.info('kill_switch_activated', { agentId, userId: req.user.userId });
    res.json({ data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'SENTINEL_ERROR' });
  }
});

// DELETE /api/sentinel/kill-switches/:agentId — Deactivate kill switch (ADMIN)
router.delete('/kill-switches/:agentId', requireAdmin, async (req, res) => {
  try {
    const result = await Sentinel.deactivateKillSwitch(req.params.agentId, req.user.userId);
    await Sentinel.logSecurityEvent('KILL_SWITCH_DEACTIVATED', {
      agentId: req.params.agentId, userId: req.user.userId, severity: 'MEDIUM' });
    res.json({ data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'SENTINEL_ERROR' });
  }
});

// GET /api/sentinel/approvals — List approval requests
router.get('/approvals', async (req, res) => {
  try {
    const status    = req.query.status || null;
    const approvals = await Sentinel.listApprovals(status);
    res.json({ data: approvals, count: approvals.length, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'SENTINEL_ERROR' });
  }
});

// POST /api/sentinel/approvals — Submit approval request
router.post('/approvals', async (req, res) => {
  try {
    const { agentId, taskType, justification } = req.body;
    if (!agentId || !taskType) {
      return res.status(400).json({ error: 'agentId and taskType required', code: 'BAD_REQUEST' });
    }
    const result = await Sentinel.submitApprovalRequest(agentId, req.user.userId, taskType, justification);
    res.json({ data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'SENTINEL_ERROR' });
  }
});

// PUT /api/sentinel/approvals/:id/approve — Approve request (ADMIN)
router.put('/approvals/:id/approve', requireAdmin, async (req, res) => {
  try {
    const result = await Sentinel.approveRequest(req.params.id, req.user.userId);
    await Sentinel.logSecurityEvent('APPROVAL_GRANTED', {
      approvalId: req.params.id, approvedBy: req.user.userId, severity: 'INFO' });
    res.json({ data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'SENTINEL_ERROR' });
  }
});

module.exports = router;
