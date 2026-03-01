const express = require('express');
const router  = express.Router();
const https   = require('https');

const MCP_URL = process.env.MCP_SERVER_URL || 'https://mcp.coreidentity.coreholdingcorp.com';
const MCP_KEY = process.env.MCP_API_KEY    || '';

// GET /api/mcp/config — returns MCP connection details to authenticated users
// API key is gated behind JWT auth — never exposed in frontend bundle
router.get('/config', (_req, res) => {
  const url = process.env.MCP_SERVER_URL || 'https://chc-mcp-server-lvuq2yqbma-ue.a.run.app';
  const key = process.env.MCP_API_KEY    || '';
  if (!key) return res.status(503).json({ error: 'MCP not configured' });
  return res.json({ url, key });
});


// POST /api/mcp/query
// Proxies MCP tool calls server-side — API key never exposed to browser
router.post('/query', async (req, res) => {
  const { method = 'tools/list', params = {} } = req.body || {};

  try {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    });

    const response = await fetch(MCP_URL + '/mcp', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'application/json, text/event-stream',
        'x-api-key':     MCP_KEY
      },
      body: payload
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    return res.json(data.result || {});
  } catch (err) {
    return res.status(502).json({ error: 'MCP server unreachable: ' + err.message });
  }
});

// GET /api/mcp/tools — returns tool list for UI rendering
router.get('/tools', async (_req, res) => {
  try {
    const response = await fetch(MCP_URL + '/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json, text/event-stream',
        'x-api-key':    MCP_KEY
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    });
    const data = await response.json();
    return res.json({ tools: data?.result?.tools || [] });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

module.exports = router;
