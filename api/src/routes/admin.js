const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { ScanCommand, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../utils/dynamodb');
const { authenticate, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const USERS_TABLE = 'coreidentity-users';
const SALT_ROUNDS = 12;

// All admin routes require authentication + ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// ── GET /api/admin/users ──────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const result = await docClient.send(new ScanCommand({ TableName: USERS_TABLE }));
    const users = (result.Items || []).map(({ passwordHash, ...u }) => u);
    res.json({ data: users, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('admin_get_users_error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch users', code: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/admin/users — create customer account ───────────────────────
router.post('/users', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'email, password, firstName, lastName required', code: 'VALIDATION_ERROR' });
    }

    const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
    const existing = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email.toLowerCase() }
    }));

    if (existing.Items?.length > 0) {
      return res.status(409).json({ error: 'Email already registered', code: 'EMAIL_EXISTS' });
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date().toISOString();

    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        userId, email: email.toLowerCase(), passwordHash,
        firstName, lastName, role: 'CUSTOMER',
        status: 'active', createdAt: now, updatedAt: now,
        createdBy: req.user.userId
      }
    }));

    logger.info('admin_created_customer', { adminId: req.user.userId, newUserId: userId });
    res.status(201).json({
      data: { userId, email: email.toLowerCase(), firstName, lastName, role: 'CUSTOMER' },
      timestamp: now
    });
  } catch (err) {
    logger.error('admin_create_user_error', { error: err.message });
    res.status(500).json({ error: 'Failed to create user', code: 'INTERNAL_ERROR' });
  }
});

// ── PUT /api/admin/users/:userId/role ─────────────────────────────────────
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['ADMIN', 'CUSTOMER'].includes(role)) {
      return res.status(400).json({ error: 'Role must be ADMIN or CUSTOMER', code: 'VALIDATION_ERROR' });
    }

    // Prevent self-demotion
    if (userId === req.user.userId && role === 'CUSTOMER') {
      return res.status(400).json({ error: 'Cannot demote yourself', code: 'VALIDATION_ERROR' });
    }

    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET #r = :role, updatedAt = :now',
      ExpressionAttributeNames: { '#r': 'role' },
      ExpressionAttributeValues: { ':role': role, ':now': new Date().toISOString() }
    }));

    logger.info('admin_updated_role', { adminId: req.user.userId, targetUserId: userId, role });
    res.json({ data: { userId, role }, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('admin_update_role_error', { error: err.message });
    res.status(500).json({ error: 'Failed to update role', code: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
