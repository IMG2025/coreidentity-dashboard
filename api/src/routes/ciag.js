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

// ── Scorecard dimensions (CoreIdentity Certified Governance Scorecard™) ──────
const SCORECARD_DIMENSIONS = {
  identity:       { label: 'Identity & Agent Registry',    weight: 0.20, description: 'Agent credentialing, role assignment, and registry completeness' },
  policy:         { label: 'Policy Enforcement',           weight: 0.25, description: 'Real-time policy gate coverage, fail-closed enforcement rate' },
  observability:  { label: 'Observability & Audit Trail',  weight: 0.20, description: 'Execution logging completeness, audit artifact generation' },
  data:           { label: 'Data Governance',              weight: 0.20, description: 'PII handling, data classification, retention compliance' },
  validation:     { label: 'Validation & Testing',         weight: 0.15, description: 'Governance test coverage, drift detection, soak testing' },
};

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
    Key: { submissionId: req.params.id },
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
    Key: { submissionId: req.params.id },
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

  const dimensionScores = scores || baselineScores[submission.engagement] || baselineScores.diagnostic;

  // Calculate weighted overall score
  let overallScore = 0;
  const dimensionDetails = {};
  Object.entries(SCORECARD_DIMENSIONS).forEach(([key, dim]) => {
    const score = dimensionScores[key] || 50;
    overallScore += score * dim.weight;
    dimensionDetails[key] = {
      label:       dim.label,
      score,
      weight:      dim.weight,
      description: dim.description,
      grade:       score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D',
      status:      score >= 70 ? 'Compliant' : score >= 50 ? 'Partial' : 'Non-Compliant',
    };
  });

  overallScore = Math.round(overallScore);

  // Generate gap analysis and recommendations
  const gaps = [];
  const recommendations = [];

  Object.entries(dimensionDetails).forEach(([key, d]) => {
    if (d.score < 70) {
      gaps.push(`${d.label} (${d.score}/100 — ${d.status})`);
    }
    if (d.score < 50) {
      recommendations.push(`CRITICAL: Remediate ${d.label} before platform deployment`);
    } else if (d.score < 70) {
      recommendations.push(`Strengthen ${d.label} — target 80+ for enterprise readiness`);
    }
  });

  // Certification tier
  const certTier = overallScore >= 85 ? 'Platinum' :
                   overallScore >= 70 ? 'Gold' :
                   overallScore >= 55 ? 'Silver' : 'Foundation';

  const scorecardId  = uuidv4();
  const generatedAt  = new Date().toISOString();

  const scorecard = {
    scorecardId,
    submissionId: req.params.id,
    company:      submission.company,
    engagement:   submission.engagement,
    generatedAt,
    generatedBy:  req.user?.email || 'system',
    overallScore,
    certTier,
    dimensions:   dimensionDetails,
    gaps,
    recommendations,
    assessorNotes,
    framework:    'CoreIdentity Certified Governance Scorecard™ v1.0',
    nextReview:   new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };

  await db.send(new PutCommand({ TableName: SCORECARD_TABLE, Item: scorecard }));

  // Link scorecard to submission
  await db.send(new UpdateCommand({
    TableName: INTAKE_TABLE,
    Key: { submissionId: req.params.id },
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

  // Dispatch to AGO execution engine (ciag-ago-1 executor)
  // Uses the ANALYZE task type to generate a pre-qualification signal
  let agoResult = null;
  let qualificationScore = null;
  let recommendedTier = submission.engagement;
  let riskFlags = [];

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
    prequalifiedAt: now,
    qualificationScore,
    recommendedTier,
    recommendedTierLabel: TIERS[recommendedTier]?.label,
    riskFlags,
    agoExecuted: !!agoResult?.success,
    agoExecutionId: agoResult?.executionId || null,
    salProofPackId: agoResult?.sal?.proof_pack_id || null,
  };

  // Update submission
  await db.send(new UpdateCommand({
    TableName: INTAKE_TABLE,
    Key: { submissionId: req.params.id },
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

module.exports = router;
