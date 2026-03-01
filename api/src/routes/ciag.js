'use strict';

const express        = require('express');
const { v4: uuidv4 } = require('uuid');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');

const router = express.Router();
const db  = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' }));
const ses = new SESv2Client({ region: process.env.AWS_REGION || 'us-east-2' });

const TABLE        = 'ciag-intake';
const NOTIFY_EMAIL = process.env.CIAG_NOTIFY_EMAIL || 'tmorgan@coreholdingcorp.com';
const SENDER_EMAIL = process.env.CIAG_SENDER_EMAIL || 'tmorgan@coreholdingcorp.com';

const TIERS = {
  diagnostic:     { label: 'Diagnostic Assessment',     duration: '21 days',  range: '$85K-$110K' },
  deployment:     { label: 'Governance Deployment',     duration: '90 days',  range: '$125K-$175K' },
  transformation: { label: 'Enterprise Transformation', duration: '180 days', range: '$250K-$500K' },
  advisory:       { label: 'Ongoing Advisory',          duration: 'Monthly',  range: '$25K-$100K/mo' },
};

router.post('/intake', async (req, res) => {
  const { firstName, lastName, email, company, title, engagement, companySize, industry, message, source } = req.body || {};
  const missing = ['firstName','lastName','email','company','engagement'].filter(f => !req.body?.[f]);
  if (missing.length) return res.status(400).json({ error: 'Missing: ' + missing.join(', ') });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
  const tier = TIERS[engagement];
  if (!tier) return res.status(400).json({ error: 'Invalid engagement type' });

  const submissionId = uuidv4();
  const submittedAt  = new Date().toISOString();

  await db.send(new PutCommand({ TableName: TABLE, Item: {
    submissionId, submittedAt, firstName, lastName, email, company,
    title: title || '', engagement, engagementLabel: tier.label,
    companySize: companySize || '', industry: industry || '',
    message: message || '', source: source || 'portal', status: 'new',
  }}));

  try {
    await ses.send(new SendEmailCommand({
      FromEmailAddress: SENDER_EMAIL,
      Destination: { ToAddresses: [NOTIFY_EMAIL] },
      Content: { Simple: {
        Subject: { Data: 'CIAG Intake - ' + company + ' - ' + tier.label },
        Body: { Text: { Data: 'New submission from ' + firstName + ' ' + lastName + ' at ' + company + '\nEngagement: ' + tier.label + '\nEmail: ' + email + '\nID: ' + submissionId } }
      }}
    }));
  } catch (e) { console.error('[CIAG] SES failed:', e.message); }

  return res.status(201).json({
    success: true, submissionId,
    message: 'Thank you. A member of the CIAG team will be in touch within one business day.',
    engagement: tier
  });
});

router.get('/submissions', async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  const result = await db.send(new ScanCommand({ TableName: TABLE, Limit: 100 }));
  return res.json({ submissions: result.Items || [], count: result.Count || 0 });
});

module.exports = router;
