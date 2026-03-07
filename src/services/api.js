export const API_URL = 'https://portal.coreholdingcorp.com';

export const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const config = {
    ...options,
    mode: 'cors',
    credentials: 'include', // Required because the server is not "same-origin"
    headers: {
      'Content-Type': 'application/json', 'cache-control': 'no-cache', 'x-api-key': 'chc-corp-dev-key-2026',
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
api.getAgentMetrics = () => api('/agents/metrics');
api.getMarketplaceAgents = () => api('/marketplace/agents');
api.getGovernanceStats = () => api('/governance/stats');
api.getSentinelLogs = () => api('/sentinel/logs');
api.getComplianceStatus = () => api('/compliance/status');
api.getIdentityProfiles = () => api('/identity/profiles');
api.getSystemHealth = () => api('/health');

export default api;

// Method aliases with correct response unwrapping
api.get = (endpoint) => api(endpoint);
api.post = (endpoint, data) => api(endpoint, { method: 'POST', body: JSON.stringify(data) });
api.put  = (endpoint, data) => api(endpoint, { method: 'PUT',  body: JSON.stringify(data) });

// Agents — unwrap data array
  let url = '/agents';
  const params = [];
  if (category && category !== 'all') params.push(`category=${category}`);
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (params.length) url += '?' + params.join('&');
  return api(url).then(r => Array.isArray(r) ? r : (r.data || r.agents || []));
};

// Governance
api.getGovernance = () => api('/governance/stats').then(r => r.data || r);

// Workflows
api.getWorkflows  = () => api('/workflows').then(r => Array.isArray(r) ? r : (r.data || []));
api.createWorkflow = (data) => api('/workflows', { method: 'POST', body: JSON.stringify(data) });

// Agent actions
api.executeAgent = (agentId, taskType, payload) => api('/agents/execute', {
  method: 'POST', body: JSON.stringify({ agentId, taskType, ...payload })
});
api.deployAgent = (agentId) => api('/agents/' + agentId + '/deploy', { method: 'POST', body: '{}' });

// Method aliases with correct response unwrapping
api.get = (endpoint) => api(endpoint);
api.post = (endpoint, data) => api(endpoint, { method: 'POST', body: JSON.stringify(data) });
api.put  = (endpoint, data) => api(endpoint, { method: 'PUT',  body: JSON.stringify(data) });

// Agents — unwrap data array
api.getAgents = (category, search) => {
  let url = '/agents';
  const params = [];
  if (category && category !== 'all') params.push(`category=${category}`);
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (params.length) url += '?' + params.join('&');
  return api(url).then(r => Array.isArray(r) ? r : (r.data || r.agents || []));
};

// Governance
api.getGovernance = () => api('/governance/stats').then(r => r.data || r);

// Workflows
api.getWorkflows  = () => api('/workflows').then(r => Array.isArray(r) ? r : (r.data || []));
api.createWorkflow = (data) => api('/workflows', { method: 'POST', body: JSON.stringify(data) });

// Agent actions
api.executeAgent = (agentId, taskType, payload) => api('/agents/execute', {
  method: 'POST', body: JSON.stringify({ agentId, taskType, ...payload })
});
api.deployAgent = (agentId) => api('/agents/' + agentId + '/deploy', { method: 'POST', body: '{}' });

