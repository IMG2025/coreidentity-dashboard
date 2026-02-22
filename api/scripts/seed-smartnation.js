#!/usr/bin/env node
// Seed SmartNation AI agent registry with all 105 agents
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBDocument.from(new DynamoDB({ region: process.env.AWS_REGION || 'us-east-2' }));
const TABLE = 'smartnation-agents';

const TIER_MAP = {
  'Customer Service': 'TIER_1', 'Research': 'TIER_1',
  'Communication': 'TIER_2', 'Data Analysis': 'TIER_2',
  'Document Processing': 'TIER_2', 'Marketing': 'TIER_2',
  'Integration': 'TIER_3', 'Compliance': 'TIER_3', 'Legal': 'TIER_3'
};

const COMPLIANCE_MAP = {
  'Customer Service': ['SOC2'],
  'Research': ['SOC2', 'GDPR'],
  'Communication': ['SOC2', 'HIPAA'],
  'Data Analysis': ['SOC2', 'HIPAA', 'GDPR'],
  'Document Processing': ['SOC2', 'GDPR'],
  'Marketing': ['SOC2', 'CCPA'],
  'Integration': ['SOC2', 'ISO27001'],
  'Compliance': ['SOC2', 'HIPAA', 'GDPR', 'CCPA', 'ISO27001'],
  'Legal': ['SOC2', 'GDPR', 'ISO27001']
};

const ICONS = {
  'Data Analysis': '📊', 'Document Processing': '📄', 'Communication': '💬',
  'Research': '🔬', 'Compliance': '🛡️', 'Integration': '🔗',
  'Marketing': '📢', 'Customer Service': '🎧', 'Legal': '⚖️'
};

const NAMES = {
  'Data Analysis':       ['DataMiner Pro','AnalyticsCore','InsightEngine','MetricsPulse','DataVault','TrendSeer','PredictIQ','StatEngine','QuantumAnalyzer','StreamAnalytics','DataLens','PatternRecognizer'],
  'Document Processing': ['DocuScan AI','TextExtract','FormParser','DocClassify','SmartOCR','PDFProcessor','DocuFlow','ContentParser','ArchiveBot','DocuVerify','TextMiner','FormExtractor'],
  'Communication':       ['CommBridge','MessageFlow','NotifyBot','AlertManager','EmailCraft','SlackSync','CommsHub','OutreachAI','EngageBot','MessageCraft','PulseNotify','AlertFlow'],
  'Research':            ['ResearchBot','DataHunter','InsightFinder','KnowledgeBase','TrendTracker','MarketScout','CompIntel','NewsAnalyzer','PatentScout','LitReview','FactChecker','ResearchPro'],
  'Compliance':          ['ComplianceGuard','RegWatch','AuditBot','PolicyEngine','RiskRadar','ComplianceIQ','RegTracker','AuditPro','PolicyGuard','RiskMonitor','ComplianceCore','RegEngine'],
  'Integration':         ['APIBridge','DataSync','SystemConnect','WorkflowLink','IntegrationHub','ConnectFlow','DataPipeline','APIOrchestrator','SyncEngine','IntegrationCore','ConnectorBot','FlowBridge'],
  'Marketing':           ['CampaignAI','ContentGen','SEOOptimizer','SocialPulse','AdTargeter','BrandVoice','LeadGen','MarketMapper','ContentFlow','CampaignFlow','AudienceAI','BrandEngine'],
  'Customer Service':    ['SupportBot','CustomerIQ','TicketFlow','ResponseAI','ChatAssist','CXEngine','SupportCore','CustomerFlow','ResolveBot','ServiceAI','CXOptimizer','HelpDesk'],
  'Legal':               ['LegalReview','ContractAI','ComplianceLex','PolicyDraft','LegalBot','RegulatoryAI','ContractFlow','LexAnalyzer','LegalCore','PolicyEngine','ContractGuard','LegalPulse']
};

const DESCRIPTIONS = {
  'Data Analysis':       'Real-time data analysis and pattern recognition across enterprise datasets.',
  'Document Processing': 'Intelligent document parsing, classification and extraction at scale.',
  'Communication':       'Automated communication workflows with multi-channel delivery.',
  'Research':            'Deep research and intelligence gathering across multiple data sources.',
  'Compliance':          'Automated compliance monitoring and regulatory framework management.',
  'Integration':         'Enterprise system integration with real-time data synchronization.',
  'Marketing':           'AI-driven marketing automation and campaign optimization.',
  'Customer Service':    'Intelligent customer support with natural language understanding.',
  'Legal':               'Legal document analysis and regulatory compliance automation.'
};

function calcScore(category, rating, tier) {
  let score = 70;
  if (tier === 'TIER_1') score += 20;
  if (tier === 'TIER_2') score += 15;
  if (tier === 'TIER_3') score += 5;
  const compliance = COMPLIANCE_MAP[category] || ['SOC2'];
  score += Math.min(10, compliance.length * 2);
  if (rating >= 4.5) score += 5;
  return Math.min(100, score);
}

async function seed() {
  const categories = Object.keys(NAMES);
  let id = 1;
  let seeded = 0;

  for (const category of categories) {
    const names  = NAMES[category];
    const tier   = TIER_MAP[category] || 'TIER_2';
    const comp   = COMPLIANCE_MAP[category] || ['SOC2'];
    const icon   = ICONS[category] || '🤖';
    const desc   = DESCRIPTIONS[category];

    for (let i = 0; i < names.length; i++) {
      const rating      = parseFloat((4.2 + Math.random() * 0.8).toFixed(1));
      const deployments = Math.floor(500 + Math.random() * 3000);
      const tierLabel   = i === 0 ? 'Premium' : 'Standard';

      const item = {
        agentId:         String(id),
        name:            names[i],
        category,
        description:     desc,
        icon,
        tier:            tierLabel,
        riskTier:        tier,
        compliance:      comp,
        status:          'active',
        rating,
        deployments,
        successRate:     Math.floor(92 + Math.random() * 8),
        governanceScore: calcScore(category, rating, tier),
        domainId:        'chc-ops',
        createdAt:       new Date().toISOString(),
        updatedAt:       new Date().toISOString(),
        version:         '1.0.0',
        registeredBy:    'SmartNation AI'
      };

      await client.put({ TableName: TABLE, Item: item });
      seeded++;
      id++;
    }
    console.log('[OK] Seeded ' + names.length + ' agents for category: ' + category);
  }

  console.log('');
  console.log('[DONE] Total agents seeded: ' + seeded);
}

seed().catch(function(err) {
  console.error('[ERROR] Seed failed:', err);
  process.exit(1);
});
