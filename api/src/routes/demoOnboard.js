'use strict';
// DEMO_ONBOARD_V1 — POST /api/demo/onboard
// Accepts: company_name, vertical, agent_count, frameworks[]
// Sequence:
//   1. Create client record in DynamoDB client-accounts
//   2. Issue AIS credentials for first 3 agents (local PQC provisioner)
//   3. Create CIAG pipeline entry at Phase 0
//   4. Apply governance profile record
//   5. Write sentinel security event (onboarding complete)
//   6. Return full onboarding summary + projected revenue

const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const Sentinel = require('../sentinel');

const router = express.Router();
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' }));

const CLIENTS_TABLE    = 'client-accounts';
const CIAG_TABLE       = 'ciag-intake';
const GOVERNANCE_TABLE = 'coreidentity-governance-profiles';

const AGENT_MO_RATE     = 45;
const EXEC_RATE         = 0.08;
const FRAMEWORK_MO_RATE = 2500;

const CIAG_PHASE_VALUE  = { 0: 112500, 1: 225000, 2: 375000 };

const FRAMEWORK_EXPOSURE = {
  HIPAA: 3200000, 'PCI-DSS': 4750000, GDPR: 2100000, SOC2: 1800000,
  SOX: 1500000, GLBA: 800000, CCPA: 650000, FFIEC: 900000,
};

const VERTICAL_PLAN_MAP = {
  healthcare:        'professional',
  financial_services:'enterprise',
  legal:             'professional',
  retail:            'starter',
  default:           'starter',
};

// Simplified AIS credential issuance (local — does not require external HTTP)
// In production this would call agentidentity.systems API
function issueAgentCredential(agentId, clientId, vertical) {
  const credentialId = 'AIS-' + agentId.toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
  return {
    credentialId,
    agentId,
    clientId,
    vertical,
    algorithm:   'ML-DSA-65',
    issuedAt:    new Date().toISOString(),
    expiresAt:   new Date(Date.now() + 86400 * 1000).toISOString(), // 24h TTL
    trustLevel:  'T2',
    status:      'ISSUED',
    note:        'Local PQC provisioner — sync to agentidentity.systems on next rotation cycle',
  };
}

function projectRevenue(agentCount, frameworks) {
  const monthlyPlatform = (agentCount * AGENT_MO_RATE) + (frameworks.length * FRAMEWORK_MO_RATE);
  const annualPlatform  = monthlyPlatform * 12;
  const ciagPhase0      = CIAG_PHASE_VALUE[0];
  const ciagPhase1      = CIAG_PHASE_VALUE[1];

  let exposureMitigated = 0;
  frameworks.forEach(fw => {
    exposureMitigated += FRAMEWORK_EXPOSURE[fw] || 500000;
  });

  return {
    platformMRR:       monthlyPlatform,
    platformARR:       annualPlatform,
    ciagPhase0:        ciagPhase0,
    ciagPhase1:        ciagPhase1,
    totalYear1:        annualPlatform + ciagPhase0,
    exposureMitigated: exposureMitigated,
  };
}

// ── Health100 preset ──────────────────────────────────────────
const HEALTH100_FRAMEWORKS = ['HIPAA','HITECH','21st Century Cures Act','EU AI Act','NIST AI RMF','Colorado AI Act'];
const HEALTH100_AGENT_COUNT = 100000;

function isHealth100(preset, company_name) {
  if (preset === 'health100') return true;
  if (typeof company_name === 'string') {
    const n = company_name.toLowerCase();
    return n.includes('cvs') || n.includes('health100');
  }
  return false;
}

function projectRevenueHealth100() {
  const platformMRR = HEALTH100_AGENT_COUNT * AGENT_MO_RATE; // 100K × $45 = $4.5M
  const agoMonthly  = Math.round(HEALTH100_AGENT_COUNT * 50 * 30 * 0.12); // 100K agents × 50 decisions/day × 30 × $0.12
  const annualPlatform = platformMRR * 12;
  const ciagPhase0  = CIAG_PHASE_VALUE[0];
  const ciagPhase1  = CIAG_PHASE_VALUE[1];
  let exposureMitigated = 0;
  HEALTH100_FRAMEWORKS.forEach(fw => { exposureMitigated += FRAMEWORK_EXPOSURE[fw] || 500000; });
  return {
    platformMRR,
    agoMonthly,
    platformARR:       annualPlatform,
    ciagPhase0,
    ciagPhase1,
    totalYear1:        annualPlatform + ciagPhase0,
    exposureMitigated,
    baaReadinessCurrent: 61,
    baaReadinessTarget:  96,
    remediationDays:     90,
    ltvLow:  28000000,
    ltvHigh: 42000000,
    note: 'Health100 scale economics — 100K agent deployment',
  };
}

// POST /api/demo/onboard
router.post('/', async (req, res) => {
  const { company_name, vertical, agent_count, frameworks, preset } = req.body || {};

  if (!company_name) return res.status(400).json({ error: 'company_name required' });
  if (!vertical)     return res.status(400).json({ error: 'vertical required' });

  // Health100 preset override
  const health100 = isHealth100(preset, company_name);
  const agentCount   = health100 ? HEALTH100_AGENT_COUNT : (parseInt(agent_count) || 10);
  const fwList       = health100 ? HEALTH100_FRAMEWORKS : (Array.isArray(frameworks) ? frameworks : []);
  const clientId     = uuidv4();
  const ciagId       = uuidv4();
  const govProfileId = uuidv4();
  const now          = new Date().toISOString();
  const plan         = VERTICAL_PLAN_MAP[vertical] || VERTICAL_PLAN_MAP.default;

  const errors = [];

  // ── 1. Create client record ────────────────────────────────────
  const clientRecord = {
    clientId,
    companyName:  company_name,
    vertical,
    plan,
    planLabel:    plan.charAt(0).toUpperCase() + plan.slice(1),
    agentLimit:   agentCount,
    frameworks:   fwList,
    status:       'active',
    createdAt:    now,
    contactEmail: 'demo@' + company_name.toLowerCase().replace(/\s+/g, '') + '.com',
    demo:         true,
  };
  try {
    await db.send(new PutCommand({ TableName: CLIENTS_TABLE, Item: clientRecord }));
  } catch (e) {
    errors.push('client_create: ' + e.message);
  }

  // ── 2. Issue AIS credentials for first 3 agents ────────────────
  const agentCredentials = [];
  const numToProvision = Math.min(agentCount, 3);
  for (let i = 1; i <= numToProvision; i++) {
    const agentId = clientId.slice(0, 8).toUpperCase() + '-' + String(i).padStart(3, '0');
    agentCredentials.push(issueAgentCredential(agentId, clientId, vertical));
  }

  // ── 3. Create CIAG pipeline entry at Phase 0 ──────────────────
  const ciagRecord = {
    submissionId:   ciagId,
    submittedAt:    now,   // required sort key on ciag-intake table
    id:             ciagId,
    companyName:    company_name,
    vertical,
    phase:          0,
    stage:          'active',
    status:         'ACTIVE',
    estimatedValue: CIAG_PHASE_VALUE[0],
    frameworks:     fwList,
    agentCount,
    createdAt:      now,
    updatedAt:      now,
    contactName:    'Demo Onboarding',
    prequalified:   true,
    source:         'demo_onboard',
  };
  try {
    await db.send(new PutCommand({ TableName: CIAG_TABLE, Item: ciagRecord }));
  } catch (e) {
    errors.push('ciag_create: ' + e.message);
  }

  // ── 4. Apply governance profile ────────────────────────────────
  const govProfile = {
    profileId:    govProfileId,
    clientId,
    companyName:  company_name,
    vertical,
    frameworks:   fwList,
    agentCount,
    governanceScore: 0, // starts at 0, rises with executions
    policySet:    'default_' + vertical,
    sentinelEnabled: true,
    pqcEnabled:   true,
    createdAt:    now,
    status:       'ACTIVE',
  };
  try {
    await db.send(new PutCommand({ TableName: GOVERNANCE_TABLE, Item: govProfile }));
  } catch (e) {
    // Table may not exist yet — non-fatal
    errors.push('governance_profile: ' + e.message);
  }

  // ── 5. Write sentinel onboarding event ────────────────────────
  try {
    await Sentinel.logSecurityEvent('POLICY_ENFORCED_PASS', {
      agentId:   clientId,
      agentName: company_name + ' — Demo Onboarding',
      userId:    req.user?.userId || 'demo',
      taskType:  'ONBOARD',
      tierId:    'TIER_1',
      severity:  'INFO',
      resource:  'demo-onboard',
      clientId,
    });
  } catch (e) {
    errors.push('sentinel_event: ' + e.message);
  }

  // ── 6. Return onboarding summary ──────────────────────────────
  const projectedRevenue = health100 ? projectRevenueHealth100() : projectRevenue(agentCount, fwList);

  return res.status(201).json({
    success:  true,
    summary: {
      clientId,
      companyName:      company_name,
      vertical,
      plan,
      agentCount,
      frameworks:       fwList,
      createdAt:        now,
    },
    records: {
      client:           clientRecord,
      ciagPipeline:     ciagRecord,
      governanceProfile:govProfile,
      agentCredentials,
    },
    projectedRevenue,
    errors: errors.length ? errors : undefined,
    message: errors.length
      ? 'Onboarding complete with ' + errors.length + ' non-fatal error(s)'
      : 'Onboarding complete — all records created successfully',
  });
});

module.exports = router;
