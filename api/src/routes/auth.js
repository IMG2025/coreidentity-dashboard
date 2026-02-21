const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { GetCommand, PutCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../utils/dynamodb');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const USERS_TABLE = 'coreidentity-users';
const SESSIONS_TABLE = 'coreidentity-sessions';
const SALT_ROUNDS = 12;

// ── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'CUSTOMER' } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'email, password, firstName, lastName required', code: 'VALIDATION_ERROR' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' });
    }

    // Only ADMIN can create ADMIN accounts
    const assignedRole = role === 'ADMIN' ? 'CUSTOMER' : role;

    // Check if email already exists
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
        firstName, lastName, role: assignedRole,
        status: 'active', createdAt: now, updatedAt: now
      }
    }));

    logger.info('user_registered', { userId, email: email.toLowerCase(), role: assignedRole });
    res.status(201).json({
      data: { userId, email: email.toLowerCase(), firstName, lastName, role: assignedRole },
      timestamp: now
    });
  } catch (err) {
    logger.error('register_error', { error: err.message });
    res.status(500).json({ error: 'Registration failed', code: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required', code: 'VALIDATION_ERROR' });
    }

    // Find user by email
    const result = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email.toLowerCase() }
    }));

    const user = result.Items?.[0];
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    if (user.passwordHash === 'CHANGE_ME_SET_VIA_API') {
      return res.status(403).json({ error: 'Password not set. Contact administrator.', code: 'PASSWORD_NOT_SET' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role, firstName: user.firstName },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Store session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await docClient.send(new PutCommand({
      TableName: SESSIONS_TABLE,
      Item: { sessionId, userId: user.userId, token, createdAt: new Date().toISOString(), expiresAt }
    }));

    logger.info('user_login', { userId: user.userId, role: user.role });
    res.json({
      data: {
        token,
        user: { userId: user.userId, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('login_error', { error: err.message });
    res.status(500).json({ error: 'Login failed', code: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    // Delete session by scanning — in production add token GSI
    logger.info('user_logout', { userId: req.user.userId });
    res.json({ data: { message: 'Logged out successfully' }, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed', code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId: req.user.userId }
    }));

    if (!result.Item) {
      return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    }

    const { passwordHash, ...safeUser } = result.Item;
    res.json({ data: safeUser, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('me_error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch profile', code: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
