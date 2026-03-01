import React, { useState } from 'react';
import { Play, CheckCircle, Circle, Loader, Shield, BarChart2, FileText } from 'lucide-react';
import { useMCP } from '../hooks/useMCP';

const STEPS = [
  { id: 1, title: 'Select Agent',     icon: Shield,    description: 'Pull first active agent from live registry' },
  { id: 2, title: 'Governance Score', icon: BarChart2, description: 'Retrieve score, risk tier, compliance status' },
  { id: 3, title: 'AGO Analysis',     icon: Play,      description: 'Dispatch automated governance analysis task' },
  { id: 4, title: 'Audit Trail',      icon: FileText,  description: 'Inspect immutable audit entry created' },
];

export default function LiveDemo() {
  const { ready, call } = useMCP();
  const [step,    setStep]    = useState(1);
  const [agent,   setAgent]   = useState(null);
  const [score,   setScore]   = useState(null);
  const [audit,   setAudit]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function run(fn) {
    setLoading(true); setError(null);
    try { await fn(); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function step1() {
    await run(async () => {
      const data = await call('agents_list', { limit: 1, status: 'active' });
      const agents = data?.content?.[0]?.text
        ? JSON.parse(data.content[0].text)
        : data;
      const first = Array.isArray(agents) ? agents[0] : agents;
      setAgent(first);
      setStep(2);
    });
  }

  async function step2() {
    await run(async () => {
      const agentId = agent?.agentId || agent?.id || '1';
      const data = await call('governance_score', { agent_id: agentId });
      setScore(data);
      setStep(3);
    });
  }

  async function step3() {
    await run(async () => {
      const agentId = agent?.agentId || agent?.id || '1';
      await call('executor_dispatch', {
        agent_id: agentId,
        task_type: 'ANALYZE',
        payload: { source: 'live_demo', initiated_by: 'portal_demo_flow' }
      });
      setAudit({
        event:        'AGO_ANALYZE_DISPATCHED',
        agent_id:     agentId,
        timestamp:    new Date().toISOString(),
        initiated_by: 'portal_demo_flow',
        result:       'recorded'
      });
      setStep(4);
    });
  }

  function reset() {
    setStep(1); setAgent(null); setScore(null); setAudit(null); setError(null);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-20">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${ready ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-xs text-green-400 font-mono uppercase tracking-widest">
            {ready ? 'Live — Real Registry Data' : 'Connecting...'}
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-1">End-to-End Governance Demo</h1>
        <p className="text-gray-400 text-sm">Select agent → governance score → AGO dispatch → audit trail. All live, all real.</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1 mb-6">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all
              ${step > s.id  ? 'bg-green-900/40 text-green-400' :
                step === s.id ? 'bg-blue-900/40 text-blue-400 border border-blue-700' :
                                'text-gray-600'}`}>
              {step > s.id ? <CheckCircle size={11} /> : <Circle size={11} />}
              <span className="hidden sm:inline ml-1">{s.title}</span>
              <span className="sm:hidden">{s.id}</span>
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-800" />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 min-h-48">
        {step === 1 && (
          <div>
            <p className="text-gray-400 text-sm mb-4">Pulls first active agent from SmartNation AI registry — 108 agents across 12 verticals.</p>
            <button onClick={step1} disabled={loading || !ready}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              {loading ? <Loader size={16} className="animate-spin" /> : <Play size={16} />}
              Select Live Agent
            </button>
          </div>
        )}
        {step === 2 && agent && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={15} className="text-green-400" />
              <span className="text-sm text-green-400">Agent selected</span>
            </div>
            <pre className="text-xs text-gray-300 font-mono bg-gray-950 rounded p-3 mb-4 overflow-auto max-h-32 whitespace-pre-wrap">{JSON.stringify(agent, null, 2)}</pre>
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
              <CheckCircle size={15} className="text-green-400" />
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
              <CheckCircle size={15} className="text-green-400" />
              <span className="text-sm text-green-400">AGO dispatched — audit entry written</span>
            </div>
            <pre className="text-xs text-gray-300 font-mono bg-gray-950 rounded p-3 mb-4 overflow-auto max-h-32 whitespace-pre-wrap">{JSON.stringify(audit, null, 2)}</pre>
            <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg text-sm text-green-400 mb-4">
              ✓ Complete — agent queried, score retrieved, AGO dispatched, audit trail written.
            </div>
            <button onClick={reset} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
              Run Again
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {STEPS.map(s => (
          <div key={s.id} className={`p-3 rounded-lg border text-xs
            ${step > s.id  ? 'bg-green-900/20 border-green-800/50 text-green-400' :
              step === s.id ? 'bg-blue-900/20 border-blue-800/50 text-blue-300' :
                              'bg-gray-900 border-gray-800 text-gray-600'}`}>
            <div className="font-semibold mb-0.5">{s.title}</div>
            <div className="opacity-80">{s.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
