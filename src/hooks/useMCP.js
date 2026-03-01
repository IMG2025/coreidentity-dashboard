import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const PORTAL_API = import.meta.env.VITE_API_URL || 'https://api.coreidentity.coreholdingcorp.com';

// useMCP — fetches MCP config from backend, then calls Cloud Run directly
// API key is never in the bundle — always fetched at runtime via JWT-gated endpoint
export function useMCP() {
  const { token } = useAuth();
  const [config,  setConfig]  = useState(null);
  const [ready,   setReady]   = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${PORTAL_API}/api/mcp/config`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setConfig(d);
        setReady(true);
      })
      .catch(e => setError(e.message));
  }, [token]);

  const call = useCallback(async (method, params = {}) => {
    if (!config) throw new Error('MCP not ready');

    const body = method === 'tools/list'
      ? { jsonrpc: '2.0', id: Date.now(), method: 'tools/list', params: {} }
      : { jsonrpc: '2.0', id: Date.now(), method: 'tools/call',
          params: { name: method, arguments: params } };

    const res = await fetch(`${config.url}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json, text/event-stream',
        'x-api-key':    config.key
      },
      body: JSON.stringify(body)
    });

    // MCP may return SSE stream or JSON — handle both
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      const text = await res.text();
      // Parse SSE — find the data line with the result
      const lines = text.split('\n').filter(l => l.startsWith('data:'));
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.slice(5).trim());
          if (parsed.result !== undefined) return parsed.result;
          if (parsed.error)  throw new Error(parsed.error.message);
        } catch (_) {}
      }
      return { raw: text };
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.result ?? data;
  }, [config]);

  const listTools = useCallback(() => call('tools/list'), [call]);

  return { ready, error, call, listTools, config };
}
