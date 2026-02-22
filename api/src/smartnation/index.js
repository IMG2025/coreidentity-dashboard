const agentRegistry = require('./agentRegistry');

const SmartNation = {
  version: '1.0.0',
  plane: 'Registry and Intelligence',
  owner: 'CoreIdentity',
  
  async getStatus() {
    const summary = await agentRegistry.getRegistrySummary();
    return {
      system: 'SmartNation AI',
      version: this.version,
      status: 'OPERATIONAL',
      plane: this.plane,
      owner: this.owner,
      timestamp: new Date().toISOString(),
      registry_summary: summary
    };
  },

  registry: agentRegistry
};

module.exports = SmartNation;
