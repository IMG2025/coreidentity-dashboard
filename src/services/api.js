export const API_URL = 'https://api.coreidentity.coreidentitygroup.com';

export const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token') || localStorage.getItem('ci_token');
  const config = {
    ...options,
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'cache-control': 'no-cache',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  const url = endpoint.startsWith('/') ? `${API_URL}${endpoint}` : `${API_URL}/${endpoint}`;
  try {
    const response = await fetch(url, config);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const parsed = await response.json();
// Emit degradation event for global notification banner
    if (parsed && parsed._meta) {
      window.dispatchEvent(new CustomEvent('chc-data-degraded', {
        detail: { degraded: parsed._meta.degraded || false, message: parsed._meta.message || '' }
      }));
    }
    return parsed.data ?? parsed;
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
  return api(url).then(r => Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []));
};

api.getAgentMetrics      = () => api('/api/agents/metrics');
api.getMarketplaceAgents = () => api('/api/marketplace/agents');

api.executeAgent = (agentId, taskType, payload) => api('/api/agents/execute', {
  method: 'POST', body: JSON.stringify({ agentId, task: taskType, clientId: 'chc-ops', payload: payload || {} })
}).then(r => r.data || r);

api.deployAgent = (agentId) => api('/api/deployed', { method: 'POST', body: JSON.stringify({ agentId }) });

// Governance
api.getGovernance       = () => api('/api/governance/stats').then(r => r.data || r);
api.getGovernanceStats  = () => api('/api/governance/stats');
api.getComplianceStatus = () => api('/api/compliance/status');

// Sentinel
api.getSentinelLogs = () => api('/api/sentinel/logs');
// Sentinel — full method set
api.getSentinelStatus    = () => api('/api/sentinel/status').then(r => r.data || r);
api.getSecurityEvents    = (limit = 30) => api(`/api/sentinel/events?limit=${limit}`).then(r => Array.isArray(r) ? r : (r.data || r.events || []));
api.getKillSwitches      = () => api('/api/sentinel/kill-switches').then(r => Array.isArray(r) ? r : (r.data || r.killSwitches || []));
api.getApprovals         = () => api('/api/sentinel/approvals').then(r => Array.isArray(r) ? r : (r.data || r.approvals || []));
api.getRiskTiers         = () => api('/api/sentinel/risk-tiers').then(r => r.data || r || {});
api.activateKillSwitch   = (agentId, reason) => api('/api/sentinel/kill-switches', { method: 'POST', body: JSON.stringify({ agentId, reason }) });
api.deactivateKillSwitch = (agentId) => api(`/api/sentinel/kill-switches/${agentId}`, { method: 'DELETE', body: '{}' });
api.approveRequest       = (approvalId) => api(`/api/sentinel/approvals/${approvalId}/approve`, { method: 'POST', body: '{}' });


// Nexus
api.getNexusStatus     = () => api('/api/nexus/status').then(r => r.data || r);
api.getNexusExecutions = (limit = 20) => api(`/api/nexus/executions?limit=${limit}`);

// Workflows
api.getWorkflows   = () => api('/api/workflows').then(r => Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : (r?.data || [])));
api.createWorkflow = (data) => api('/api/workflows', { method: 'POST', body: JSON.stringify(data) });

// SmartNation AI
api.getSmartNationSummary = () => api('/api/smartnation/summary').then(r => r.data || r);
api.getSmartNationAgents  = (cat, q) => api.getAgents(cat, q);

// Identity & System
api.getIdentityProfiles = () => api('/api/identity/profiles');
api.getSystemHealth     = () => api('/api/health');


// ── Customer + Client + Billing — attached as api object methods ──────────────
// SettingsPage imports { api } and calls api.createCustomer() — must be on object
api.createCustomer = (data) =>
  api('/api/users/create', { method: 'POST', body: JSON.stringify(data) });

api.getUsers = () =>
  api('/api/users');

api.createClient = (data) =>
  api('/api/clients', { method: 'POST', body: JSON.stringify(data) });

api.getClients = () =>
  api('/api/clients');

api.createBillingCheckout = (clientId, plan, email, companyName) =>
  api('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ clientId, plan, email, companyName })
  });

export default api;

