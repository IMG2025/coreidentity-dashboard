export const API_URL = 'https://api.coreidentity.coreholdingcorp.com/api';

const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    credentials: 'include', // This is the magic CORS fix
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    if (response.status === 401) {
      // Optional: Redirect to login if token is dead
      // window.location.href = '/login';
    }
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
};

export default apiFetch;
