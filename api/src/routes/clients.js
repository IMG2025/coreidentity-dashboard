'use strict';

const express        = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt         = require('bcryptjs');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');

const router = express.Router();
const db  = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' }));
const ses = new SESv2Client({ region: process.env.AWS_REGION || 'us-east-2' });

const CLIENTS_TABLE = 'client-accounts';
const USERS_TABLE   = 'coreidentity-users';
const SENDER_EMAIL  = process.env.CIAG_SENDER_EMAIL || 'tmorgan@coreholdingcorp.com';

const VIRTUAL_COMPANIES = [
  'CHC Corporate API','Virtual Bank','Health Network','Legal Partners','Retail Group',
];

const PLAN_TIERS = {
  starter:      { label: 'Starter',      agents: 10,  price: 2500  },
  professional: { label: 'Professional', agents: 25,  price: 7500  },
  enterprise:   { label: 'Enterprise',   agents: 108, price: 25000 },
  sovereign:    { label: 'Sovereign',    agents: -1,  price: null  },
};

function adminOnly(req, res, next) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  next();
}

// POST /api/clients
router.post('/', adminOnly, async (req, res) => {
  const { companyName, contactEmail, contactFirstName, contactLastName, plan, virtualCompany, tempPassword } = req.body || {};

  const missing = ['companyName','contactEmail','contactFirstName','contactLastName','plan']
    .filter(f => !req.body?.[f]);
  if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(', ')}` });

  const tier = PLAN_TIERS[plan];
  if (!tier) return res.status(400).json({ error: 'Invalid plan tier' });

  const clientId = uuidv4();
  const userId   = uuidv4();
  const now      = new Date().toISOString();
  const password = tempPassword || Math.random().toString(36).slice(-12) + 'A1!';
  const hash     = await bcrypt.hash(password, 12);

  await db.send(new PutCommand({
    TableName: CLIENTS_TABLE,
    Item: {
      clientId, companyName, contactEmail, plan,
      planLabel: tier.label, agentLimit: tier.agents,
      virtualCompany: virtualCompany || null,
      status: 'active', createdAt: now,
      stripeCustomerId: null, stripeSubscriptionId: null,
    }
  }));

  await db.send(new PutCommand({
    TableName: USERS_TABLE,
    Item: {
      userId, email: contactEmail,
      firstName: contactFirstName, lastName: contactLastName,
      role: 'CLIENT_ADMIN', clientId, companyName,
      passwordHash: hash, createdAt: now, status: 'active',
    }
  }));

  try {
    await ses.send(new SendEmailCommand({
      FromEmailAddress: SENDER_EMAIL,
      Destination: { ToAddresses: [contactEmail] },
      Content: {
        Simple: {
          Subject: { Data: `Welcome to CoreIdentity - ${companyName}` },
          Body: { Text: { Data: [
            `Hi ${contactFirstName},`,
            '',
            'Your CoreIdentity Governance Portal account is ready.',
            '',
            `Portal:    https://portal.coreholdingcorp.com`,
            `Email:     ${contactEmail}`,
            `Password:  ${password}`,
            '',
            `Plan: ${tier.label} (${tier.agents === -1 ? 'Unlimited' : tier.agents} agents)`,
            virtualCompany ? `Virtual Company: ${virtualCompany}` : '',
            '',
            'Please change your password after your first login.',
            '',
            'CoreIdentity - Core Holding Corp.',
          ].filter(l => l !== undefined).join('\n') } }
        }
      }
    }));
  } catch (e) { console.error('[CLIENTS] Welcome email failed:', e.message); }

  return res.status(201).json({
    success: true, clientId, userId, companyName,
    plan: tier.label, contactEmail, tempPassword: password,
    message: `Client account created. Welcome email sent to ${contactEmail}.`
  });
});

// GET /api/clients
router.get('/', adminOnly, async (req, res) => {
  const result = await db.send(new ScanCommand({ TableName: CLIENTS_TABLE, Limit: 100 }));
  return res.json({ clients: result.Items || [], count: result.Count || 0 });
});

// GET /api/clients/meta/options — must be before /:clientId
router.get('/meta/options', async (_req, res) => {
  return res.json({ plans: PLAN_TIERS, virtualCompanies: VIRTUAL_COMPANIES });
});

// GET /api/clients/:clientId
router.get('/:clientId', adminOnly, async (req, res) => {
  const result = await db.send(new GetCommand({
    TableName: CLIENTS_TABLE, Key: { clientId: req.params.clientId }
  }));
  if (!result.Item) return res.status(404).json({ error: 'Client not found' });
  return res.json(result.Item);
});

// PATCH /api/clients/:clientId/status
router.patch('/:clientId/status', adminOnly, async (req, res) => {
  const { status } = req.body || {};
  if (!['active','suspended','churned'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  await db.send(new UpdateCommand({
    TableName: CLIENTS_TABLE,
    Key: { clientId: req.params.clientId },
    UpdateExpression: 'SET #s = :s, updatedAt = :t',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': status, ':t': new Date().toISOString() }
  }));
  return res.json({ success: true, status });
});

module.exports = router;
