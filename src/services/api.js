export const API_URL = 'https://portal.coreholdingcorp.com';

export const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token') || localStorage.getItem('ci_token');
  const config = {
    ...options,
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'cache-control': 'no-cache',
      'x-api-key': 'chc-corp-dev-key-2026',
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
    console.error('API Fetch Error:', error);
    throw error;
  }
};

// Core HTTP aliases
api.get  = (ep)       => api(ep);
api.post = (ep, data) => api(ep, { method: 'POST', body: JSON.stringify(data) });
api.put  = (ep, data) => api(ep, { method: 'PUT',  body: JSON.stringify(data) });

// Agents
api.getAgents = (category, search) => {
  let url = '/api/agents';
  const params = [];
  if (category && category !== 'all') params.push(`category=${encodeURIComponent(category)}`);
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (params.length) url += '?' + params.join('&');
  return api(url).then(r => Array.isArray(r) ? r : (r.data || r.agents || []));
};

api.getAgentMetrics      = () => api('/api/agents/metrics');
api.getMarketplaceAgents = () => api('/api/marketplace/agents');

api.executeAgent = (agentId, taskType, payload) => api('/api/agents/execute', {
  method: 'POST', body: JSON.stringify({ agentId, taskType, ...payload })
}).then(r => r.data || r);

api.deployAgent = (agentId) => api(`/api/agents/${agentId}/deploy`, {
  method: 'POST', body: '{}'
});

// Governance
api.getGovernance       = () => api('/api/governance/stats').then(r => r.data || r);
api.getGovernanceStats  = () => api('/api/governance/stats');
api.getComplianceStatus = () => api('/api/compliance/status');

// Sentinel
api.getSentinelLogs = () => api('/api/sentinel/logs');

// Nexus
api.getNexusStatus     = () => api('/api/nexus/status').then(r => r.data || r);
api.getNexusExecutions = (limit = 20) => api(`/api/nexus/executions?limit=${limit}`);

// Workflows
api.getWorkflows   = () => api('/api/workflows').then(r => Array.isArray(r) ? r : (r.data || []));
api.createWorkflow = (data) => api('/api/workflows', { method: 'POST', body: JSON.stringify(data) });

// SmartNation AI
api.getSmartNationSummary = () => api('/api/smartnation/summary').then(r => r.data || r);
api.getSmartNationAgents  = (cat, q) => api.getAgents(cat, q);

// Identity & System
api.getIdentityProfiles = () => api('/api/identity/profiles');
api.getSystemHealth     = () => api('/api/health');

export default api;
