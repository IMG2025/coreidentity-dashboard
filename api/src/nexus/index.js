const nexusRuntime = require('./nexusRuntime');

const NexusOS = {
  version: '1.0.0',
  plane:   'Execution OS',
  owner:   'CoreIdentity',

  async dispatch(agentId, taskType, inputs, sentinelContext, agoHandler) {
    return nexusRuntime.dispatch(agentId, taskType, inputs, sentinelContext, agoHandler);
  },

  async getStatus() {
    const stats = await nexusRuntime.getExecutionStats();
    return {
      system:   'Nexus OS',
      version:  this.version,
      status:   'OPERATIONAL',
      plane:    this.plane,
      timestamp: new Date().toISOString(),
      execution_stats: stats
    };
  },

  runtime: nexusRuntime
};

module.exports = NexusOS;
