'use strict';

const express = require('express');
const Stripe  = require('stripe');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const router = express.Router();
const db     = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' }));
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');

const CLIENTS_TABLE = 'client-accounts';
const EVENTS_TABLE  = 'billing-events';

const PRICE_IDS = {
  starter:      process.env.STRIPE_PRICE_STARTER      || '',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || '',
  enterprise:   process.env.STRIPE_PRICE_ENTERPRISE   || '',
};

function adminOnly(req, res, next) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  next();
}

// POST /api/billing/checkout
router.post('/checkout', adminOnly, async (req, res) => {
  const { clientId, plan, email, companyName } = req.body || {};
  if (!clientId || !plan || !email) {
    return res.status(400).json({ error: 'Missing clientId, plan, or email' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to ECS environment.' });
  }
  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return res.status(400).json({ error: `No Stripe price configured for plan: ${plan}` });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    metadata: { clientId, plan, companyName: companyName || '' },
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.PORTAL_URL || 'https://portal.coreholdingcorp.com'}/#/settings?billing=success`,
    cancel_url:  `${process.env.PORTAL_URL || 'https://portal.coreholdingcorp.com'}/#/settings`,
    subscription_data: { metadata: { clientId, plan } }
  });

  return res.json({ sessionUrl: session.url, sessionId: session.id });
});

// POST /api/billing/webhook — raw body required
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig    = req.headers['stripe-signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET || '';

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
      console.error('[BILLING] Webhook signature failed:', err.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    await db.send(new PutCommand({
      TableName: EVENTS_TABLE,
      Item: {
        eventId: event.id, type: event.type,
        receivedAt: new Date().toISOString(),
        data: JSON.stringify(event.data.object),
      }
    }));

    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        if (s.metadata?.clientId) {
          await db.send(new UpdateCommand({
            TableName: CLIENTS_TABLE,
            Key: { clientId: s.metadata.clientId },
            UpdateExpression: 'SET stripeCustomerId = :c, stripeSubscriptionId = :s, billingStatus = :b, updatedAt = :t',
            ExpressionAttributeValues: { ':c': s.customer, ':s': s.subscription, ':b': 'active', ':t': new Date().toISOString() }
          }));
        }
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object;
        const sub = await stripe.subscriptions.retrieve(inv.subscription);
        if (sub.metadata?.clientId) {
          await db.send(new UpdateCommand({
            TableName: CLIENTS_TABLE,
            Key: { clientId: sub.metadata.clientId },
            UpdateExpression: 'SET billingStatus = :b, updatedAt = :t',
            ExpressionAttributeValues: { ':b': 'past_due', ':t': new Date().toISOString() }
          }));
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        if (sub.metadata?.clientId) {
          await db.send(new UpdateCommand({
            TableName: CLIENTS_TABLE,
            Key: { clientId: sub.metadata.clientId },
            UpdateExpression: 'SET billingStatus = :b, #s = :s, updatedAt = :t',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':b': 'cancelled', ':s': 'churned', ':t': new Date().toISOString() }
          }));
        }
        break;
      }
    }

    return res.json({ received: true });
  }
);

// GET /api/billing/status/:clientId
router.get('/status/:clientId', adminOnly, async (req, res) => {
  const result = await db.send(new GetCommand({
    TableName: CLIENTS_TABLE, Key: { clientId: req.params.clientId }
  }));
  if (!result.Item) return res.status(404).json({ error: 'Client not found' });
  const { billingStatus, stripeCustomerId, stripeSubscriptionId, plan } = result.Item;
  return res.json({ billingStatus, stripeCustomerId, stripeSubscriptionId, plan });
});

module.exports = router;
