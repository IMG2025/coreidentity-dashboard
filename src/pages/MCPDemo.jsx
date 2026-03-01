import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Send, ChevronRight, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'https://api.coreidentity.coreholdingcorp.com';

const PRESET_QUERIES = [
  { label: 'Governance posture',   method: 'tools/call', tool: 'agents_summary',      params: {},                                     description: 'Overall governance posture across all 108 agents' },
  { label: 'TIER_1 agents',        method: 'tools/call', tool: 'agents_list',          params: { risk_tier: 'TIER_1', limit: 5 },      description: 'Highest risk agents requiring closest oversight' },
  { label: 'Scores below 70',      method: 'tools/call', tool: 'agents_list',          params: { max_score: 70, limit: 5 },            description: 'Agents with governance scores requiring remediation' },
  { label: 'Active compliance',    method: 'tools/call', tool: 'agents_list',          params: { category: 'Compliance', status: 'active' }, description: 'Live compliance agents in production' },
  { label: 'Suspended agents',     method: 'tools/call', tool: 'agents_list',          params: { status: 'suspended', limit: 10 },     description: 'Agents currently suspended by governance controls' },
  { label: 'Available tools',      method: 'tools/list', tool: null,                   params: {},                                     description: 'All MCP tools exposed by this platform' },
];

function ResultPanel({ result, loading, error }) {
  if (loading) return (
    <div className="flex items-center gap-3 text-blue-400 p-6">
      <Loader className="animate-spin" size={20} />
      <span className="text-sm font-mono">Querying live governance registry...</span>
    </div>
  );
  if (error) return (
    <div className="flex items-start gap-3 text-red-400 p-6">
      <AlertCircle size={20} className="mt-0.5 shrink-0" />
      <span className="text-sm font-mono whitespace-pre-wrap">{error}</span>
    </div>
  );
  if (!result) return (
    <div className="p-6 text-gray-500 text-sm font-mono">
      Select a query above or type a custom request to query the live agent registry.
    </div>
  );
  return (
    <div className="p-4 overflow-auto max-h-96">
      <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

export default function MCPDemo() {
  const { token } = useAuth();
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [active,  setActive]  = useState(null);
  const [tools,   setTools]   = useState([]);

  // Load tool list on mount
  useEffect(() => {
    fetch(`${API}/api/mcp/tools`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setTools(d.tools || []))
      .catch(() => {});
  }, [token]);

  async function runQuery(preset) {
    setActive(preset.label);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body = preset.method === 'tools/list'
        ? { method: 'tools/list', params: {} }
        : { method: 'tools/call', params: { name: preset.tool, arguments: preset.params } };

      const res = await fetch(`${API}/api/mcp/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Query failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-20">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-xs text-purple-400 font-mono uppercase tracking-widest">Live — MCP Integration</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">CoreIdentity is AI-Native</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Query your live governance registry in plain English. This platform is the first AI governance
          infrastructure directly queryable by AI clients via Model Context Protocol.
        </p>
      </div>

      {/* Tool count badge */}
      {tools.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {tools.map(t => (
            <span key={t.name} className="px-2 py-1 bg-purple-900/40 border border-purple-700/50 rounded text-purple-300 text-xs font-mono">
              {t.name}
            </span>
          ))}
        </div>
      )}

      {/* Preset queries */}
      <div className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-mono">Preset Queries</p>
        <div className="grid grid-cols-1 gap-2">
          {PRESET_QUERIES.map(q => (
            <button
              key={q.label}
              onClick={() => runQuery(q)}
              disabled={loading}
              className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all
                ${active === q.label
                  ? 'bg-purple-900/40 border-purple-500 text-white'
                  : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-purple-700 hover:bg-gray-800'
                } disabled:opacity-50`}
            >
              <div>
                <div className="text-sm font-medium">{q.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{q.description}</div>
              </div>
              <ChevronRight size={16} className="text-gray-600 shrink-0 ml-2" />
            </button>
          ))}
        </div>
      </div>

      {/* Result panel */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-8">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-950">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-purple-400" />
            <span className="text-xs font-mono text-gray-400">mcp.coreidentity.coreholdingcorp.com</span>
          </div>
          {result && <CheckCircle size={14} className="text-green-400" />}
        </div>
        <ResultPanel result={result} loading={loading} error={error} />
      </div>

      {/* Claude Desktop integration callout */}
      <div className="bg-gray-900 border border-purple-900/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-purple-400" />
          <span className="text-sm font-semibold text-purple-300">Connect Claude Desktop</span>
        </div>
        <p className="text-xs text-gray-400 mb-3 leading-relaxed">
          Add this to your <span className="font-mono text-gray-300">claude_desktop_config.json</span> to
          query CoreIdentity governance directly from Claude.
        </p>
        <pre className="bg-gray-950 rounded p-3 text-xs text-green-400 font-mono overflow-auto whitespace-pre">{`{
  "mcpServers": {
    "coreidentity": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-http"],
      "env": {
        "MCP_SERVER_URL": "https://mcp.coreidentity.coreholdingcorp.com",
        "MCP_API_KEY": "<your-api-key>"
      }
    }
  }
}`}</pre>
      </div>
    </div>
  );
}
