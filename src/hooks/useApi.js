import { useCallback } from 'react';

// TODO: migrate to api.coreidentitygroup.com after DNS cutover
// DNS cutover complete — api.coreidentitygroup.com live with TLS
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.coreidentitygroup.com';

export function useApi() {
  const call = useCallback(async (path, method = 'GET', body = null) => {
    const token = localStorage.getItem('ci_token');
    const opts = {
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(`${API_BASE}${path}`, opts);
      return await res.json();
    } catch (e) {
      return { error: e.message };
    }
  }, []);
  return { call };
}
