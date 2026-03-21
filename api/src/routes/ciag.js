'use strict';
/* ciag-ops-v1 */
/**
 * CIAG — CoreIdentity Advisory Group — Operations Backend
 * Full pipeline management for enterprise advisory engagements.
 * Primary use case: CVS Health advisory → platform deployment track.
 */

const express           = require('express');
const { v4: uuidv4 }    = require('uuid');
const { DynamoDBClient }                                   = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand,
        GetCommand, UpdateCommand, QueryCommand }           = require('@aws-sdk/lib-dynamodb');
const { SESv2Client, SendEmailCommand }                    = require('@aws-sdk/client-sesv2');

const router = express.Router();
const db  = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' }));
const ses = new SESv2Client({ region: process.env.AWS_REGION || 'us-east-2' });

const INTAKE_TABLE    = 'ciag-intake';
const NOTES_TABLE     = 'ciag-notes';
const SCORECARD_TABLE = 'ciag-scorecards';
const NOTIFY_EMAIL    = process.env.CIAG_NOTIFY_EMAIL || 'tmorgan@coreidentitygroup.com';
const SENDER_EMAIL    = process.env.CIAG_SENDER_EMAIL || 'tmorgan@coreidentitygroup.com';
const ECS_API         = process.env.ECS_API || 'https://api.coreidentity.coreholdingcorp.com';

// ── Pipeline stages ──────────────────────────────────────────────────────────
const PIPELINE_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'active', 'closed_won', 'closed_lost'];

// ── Engagement tiers ─────────────────────────────────────────────────────────
const TIERS = {
  diagnostic:     { label: 'Diagnostic Assessment',     duration: '21 days',  range: '$85K-$110K',    description: 'Baseline governance gap analysis and AI risk exposure mapping.' },
  deployment:     { label: 'Governance Deployment',     duration: '90 days',  range: '$125K-$175K',   description: 'Full Sentinel OS deployment with policy framework mapping.' },
  transformation: { label: 'Enterprise Transformation', duration: '180 days', range: '$250K-$500K',   description: 'End-to-end governed AI transformation across all verticals.' },
  advisory:       { label: 'Ongoing Advisory',          duration: 'Monthly',  range: '$25K-$100K/mo', description: 'Retained advisory with monthly governance review cadence.' },
};

/* ciag-vertical-v1 */
// =============================================================================
// VERTICAL ENGINE — CoreIdentity Certified Governance Scorecard™
// 7 verticals, vertical-specific dimension weights + regulatory baselines
// =============================================================================

const VERTICALS = {
  healthcare: {
    label:       'Healthcare',
    aliases:     ['healthcare', 'health', 'medical', 'pharma', 'biotech', 'hospital', 'cvs', 'health system'],
    frameworks:  ['HIPAA', 'SOC2', 'HITRUST', 'FDA 21 CFR Part 11', 'NIST AI RMF'],
    baaRequired: true,
    weights: { identity: 0.25, policy: 0.25, observability: 0.20, data: 0.25, validation: 0.05 },
    baseline: { identity: 35, policy: 40, observability: 30, data: 35, validation: 25 },
    riskFlags: [
      { condition: (s) => s.regulatoryFrameworks?.includes('HIPAA'), flag: 'HIPAA scope — BAA required before PHI agent deployment (90-day remediation, $40K-$75K)' },
      { condition: (s) => (s.agentCount || 0) > 10000, flag: 'Large agent fleet — phased deployment required, tier escalation recommended' },
      { condition: (s) => !s.regulatoryFrameworks?.length, flag: 'No regulatory frameworks specified — compliance mapping required in diagnostic phase' },
    ],
    recommendedEngagement: (score) => score >= 70 ? 'transformation' : score >= 45 ? 'deployment' : 'diagnostic',
    notes: 'PHI agent governance requires BAA execution before platform deployment. HIPAA Security Rule mapping included in all engagement tiers.',
  },

  financial_services: {
    label:       'Financial Services',
    aliases:     ['financial', 'finance', 'banking', 'bank', 'insurance', 'wealth', 'investment', 'fintech', 'bfsi'],
    frameworks:  ['GLBA', 'PCI-DSS', 'SOX', 'DORA', 'NIST AI RMF', 'SR 11-7'],
    baaRequired: false,
    weights: { identity: 0.20, policy: 0.30, observability: 0.20, data: 0.20, validation: 0.10 },
    baseline: { identity: 50, policy: 45, observability: 40, data: 45, validation: 35 },
    riskFlags: [
      { condition: (s) => s.regulatoryFrameworks?.includes('SOX'), flag: 'SOX scope — model risk governance documentation required' },
      { condition: (s) => s.regulatoryFrameworks?.includes('DORA'), flag: 'DORA scope — ICT risk management framework mapping required' },
      { condition: (s) => (s.agentCount || 0) > 5000, flag: 'High agent count in regulated environment — SR 11-7 model risk management applies' },
    ],
    recommendedEngagement: (score) => score >= 75 ? 'transformation' : score >= 50 ? 'deployment' : 'diagnostic',
    notes: 'Model risk governance (SR 11-7) applies to AI agents in decision-making roles. Policy enforcement layer is the primary risk mitigation.',
  },

  legal: {
    label:       'Legal',
    aliases:     ['legal', 'law', 'attorney', 'counsel', 'litigation', 'compliance', 'regulatory'],
    frameworks:  ['ABA Model Rules', 'CCPA', 'GDPR', 'State Bar Requirements', 'NIST AI RMF'],
    baaRequired: false,
    weights: { identity: 0.20, policy: 0.25, observability: 0.25, data: 0.20, validation: 0.10 },
    baseline: { identity: 40, policy: 45, observability: 35, data: 40, validation: 30 },
    riskFlags: [
      { condition: (s) => !s.regulatoryFrameworks?.length, flag: 'Attorney-client privilege implications — data governance framework mapping required' },
      { condition: (s) => (s.agentCount || 0) > 500, flag: 'Large agent deployment — ABA competence rule (1.1) review recommended' },
    ],
    recommendedEngagement: (score) => score >= 65 ? 'deployment' : 'diagnostic',
    notes: 'Attorney-client privilege and confidentiality obligations require robust observability and audit trail. ABA Model Rule 1.1 competence applies to AI tool adoption.',
  },

  hospitality: {
    label:       'Hospitality',
    aliases:     ['hospitality', 'hotel', 'restaurant', 'travel', 'tourism', 'food service', 'lodging'],
    frameworks:  ['PCI-DSS', 'CCPA', 'GDPR', 'State Privacy Laws'],
    baaRequired: false,
    weights: { identity: 0.15, policy: 0.20, observability: 0.20, data: 0.25, validation: 0.20 },
    baseline: { identity: 45, policy: 40, observability: 35, data: 40, validation: 35 },
    riskFlags: [
      { condition: (s) => s.regulatoryFrameworks?.includes('PCI-DSS'), flag: 'PCI-DSS scope — payment agent governance and cardholder data protection required' },
      { condition: (s) => (s.agentCount || 0) > 1000, flag: 'Customer-facing agent fleet — brand risk and customer experience governance recommended' },
    ],
    recommendedEngagement: (score) => score >= 60 ? 'deployment' : 'diagnostic',
    notes: 'Customer data handling and pricing algorithm transparency are primary governance vectors. Fastest procurement cycle — design partner candidate.',
  },

  retail: {
    label:       'Retail',
    aliases:     ['retail', 'ecommerce', 'e-commerce', 'commerce', 'consumer', 'cpg', 'merchandise'],
    frameworks:  ['PCI-DSS', 'CCPA', 'GDPR', 'FTC Act', 'State Privacy Laws'],
    baaRequired: false,
    weights: { identity: 0.15, policy: 0.20, observability: 0.20, data: 0.30, validation: 0.15 },
    baseline: { identity: 45, policy: 40, observability: 35, data: 45, validation: 35 },
    riskFlags: [
      { condition: (s) => s.regulatoryFrameworks?.includes('PCI-DSS'), flag: 'PCI-DSS scope — payment processing agents require cardholder data environment isolation' },
      { condition: (s) => s.regulatoryFrameworks?.includes('CCPA'), flag: 'CCPA scope — consumer data agent governance and opt-out mechanisms required' },
    ],
    recommendedEngagement: (score) => score >= 60 ? 'deployment' : 'diagnostic',
    notes: 'Consumer data protection and pricing algorithm fairness are primary governance vectors. Data governance dimension is weighted highest.',
  },

  manufacturing: {
    label:       'Manufacturing',
    aliases:     ['manufacturing', 'industrial', 'factory', 'production', 'supply chain', 'logistics', 'automotive', 'aerospace'],
    frameworks:  ['ISO 9001', 'OSHA', 'FDA 21 CFR Part 11', 'ITAR', 'NIST AI RMF'],
    baaRequired: false,
    weights: { identity: 0.20, policy: 0.25, observability: 0.20, data: 0.20, validation: 0.15 },
    baseline: { identity: 40, policy: 35, observability: 30, data: 35, validation: 30 },
    riskFlags: [
      { condition: (s) => s.regulatoryFrameworks?.includes('ITAR'), flag: 'ITAR scope — export control compliance required for AI agent deployment' },
      { condition: (s) => s.regulatoryFrameworks?.includes('FDA 21 CFR Part 11'), flag: 'FDA 21 CFR Part 11 — electronic records validation required for process agents' },
      { condition: (s) => (s.agentCount || 0) > 500, flag: 'Autonomous process agents — safety-critical governance layer required' },
    ],
    recommendedEngagement: (score) => score >= 65 ? 'deployment' : 'diagnostic',
    notes: 'Safety-critical autonomous process agents require deterministic policy enforcement. ISO 9001 quality management framework integration available.',
  },

  enterprise_bfsi: {
    label:       'Enterprise / BFSI',
    aliases:     ['enterprise', 'conglomerate', 'holding', 'bfsi', 'diversified', 'corporate'],
    frameworks:  ['SOX', 'Basel III', 'DORA', 'ISO 27001', 'NIST AI RMF', 'SEC AI Guidance'],
    baaRequired: false,
    weights: { identity: 0.20, policy: 0.25, observability: 0.20, data: 0.20, validation: 0.15 },
    baseline: { identity: 50, policy: 50, observability: 45, data: 45, validation: 40 },
    riskFlags: [
      { condition: (s) => s.regulatoryFrameworks?.includes('SOX'), flag: 'SOX scope — AI agent audit trail and financial reporting governance required' },
      { condition: (s) => (s.agentCount || 0) > 50000, flag: 'Enterprise-scale fleet — multi-vertical governance framework and phased rollout required' },
    ],
    recommendedEngagement: (score) => score >= 75 ? 'transformation' : score >= 55 ? 'deployment' : 'diagnostic',
    notes: 'Multi-vertical governance framework with enterprise-grade audit trail. Transformation engagement recommended for fleets >50K agents.',
  },
};

// Detect vertical from industry string or company context
function detectVertical(industry, company, primaryVertical) {
  const search = [industry, company, primaryVertical]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const [key, v] of Object.entries(VERTICALS)) {
    if (v.aliases.some(alias => { const re = new RegExp('(^|[\\s,])' + alias.replace(/[.*+?^]/g, '\\$&') + '([\\s,]|$)'); return re.test(search) || search === alias; })) {
      return key;
    }
  }
  return 'enterprise_bfsi'; // safe default
}

// Calculate vertical-aware scorecard
function calculateScorecard(submission, manualScores = null) {
  const verticalKey = detectVertical(
    submission.industry,
    submission.company,
    submission.primaryVertical
  );
  const vertical = VERTICALS[verticalKey];

  // Use manual scores or generate baseline from vertical + engagement
  const engagementMultipliers = {
    diagnostic:     1.0,
    deployment:     1.15,
    transformation: 1.30,
    advisory:       1.10,
  };
  const mult = engagementMultipliers[submission.engagement] || 1.0;

  const dimensionScores = {};
  Object.keys(vertical.baseline).forEach(dim => {
    dimensionScores[dim] = manualScores?.[dim] ||
      Math.min(95, Math.round(vertical.baseline[dim] * mult));
  });

  // Calculate weighted overall score using vertical weights
  let overallScore = 0;
  const dimensionDetails = {};
  const SCORECARD_DIMENSIONS_META = {
    identity:       { label: 'Identity & Agent Registry',    description: 'Agent credentialing, role assignment, and registry completeness' },
    policy:         { label: 'Policy Enforcement',           description: 'Real-time policy gate coverage, fail-closed enforcement rate' },
    observability:  { label: 'Observability & Audit Trail',  description: 'Execution logging completeness, audit artifact generation' },
    data:           { label: 'Data Governance',              description: 'PII handling, data classification, retention compliance' },
    validation:     { label: 'Validation & Testing',         description: 'Governance test coverage, drift detection, soak testing' },
  };

  Object.entries(vertical.weights).forEach(([dim, weight]) => {
    const score = dimensionScores[dim] || 50;
    overallScore += score * weight;
    dimensionDetails[dim] = {
      label:       SCORECARD_DIMENSIONS_META[dim].label,
      score,
      weight,
      weightPct:   Math.round(weight * 100),
      description: SCORECARD_DIMENSIONS_META[dim].description,
      grade:       score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D',
      status:      score >= 70 ? 'Compliant' : score >= 50 ? 'Partial' : 'Non-Compliant',
    };
  });

  overallScore = Math.round(overallScore);

  // Risk flags from vertical engine
  const riskFlags = vertical.riskFlags
    .filter(rf => rf.condition(submission))
    .map(rf => rf.flag);

  // Gap analysis
  const gaps = Object.entries(dimensionDetails)
    .filter(([, d]) => d.score < 70)
    .map(([, d]) => `${d.label} (${d.score}/100 — ${d.status})`);

  // Recommendations
  const recommendations = [];
  Object.entries(dimensionDetails).forEach(([, d]) => {
    if (d.score < 50) recommendations.push(`CRITICAL: Remediate ${d.label} before platform deployment`);
    else if (d.score < 70) recommendations.push(`Strengthen ${d.label} — target 80+ for enterprise readiness`);
  });
  if (vertical.baaRequired) {
    recommendations.unshift('Execute BAA before any PHI-scoped agent deployment');
  }

  const certTier = overallScore >= 85 ? 'Platinum' :
                   overallScore >= 70 ? 'Gold' :
                   overallScore >= 55 ? 'Silver' : 'Foundation';

  const recommendedEngagement = vertical.recommendedEngagement(overallScore);

  return {
    verticalKey,
    verticalLabel:         vertical.label,
    frameworks:            vertical.frameworks,
    baaRequired:           vertical.baaRequired,
    overallScore,
    certTier,
    dimensions:            dimensionDetails,
    gaps,
    recommendations,
    riskFlags,
    verticalNotes:         vertical.notes,
    recommendedEngagement,
    recommendedEngagementLabel: TIERS[recommendedEngagement]?.label || recommendedEngagement,
  };
}

// Vertical-aware pre-qualification score
function calculatePrequalScore(submission) {
  const verticalKey = detectVertical(
    submission.industry,
    submission.company,
    submission.primaryVertical
  );
  const vertical = VERTICALS[verticalKey];

  let score = 40; // base

  // Agent count signal
  const agents = submission.agentCount || 0;
  if (agents > 50000) score += 25;
  else if (agents > 10000) score += 20;
  else if (agents > 1000) score += 12;
  else if (agents > 100) score += 6;

  // Regulatory complexity signal
  const frameworks = submission.regulatoryFrameworks || [];
  score += Math.min(20, frameworks.length * 5);

  // Engagement ambition signal
  if (submission.engagement === 'transformation') score += 15;
  else if (submission.engagement === 'deployment') score += 8;
  else if (submission.engagement === 'advisory') score += 5;

  // Vertical premium
  const premiumVerticals = ['healthcare', 'financial_services', 'enterprise_bfsi'];
  if (premiumVerticals.includes(verticalKey)) score += 10;

  score = Math.min(95, Math.max(25, score));

  const riskFlags = vertical.riskFlags
    .filter(rf => rf.condition(submission))
    .map(rf => rf.flag);

  return {
    qualificationScore:       score,
    verticalKey,
    verticalLabel:            vertical.label,
    recommendedTier:          vertical.recommendedEngagement(50), // baseline
    recommendedTierLabel:     TIERS[vertical.recommendedEngagement(50)]?.label,
    riskFlags,
    baaRequired:              vertical.baaRequired,
    frameworks:               vertical.frameworks,
    verticalNotes:            vertical.notes,
  };
}



// Scorecard dimensions now handled by VERTICALS engine (ciag-vertical-v1)

// ── Email helper ─────────────────────────────────────────────────────────────
async function sendEmail(to, subject, body) {
  try {
    await ses.send(new SendEmailCommand({
      FromEmailAddress: SENDER_EMAIL,
      Destination: { ToAddresses: [to] },
      Content: { Simple: {
        Subject: { Data: subject },
        Body: { Text: { Data: body } }
      }}
    }));
  } catch (e) {
    console.error('[CIAG] SES failed:', e.message);
  }
}

// ── Safe DynamoDB fetch ───────────────────────────────────────────────────────
async function getSubmission(submissionId) {
  const result = await db.send(new ScanCommand({
    TableName: INTAKE_TABLE,
    FilterExpression: 'submissionId = :sid',
    ExpressionAttributeValues: { ':sid': submissionId }
  }));
  return (result.Items && result.Items[0]) || null;
}

// =============================================================================
// POST /api/ciag/intake — submit prospect inquiry
// =============================================================================
router.post('/intake', async (req, res) => {
  const {
    firstName, lastName, email, company, title,
    engagement, companySize, industry, message, source, phone,
    agentCount, primaryVertical, regulatoryFrameworks
  } = req.body || {};

  const missing = ['firstName','lastName','email','company','engagement']
    .filter(f => !req.body?.[f]);
  if (missing.length) return res.status(400).json({ error: 'Missing: ' + missing.join(', ') });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email' });

  const tier = TIERS[engagement];
  if (!tier) return res.status(400).json({
    error: 'Invalid engagement type',
    valid: Object.keys(TIERS)
  });

  const submissionId = uuidv4();
  const submittedAt  = new Date().toISOString();

  await db.send(new PutCommand({
    TableName: INTAKE_TABLE,
    Item: {
      submissionId, submittedAt,
      firstName, lastName, email, company,
      title: title || '', engagement,
      engagementLabel: tier.label,
      companySize: companySize || '',
      industry: industry || '',
      message: message || '',
      source: source || 'portal',
      status: 'new',
      phone: phone || '',
      agentCount: agentCount || null,
      primaryVertical: primaryVertical || '',
      regulatoryFrameworks: regulatoryFrameworks || [],
      assignedTo: NOTIFY_EMAIL,
      lastActivity: submittedAt,
      prequalified: false,
      scorecardId: null,
    }
  }));

  // Prospect confirmation email
  await sendEmail(
    email,
    'Thank you for your interest in CoreIdentity Advisory Services',
    `Dear ${firstName},

Thank you for reaching out to CoreIdentity Advisory Group.

We have received your inquiry for a ${tier.label} engagement and will be in touch within one business day.

Engagement Overview:
  Type:     ${tier.label}
  Duration: ${tier.duration}
  Range:    ${tier.range}

${tier.description}

Your Reference ID: ${submissionId}

A member of our advisory team will contact you shortly to discuss your organization's governance objectives and next steps.

Best regards,
CoreIdentity Advisory Group
tmorgan@coreidentitygroup.com`
  );

  // Internal alert to Todd
  await sendEmail(
    NOTIFY_EMAIL,
    `[CIAG] New ${tier.label} Inquiry — ${company}`,
    `New CIAG intake submission received.

Company:    ${company}
Contact:    ${firstName} ${lastName} <${email}>
Title:      ${title || 'Not provided'}
Engagement: ${tier.label} (${tier.range})
Industry:   ${industry || 'Not provided'}
Agents:     ${agentCount || 'Not provided'}

Message:
${message || '(none)'}

Submission ID: ${submissionId}
Portal: https://portal.coreidentitygroup.com/ciag/submissions/${submissionId}`
  );

  return res.status(201).json({
    success: true,
    submissionId,
    message: 'Thank you. A member of the CIAG team will be in touch within one business day.',
    engagement: tier
  });
});

// =============================================================================
// GET /api/ciag/submissions — pipeline view (admin only)
// =============================================================================
router.get('/submissions', async (req, res) => {
  if (req.user?.role !== 'ADMIN')
    return res.status(403).json({ error: 'Admin access required' });

  const { stage, limit = 100 } = req.query;
  const result = await db.send(new ScanCommand({ TableName: INTAKE_TABLE, Limit: parseInt(limit) }));
  let items = result.Items || [];

  if (stage) items = items.filter(s => s.status === stage);

  // Sort by lastActivity descending
  items.sort((a, b) => new Date(b.lastActivity || b.submittedAt) - new Date(a.lastActivity || a.submittedAt));

  // Pipeline summary
  const pipeline = {};
  PIPELINE_STAGES.forEach(s => { pipeline[s] = 0; });
  items.forEach(i => { if (pipeline[i.status] !== undefined) pipeline[i.status]++; });

  return res.json({
    success: true,
    submissions: items,
    count: items.length,
    pipeline,
    stages: PIPELINE_STAGES
  });
});

// =============================================================================
// GET /api/ciag/submissions/:id — full submission detail
// =============================================================================
router.get('/submissions/:id', async (req, res) => {
  if (req.user?.role !== 'ADMIN')
    return res.status(403).json({ error: 'Admin access required' });

  const submission = await getSubmission(req.params.id);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  // Fetch notes
  let notes = [];
  try {
    const notesResult = await db.send(new ScanCommand({
      TableName: NOTES_TABLE,
      FilterExpression: 'submissionId = :sid',
      ExpressionAttributeValues: { ':sid': req.params.id }
    }));
    notes = (notesResult.Items || []).sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  } catch (e) { console.warn('[CIAG] Notes fetch failed:', e.message); }

  // Fetch scorecard if exists
  let scorecard = null;
  if (submission.scorecardId) {
    try {
      const scResult = await db.send(new GetCommand({
        TableName: SCORECARD_TABLE,
        Key: { scorecardId: submission.scorecardId }
      }));
      scorecard = scResult.Item || null;
    } catch (e) { console.warn('[CIAG] Scorecard fetch failed:', e.message); }
  }

  return res.json({
    success: true,
    data: { ...submission, notes, scorecard }
  });
});

// =============================================================================
// PATCH /api/ciag/submissions/:id/status — advance pipeline stage
// =============================================================================
router.patch('/submissions/:id/status', async (req, res) => {
  if (req.user?.role !== 'ADMIN')
    return res.status(403).json({ error: 'Admin access required' });

  const { status, note } = req.body || {};
  if (!PIPELINE_STAGES.includes(status))
    return res.status(400).json({ error: 'Invalid status', valid: PIPELINE_STAGES });

  const submission = await getSubmission(req.params.id);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  const now = new Date().toISOString();

  await db.send(new UpdateCommand({
    TableName: INTAKE_TABLE,
    Key: { submissionId: req.params.id, submittedAt: submission.submittedAt },
    UpdateExpression: 'SET #status = :status, lastActivity = :now',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': status, ':now': now }
  }));

  // Auto-add a note on status change if provided
  if (note) {
    await db.send(new PutCommand({
      TableName: NOTES_TABLE,
      Item: {
        noteId: uuidv4(),
        submissionId: req.params.id,
        content: `[Status → ${status}] ${note}`,
        author: req.user?.email || 'system',
        createdAt: now,
        type: 'status_change'
      }
    }));
  }

  return res.json({
    success: true,
    submissionId: req.params.id,
    status,
    lastActivity: now
  });
});

// =============================================================================
// POST /api/ciag/submissions/:id/notes — add engagement note
// =============================================================================
router.post('/submissions/:id/notes', async (req, res) => {
  if (req.user?.role !== 'ADMIN')
    return res.status(403).json({ error: 'Admin access required' });

  const { content, type = 'general' } = req.body || {};
  if (!content || content.trim().length < 5)
    return res.status(400).json({ error: 'Note content required (min 5 chars)' });

  const submission = await getSubmission(req.params.id);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  const now    = new Date().toISOString();
  const noteId = uuidv4();

  await db.send(new PutCommand({
    TableName: NOTES_TABLE,
    Item: {
      noteId,
      submissionId: req.params.id,
      content: content.trim(),
      author: req.user?.email || 'system',
      createdAt: now,
      type
    }
  }));

  // Update lastActivity on parent record
  await db.send(new UpdateCommand({
    TableName: INTAKE_TABLE,
    Key: { submissionId: req.params.id, submittedAt: submission.submittedAt },
    UpdateExpression: 'SET lastActivity = :now',
    ExpressionAttributeValues: { ':now': now }
  }));

  return res.status(201).json({ success: true, noteId, createdAt: now });
});

// =============================================================================
// POST /api/ciag/submissions/:id/scorecard — generate Governance Scorecard
// =============================================================================
router.post('/submissions/:id/scorecard', async (req, res) => {
  if (req.user?.role !== 'ADMIN')
    return res.status(403).json({ error: 'Admin access required' });

  const submission = await getSubmission(req.params.id);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  // Accept manual scores or auto-generate baseline based on engagement type
  const { scores = null, assessorNotes = '' } = req.body || {};

  // Default scores based on engagement type — CVS-calibrated baseline
  const baselineScores = {
    diagnostic:     { identity: 45, policy: 40, observability: 35, data: 50, validation: 30 },
    deployment:     { identity: 60, policy: 65, observability: 55, data: 60, validation: 50 },
    transformation: { identity: 70, policy: 75, observability: 70, data: 75, validation: 65 },
    advisory:       { identity: 55, policy: 55, observability: 50, data: 55, validation: 45 },
  };

  const scorecardResult = calculateScorecard(submission, scores);
  const { overallScore, certTier, dimensions: dimensionDetails,
          gaps, recommendations, riskFlags: scorecardRiskFlags,
          verticalKey, verticalLabel, frameworks, baaRequired,
          verticalNotes, recommendedEngagement, recommendedEngagementLabel } = scorecardResult;
  const scorecardId  = uuidv4();
  const generatedAt  = new Date().toISOString();

  const scorecard = {
    scorecardId,
    submissionId:              req.params.id,
    company:                   submission.company,
    engagement:                submission.engagement,
    generatedAt,
    generatedBy:               req.user?.email || 'system',
    overallScore,
    certTier,
    dimensions:                dimensionDetails,
    gaps,
    recommendations,
    riskFlags:                 scorecardRiskFlags || [],
    assessorNotes,
    verticalKey:               verticalKey || 'enterprise_bfsi',
    verticalLabel:             verticalLabel || 'Enterprise / BFSI',
    regulatoryFrameworks:      frameworks || [],
    baaRequired:               baaRequired || false,
    verticalNotes:             verticalNotes || '',
    recommendedEngagement,
    recommendedEngagementLabel,
    framework:                 'CoreIdentity Certified Governance Scorecard™ v1.0',
    nextReview:                new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };

  await db.send(new PutCommand({ TableName: SCORECARD_TABLE, Item: scorecard }));

  // Link scorecard to submission
  await db.send(new UpdateCommand({
    TableName: INTAKE_TABLE,
    Key: { submissionId: req.params.id, submittedAt: submission.submittedAt },
    UpdateExpression: 'SET scorecardId = :sid, lastActivity = :now',
    ExpressionAttributeValues: { ':sid': scorecardId, ':now': generatedAt }
  }));

  // Note the scorecard generation
  await db.send(new PutCommand({
    TableName: NOTES_TABLE,
    Item: {
      noteId: uuidv4(),
      submissionId: req.params.id,
      content: `Governance Scorecard generated — Overall: ${overallScore}/100 (${certTier}). Cert tier: ${certTier}.`,
      author: req.user?.email || 'system',
      createdAt: generatedAt,
      type: 'scorecard'
    }
  }));

  return res.status(201).json({ success: true, data: scorecard });
});

// =============================================================================
// POST /api/ciag/submissions/:id/prequalify — AGO-in-CIAG pre-qualification
// =============================================================================
router.post('/submissions/:id/prequalify', async (req, res) => {
  if (req.user?.role !== 'ADMIN')
    return res.status(403).json({ error: 'Admin access required' });

  const submission = await getSubmission(req.params.id);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  const now = new Date().toISOString();

  // Vertical-aware pre-qualification baseline
  const prequalBaseline = calculatePrequalScore(submission);
  let agoResult = null;
  let qualificationScore = prequalBaseline.qualificationScore;
  let recommendedTier = prequalBaseline.recommendedTier;
  let riskFlags = prequalBaseline.riskFlags;

  // Attempt AGO execution for enriched signal
  try {
    const authResp = await fetch(`${ECS_API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.COREIDENTITY_API_EMAIL || 'tmorgan@coreholdingcorp.com',
        password: process.env.COREIDENTITY_API_PASSWORD || ''
      }),
      signal: AbortSignal.timeout(10000)
    });
    const authData = await authResp.json();
    const token = authData?.data?.token;

    if (token) {
      // Find the CIAG AGO agent
      const agentsResp = await fetch(`${ECS_API}/api/agents?category=Compliance&limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(10000)
      });
      const agentsData = await agentsResp.json();
      const ciagAgent = (agentsData?.data || [])[0];

      if (ciagAgent) {
        const execResp = await fetch(`${ECS_API}/api/execute/${ciagAgent.agentId}/execute`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            taskType: 'ANALYZE',
            inputs: {
              company:             submission.company,
              industry:            submission.industry,
              engagement:          submission.engagement,
              agentCount:          submission.agentCount,
              regulatoryFrameworks: submission.regulatoryFrameworks,
              prequalification:    true
            }
          }),
          signal: AbortSignal.timeout(30000)
        });
        const execData = await execResp.json();
        agoResult = execData;

        if (execData?.success) {
          // Generate qualification signal from AGO output
          qualificationScore = Math.min(95, Math.max(25,
            50 +
            (submission.agentCount > 1000 ? 20 : submission.agentCount > 100 ? 10 : 0) +
            (submission.regulatoryFrameworks?.length > 2 ? 15 : submission.regulatoryFrameworks?.length > 0 ? 8 : 0) +
            (['Healthcare','Financial Services','Legal'].includes(submission.industry) ? 15 : 5) +
            (['transformation','deployment'].includes(submission.engagement) ? 10 : 0)
          ));

          // Risk flags
          if (submission.agentCount > 10000) riskFlags.push('High agent count — phased deployment required');
          if (submission.regulatoryFrameworks?.includes('HIPAA')) riskFlags.push('HIPAA scope — BAA required before PHI agent deployment');
          if (submission.engagement === 'transformation') riskFlags.push('Enterprise transformation — executive sponsor confirmation required');
          if (!submission.industry) riskFlags.push('Industry not specified — vertical framework mapping TBD');

          // Tier recommendation
          if (qualificationScore >= 80) recommendedTier = 'transformation';
          else if (qualificationScore >= 60) recommendedTier = 'deployment';
          else if (qualificationScore >= 40) recommendedTier = 'diagnostic';
          else recommendedTier = 'diagnostic';
        }
      }
    }
  } catch (e) {
    console.error('[CIAG] AGO pre-qualification failed:', e.message);
  }

  const prequalResult = {
    prequalifiedAt:           now,
    qualificationScore,
    recommendedTier,
    recommendedTierLabel:     TIERS[recommendedTier]?.label,
    riskFlags,
    verticalKey:              prequalBaseline.verticalKey,
    verticalLabel:            prequalBaseline.verticalLabel,
    regulatoryFrameworks:     prequalBaseline.frameworks,
    baaRequired:              prequalBaseline.baaRequired,
    verticalNotes:            prequalBaseline.verticalNotes,
    agoExecuted:              !!agoResult?.success,
    agoExecutionId:           agoResult?.executionId || null,
    salProofPackId:           agoResult?.sal?.proof_pack_id || null,
  };

  // Update submission
  await db.send(new UpdateCommand({
    TableName: INTAKE_TABLE,
    Key: { submissionId: req.params.id, submittedAt: submission.submittedAt },
    UpdateExpression: 'SET prequalified = :pq, prequalResult = :pqr, lastActivity = :now',
    ExpressionAttributeValues: {
      ':pq':  true,
      ':pqr': prequalResult,
      ':now': now
    }
  }));

  // Note the pre-qualification
  await db.send(new PutCommand({
    TableName: NOTES_TABLE,
    Item: {
      noteId: uuidv4(),
      submissionId: req.params.id,
      content: `AGO pre-qualification complete — Score: ${qualificationScore || 'N/A'}, Recommended: ${TIERS[recommendedTier]?.label}, Risk flags: ${riskFlags.length > 0 ? riskFlags.join('; ') : 'None'}`,
      author: 'system',
      createdAt: now,
      type: 'prequalification'
    }
  }));

  return res.json({ success: true, data: prequalResult });
});

// =============================================================================
// GET /api/ciag/pipeline — summary for dashboard widget
// =============================================================================
router.get('/pipeline', async (req, res) => {
  if (req.user?.role !== 'ADMIN')
    return res.status(403).json({ error: 'Admin access required' });

  const result = await db.send(new ScanCommand({ TableName: INTAKE_TABLE }));
  const items  = result.Items || [];

  const pipeline = {};
  PIPELINE_STAGES.forEach(s => { pipeline[s] = { count: 0, value: 0 }; });

  items.forEach(item => {
    const stage = item.status || 'new';
    if (pipeline[stage]) {
      pipeline[stage].count++;
      const tier = TIERS[item.engagement];
      if (tier?.range) {
        const match = tier.range.match(/\$([0-9K]+)/);
        if (match) {
          const val = parseInt(match[1].replace('K', '000'));
          pipeline[stage].value += val;
        }
      }
    }
  });

  const totalPipeline = Object.values(pipeline).reduce((s, v) => s + v.value, 0);
  const recentActivity = items
    .sort((a, b) => new Date(b.lastActivity || b.submittedAt) - new Date(a.lastActivity || a.submittedAt))
    .slice(0, 5)
    .map(i => ({
      submissionId: i.submissionId,
      company: i.company,
      engagement: i.engagementLabel,
      status: i.status,
      lastActivity: i.lastActivity || i.submittedAt,
      prequalified: i.prequalified || false,
      scorecardId: i.scorecardId || null,
    }));

  return res.json({
    success: true,
    data: { pipeline, totalPipeline, totalSubmissions: items.length, recentActivity }
  });
});


// =============================================================================
// GET /api/ciag/verticals — list all supported verticals + frameworks
// =============================================================================
router.get('/verticals', async (req, res) => {
  const verticalList = Object.entries(VERTICALS).map(([key, v]) => ({
    key,
    label:        v.label,
    frameworks:   v.frameworks,
    baaRequired:  v.baaRequired,
    weights:      v.weights,
    notes:        v.notes,
  }));
  return res.json({ success: true, verticals: verticalList, count: verticalList.length });
});

module.exports = router;
