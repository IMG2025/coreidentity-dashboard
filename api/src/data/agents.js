// NOTE: Replace this with DB queries when database is integrated.
// Schema matches BACKEND_API.md exactly.

const AGENTS = [
  { id: 1,  name: "DataMiner Pro",        category: "Data Analysis",     description: "Real-time data mining and pattern recognition across enterprise datasets.", rating: 4.9, deployments: 2341, compliance: ["SOC2", "HIPAA"], icon: "📊", price: "Premium", status: "active", tags: ["ML", "ETL", "Real-time"] },
  { id: 2,  name: "DocuScan AI",          category: "Document Processing",description: "Intelligent document parsing, classification and extraction at scale.", rating: 4.8, deployments: 1876, compliance: ["SOC2", "GDPR"], icon: "📄", price: "Standard", status: "active", tags: ["OCR", "NLP", "Classification"] },
  { id: 3,  name: "CommBridge",           category: "Communication",     description: "Multi-channel communication orchestration with sentiment analysis.", rating: 4.7, deployments: 987, compliance: ["CCPA"], icon: "💬", price: "Standard", status: "active", tags: ["Email", "SMS", "Sentiment"] },
  { id: 4,  name: "ResearchHound",        category: "Research",          description: "Autonomous research agent with citation tracking and synthesis.", rating: 4.9, deployments: 654, compliance: ["SOC2"], icon: "🔍", price: "Premium", status: "active", tags: ["Web", "Academic", "Synthesis"] },
  { id: 5,  name: "ComplianceGuard",      category: "Compliance",        description: "Continuous compliance monitoring across regulatory frameworks.", rating: 4.9, deployments: 1234, compliance: ["SOC2", "HIPAA", "GDPR", "CCPA"], icon: "🛡️", price: "Enterprise", status: "active", tags: ["Audit", "Regulatory", "Alerts"] },
  { id: 6,  name: "IntegrationHub",       category: "Integration",       description: "Enterprise API orchestration with 200+ connector library.", rating: 4.6, deployments: 3421, compliance: ["SOC2"], icon: "🔗", price: "Standard", status: "active", tags: ["API", "Webhooks", "ETL"] },
  { id: 7,  name: "MarketPulse",          category: "Marketing",         description: "AI-driven campaign optimization with predictive audience modeling.", rating: 4.7, deployments: 892, compliance: ["CCPA", "GDPR"], icon: "📈", price: "Premium", status: "active", tags: ["CRM", "Attribution", "Segmentation"] },
  { id: 8,  name: "SupportSage",          category: "Customer Service",  description: "Autonomous tier-1 support resolution with escalation intelligence.", rating: 4.8, deployments: 2156, compliance: ["SOC2", "CCPA"], icon: "🎯", price: "Standard", status: "active", tags: ["Tickets", "Chat", "Resolution"] },
  { id: 9,  name: "RiskRadar",            category: "Compliance",        description: "Real-time enterprise risk scoring with jurisdictional mapping.", rating: 4.8, deployments: 743, compliance: ["SOC2", "HIPAA"], icon: "⚠️", price: "Enterprise", status: "active", tags: ["Risk", "Scoring", "Jurisdictions"] },
  { id: 10, name: "PipelineOrchestrator", category: "Data Analysis",     description: "Automated data pipeline management with anomaly detection.", rating: 4.7, deployments: 1567, compliance: ["SOC2"], icon: "🔄", price: "Premium", status: "active", tags: ["Pipeline", "Monitoring", "ML"] }
];

// Generate full 105 agents from seed categories
const CATEGORIES = ["Data Analysis","Document Processing","Communication","Research","Compliance","Integration","Marketing","Customer Service"];
const PRICES = ["Standard","Premium","Enterprise"];

for (let i = 11; i <= 105; i++) {
  const cat = CATEGORIES[(i - 1) % CATEGORIES.length];
  AGENTS.push({
    id: i,
    name: `Agent ${i.toString().padStart(3, '0')}`,
    category: cat,
    description: `Enterprise-grade ${cat} agent with governed execution and audit trail.`,
    rating: parseFloat((4.5 + Math.random() * 0.5).toFixed(1)),
    deployments: Math.floor(Math.random() * 3000) + 100,
    compliance: ["SOC2"],
    icon: "🤖",
    price: PRICES[i % PRICES.length],
    status: "active",
    tags: [cat.split(" ")[0], "Enterprise", "Governed"]
  });
}

module.exports = { AGENTS };
