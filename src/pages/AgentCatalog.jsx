import React, { useState, useEffect } from 'react';
import { Search, Play, BarChart2, AlertTriangle, Star,
         Rocket, Database, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../App';
/* patch-32 */
const agentId = (a) => a.agentId || a.id || String(a.agentId || a.id || '');

const CATEGORIES = ['all','Data Analysis','Document Processing','Communication',
  'Research','Compliance','Integration','Marketing','Customer Service'];

const TIER_MAP = {
  'Customer Service': 'TIER_1', 'Research': 'TIER_1',
  'Communication': 'TIER_2',   'Data Analysis': 'TIER_2',
  'Document Processing': 'TIER_2', 'Marketing': 'TIER_2',
  'Integration': 'TIER_3',    'Compliance': 'TIER_3', 'Legal': 'TIER_3'
};

const TIER_COLORS = {
  TIER_1: 'bg-green-100 text-green-700',
  TIER_2: 'bg-blue-100 text-blue-700',
  TIER_3: 'bg-orange-100 text-orange-700',
  TIER_4: 'bg-red-100 text-red-700'
};

function ResultModal({ result, onClose }) {
  if (!result) return null;
  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-96 overflow-y-auto'>
        <div className='p-6'>
          <div className='flex justify-between items-start mb-4'>
            <div>
              <h3 className='text-lg font-bold text-gray-900'>{result.agent_name}</h3>
              <div className='flex items-center gap-2 mt-1'>
                <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (result.status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                  {result.status}
                </span>
                <span className='text-xs text-gray-500'>{result.task_type} · {result.domain_id}</span>
                {result.sentinel && (
                  <span className='text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium'>
                    {result.sentinel.tier_id}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className='text-gray-400 hover:text-gray-600 text-2xl leading-none'>x</button>
          </div>
          <div className='bg-gray-50 rounded-xl p-4 space-y-2'>
            {Object.entries(result.output || {}).map(function(entry) {
              const key = entry[0], value = entry[1];
              return (
                <div key={key} className='flex justify-between items-start gap-4 text-sm'>
                  <span className='text-gray-500 font-medium capitalize shrink-0'>{key.replace(/_/g,' ')}</span>
                  <span className='text-gray-900 text-right text-xs font-mono'>
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              );
            })}
          </div>
          <p className='text-xs text-gray-400 mt-3'>Task: {result.task_id}</p>
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
  const [deploying, setDeploying] = useState({});
  const [result, setResult]       = useState(null);

  useEffect(function() { loadAgents(); }, [category, search]);

  async function loadAgents() {
    setLoading(true);
    try { setAgents(await api.getAgents(category, search)); }
    catch(e) { addNotification('Failed to load agents', 'error'); }
    finally { setLoading(false); }
  }

  async function handleExecute(agent, taskType) {
    const key = agentId(agent) + '-' + taskType;
    setExecuting(function(p) { return Object.assign({}, p, { [key]: true }); });
    try {
      const res = await api.executeAgent(agentId(agent), taskType, {});
      setResult(res);
      addNotification(agent.name + ' ' + taskType + ' complete', 'success');
    } catch(err) {
      const msg = err.response && err.response.data ? err.response.data.error : err.message;
      if (msg && msg.includes('approval')) {
        addNotification('Approval required for ' + agent.name + ' — submit via Sentinel OS', 'warning');
      } else {
        addNotification(msg || 'Execution failed', 'error');
      }
    } finally {
      setExecuting(function(p) { return Object.assign({}, p, { [key]: false }); });
    }
  }

  async function handleDeploy(agent) {
    setDeploying(function(p) { return Object.assign({}, p, { [agentId(agent)]: true }); });
    try {
      await api.deployAgent(agentId(agent));
      addNotification(agent.name + ' deployed successfully', 'success');
    } catch(err) {
      const msg = err.response && err.response.data ? err.response.data.error : err.message;
      addNotification(msg || 'Deployment failed', 'error');
    } finally {
      setDeploying(function(p) { return Object.assign({}, p, { [agentId(agent)]: false }); });
    }
  }

  const isAdmin = user && user.role === 'ADMIN';
  const taskButtons = isAdmin
    ? [['EXECUTE','Execute',Play,'bg-blue-600 hover:bg-blue-700 text-white'],
       ['ANALYZE','Analyze',BarChart2,'bg-green-600 hover:bg-green-700 text-white'],
       ['ESCALATE','Escalate',AlertTriangle,'bg-orange-500 hover:bg-orange-600 text-white']]
    : [['ANALYZE','Analyze',BarChart2,'bg-green-600 hover:bg-green-700 text-white']];

  return (
    <div className='max-w-4xl mx-auto px-4 py-6'>
      <div className='flex items-center gap-3 mb-2'>
        <div className='w-10 h-10 bg-gradient-to-br from-blue-900 to-blue-700 rounded-xl flex items-center justify-center'>
          <Database size={20} className='text-white' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Agent Catalog</h1>
          <p className='text-xs text-blue-600 font-medium'>SmartNation AI Registry · {agents.length} agents available</p>
        </div>
      </div>

      <div className='flex gap-3 mb-6 mt-4'>
        <div className='relative flex-1'>
          <Search size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
          <input
            type='text' placeholder='Search agents...' value={search}
            onChange={function(e) { setSearch(e.target.value); }}
            className='w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>
        <div className='relative'>
          <select value={category}
            onChange={function(e) { setCategory(e.target.value); }}
            className='appearance-none pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'>
            {CATEGORIES.map(function(c) {
              return <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>;
            })}
          </select>
          <ChevronDown size={14} className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none' />
        </div>
      </div>

      {loading ? (
        <div className='flex justify-center py-12'>
          <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600' />
        </div>
      ) : (
        <div className='space-y-4'>
          {agents.map(function(agent) {
            const tier = TIER_MAP[agent.category] || 'TIER_2';
            return (
              <div key={agentId(agent)} className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
                <div className='flex items-start gap-4'>
                  <div className='text-3xl'>{agent.icon}</div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <h3 className='font-bold text-gray-900'>{agent.name}</h3>
                      {agent.tier && (
                        <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (agent.tier === 'Premium' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600')}>
                          {agent.tier}
                        </span>
                      )}
                      <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (TIER_COLORS[tier] || TIER_COLORS.TIER_2)}>
                        {tier}
                      </span>
                    </div>
                    <p className='text-xs text-gray-500 mt-0.5'>{agent.category}</p>
                    <p className='text-sm text-gray-600 mt-1'>{agent.description}</p>
                    <div className='flex items-center gap-3 mt-2 text-xs text-gray-400'>
                      <span className='flex items-center gap-1'><Star size={11} className='text-yellow-400 fill-yellow-400' />{agent.rating}</span>
                      <span>{agent.deployments ? agent.deployments.toLocaleString() : 0} deployments</span>
                      {(agent.compliance || []).map(function(c) {
                        return <span key={c} className='px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded'>{c}</span>;
                      })}
                    </div>
                  </div>
                </div>
                <div className='flex flex-wrap gap-2 mt-4'>
                  {isAdmin && (
                    <button
                      onClick={function() { handleDeploy(agent); }}
                      disabled={!!deploying[agentId(agent)]}
                      className='flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'>
                      {deploying[agentId(agent)]
                        ? <div className='w-3 h-3 border border-white border-t-transparent rounded-full animate-spin' />
                        : <Rocket size={14} />}
                      Deploy
                    </button>
                  )}
                  {taskButtons.map(function(btn) {
                    const taskType = btn[0], label = btn[1], Icon = btn[2], cls = btn[3];
                    const key = agentId(agent) + '-' + taskType;
                    return (
                      <button key={taskType}
                        onClick={function() { handleExecute(agent, taskType); }}
                        disabled={!!executing[key]}
                        className={'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ' + cls}>
                        {executing[key]
                          ? <div className='w-3 h-3 border border-white border-t-transparent rounded-full animate-spin' />
                          : <Icon size={14} />}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ResultModal result={result} onClose={function() { setResult(null); }} />
    </div>
  );
}