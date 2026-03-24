/* script-41 — SmartNation AI: Full 10K Agent Catalog + Resume View + Deploy */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, ChevronDown, X, Shield, Star, Award,
  RefreshCw, Rocket, Clock, Activity, CheckCircle,
  AlertTriangle, BarChart3, FileText, Zap, ChevronRight
} from 'lucide-react';
import { C, F } from '../chc-design.js';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../App';
import { useTenant } from '../context/TenantContext';

const API = 'https://api.coreidentitygroup.com';
const token = () => localStorage.getItem('ci_token') || localStorage.getItem('token') || '';

const VERTICALS = [
  'all','Healthcare','Financial Services','Legal',
  'Hospitality','Retail','Manufacturing','Logistics','Enterprise / BFSI',
];

const TIER_CFG = {
  TIER_1:{ label:'T1', color:'#ef4444', bg:'rgba(239,68,68,0.1)', border:'rgba(239,68,68,0.2)' },
  TIER_2:{ label:'T2', color:'#f97316', bg:'rgba(249,115,22,0.1)', border:'rgba(249,115,22,0.2)' },
  TIER_3:{ label:'T3', color:'#3b82f6', bg:'rgba(59,130,246,0.1)', border:'rgba(59,130,246,0.2)' },
  TIER_4:{ label:'T4', color:'#22c55e', bg:'rgba(34,197,94,0.1)',  border:'rgba(34,197,94,0.2)'  },
};

const CERT_CFG = {
  Platinum:  { color:'#22d3ee',  glow:'rgba(34,211,238,0.15)' },
  Gold:      { color:'#d4a843',  glow:'rgba(212,168,67,0.15)' },
  Silver:    { color:'#94a3b8',  glow:'rgba(148,163,184,0.15)' },
  Foundation:{ color:'#6b7280',  glow:'rgba(107,114,128,0.1)' },
};

function ScoreBar({ value }) {
  const color = value >= 80 ? C.green : value >= 60 ? C.gold : '#ef4444';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ flex:1, height:2, background:C.border, borderRadius:1 }}>
        <div style={{ height:'100%', width:Math.min(100,value||0)+'%', background:color, borderRadius:1 }} />
      </div>
      <span style={{ fontSize:10, fontFamily:F.mono, color, width:24, textAlign:'right' }}>{value||0}</span>
    </div>
  );
}

function AgentCard({ agent, onView, onDeploy, deploying }) {
  const id = agent.agentId || agent.id || '';
  const tier = agent.riskTier || 'TIER_2';
  const tierCfg = TIER_CFG[tier] || TIER_CFG.TIER_2;
  const cert = agent.certTier || 'Foundation';
  const certCfg = CERT_CFG[cert] || CERT_CFG.Foundation;
  const score = parseInt(agent.governanceScore || 0);
  const fw = typeof agent.complianceFrameworks === 'string'
    ? agent.complianceFrameworks.replace(/[\[\]']/g,'').split(',').map(s=>s.trim()).filter(Boolean)
    : (agent.complianceFrameworks || []);

  return (
    <div style={{
      background: C.surface,
      border: '1px solid ' + C.border,
      borderRadius:6, padding:'14px 16px',
      display:'flex', flexDirection:'column', gap:8,
      cursor:'pointer', transition:'border-color 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = C.border2}
    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    onClick={() => onView(agent)}
    >
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, color:C.white, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {agent.name || agent.agentName || id}
          </div>
          <div style={{ fontSize:10, color:C.slate, fontFamily:F.mono, marginTop:2 }}>
            {agent.category || agent.vertical || '—'} · {id}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, flexShrink:0 }}>
          <span style={{ fontSize:9, padding:'2px 6px', borderRadius:3, background:tierCfg.bg, color:tierCfg.color, border:'1px solid '+tierCfg.border, fontFamily:F.mono, fontWeight:700 }}>
            {tier}
          </span>
          <span style={{ fontSize:9, padding:'2px 6px', borderRadius:3, background:certCfg.glow, color:certCfg.color, border:'1px solid '+certCfg.color+'40', fontFamily:F.mono }}>
            {cert}
          </span>
        </div>
      </div>

      {fw.length > 0 && (
        <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
          {fw.slice(0,3).map(f => (
            <span key={f} style={{ fontSize:9, padding:'2px 5px', borderRadius:3, background:'rgba(212,168,67,0.06)', color:C.gold, border:'1px solid rgba(212,168,67,0.12)', fontFamily:F.mono }}>
              {f}
            </span>
          ))}
          {fw.length > 3 && <span style={{ fontSize:9, color:C.slate, fontFamily:F.mono }}>+{fw.length-3}</span>}
        </div>
      )}

      <ScoreBar value={score} />

      <div style={{ display:'flex', gap:4, marginTop:2 }}>
        <button
          onClick={e => { e.stopPropagation(); onView(agent); }}
          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'6px 0', background:'transparent', border:'1px solid rgba(59,130,246,0.25)', borderRadius:4, color:C.blue, fontSize:9, fontFamily:F.mono, letterSpacing:'0.06em', cursor:'pointer' }}
        >
          <FileText size={10}/><span>PROFILE</span>
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDeploy(agent); }}
          disabled={!!deploying[id]}
          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'6px 0', background:deploying[id]?'transparent':'rgba(20,184,166,0.08)', border:'1px solid '+(deploying[id]?C.border:'rgba(20,184,166,0.25)'), borderRadius:4, color:deploying[id]?C.slate:C.teal, fontSize:9, fontFamily:F.mono, letterSpacing:'0.06em', cursor:deploying[id]?'not-allowed':'pointer' }}
        >
          <Rocket size={10}/><span>{deploying[id]?'DEPLOYING...':'DEPLOY'}</span>
        </button>
      </div>
    </div>
  );
}

function AgentModal({ agent, onClose, onDeploy, deploying }) {
  if (!agent) return null;
  const id = agent.agentId || agent.id || '';
  const tier = agent.riskTier || 'TIER_2';
  const tierCfg = TIER_CFG[tier] || TIER_CFG.TIER_2;
  const cert = agent.certTier || 'Foundation';
  const certCfg = CERT_CFG[cert] || CERT_CFG.Foundation;
  const score = parseInt(agent.governanceScore || 0);
  const scoreColor = score >= 80 ? C.green : score >= 60 ? C.gold : '#ef4444';
  const fw = typeof agent.complianceFrameworks === 'string'
    ? agent.complianceFrameworks.replace(/[\[\]']/g,'').split(',').map(s=>s.trim()).filter(Boolean)
    : (agent.complianceFrameworks || []);
  const caps = typeof agent.capabilities === 'string'
    ? agent.capabilities.replace(/[\[\]']/g,'').split(',').map(s=>s.trim()).filter(Boolean)
    : (agent.capabilities || []);
  const tasks = typeof agent.taskTypes === 'string'
    ? agent.taskTypes.replace(/[\[\]']/g,'').split(',').map(s=>s.trim()).filter(Boolean)
    : (agent.taskTypes || []);
  const audit = typeof agent.auditHistory === 'string'
    ? (() => { try { return JSON.parse(agent.auditHistory.replace(/'/g,'"')); } catch { return []; } })()
    : (agent.auditHistory || []);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(4px)', zIndex:50, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'20px 16px', overflowY:'auto' }}
      onClick={onClose}>
      <div style={{ background:C.bg2, border:'1px solid '+C.border, borderTop:'2px solid '+certCfg.color, borderRadius:8, padding:24, maxWidth:600, width:'100%', fontFamily:F.body }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:C.white, fontFamily:F.display, letterSpacing:'0.05em' }}>
              {agent.name || agent.agentName}
            </div>
            <div style={{ fontSize:11, color:C.slate, fontFamily:F.mono, marginTop:4 }}>
              {agent.role || 'Autonomous governance agent'}
            </div>
            <div style={{ display:'flex', gap:6, marginTop:8 }}>
              <span style={{ fontSize:9, padding:'2px 7px', borderRadius:3, background:tierCfg.bg, color:tierCfg.color, border:'1px solid '+tierCfg.border, fontFamily:F.mono, fontWeight:700 }}>{tier}</span>
              <span style={{ fontSize:9, padding:'2px 7px', borderRadius:3, background:certCfg.glow, color:certCfg.color, border:'1px solid '+certCfg.color+'40', fontFamily:F.mono }}>{cert} Certified</span>
              <span style={{ fontSize:9, padding:'2px 7px', borderRadius:3, background:'rgba(34,197,94,0.08)', color:C.green, border:'1px solid rgba(34,197,94,0.2)', fontFamily:F.mono }}>v{agent.version||'1.0.0'}</span>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
            <button onClick={onClose} style={{ background:'none', border:'none', color:C.slate, cursor:'pointer' }}><X size={18}/></button>
            <div style={{ fontSize:28, fontFamily:F.mono, fontWeight:700, color:scoreColor, lineHeight:1 }}>{score}</div>
            <div style={{ fontSize:9, fontFamily:F.mono, color:C.slate }}>GOV SCORE</div>
          </div>
        </div>

        {/* Metrics row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20 }}>
          {[
            { label:'EXECUTIONS', value:(parseInt(agent.executionCount)||0).toLocaleString() },
            { label:'SUCCESS RATE', value:((parseFloat(agent.successRate)||0)*100).toFixed(1)+'%' },
            { label:'AVG LATENCY', value:(parseInt(agent.avgLatencyMs)||0)+'ms' },
            { label:'PROOF PACKS', value:(parseInt(agent.proofPackCount)||0).toLocaleString() },
          ].map(m => (
            <div key={m.label} style={{ background:C.surface, border:'1px solid '+C.border, borderRadius:5, padding:'10px 12px' }}>
              <div style={{ fontSize:9, fontFamily:F.mono, color:C.slate, letterSpacing:'0.08em', marginBottom:4 }}>{m.label}</div>
              <div style={{ fontSize:16, fontFamily:F.mono, fontWeight:700, color:C.white }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Position details */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
          <div>
            <div style={{ fontSize:9, fontFamily:F.mono, color:C.slate, letterSpacing:'0.08em', marginBottom:6 }}>POSITION DETAILS</div>
            <div style={{ background:C.surface, border:'1px solid '+C.border, borderRadius:5, padding:12 }}>
              {[
                { label:'Department', value:agent.department || '—' },
                { label:'Owner', value:agent.owner || '—' },
                { label:'Vertical', value:agent.vertical || agent.category || '—' },
                { label:'Agent ID', value:id },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:11 }}>
                  <span style={{ color:C.slate, fontFamily:F.mono }}>{r.label}</span>
                  <span style={{ color:C.white, fontFamily:F.mono, textAlign:'right' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize:9, fontFamily:F.mono, color:C.slate, letterSpacing:'0.08em', marginBottom:6 }}>AUDIT SCHEDULE</div>
            <div style={{ background:C.surface, border:'1px solid '+C.border, borderRadius:5, padding:12 }}>
              {[
                { label:'Last Audit', value:(agent.lastAuditDate||'').slice(0,10) || '—' },
                { label:'Next Audit', value:(agent.nextAuditDate||'').slice(0,10) || '—' },
                { label:'Deployed', value:(agent.deployedAt||'').slice(0,10) || '—' },
                { label:'Last Exec', value:(agent.lastExecutionAt||'').slice(0,10) || '—' },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:11 }}>
                  <span style={{ color:C.slate, fontFamily:F.mono }}>{r.label}</span>
                  <span style={{ color:C.white, fontFamily:F.mono }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compliance frameworks */}
        {fw.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:9, fontFamily:F.mono, color:C.slate, letterSpacing:'0.08em', marginBottom:6 }}>COMPLIANCE FRAMEWORKS</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {fw.map(f => (
                <span key={f} style={{ fontSize:10, padding:'3px 8px', borderRadius:4, background:'rgba(212,168,67,0.08)', color:C.gold, border:'1px solid rgba(212,168,67,0.2)', fontFamily:F.mono }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Capabilities */}
        {caps.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:9, fontFamily:F.mono, color:C.slate, letterSpacing:'0.08em', marginBottom:6 }}>CAPABILITIES</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {caps.map((cap,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:C.white }}>
                  <CheckCircle size={10} color={C.green} style={{ flexShrink:0 }}/>
                  <span>{cap}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task types */}
        {tasks.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:9, fontFamily:F.mono, color:C.slate, letterSpacing:'0.08em', marginBottom:6 }}>AUTHORIZED TASK TYPES</div>
            <div style={{ display:'flex', gap:6 }}>
              {tasks.map(t => (
                <span key={t} style={{ fontSize:10, padding:'3px 10px', borderRadius:4, background:'rgba(59,130,246,0.08)', color:C.blue, border:'1px solid rgba(59,130,246,0.2)', fontFamily:F.mono }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cert fingerprint */}
        {agent.certFingerprint && (
          <div style={{ marginBottom:20, padding:'8px 12px', background:'rgba(34,211,238,0.04)', border:'1px solid rgba(34,211,238,0.1)', borderRadius:5 }}>
            <div style={{ fontSize:9, fontFamily:F.mono, color:'#22d3ee', letterSpacing:'0.08em', marginBottom:3 }}>CERT FINGERPRINT</div>
            <div style={{ fontSize:10, fontFamily:F.mono, color:C.slate }}>{agent.certFingerprint}</div>
          </div>
        )}

        {/* Deploy button */}
        <button
          onClick={() => onDeploy(agent)}
          disabled={!!deploying[id]}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px 0', background:deploying[id]?'transparent':'rgba(20,184,166,0.1)', border:'1px solid '+(deploying[id]?C.border:'rgba(20,184,166,0.35)'), borderRadius:6, color:deploying[id]?C.slate:C.teal, fontSize:12, fontFamily:F.mono, letterSpacing:'0.08em', fontWeight:600, cursor:deploying[id]?'not-allowed':'pointer' }}
        >
          <Rocket size={14}/><span>{deploying[id]?'DEPLOYING...':'DEPLOY AGENT'}</span>
        </button>
      </div>
    </div>
  );
}

export default function SmartNation() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { selectedTenant } = useTenant();

  const [agents,    setAgents]    = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [hasMore,   setHasMore]   = useState(false);
  const [vertical,  setVertical]  = useState('all');
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewAgent, setViewAgent] = useState(null);
  const [deploying, setDeploying] = useState({});
  const PAGE_SIZE = 50;

  const loadAgents = useCallback(async (reset) => {
    if (reset) { setPage(1); setAgents([]); }
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const offset = reset ? 0 : (page-1)*PAGE_SIZE;
      const params = new URLSearchParams({ limit:PAGE_SIZE, offset });
      if (vertical && vertical !== 'all') params.append('category', vertical);
      if (search) params.append('search', search);
      const res = await fetch(API+'/api/agents?'+params, { headers:{ Authorization:'Bearer '+token() } });
      const json = await res.json();
      const items = Array.isArray(json) ? json : (json?.data || []);
      const count = json?.total || json?.count || items.length;
      if (reset) setAgents(items); else setAgents(p => [...p, ...items]);
      setTotal(count);
      setHasMore(items.length === PAGE_SIZE);
    } catch(e) {
      addNotification('Failed to load registry', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [vertical, search, page]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch(API+'/api/smartnation/summary', { headers:{ Authorization:'Bearer '+token() } });
      const json = await res.json();
      setSummary(json?.data || json);
    } catch {}
  }, []);

  useEffect(() => { loadAgents(true); }, [vertical, search]);
  useEffect(() => { loadSummary(); }, []);

  const handleDeploy = async (agent) => {
    const id = agent.agentId || agent.id || '';
    setDeploying(p => ({ ...p, [id]:true }));
    setViewAgent(null);
    try {
      const res = await fetch(API+'/api/agents/'+id+'/deploy', {
        method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token() },
        body: JSON.stringify({ tenantId: selectedTenant !== 'consolidated' ? selectedTenant : undefined }),
      });
      const data = await res.json();
      if (!data.success && !data.deploymentId) throw new Error(data.error || 'Deploy failed');
      addNotification((agent.name||id)+' deployed successfully', 'success');
    } catch(e) {
      addNotification('Deploy failed: '+e.message, 'error');
    } finally {
      setDeploying(p => ({ ...p, [id]:false }));
    }
  };

  return (
    <div style={{ padding:'20px', fontFamily:F.body, color:C.white, maxWidth:1200, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontFamily:F.display, fontWeight:700, letterSpacing:'0.08em', color:C.white, margin:0 }}>
          SMARTNATION AI
        </h1>
        <p style={{ color:C.slate, fontSize:11, fontFamily:F.mono, margin:'4px 0 0', letterSpacing:'0.05em' }}>
          GOVERNED AGENT REGISTRY · {loading ? 'LOADING' : total.toLocaleString()+' AGENTS'}
          {selectedTenant !== 'consolidated' && ' · DEPLOYING TO ACTIVE TENANT'}
        </p>
      </div>

      {/* Summary stats */}
      {summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:8, marginBottom:16 }}>
          {[
            { label:'TOTAL AGENTS',  value:(summary.totalAgents||0).toLocaleString(),      accent:C.blue   },
            { label:'ACTIVE',        value:(summary.activeAgents||0).toLocaleString(),      accent:C.green  },
            { label:'AVG GOV SCORE', value:(summary.avgGovernanceScore||0).toFixed(1),     accent:C.teal   },
            { label:'VERTICALS',     value:'8',                                             accent:C.gold   },
          ].map(s => (
            <div key={s.label} style={{ background:C.surface, border:'1px solid '+C.border, borderTop:'2px solid '+s.accent, borderRadius:5, padding:'10px 12px' }}>
              <div style={{ fontSize:9, fontFamily:F.mono, color:C.slate, letterSpacing:'0.08em', marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:20, fontFamily:F.mono, fontWeight:700, color:C.white, lineHeight:1 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:200, display:'flex', alignItems:'center', gap:8, background:C.surface, border:'1px solid '+C.border, borderRadius:5, padding:'0 12px' }}>
          <Search size={13} color={C.slate}/>
          <input type="text" placeholder="Search agents, roles, frameworks..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex:1, background:'none', border:'none', outline:'none', color:C.white, fontSize:12, fontFamily:F.mono, padding:'9px 0' }}/>
          {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', color:C.slate, cursor:'pointer', padding:0 }}><X size={12}/></button>}
        </div>
        <div style={{ position:'relative' }}>
          <select value={vertical} onChange={e => setVertical(e.target.value)}
            style={{ background:C.surface, border:'1px solid '+C.border, borderRadius:5, padding:'8px 32px 8px 12px', color:C.white, fontSize:11, fontFamily:F.mono, cursor:'pointer', appearance:'none' }}>
            {VERTICALS.map(v => <option key={v} value={v} style={{ background:C.bg2 }}>{v === 'all' ? 'ALL VERTICALS' : v.toUpperCase()}</option>)}
          </select>
          <ChevronDown size={11} color={C.slate} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
        </div>
        <button onClick={() => loadAgents(true)} style={{ display:'flex', alignItems:'center', background:'transparent', border:'1px solid '+C.border, borderRadius:5, padding:'8px 12px', color:C.slate, cursor:'pointer' }}>
          <RefreshCw size={11}/>
        </button>
      </div>

      {/* Agent grid */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:240, gap:12 }}>
          <div style={{ width:24, height:24, border:'2px solid '+C.border, borderTop:'2px solid '+C.blue, borderRadius:'50%', animation:'cidg-spin 0.7s linear infinite' }}/>
          <span style={{ color:C.slate, fontSize:10, fontFamily:F.mono }}>LOADING AGENT REGISTRY</span>
          <style>{'@keyframes cidg-spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      ) : agents.length === 0 ? (
        <div style={{ textAlign:'center', padding:48 }}>
          <Shield size={32} color={C.slate} style={{ marginBottom:12, opacity:0.3 }}/>
          <p style={{ color:C.slate, fontSize:12, fontFamily:F.mono }}>No agents found</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:8 }}>
          {agents.map(agent => (
            <AgentCard key={agent.agentId||agent.id} agent={agent} onView={setViewAgent} onDeploy={handleDeploy} deploying={deploying}/>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div style={{ textAlign:'center', marginTop:16 }}>
          <button onClick={() => { setPage(p=>p+1); loadAgents(false); }} disabled={loadingMore}
            style={{ padding:'8px 24px', background:'transparent', border:'1px solid '+C.border, borderRadius:5, color:loadingMore?C.slate:C.white, fontSize:11, fontFamily:F.mono, cursor:loadingMore?'not-allowed':'pointer', letterSpacing:'0.06em' }}>
            {loadingMore ? 'LOADING...' : 'LOAD MORE'}
          </button>
        </div>
      )}

      {/* Agent resume modal */}
      <AgentModal agent={viewAgent} onClose={() => setViewAgent(null)} onDeploy={handleDeploy} deploying={deploying}/>
    </div>
  );
}
