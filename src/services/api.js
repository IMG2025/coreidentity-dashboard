export const API_URL = 'https://api.coreidentity.coreholdingcorp.com/api';

export const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const config = {
    ...options,
    mode: 'cors',
    credentials: 'include', // Required because the server is not "same-origin"
    headers: {
      'Content-Type': 'application/json', 'x-api-key': 'chc-corp-dev-key-2026',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  const url = endpoint.startsWith('/') ? `${API_URL}${endpoint}` : `${API_URL}/${endpoint}`;
  
  try {
    const response = await fetch(url, config);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    // This will help us see if it's a network error or a blocked error
    console.error('API Fetch Error:', error);
    throw error;
  }
};

// Restore all methods
api.getNexusStatus = () => api('/nexus/status');
api.getNexusExecutions = (limit = 20) => api(`/nexus/executions?limit=${limit}`);
api.getAgents = () => api('/agents');
api.getAgentMetrics = () => api('/agents/metrics');
api.getMarketplaceAgents = () => api('/marketplace/agents');
api.getGovernanceStats = () => api('/governance/stats');
api.getSentinelLogs = () => api('/sentinel/logs');
api.getComplianceStatus = () => api('/compliance/status');
api.getIdentityProfiles = () => api('/identity/profiles');
api.getSystemHealth = () => api('/health');

export default api;
