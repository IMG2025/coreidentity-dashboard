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
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  
// ── Sentinel OS API methods ────────────────────────────────────────────────
async getSentinelStatus() {
  return request('/api/sentinel/status').then(r => r.data);
},

async getSecurityEvents(limit) {
  return request('/api/sentinel/security-events?limit=' + (limit || 50)).then(r => r.data);
},

async getKillSwitches() {
  return request('/api/sentinel/kill-switches').then(r => r.data);
},

async activateKillSwitch(agentId, reason) {
  return request('/api/sentinel/kill-switches', {
    method: 'POST',
    body: JSON.stringify({ agentId, reason })
  }).then(r => r.data);
},

async deactivateKillSwitch(agentId) {
  return request('/api/sentinel/kill-switches/' + agentId, {
    method: 'DELETE'
  }).then(r => r.data);
},

async getApprovals(status) {
  const qs = status ? '?status=' + status : '';
  return request('/api/sentinel/approvals' + qs).then(r => r.data);
},

async submitApproval(agentId, taskType, justification) {
  return request('/api/sentinel/approvals', {
    method: 'POST',
    body: JSON.stringify({ agentId, taskType, justification })
  }).then(r => r.data);
},

async approveRequest(approvalId) {
  return request('/api/sentinel/approvals/' + approvalId + '/approve', {
    method: 'PUT'
  }).then(r => r.data);
},

async getRiskTiers() {
  return request('/api/sentinel/risk-tiers').then(r => r.data);
},

async deployAgent(agentId) {
  return request('/api/deployed', {
    method: 'POST',
    body: JSON.stringify({ agentId })
  }).then(r => r.data);
},

};


  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // Token expired — force logout
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('ci_user');
    window.location.reload();
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // ── Sentinel OS ─────────────────────────────────────────────────────  de
  // ── Agents ────────────────────────────────────────────────────────────
  async getAgents(category = 'all', search = '') {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (search) params.set('search', search);
    const query = params.toString() ? `?${params}` : '';
    const res = await request(`/api/agents${query}`);
    return res.data || [];
  },

  async getAgent(id) {
    const res = await request(`/api/agents/${id}`);
    return res.data;
  },

  // ── Deployments ───────────────────────────────────────────────────────
  async deployAgent(agentId) {
    const res = await request('/api/deployed', {
      method: 'POST',
      body: JSON.stringify({ agentId })
    });
    return res.data;
  },

  async getDeployedAgents() {
    const res = await request('/api/deployed');
    return res.data || [];
  },

  async stopAgent(deploymentId) {
    const res = await request(`/api/deployed/${deploymentId}/stop`, {
      method: 'POST'
    });
    return res.data;
  },

  // ── Workflows ─────────────────────────────────────────────────────────
  async getWorkflows() {
    const res = await request('/api/workflows');
    return res.data || [];
  },

  async createWorkflow(data) {
    const res = await request('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  // ── Governance ────────────────────────────────────────────────────────
  async getGovernance() {
    const res = await request('/api/governance');
    return res.data || {};
  },

  // ── Auth ──────────────────────────────────────────────────────────────
  async login(email, password) {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    return res.data;
  },

  async register(data) {
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async getMe() {
    const res = await request('/api/auth/me');
    return res.data;
  },

  // ── Admin: User management ────────────────────────────────────────────
  async getUsers() {
    const res = await request('/api/admin/users');
    return res.data || [];
  },

  async updateUserRole(userId, role) {
    const res = await request(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
    return res.data;
  },

  async createCustomer(data) {
    // ADMIN only — creates a CUSTOMER account
    const res = await request('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ ...data, role: 'CUSTOMER' })
    });
    return res.data;
  }
};

console.log('✅ CoreIdentity Live API Service loaded');

// ── Agent execution — wired to AGO engine ────────────────────────────────
api.executeAgent = async function(agentId, taskType = 'ANALYZE', inputs = {}) {
  const res = await request(`/api/execute/${agentId}/execute`, {
    method: 'POST',
    body: JSON.stringify({ taskType, inputs })
  });
  return res.data;
};
