/**
 * Sentinel OS — Risk Tier Definitions
 * The authoritative risk classification schema for all AgentInstruments.
 *
 * TIER_1: Read-only, low blast radius — any authenticated user
 * TIER_2: Standard execution — ADMIN required, no approval needed
 * TIER_3: High-impact operations — ADMIN + pre-approval required
 * TIER_4: Critical infrastructure — ADMIN + multi-approval + kill-switch enabled
 */

const RISK_TIERS = {
  TIER_1: {
    id: 'TIER_1',
    label: 'Low Risk',
    color: 'green',
    description: 'Read-only analytics and reporting operations',
    allowed_roles: ['ADMIN', 'CUSTOMER'],
    allowed_task_types: ['ANALYZE'],
    requires_approval: false,
    kill_switch_eligible: false,
    max_concurrency: 50,
    audit_level: 'STANDARD'
  },
  TIER_2: {
    id: 'TIER_2',
    label: 'Standard',
    color: 'blue',
    description: 'Standard execution with data read/write capabilities',
    allowed_roles: ['ADMIN'],
    allowed_task_types: ['ANALYZE', 'EXECUTE'],
    requires_approval: false,
    kill_switch_eligible: false,
    max_concurrency: 20,
    audit_level: 'ENHANCED'
  },
  TIER_3: {
    id: 'TIER_3',
    label: 'High Impact',
    color: 'orange',
    description: 'High-impact operations requiring pre-approval',
    allowed_roles: ['ADMIN'],
    allowed_task_types: ['ANALYZE', 'EXECUTE', 'ESCALATE'],
    requires_approval: true,
    kill_switch_eligible: true,
    max_concurrency: 5,
    audit_level: 'FULL'
  },
  TIER_4: {
    id: 'TIER_4',
    label: 'Critical',
    color: 'red',
    description: 'Critical infrastructure — multi-approval and kill-switch enforced',
    allowed_roles: ['ADMIN'],
    allowed_task_types: ['ANALYZE', 'EXECUTE', 'ESCALATE'],
    requires_approval: true,
    requires_multi_approval: true,
    kill_switch_eligible: true,
    max_concurrency: 2,
    audit_level: 'FORENSIC'
  }
};

// Agent category → risk tier mapping
const CATEGORY_RISK_MAP = {
  'Customer Service':    'TIER_1',
  'Research':            'TIER_1',
  'Communication':       'TIER_2',
  'Data Analysis':       'TIER_2',
  'Document Processing': 'TIER_2',
  'Marketing':           'TIER_2',
  'Integration':         'TIER_3',
  'Compliance':          'TIER_3',
  'Legal':               'TIER_3'
};

// Task type escalation map — ESCALATE on TIER_3+ triggers TIER_4 enforcement
const TASK_TIER_ESCALATION = {
  'ESCALATE': { 'TIER_3': 'TIER_4', 'TIER_4': 'TIER_4' }
};

function resolveRiskTier(agentCategory, taskType = 'ANALYZE') {
  const baseTier = CATEGORY_RISK_MAP[agentCategory] || 'TIER_2';
  const escalation = TASK_TIER_ESCALATION[taskType];
  return escalation?.[baseTier] || baseTier;
}

function getTierDefinition(tierId) {
  return RISK_TIERS[tierId] || RISK_TIERS['TIER_2'];
}

module.exports = { RISK_TIERS, CATEGORY_RISK_MAP, resolveRiskTier, getTierDefinition };
