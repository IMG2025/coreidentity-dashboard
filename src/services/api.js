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

// Add the missing functions that NexusOS.jsx is looking for
api.getNexusStatus = () => api('/nexus/status');
api.getNexusExecutions = (limit = 20) => api(`/nexus/executions?limit=${limit}`);

export default api;
