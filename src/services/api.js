// Mock API Service - Working Version
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// In-memory storage
let deployedAgents = [];
let agentIdCounter = 1;

// Generate 105 agents
function generateAgents() {
  const agents = [];
  const categories = {
    'Data Analysis': { icon: '📊', count: 20 },
    'Document Processing': { icon: '📄', count: 20 },
    'Communication': { icon: '📧', count: 15 },
    'Research': { icon: '🔍', count: 10 },
    'Compliance': { icon: '🛡️', count: 10 },
    'Integration': { icon: '🔌', count: 10 },
    'Marketing': { icon: '📣', count: 10 },
    'Customer Service': { icon: '💁', count: 10 }
  };

  const premiumNames = {
    'Data Analysis': ['Data Insights AI', 'Predictive Analytics', 'Business Intelligence', 'Data Mining Pro'],
    'Document Processing': ['Document Processor', 'Smart OCR', 'PDF Analyzer', 'Doc Automation'],
    'Communication': ['Email Automation', 'Chat Bot Pro', 'Meeting Assistant', 'Notification Hub'],
    'Research': ['Research Assistant', 'Web Crawler', 'Insight Finder', 'Trend Analyzer'],
    'Compliance': ['Compliance Guardian', 'Audit Assistant', 'Risk Monitor', 'Policy Enforcer'],
    'Integration': ['API Connector', 'Data Sync', 'Workflow Bridge', 'System Integrator'],
    'Marketing': ['Campaign Manager', 'SEO Optimizer', 'Content Creator', 'Ad Analyzer'],
    'Customer Service': ['Support Bot', 'Ticket Manager', 'Feedback Analyzer', 'Help Desk AI']
  };

  const compliance = ['SOC2', 'HIPAA', 'GDPR', 'ISO 27001'];
  
  let id = 1;
  for (const [category, config] of Object.entries(categories)) {
    for (let i = 0; i < config.count; i++) {
      const isPremium = i < 4;
      const name = isPremium && premiumNames[category][i] 
        ? premiumNames[category][i]
        : `${category} Agent ${i + 1}`;
      
      agents.push({
        id: id++,
        name,
        category,
        description: `Professional ${category.toLowerCase()} automation`,
        rating: 4.5 + Math.random() * 0.5,
        deployments: Math.floor(Math.random() * 3000) + 500,
        compliance: isPremium ? [compliance[0], compliance[1]] : [compliance[0]],
        icon: config.icon,
        price: isPremium ? 'Premium' : i < 10 ? 'Standard' : 'Basic',
        features: ['Automated processing', 'Real-time updates', '24/7 operation']
      });
    }
  }
  
  return agents;
}

const allAgents = generateAgents();

export const api = {
  async getAgents(category = 'all', search = '') {
    await delay(300);
    
    let filtered = [...allAgents];
    
    if (category && category !== 'all') {
      filtered = filtered.filter(a => 
        a.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(s) ||
        a.description.toLowerCase().includes(s) ||
        a.category.toLowerCase().includes(s)
      );
    }
    
    return filtered;
  },

  async getAgent(id) {
    await delay(200);
    return allAgents.find(a => a.id === parseInt(id));
  },

  async deployAgent(agentId) {
    await delay(1000);
    
    const agent = allAgents.find(a => a.id === parseInt(agentId));
    if (!agent) {
      throw new Error('Agent not found');
    }

    const deployment = {
      id: agentIdCounter++,
      agentId: agent.id,
      agentName: agent.name,
      agentIcon: agent.icon,
      status: 'deploying',
      deployedAt: new Date().toISOString()
    };

    deployedAgents.push(deployment);

    // Simulate deployment process
    setTimeout(() => {
      deployment.status = 'running';
    }, 3000);

    return deployment;
  },

  async getDeployedAgents() {
    await delay(200);
    return [...deployedAgents];
  },

  async stopAgent(deploymentId) {
    await delay(500);
    
    const deployment = deployedAgents.find(d => d.id === parseInt(deploymentId));
    if (deployment) {
      deployment.status = 'stopped';
    }
    
    return deployment;
  }
};

console.log('✅ API Service loaded - Mock mode with 105 agents');
