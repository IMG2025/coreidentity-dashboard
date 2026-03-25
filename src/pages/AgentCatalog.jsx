/* script-41 — Operations Console: Deployed Agents + Execute/Analyze/Escalate/Stop/Restart */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Play, BarChart3, AlertTriangle, Square,
  RefreshCw, Search, X, Shield, Activity,
  CheckCircle, AlertCircle, RotateCcw, ChevronDown
} from 'lucide-react';
import { C, F } from '../chc-design.js';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../App';

const API = 'https://api.coreidentitygroup.com';
const token = () => localStorage.getItem('ci_token') || localStorage.getItem('token') || '';

const TIER_CFG = {
  TIER_1:{ color:'#ef4444', bg:'rgba(239,68,68,0.1)', border:'rgba(239,68,68,0.2)' },
  TIER_2:{ color:'#f97316', bg:'rgba(249,115,22,0.1)', border:'rgba(249,115,22,0.2)' },
  TIER_3:{ color:'#3b82f6', bg:'rgba(59,130,246,0.1)', border:'rgba(59,130,246,0.2)' },
  TIER_4:{ color:'#22c55e', bg:'rgba(34,197,94,0.1)',  border:'rgba(34,197,94,0.2)'  },
};

function StatusDot({ status }) {
  const color = status === 'active' ? C.green : status === 'suspended' ? '#ef4444' : C.gold;
  return (
    <span style={{
      width:6, height:6, borderRadius:'50%', background:color,
      display:'inline-block', flexShrink:0,
      boxShadow: status === 'active' ? '0 0 6px '+color : 'none',
      animation: status === 'active' ? 'cidg-pulse 2s infinite' : 'none',
    }}/>
  );
}

function ResultModal({ result, onClose }) {
  if (!result) return null;
  const statusColor = result.status === 'OK' ? C.green : result.status === 'BLOCKED' ? '#ef4444' : C.gold;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:C.surface, border:'1px solid '+C.border, borderTop:'2px solid '+statusColor, borderRadius:8, padding:20, maxWidth:480, width:'100%', maxHeight:'80vh', overflowY:'auto', fontFamily:F.mono }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ color:C.white, fontWeight:700, fontSize:13 }}>{result.agentName}</div>
            <div style={{ display:'flex', gap:6, marginTop:4 }}>
              <span style={{ fontSize:9, padding:'2px 6px', borderRadius:3, background:statusColor+'20', color:statusColor, border:'1px solid '+statusColor+'40', letterSpacing:'0.06em' }}>{result.status}</span>
              <span style={{ fontSize:9, color:C.slate }}>{result.taskType}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.slate, cursor:'pointer' }}><X size={16}/></button>
        </div>
        <div style={{ background:C.bg2, borderRadius:5, padding:12 }}>
          {Object.entries(result.output || {}).map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:6, fontSize:11 }}>
              <span style={{ color:C.slate, textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</span>
              <span style={{ color:C.white, textAlign:'right', wordBreak:'break-all' }}>{typeof v==='object'?JSON.stringify(v):String(v)}</span>
            </div>
          ))}
        </div>
        {result.executionId && <p style={{ color:C.slate, fontSize:9, marginTop:10 }}>ID: {result.executionId}</p>}
      </div>
    </div>
  );
}

export default function AgentCatalog() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const [agents,      setAgents]      = useState([]);
  const [total,       setTotal]       = useState(0);
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState('all');
  const [loading,     setLoading]     = useState(true);
  const [executing,   setExecuting]   = useState({});
  const [stopping,    setStopping]    = useState({});
  const [restarting,  setRestarting]  = useState({});
  const [result,      setResult]      = useState(null);
  const PAGE_SIZE = 50;

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: PAGE_SIZE });
      if (search) params.append('search', search);
      const res = await fetch(API+'/api/agents?'+params, { headers:{ Authorization:'Bearer '+token() } });
      const json = await res.json();
      let items = Array.isArray(json) ? json : (json?.data || []);
      // Filter by status
      if (filter === 'active')    items = items.filter(a => (a.status||'active') === 'active');
      if (filter === 'suspended') items = items.filter(a => a.status === 'suspended');
      setAgents(items);
      setTotal(json?.total || json?.count || items.length);
    } catch(e) {
      addNotification('Failed to load agents', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => { loadAgents(); }, [search, filter]);

  const handleExecute = async (agent, taskType) => {
    const id = agent.agentId || agent.id || '';
    setExecuting(p => ({ ...p, [id+taskType]: true }));
    try {
      const res = await fetch(API+'/api/agents/execute', {
        method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token() },
        body: JSON.stringify({ agentId:id, task:taskType, clientId:'chc-ops', payload:{} }),
      });
      const data = await res.json();
      const body = data?.data || data;
      const d = body.data || body;
      setResult({
        agentName: agent.name || agent.agentName || id,
        status: d.policyBlocked ? 'BLOCKED' : data.success===true ? 'OK' : 'FAILED',
        taskType,
        executionId: d.executionId || d.taskId || '—',
        output: d.result || d.output || { message: d.message || body.message || 'Task dispatched' },
      });
      addNotification((agent.name||id)+' '+taskType+' complete', 'success');
    } catch(e) {
      addNotification('Execute failed: '+e.message, 'error');
    } finally {
      setExecuting(p => ({ ...p, [id+taskType]: false }));
    }
  };

  const handleStop = async (agent) => {
    const id = agent.agentId || agent.id || '';
    setStopping(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(API+'/api/sentinel/kill-switches', {
        method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token() },
        body: JSON.stringify({ agentId:id, reason:'Manual stop via Operations Console', triggeredBy: user?.email || 'admin' }),
      });
      const data = await res.json();
      if (!data.success && !data.killSwitchId) throw new Error(data.error || 'Stop failed');
      addNotification((agent.name||id)+' stopped', 'warning');
      // Update local state
      setAgents(p => p.map(a => (a.agentId||a.id)===id ? {...a, status:'suspended'} : a));
    } catch(e) {
      addNotification('Stop failed: '+e.message, 'error');
    } finally {
      setStopping(p => ({ ...p, [id]: false }));
    }
  };

  const handleRestart = async (agent) => {
    const id = agent.agentId || agent.id || '';
    setRestarting(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(API+'/api/agents/'+id+'/deploy', {
        method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token() },
      });
      const data = await res.json();
      if (!data.success && !data.deploymentId) throw new Error(data.error || 'Restart failed');
      addNotification((agent.name||id)+' restarted', 'success');
      setAgents(p => p.map(a => (a.agentId||a.id)===id ? {...a, status:'active'} : a));
      if(filter==='suspended') setFilter('all');
    } catch(e) {
      addNotification('Restart failed: '+e.message, 'error');
    } finally {
      setRestarting(p => ({ ...p, [id]: false }));
    }
  };

  const filtered = agents.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.name||'').toLowerCase().includes(q) ||
           (a.agentId||'').toLowerCase().includes(q) ||
           (a.category||'').toLowerCase().includes(q);
  });

  return (
    <div style={{ padding:'20px', fontFamily:F.body, color:C.white, maxWidth:1200, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontFamily:F.display, fontWeight:700, letterSpacing:'0.08em', color:C.white, margin:0 }}>
          OPERATIONS
        </h1>
        <p style={{ color:C.slate, fontSize:11, fontFamily:F.mono, margin:'4px 0 0', letterSpacing:'0.05em' }}>
          ACTIVE AGENT CONSOLE · {loading ? 'LOADING' : filtered.length.toLocaleString()+' AGENTS'}
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:180, display:'flex', alignItems:'center', gap:8, background:C.surface, border:'1px solid '+C.border, borderRadius:5, padding:'0 12px' }}>
          <Search size={13} color={C.slate}/>
          <input type="text" placeholder="Search agents..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex:1, background:'none', border:'none', outline:'none', color:C.white, fontSize:12, fontFamily:F.mono, padding:'9px 0' }}/>
          {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', color:C.slate, cursor:'pointer', padding:0 }}><X size={12}/></button>}
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {['all','active','suspended'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding:'8px 12px', background:filter===f?'rgba(212,168,67,0.1)':'transparent', border:'1px solid '+(filter===f?'rgba(212,168,67,0.3)':C.border), borderRadius:5, color:filter===f?C.gold:C.slate, fontSize:10, fontFamily:F.mono, cursor:'pointer', letterSpacing:'0.06em', textTransform:'uppercase' }}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={loadAgents} style={{ display:'flex', alignItems:'center', background:'transparent', border:'1px solid '+C.border, borderRadius:5, padding:'8px 12px', color:C.slate, cursor:'pointer' }}>
          <RefreshCw size={11}/>
        </button>
      </div>

      {/* Agent list */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:240, gap:12 }}>
          <div style={{ width:24, height:24, border:'2px solid '+C.border, borderTop:'2px solid '+C.blue, borderRadius:'50%', animation:'cidg-spin 0.7s linear infinite' }}/>
          <span style={{ color:C.slate, fontSize:10, fontFamily:F.mono }}>LOADING OPERATIONS CONSOLE</span>
          <style>{'@keyframes cidg-spin{to{transform:rotate(360deg)}} @keyframes cidg-pulse{0%,100%{opacity:1}50%{opacity:0.4}}'}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:48 }}>
          <Activity size={32} color={C.slate} style={{ marginBottom:12, opacity:0.3 }}/>
          <p style={{ color:C.slate, fontSize:12, fontFamily:F.mono }}>No agents found</p>
          <p style={{ color:C.slate, fontSize:10, fontFamily:F.mono, marginTop:4 }}>Deploy agents from SmartNation AI</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {filtered.map(agent => {
            const id = agent.agentId || agent.id || '';
            const tier = agent.riskTier || 'TIER_2';
            const tierCfg = TIER_CFG[tier] || TIER_CFG.TIER_2;
            const status = agent.status || 'active';
            const score = parseInt(agent.governanceScore || 0);
            const scoreColor = score >= 80 ? C.green : score >= 60 ? C.gold : '#ef4444';
            const isStopped = status === 'suspended' || status === 'inactive';
            const isT1 = tier === 'TIER_1';

            return (
              <div key={id} style={{ background:C.surface, border:'1px solid '+(isStopped?'rgba(239,68,68,0.2)':C.border), borderLeft:'3px solid '+(isStopped?'#ef4444':isStopped?C.border:C.green), borderRadius:6, padding:'12px 14px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>

                {/* Status + name */}
                <div style={{ display:'flex', alignItems:'center', gap:8, flex:'2 1 200px', minWidth:0 }}>
                  <StatusDot status={status}/>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:C.white, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {agent.name || agent.agentName || id}
                    </div>
                    <div style={{ fontSize:10, color:C.slate, fontFamily:F.mono }}>
                      {agent.category || '—'} · {id}
                    </div>
                  </div>
                </div>

                {/* Score + tier */}
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <span style={{ fontSize:9, padding:'2px 6px', borderRadius:3, background:tierCfg.bg, color:tierCfg.color, border:'1px solid '+tierCfg.border, fontFamily:F.mono, fontWeight:700 }}>{tier}</span>
                  <span style={{ fontSize:13, fontFamily:F.mono, fontWeight:700, color:scoreColor }}>{score}</span>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:4, flexShrink:0, flexWrap:'wrap' }}>
                  {!isStopped ? (
                    <>
                      {[
                        { label:'EXEC',     task:'EXECUTE',  color:C.green,  icon:Play          },
                        { label:'ANALYZE',  task:'ANALYZE',  color:C.blue,   icon:BarChart3     },
                        ...(isT1 ? [{ label:'ESCALATE', task:'ESCALATE', color:C.gold, icon:AlertTriangle }] : []),
                      ].map(({ label, task, color, icon:Icon }) => (
                        <button key={task}
                          onClick={() => handleExecute(agent, task)}
                          disabled={!!executing[id+task]}
                          style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 8px', background:'transparent', border:'1px solid '+color+'30', borderRadius:4, color:executing[id+task]?C.slate:color, fontSize:9, fontFamily:F.mono, letterSpacing:'0.05em', cursor:executing[id+task]?'not-allowed':'pointer', opacity:executing[id+task]?0.5:1 }}>
                          <Icon size={9}/><span>{executing[id+task]?'...':label}</span>
                        </button>
                      ))}
                      <button
                        onClick={() => handleStop(agent)}
                        disabled={!!stopping[id]}
                        style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 8px', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:4, color:stopping[id]?C.slate:'#ef4444', fontSize:9, fontFamily:F.mono, letterSpacing:'0.05em', cursor:stopping[id]?'not-allowed':'pointer' }}>
                        <Square size={9}/><span>{stopping[id]?'...':'STOP'}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleRestart(agent)}
                      disabled={!!restarting[id]}
                      style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 12px', background:'rgba(20,184,166,0.08)', border:'1px solid rgba(20,184,166,0.3)', borderRadius:4, color:restarting[id]?C.slate:C.teal, fontSize:9, fontFamily:F.mono, letterSpacing:'0.05em', cursor:restarting[id]?'not-allowed':'pointer' }}>
                      <RotateCcw size={9}/><span>{restarting[id]?'...':'RESTART'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ResultModal result={result} onClose={() => setResult(null)}/>
    </div>
  );
}
