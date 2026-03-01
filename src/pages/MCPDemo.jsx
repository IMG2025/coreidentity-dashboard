import React, { useState, useEffect } from 'react';
import { Cpu, Zap, CheckCircle, AlertCircle, Loader, ChevronRight } from 'lucide-react';
import { useMCP } from '../hooks/useMCP';

const PRESET_QUERIES = [
  { label: 'Governance posture',  tool: 'agents_summary', args: {},                              description: 'Overall posture across all 108 agents' },
  { label: 'TIER_1 agents',       tool: 'agents_list',    args: { risk_tier: 'TIER_1', limit: 5 }, description: 'Highest risk agents requiring closest oversight' },
  { label: 'Scores below 70',     tool: 'agents_list',    args: { max_score: 70, limit: 5 },     description: 'Agents requiring governance remediation' },
  { label: 'Active compliance',   tool: 'agents_list',    args: { category: 'Compliance', status: 'active' }, description: 'Live compliance agents in production' },
  { label: 'Suspended agents',    tool: 'agents_list',    args: { status: 'suspended', limit: 10 }, description: 'Agents suspended by governance controls' },
  { label: 'Available tools',     tool: null,             args: {},                              description: 'All MCP tools exposed by this platform', isList: true },
];

export default function MCPDemo() {
  const { ready, error: mcpError, call, listTools } = useMCP();
  const [tools,   setTools]   = useState([]);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [active,  setActive]  = useState(null);

  useEffect(() => {
    if (!ready) return;
    listTools()
      .then(d => setTools(d?.tools || []))
      .catch(() => {});
  }, [ready, listTools]);

  async function runQuery(q) {
    setActive(q.label); setLoading(true); setError(null); setResult(null);
    try {
      const data = q.isList
        ? await listTools()
        : await call(q.tool, q.args);
      setResult(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-20">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${ready ? 'bg-purple-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-xs text-purple-400 font-mono uppercase tracking-widest">
            {ready ? 'Live — MCP Connected' : 'Connecting to MCP...'}
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-1">CoreIdentity is AI-Native</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Query your live governance registry directly via Model Context Protocol.
          First governance platform natively queryable by AI.
        </p>
      </div>

      {mcpError && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
          MCP connection error: {mcpError}
        </div>
      )}

      {tools.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {tools.map(t => (
            <span key={t.name} className="px-2 py-1 bg-purple-900/40 border border-purple-700/50 rounded text-purple-300 text-xs font-mono">
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-mono">Preset Queries</p>
        <div className="grid grid-cols-1 gap-2">
          {PRESET_QUERIES.map(q => (
            <button key={q.label} onClick={() => runQuery(q)}
              disabled={loading || !ready}
              className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all
                ${active === q.label
                  ? 'bg-purple-900/40 border-purple-500 text-white'
                  : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-purple-700 hover:bg-gray-800'
                } disabled:opacity-50`}>
              <div>
                <div className="text-sm font-medium">{q.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{q.description}</div>
              </div>
              <ChevronRight size={16} className="text-gray-600 shrink-0 ml-2" />
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-8">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-950">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-purple-400" />
            <span className="text-xs font-mono text-gray-400">chc-mcp-server · Cloud Run · us-east1</span>
          </div>
          {result && <CheckCircle size={14} className="text-green-400" />}
        </div>
        <div className="p-4 min-h-24">
          {loading && (
            <div className="flex items-center gap-3 text-blue-400">
              <Loader className="animate-spin" size={18} />
              <span className="text-sm font-mono">Querying live governance registry...</span>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 text-red-400">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span className="text-sm font-mono">{error}</span>
            </div>
          )}
          {!loading && !error && !result && (
            <p className="text-gray-600 text-sm font-mono">Select a query to call the live agent registry.</p>
          )}
          {result && (
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </div>

      <div className="bg-gray-900 border border-purple-900/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-purple-400" />
          <span className="text-sm font-semibold text-purple-300">Connect Claude Desktop</span>
        </div>
        <pre className="bg-gray-950 rounded p-3 text-xs text-green-400 font-mono overflow-auto whitespace-pre">{`{
  "mcpServers": {
    "coreidentity": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-http"],
      "env": {
        "MCP_SERVER_URL": "https://chc-mcp-server-lvuq2yqbma-ue.a.run.app",
        "MCP_API_KEY": "<your-api-key>"
      }
    }
  }
}`}</pre>
      </div>
    </div>
  );
}
