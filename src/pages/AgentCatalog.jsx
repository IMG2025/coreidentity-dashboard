/* script-41 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Play, BarChart3, AlertTriangle,
  Rocket, ChevronDown, X, Shield, Clock, CheckCircle,
  Filter, RefreshCw, AlertCircle
} from 'lucide-react';
import { C, F } from '../chc-design.js';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../App';

const API = 'https://api.coreidentitygroup.com';
const token = () => localStorage.getItem('ci_token') || localStorage.getItem('token') || '';

const agentId = (a) => a.agentId || a.id || '';

const CATEGORIES = [
  'all', 'Healthcare', 'Financial Services', 'Legal',
  'Hospitality', 'Retail', 'Manufacturing', 'Logistics', 'Enterprise / BFSI',
];

const TIER_CONFIG = {
  TIER_1: { label: 'T1', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
  TIER_2: { label: 'T2', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
  TIER_3: { label: 'T3', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
  TIER_4: { label: 'T4', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.2)'  },
};

function ScoreBar({ value }) {
  const color = value >= 80 ? C.green : value >= 60 ? C.gold : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 2, background: C.border, borderRadius: 1 }}>
        <div style={{
          height: '100%',
          width: Math.min(100, value || 0) + '%',
          background: color,
          borderRadius: 1,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: 10, fontFamily: F.mono, color, width: 24, textAlign: 'right' }}>{value || 0}</span>
    </div>
  );
}

function ResultModal({ result, onClose }) {
  if (!result) return null;
  const statusColor = result.status === 'OK' ? C.green : C.gold;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: C.surface,
        border: '1px solid ' + C.border,
        borderTop: '2px solid ' + statusColor,
        borderRadius: 8,
        padding: 20,
        maxWidth: 480,
        width: '100%',
        maxHeight: '80vh',
        overflowY: 'auto',
        fontFamily: F.mono,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>{result.agent_name}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: statusColor + '20', color: statusColor, border: '1px solid ' + statusColor + '40', letterSpacing: '0.06em' }}>
                {result.status}
              </span>
              <span style={{ fontSize: 9, color: C.slate }}>{result.task_type} · {result.domain_id}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.slate, cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ background: C.bg2, borderRadius: 5, padding: 12 }}>
          {Object.entries(result.output || {}).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6, fontSize: 11 }}>
              <span style={{ color: C.slate, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
              <span style={{ color: C.white, textAlign: 'right', wordBreak: 'break-all' }}>
                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </span>
            </div>
          ))}
        </div>
        <p style={{ color: C.slate, fontSize: 9, marginTop: 10 }}>TASK_ID: {result.task_id}</p>
      </div>
    </div>
  );
}

export default function AgentCatalog() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const [agents,     setAgents]     = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(false);
  const [category,   setCategory]   = useState('all');
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [executing,  setExecuting]  = useState({});
  const [deploying,  setDeploying]  = useState({});
  const [result,     setResult]     = useState(null);
  const PAGE_SIZE = 50;

  const loadAgents = useCallback(async (reset) => {
    if (reset) {
      setPage(1);
      setAgents([]);
    }
    reset ? setLoading(true) : setLoadingMore(true);

    try {
      const currentPage = reset ? 1 : page;
      const offset = (currentPage - 1) * PAGE_SIZE;
      const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
      if (category && category !== 'all') params.append('category', category);
      if (search) params.append('search', search);

      const res = await fetch(API + '/api/agents?' + params.toString(), {
        credentials: 'include',
        headers: { Authorization: 'Bearer ' + token() },
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();

      // Handle both shapes: { data: [...] } and direct array
      const items = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : [];
      const count = json?.total || json?.count || items.length;

      if (reset) {
        setAgents(items);
      } else {
        setAgents(prev => [...prev, ...items]);
      }
      setTotal(count);
      setHasMore(items.length === PAGE_SIZE);
    } catch(e) {
      addNotification('Failed to load agents: ' + e.message, 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, search, page]);

  useEffect(() => { loadAgents(true); }, [category, search]);

  const loadMore = () => {
    setLoadingMore(true);
    setPage(p => p + 1);
    loadAgents(false);
  };

  const handleExecute = async (agent, taskType) => {
    const id = agentId(agent);
    setExecuting(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(API + '/api/agents/execute', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token(),
        },
        body: JSON.stringify({
          agentId: id, task: taskType,
          clientId: 'chc-ops', payload: {},
        }),
      });
      const data = await res.json();
      const body = data?.data || data;
      setResult({
        agent_name: agent.name || agent.agentName || id,
        status:     body.policyBlocked ? 'BLOCKED' : body.success === false ? 'FAILED' : 'OK',
        task_type:  taskType,
        domain_id:  agent.category || '—',
        task_id:    body.executionId || body.taskId || '—',
        output:     body.output || body.result || { message: body.message || 'Dispatched' },
        sentinel:   body.sentinel,
      });
      addNotification((agent.name || id) + ' ' + taskType + ' complete', 'success');
    } catch(e) {
      const msg = e.message || 'Unknown error';
      addNotification('Execute failed: ' + msg, 'error');
    } finally {
      setExecuting(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDeploy = async (agent) => {
    const id = agentId(agent);
    setDeploying(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(API + '/api/agents/' + id + '/deploy', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token(),
        },
      });
      const data = await res.json();
      if (!data.success && !data.deploymentId) throw new Error(data.error || 'Deploy failed');
      addNotification((agent.name || id) + ' deployed', 'success');
    } catch(e) {
      addNotification('Deploy failed: ' + e.message, 'error');
    } finally {
      setDeploying(prev => ({ ...prev, [id]: false }));
    }
  };

  const ACTIONS = [
    { label: 'EXECUTE', task: 'EXECUTE', icon: Play,     color: C.green  },
    { label: 'ANALYZE', task: 'ANALYZE', icon: BarChart3, color: C.blue   },
    { label: 'ESCALATE', task: 'ESCALATE', icon: AlertTriangle, color: C.gold },
  ];

  return (
    <div style={{ padding: '20px', fontFamily: F.body, color: C.white, maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontSize: 22, fontFamily: F.display, fontWeight: 700,
          letterSpacing: '0.08em', color: C.white, margin: 0,
        }}>AGENT CATALOG</h1>
        <p style={{
          color: C.slate, fontSize: 11, fontFamily: F.mono,
          margin: '4px 0 0', letterSpacing: '0.05em',
        }}>
          SMARTNATION AI REGISTRY · {loading ? 'LOADING' : total.toLocaleString() + ' AGENTS'}
        </p>
      </div>

      {/* Search + filter bar */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16,
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div style={{
          flex: 1, minWidth: 200,
          display: 'flex', alignItems: 'center', gap: 8,
          background: C.surface, border: '1px solid ' + C.border,
          borderRadius: 5, padding: '0 12px',
        }}>
          <Search size={13} color={C.slate} />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: C.white, fontSize: 12, fontFamily: F.mono,
              padding: '9px 0', letterSpacing: '0.02em',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: C.slate, cursor: 'pointer', padding: 0 }}>
              <X size={12} />
            </button>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{
              background: C.surface, border: '1px solid ' + C.border,
              borderRadius: 5, padding: '8px 32px 8px 12px',
              color: C.white, fontSize: 11, fontFamily: F.mono,
              cursor: 'pointer', appearance: 'none',
              letterSpacing: '0.04em',
            }}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c} style={{ background: C.bg2 }}>
                {c === 'all' ? 'ALL CATEGORIES' : c.toUpperCase()}
              </option>
            ))}
          </select>
          <ChevronDown size={11} color={C.slate} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        <button onClick={() => loadAgents(true)} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'transparent', border: '1px solid ' + C.border,
          borderRadius: 5, padding: '8px 12px',
          color: C.slate, fontSize: 10, fontFamily: F.mono,
          cursor: 'pointer', letterSpacing: '0.06em',
        }}>
          <RefreshCw size={11} />
        </button>
      </div>

      {/* Agent grid */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 12 }}>
          <div style={{
            width: 24, height: 24,
            border: '2px solid ' + C.border,
            borderTop: '2px solid ' + C.blue,
            borderRadius: '50%',
            animation: 'cidg-spin 0.7s linear infinite',
          }} />
          <span style={{ color: C.slate, fontSize: 10, fontFamily: F.mono }}>LOADING AGENT REGISTRY</span>
          <style>{'@keyframes cidg-spin { to { transform: rotate(360deg); } }'}</style>
        </div>
      ) : agents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <AlertCircle size={32} color={C.slate} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ color: C.slate, fontSize: 12, fontFamily: F.mono }}>No agents found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
          {agents.map((agent) => {
            const id = agentId(agent);
            const tier = agent.riskTier || agent.tier || 'TIER_2';
            const tierCfg = TIER_CONFIG[tier] || TIER_CONFIG.TIER_2;
            const score = parseInt(agent.governanceScore || agent.score || 0);
            const isExecuting = executing[id];
            const isDeploying = deploying[id];

            return (
              <div key={id} style={{
                background: C.surface,
                border: '1px solid ' + C.border,
                borderRadius: 6,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.border2}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                {/* Agent header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: C.white,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {agent.name || agent.agentName || id}
                    </div>
                    <div style={{ fontSize: 10, color: C.slate, fontFamily: F.mono, marginTop: 2, letterSpacing: '0.03em' }}>
                      {agent.category || '—'} · {id}
                    </div>
                  </div>
                  <div style={{
                    padding: '2px 7px',
                    borderRadius: 3,
                    fontSize: 9,
                    fontFamily: F.mono,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    background: tierCfg.bg,
                    color: tierCfg.color,
                    border: '1px solid ' + tierCfg.border,
                    flexShrink: 0,
                  }}>
                    {tier}
                  </div>
                </div>

                {/* Compliance tags */}
                {agent.compliance && agent.compliance.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {agent.compliance.slice(0, 3).map(fw => (
                      <span key={fw} style={{
                        fontSize: 9, padding: '2px 5px', borderRadius: 3,
                        background: 'rgba(212,168,67,0.08)',
                        color: C.gold,
                        border: '1px solid rgba(212,168,67,0.15)',
                        fontFamily: F.mono, letterSpacing: '0.04em',
                      }}>{fw}</span>
                    ))}
                    {agent.compliance.length > 3 && (
                      <span style={{ fontSize: 9, color: C.slate, fontFamily: F.mono }}>+{agent.compliance.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Governance score */}
                <ScoreBar value={score} />

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {ACTIONS.map(({ label, task, icon: Icon, color }) => (
                    <button
                      key={task}
                      onClick={() => handleExecute(agent, task)}
                      disabled={!!isExecuting}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        padding: '6px 0',
                        background: 'transparent',
                        border: '1px solid ' + (isExecuting ? C.border : color + '30'),
                        borderRadius: 4,
                        color: isExecuting ? C.slate : color,
                        fontSize: 9,
                        fontFamily: F.mono,
                        letterSpacing: '0.06em',
                        cursor: isExecuting ? 'not-allowed' : 'pointer',
                        opacity: isExecuting ? 0.5 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      <Icon size={10} />
                      <span>{label}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => handleDeploy(agent)}
                    disabled={!!isDeploying}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '6px 10px',
                      background: isDeploying ? 'transparent' : 'rgba(20,184,166,0.1)',
                      border: '1px solid ' + (isDeploying ? C.border : 'rgba(20,184,166,0.3)'),
                      borderRadius: 4,
                      color: isDeploying ? C.slate : C.teal,
                      fontSize: 9,
                      fontFamily: F.mono,
                      letterSpacing: '0.06em',
                      cursor: isDeploying ? 'not-allowed' : 'pointer',
                      opacity: isDeploying ? 0.5 : 1,
                    }}
                  >
                    <Rocket size={10} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={loadMore} disabled={loadingMore} style={{
            padding: '8px 24px',
            background: 'transparent',
            border: '1px solid ' + C.border,
            borderRadius: 5,
            color: loadingMore ? C.slate : C.white,
            fontSize: 11,
            fontFamily: F.mono,
            cursor: loadingMore ? 'not-allowed' : 'pointer',
            letterSpacing: '0.06em',
          }}>
            {loadingMore ? 'LOADING...' : 'LOAD MORE'}
          </button>
        </div>
      )}

      {/* Result modal */}
      <ResultModal result={result} onClose={() => setResult(null)} />
    </div>
  );
}
