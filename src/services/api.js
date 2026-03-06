export const API_URL = 'https://api.coreidentity.coreholdingcorp.com/api';

export const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const config = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  };
  const url = endpoint.startsWith('/') ? `${API_URL}${endpoint}` : `${API_URL}/${endpoint}`;
  const response = await fetch(url, config);
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
};

// --- RESTORED METHODS FOR ALL PAGES ---

// Nexus & Ops
api.getNexusStatus = () => api('/nexus/status');
api.getNexusExecutions = (limit = 20) => api(`/nexus/executions?limit=${limit}`);

// SmartNation & Agents
api.getAgents = () => api('/agents');
api.getAgentMetrics = () => api('/agents/metrics');
api.getMarketplaceAgents = () => api('/marketplace/agents');

// Governance & Sentinel
api.getGovernanceStats = () => api('/governance/stats');
api.getSentinelLogs = () => api('/sentinel/logs');
api.getComplianceStatus = () => api('/compliance/status');

// Identity & General
api.getIdentityProfiles = () => api('/identity/profiles');
api.getSystemHealth = () => api('/health');

export default api;
