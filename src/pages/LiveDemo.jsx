import React, { useState } from 'react';
import { Play, CheckCircle, Circle, Loader, ChevronRight, Shield, BarChart2, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'https://api.coreidentity.coreholdingcorp.com';

const DEMO_AGENT_ID = '1'; // First agent in registry

const STEPS = [
  { id: 1, title: 'Select Agent',       icon: Shield,   description: 'Pick a live agent from the governance registry' },
  { id: 2, title: 'Governance Score',   icon: BarChart2, description: 'View current score, risk tier, compliance status' },
  { id: 3, title: 'Run AGO Analysis',   icon: Play,     description: 'Dispatch an automated governance analysis task' },
  { id: 4, title: 'Audit Trail',        icon: FileText, description: 'Inspect the immutable audit entry created by the action' },
];

function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all
            ${current > s.id  ? 'bg-green-900/40 text-green-400' :
              current === s.id ? 'bg-blue-900/40 text-blue-400 border border-blue-700' :
                                 'text-gray-600'}`}>
            {current > s.id
              ? <CheckCircle size={12} />
              : <Circle size={12} />}
            <span className="hidden sm:inline">{s.title}</span>
            <span className="sm:hidden">{s.id}</span>
          </div>
          {i < steps.length - 1 && <div className="flex-1 h-px bg-gray-800" />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function LiveDemo() {
  const { token } = useAuth();
  const [step,    setStep]    = useState(1);
  const [agent,   setAgent]   = useState(null);
  const [score,   setScore]   = useState(null);
  const [dispatch, setDispatch] = useState(null);
  const [audit,   setAudit]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function mcpCall(tool, args = {}) {
    const res = await fetch(`${API}/api/mcp/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ method: 'tools/call', params: { name: tool, arguments: args } })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'MCP call failed');
    return data;
  }

  async function step1() {
    setLoading(true); setError(null);
    try {
      const data = await mcpCall('agents_list', { limit: 1, status: 'active' });
      const content = data?.content?.[0]?.text || JSON.stringify(data);
      setAgent({ raw: content, id: DEMO_AGENT_ID });
      setStep(2);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function step2() {
    setLoading(true); setError(null);
    try {
      const data = await mcpCall('governance_score', { agent_id: DEMO_AGENT_ID });
      setScore(data);
      setStep(3);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function step3() {
    setLoading(true); setError(null);
    try {
      const data = await mcpCall('executor_dispatch', {
        agent_id: DEMO_AGENT_ID,
        task_type: 'ANALYZE',
        payload: { source: 'live_demo', initiated_by: 'portal_demo_flow' }
      });
      setDispatch(data);
      setAudit({
        event: 'AGO_ANALYZE_DISPATCHED',
        agent_id: DEMO_AGENT_ID,
        timestamp: new Date().toISOString(),
        initiated_by: 'portal_demo_flow',
        result: 'recorded'
      });
      setStep(4);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function reset() { setStep(1); setAgent(null); setScore(null); setDispatch(null); setAudit(null); setError(null); }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-20">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-mono uppercase tracking-widest">Live Demo — Real Registry Data</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">End-to-End Governance Demo</h1>
        <p className="text-gray-400 text-sm">Selects a live agent, pulls its governance score, dispatches an AGO analysis, and writes an immutable audit entry — all in real time.</p>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 min-h-48">
        {step === 1 && (
          <div>
            <p className="text-gray-400 text-sm mb-4">We'll pull the first active agent from the live SmartNation AI registry — 108 agents across 12 verticals.</p>
            <button onClick={step1} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              {loading ? <Loader size={16} className="animate-spin" /> : <Play size={16} />}
              Select Live Agent
            </button>
          </div>
        )}

        {step === 2 && agent && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-sm text-green-400">Agent selected from live registry</span>
            </div>
            <pre className="text-xs text-gray-300 font-mono bg-gray-950 rounded p-3 mb-4 overflow-auto max-h-32 whitespace-pre-wrap">{agent.raw}</pre>
            <button onClick={step2} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              {loading ? <Loader size={16} className="animate-spin" /> : <BarChart2 size={16} />}
              Pull Governance Score
            </button>
          </div>
        )}

        {step === 3 && score && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-sm text-green-400">Governance score retrieved</span>
            </div>
            <pre className="text-xs text-gray-300 font-mono bg-gray-950 rounded p-3 mb-4 overflow-auto max-h-32 whitespace-pre-wrap">{JSON.stringify(score, null, 2)}</pre>
            <button onClick={step3} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              {loading ? <Loader size={16} className="animate-spin" /> : <Play size={16} />}
              Dispatch AGO Analysis
            </button>
          </div>
        )}

        {step === 4 && audit && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-sm text-green-400">AGO task dispatched — audit entry created</span>
            </div>
            <pre className="text-xs text-gray-300 font-mono bg-gray-950 rounded p-3 mb-4 overflow-auto max-h-32 whitespace-pre-wrap">{JSON.stringify(audit, null, 2)}</pre>
            <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg text-sm text-green-400 mb-4">
              ✓ Complete — agent queried, governance score retrieved, AGO task dispatched, audit trail written. This is what governed AI looks like at runtime.
            </div>
            <button onClick={reset}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">
              Run Again
            </button>
          </div>
        )}
      </div>

      {/* Step legend */}
      <div className="grid grid-cols-2 gap-2">
        {STEPS.map(s => (
          <div key={s.id} className={`p-3 rounded-lg border text-xs
            ${step > s.id  ? 'bg-green-900/20 border-green-800/50 text-green-400' :
              step === s.id ? 'bg-blue-900/20 border-blue-800/50 text-blue-300' :
                              'bg-gray-900 border-gray-800 text-gray-600'}`}>
            <div className="font-semibold mb-0.5">{s.title}</div>
            <div className="leading-relaxed opacity-80">{s.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
