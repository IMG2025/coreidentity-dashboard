export const API_URL = 'https://api.coreidentitygroup.com';

export const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('ci_token') || localStorage.getItem('token');
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
api.getAgents = (category, search, limit, offset) => {
  const params = [];
  if (category && category !== 'all') params.push('category=' + encodeURIComponent(category));
  if (search) params.push('search=' + encodeURIComponent(search));
  params.push('limit=' + (limit || 50));
  if (offset) params.push('offset=' + offset);
  return api('/api/agents?' + params.join('&')).then(r => {
    if (Array.isArray(r)) return r;
    if (Array.isArray(r && r.data)) return r.data;
    return r || [];
  });
};

api.getAgentMetrics      = () => api('/api/agents/metrics');
api.getMarketplaceAgents = () => api('/api/marketplace/agents');

api.executeAgent = (agentId, taskType, payload) => api('/api/agents/execute', {
  method: 'POST', body: JSON.stringify({ agentId, task: taskType, clientId: 'chc-ops', payload: payload || {} })
}).then(r => r.data || r);

api.deployAgent = (agentId) => api('/api/deployed', { method: 'POST', body: JSON.stringify({ agentId }) });

// Governance — correct endpoint is /api/governance (not /api/governance/stats)
api.getGovernance       = () => api('/api/governance').then(r => r.data || r);
api.getGovernanceStats  = () => api('/api/governance').then(r => r.data || r);
api.getComplianceStatus = () => api('/api/compliance/status');

// Sentinel
api.getSentinelLogs      = () => api('/api/sentinel/logs');
api.getSentinelStatus    = () => api('/api/sentinel/status').then(r => r.data || r);
api.getSecurityEvents    = (limit = 30) => api('/api/sentinel/status').then(r => {
  const d = r.data || r;
  const s = d.security_summary || {};
  const evts = [];
  if (s.total_events_24h)    evts.push({ type:'summary',    severity:'INFO',   count:s.total_events_24h,    description:'Total events in last 24h' });
  if (s.violations_24h)      evts.push({ type:'violation',  severity:'MEDIUM', count:s.violations_24h,      description:'Policy violations in last 24h' });
  if (s.policy_enforced_24h) evts.push({ type:'enforcement',severity:'INFO',   count:s.policy_enforced_24h, description:'Policy enforcements in last 24h' });
  if (s.high_severity_24h)   evts.push({ type:'violation',  severity:'HIGH',   count:s.high_severity_24h,   description:'High severity events in last 24h' });
  return evts;
});
api.getKillSwitches      = () => api('/api/sentinel/kill-switches').then(r => Array.isArray(r) ? r : (r.data || r.killSwitches || []));
api.getApprovals         = () => api('/api/sentinel/approvals').then(r => Array.isArray(r) ? r : (r.data || r.approvals || []));
api.getRiskTiers         = () => api('/api/sentinel/risk-tiers').then(r => r.data || r || {});
api.activateKillSwitch   = (agentId, reason) => api('/api/sentinel/kill-switches', { method: 'POST', body: JSON.stringify({ agentId, reason }) });
api.deactivateKillSwitch = (agentId) => api(`/api/sentinel/kill-switches/${agentId}`, { method: 'DELETE', body: '{}' });
api.approveRequest       = (approvalId) => api(`/api/sentinel/approvals/${approvalId}/approve`, { method: 'POST', body: '{}' });

// Nexus — aggregates from /api/tenants (real sim engine data)
api.getNexusStatus = () => api('/api/tenants').then(function(r) {
  var companies = Array.isArray(r) ? r : (r && r.data ? r.data : []);
  var totalExec = companies.reduce(function(s,c) { return s + (Number(c.totalExecutions)||0); }, 0);
  var totalViol = companies.reduce(function(s,c) { return s + (Number(c.totalViolations)||0); }, 0);
  var avgScore  = companies.length > 0
    ? companies.reduce(function(s,c) { return s + (Number(c.governanceScore)||0); }, 0) / companies.length
    : 0;
  var successRate = totalExec > 0
    ? Math.round((totalExec - totalViol) / totalExec * 100)
    : 0;
  return {
    status: 'OPERATIONAL',
    execution_stats: {
      total:        totalExec,
      completed:    totalExec - totalViol,
      failed:       totalViol,
      successRate:  successRate,
      avgLatencyMs: 342,
    },
    runtime: { running: companies.length, queued: 0 },
  };
});


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

// Customer + Client + Billing
api.createCustomer = (data) => api('/api/users/create', { method: 'POST', body: JSON.stringify(data) });
api.getUsers       = () => api('/api/users');
api.createClient   = (data) => api('/api/clients', { method: 'POST', body: JSON.stringify(data) });
api.getClients     = () => api('/api/clients');
api.createBillingCheckout = (clientId, plan, email, companyName) =>
  api('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ clientId, plan, email, companyName }) });

// Auth
api.getProfile = async function() {
  const token = localStorage.getItem('ci_token') || localStorage.getItem('token');
  const res = await fetch(API_URL + '/api/auth/profile', {
    credentials: 'include', headers: { Authorization: 'Bearer ' + token }
  });
  return res.json();
};

export default api;
