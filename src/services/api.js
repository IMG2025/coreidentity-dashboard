// CoreIdentity Live API Service
// Authenticated client — all requests include JWT token

const API_URL = import.meta.env.VITE_API_URL || 'https://api.coreidentity.coreholdingcorp.com';
const TOKEN_KEY = 'ci_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
    ...options.headers
  };

  const res = await fetch(API_URL + path, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(function() { return {}; });
    throw new Error(err.error || err.message || 'Request failed: ' + res.status);
  }
  return res.json();
}

export const api = {
  async post(url, body) {
    const token = localStorage.getItem('ci_token');
    const API = import.meta.env.VITE_API_URL || 'https://api.coreidentity.coreholdingcorp.com';
    const res = await fetch(API + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify(body)
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw Object.assign(new Error(e.error || 'Request failed'), { response: { data: e } }); }
    return res.json();
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  async login(email, password) {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
  },

  async getProfile() {
    return request('/api/auth/profile');
  },

  // ── Agents ────────────────────────────────────────────────────────────────
  async getAgents(category, search) {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);
    const qs = params.toString();
    const data = await request('/api/agents' + (qs ? '?' + qs : ''));
    return data.data || data;
  },

  async getAgent(id) {
    const data = await request('/api/agents/' + id);
    return data.data || data;
  },

  async deployAgent(agentId) {
    const data = await request('/api/deployed', {
      method: 'POST',
      body: JSON.stringify({ agentId })
    });
    return data.data || data;
  },

  // ── Executions ────────────────────────────────────────────────────────────
  async executeAgent(agentId, taskType, inputs) {
    const data = await request('/api/execute/' + agentId + '/execute', {
      method: 'POST',
      body: JSON.stringify({ taskType: taskType || 'ANALYZE', inputs: inputs || {} })
    });
    return data.data || data;
  },

  // ── Workflows ─────────────────────────────────────────────────────────────
  async getWorkflows() {
    const data = await request('/api/workflows');
    return data.data || data;
  },

  async createWorkflow(workflow) {
    const data = await request('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow)
    });
    return data.data || data;
  },

  // ── Governance ────────────────────────────────────────────────────────────
  async getGovernance() {
    const data = await request('/api/governance');
    return data.data || data;
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  async getAnalytics() {
    const data = await request('/api/analytics');
    return data.data || data;
  },

  // ── Deployed Agents ───────────────────────────────────────────────────────
  async getDeployedAgents() {
    const data = await request('/api/deployed');
    return data.data || data;
  },

  // ── Sentinel OS ───────────────────────────────────────────────────────────
  async getVerticals() {
    const data = await request('/api/verticals');
    return data.data || data;
  },

  async getCISOSummary() {
      const [sentinel, smartnation, events] = await Promise.allSettled([
        request('/api/sentinel/status'),
        request('/api/smartnation/summary'),
        request('/api/sentinel/security-events?limit=10')
      ]);
      return {
        sentinel:    sentinel.status    === 'fulfilled' ? (sentinel.value.data    || sentinel.value)    : null,
        smartnation: smartnation.status === 'fulfilled' ? (smartnation.value.data || smartnation.value) : null,
        events:      events.status      === 'fulfilled' ? (events.value.data      || [])               : []
      };
    },
  
    async getNexusStatus() {
      const data = await request('/api/execute/nexus/status');
      return data.data || data;
    },
  
    async getNexusExecutions(limit) {
      const data = await request('/api/execute/nexus/executions?limit=' + (limit || 20));
      return data.data || data;
    },
  
    async getSmartNationSummary() {
      const data = await request('/api/smartnation/summary');
      return data.data || data;
    },
  
    async getSentinelStatus() {
    const data = await request('/api/sentinel/status');
    return data.data || data;
  },

  async getSecurityEvents(limit) {
    const data = await request('/api/sentinel/security-events?limit=' + (limit || 50));
    return data.data || data;
  },

  async getKillSwitches() {
    const data = await request('/api/sentinel/kill-switches');
    return data.data || data;
  },

  async activateKillSwitch(agentId, reason) {
    const data = await request('/api/sentinel/kill-switches', {
      method: 'POST',
      body: JSON.stringify({ agentId, reason })
    });
    return data.data || data;
  },

  async deactivateKillSwitch(agentId) {
    const data = await request('/api/sentinel/kill-switches/' + agentId, {
      method: 'DELETE'
    });
    return data.data || data;
  },

  async getApprovals(status) {
    const qs = status ? '?status=' + status : '';
    const data = await request('/api/sentinel/approvals' + qs);
    return data.data || data;
  },

  async submitApproval(agentId, taskType, justification) {
    const data = await request('/api/sentinel/approvals', {
      method: 'POST',
      body: JSON.stringify({ agentId, taskType, justification })
    });
    return data.data || data;
  },

  async approveRequest(approvalId) {
    const data = await request('/api/sentinel/approvals/' + approvalId + '/approve', {
      method: 'PUT'
    });
    return data.data || data;
  },

  async getRiskTiers() {
    const data = await request('/api/sentinel/risk-tiers');
    return data.data || data;
  }

};

export default api;
