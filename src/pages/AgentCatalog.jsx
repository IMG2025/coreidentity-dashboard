import React, { useState, useEffect } from 'react';
import { Search, Play, BarChart2, AlertTriangle, Star, Loader } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../App';

const CATEGORIES = ['all','Data Analysis','Document Processing','Communication','Research','Compliance','Integration','Marketing','Customer Service'];

const TASK_BUTTONS = {
  ADMIN:    [
    { type: 'EXECUTE',  label: 'Execute',  Icon: Play,          cls: 'bg-blue-600 hover:bg-blue-700 text-white' },
    { type: 'ANALYZE',  label: 'Analyze',  Icon: BarChart2,     cls: 'bg-green-600 hover:bg-green-700 text-white' },
    { type: 'ESCALATE', label: 'Escalate', Icon: AlertTriangle, cls: 'bg-orange-500 hover:bg-orange-600 text-white' }
  ],
  CUSTOMER: [
    { type: 'ANALYZE', label: 'Analyze', Icon: BarChart2, cls: 'bg-green-600 hover:bg-green-700 text-white' }
  ]
};

function ResultModal({ result, onClose }) {
  if (!result) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{result.agent_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${result.status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {result.status}
                </span>
                <span className="text-xs text-gray-500">{result.task_type} · {result.domain_id}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            {Object.entries(result.output || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between items-start gap-4 text-sm">
                <span className="text-gray-500 font-medium capitalize shrink-0">{key.replace(/_/g,' ')}</span>
                <span className="text-gray-900 text-right text-xs font-mono">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Task: {result.task_id}</p>
        </div>
      </div>
    </div>
  );
}

export default function AgentCatalog() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [agents, setAgents]       = useState([]);
  const [category, setCategory]   = useState('all');
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [executing, setExecuting] = useState({});
  const [result, setResult]       = useState(null);

  useEffect(() => { loadAgents(); }, [category, search]);

  async function loadAgents() {
    setLoading(true);
    try { setAgents(await api.getAgents(category, search)); }
    catch { addNotification('Failed to load agents', 'error'); }
    finally { setLoading(false); }
  }

  async function handleExecute(agent, taskType) {
    const key = `${agent.id}-${taskType}`;
    setExecuting(p => ({ ...p, [key]: true }));
    try {
      const res = await api.executeAgent(agent.id, taskType);
      setResult(res);
      addNotification(`✅ ${agent.name} — ${taskType} complete`, 'success');
    } catch (err) {
      addNotification(`❌ ${err.message}`, 'error');
    } finally {
      setExecuting(p => ({ ...p, [key]: false }));
    }
  }

  const buttons = TASK_BUTTONS[user?.role] || TASK_BUTTONS.CUSTOMER;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Agent Catalog</h1>
        <p className="text-gray-600 mt-1">{agents.length} agents available</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{agent.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                    <p className="text-xs text-gray-500">{agent.category}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  agent.price === 'Premium'    ? 'bg-purple-100 text-purple-700' :
                  agent.price === 'Enterprise' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-600'}`}>{agent.price}</span>
              </div>

              <p className="text-sm text-gray-600">{agent.description}</p>

              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-400" />{agent.rating?.toFixed(1)}</span>
                <span>{agent.deployments?.toLocaleString()} deployments</span>
                {(agent.compliance||[]).map(c => (
                  <span key={c} className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{c}</span>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap">
                {buttons.map(({ type, label, Icon, cls }) => {
                  const key = `${agent.id}-${type}`;
                  const busy = executing[key];
                  return (
                    <button key={type} onClick={() => handleExecute(agent, type)} disabled={busy}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${cls} disabled:opacity-50`}>
                      {busy ? <Loader className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
                      {busy ? 'Running...' : label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ResultModal result={result} onClose={() => setResult(null)} />
    </div>
  );
}
