// CoreIdentity Live API Service
// Single source of truth for all authenticated API calls

const API_URL   = 'https://api.coreidentity.coreholdingcorp.com';
const TOKEN_KEY = 'ci_token'; // Must match AuthContext

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(API_URL + path, { ...options, headers });

  if (res.status === 401) {
    // Token expired — clear storage and reload to login
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('ci_user');
    window.location.reload();
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Request failed: ' + res.status);
  }

  return res.json();
}

export const api = {

  // ── Auth ─────────────────────────────────────────────────────────────
  async getProfile() {
    return request('/api/auth/profile');
  },

  // ── Agents ───────────────────────────────────────────────────────────
  async getAgents(category, search) {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);
    const qs = params.toString();
    return request('/api/agents' + (qs ? '?' + qs : ''));
  },

  async getAgent(id) {
    return request('/api/agents/' + id);
  },

  async deployAgent(id) {
    return request('/api/agents/' + id + '/deploy', { method: 'POST' });
  },

  async executeAgent(id) {
    return request('/api/agents/' + id + '/execute', { method: 'POST' });
  },

  async updateAgentStatus(id, status) {
    return request('/api/agents/' + id + '/status', {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  // ── SmartNation ──────────────────────────────────────────────────────
  async getSmartNationSummary() {
    return request('/api/smartnation/summary');
  },

  async getSmartNationAgents(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request('/api/smartnation/agents' + (qs ? '?' + qs : ''));
  },

  // ── Sentinel ─────────────────────────────────────────────────────────
  async getSentinelStatus() {
    return request('/api/sentinel/status');
  },

  async getSentinelPolicies() {
    return request('/api/sentinel/policies');
  },

  async getSentinelApprovals() {
    return request('/api/sentinel/approvals');
  },

  async getSentinelKillSwitches() {
    return request('/api/sentinel/kill-switches');
  },

  async getSentinelSecurityEvents() {
    return request('/api/sentinel/security-events');
  },

  async getSentinelScore() {
    return request('/api/sentinel/score');
  },

  // ── Nexus ────────────────────────────────────────────────────────────
  async getNexusStatus() {
    return request('/api/nexus/status');
  },

  async getNexusWorkflows() {
    return request('/api/nexus/workflows');
  },

  async getNexusExecutions() {
    return request('/api/nexus/executions');
  },

  // ── AGO ──────────────────────────────────────────────────────────────
  async getAGOStatus() {
    return request('/api/ago/status');
  },

  async getAGOExecutions() {
    return request('/api/ago/executions');
  },

  async dispatchAGO(type, payload) {
    return request('/api/ago/dispatch', {
      method: 'POST',
      body: JSON.stringify({ type, ...payload })
    });
  },

  // ── Analytics ────────────────────────────────────────────────────────
  async getAnalytics() {
    return request('/api/analytics');
  },

  async getDashboardMetrics() {
    return request('/api/dashboard/metrics');
  },

  // ── CHC / Founder Dashboard ──────────────────────────────────────────
  async getFounderDashboard() {
    return request('/api/chc/founder-dashboard');
  },

  async getCHCMetrics() {
    return request('/api/chc/metrics');
  },

  // ── CIAG ─────────────────────────────────────────────────────────────
  async getCIAGPipeline() {
    return request('/api/ciag/pipeline');
  },

  async getCIAGIntakeStatus() {
    return request('/api/ciag/intake/status');
  },

  // ── Deployments ──────────────────────────────────────────────────────
  async getDeployments() {
    return request('/api/deployments');
  },

  async getDeployment(id) {
    return request('/api/deployments/' + id);
  },
};

export default api;
