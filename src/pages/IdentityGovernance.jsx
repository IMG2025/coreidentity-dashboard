import React, { useState, useEffect } from 'react';
import { Play, BarChart3, Square, RotateCcw, ChevronDown, ChevronUp, Shield } from 'lucide-react';

const C = {
  bg: '#0a0f1e', surface: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)',
  white: '#f8fafc', slate: '#64748b', blue: '#3b82f6', green: '#22c55e',
  gold: '#d4af37', red: '#ef4444', teal: '#14b8a6',
};
const F = { mono: 'monospace', display: 'monospace', body: 'system-ui' };

const TIER_COLORS = { TIER_1: C.red, TIER_2: C.gold, TIER_3: C.teal };

function PolicyTrace({ trace }) {
  if (!trace) return null;
  return (
    <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: 12, marginTop: 10 }}>
      <div style={{ fontSize: 9, fontFamily: F.mono, color: '#818cf8', letterSpacing: '0.1em', marginBottom: 8 }}>POLICY DECISION TRACE</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {['INPUT','→','POLICY','→','DECISION','→','OUTCOME'].map((s, i) => (
          <span key={i} style={{ fontSize: 10, fontFamily: F.mono, color: s === '→' ? C.slate : C.white, padding: s === '→' ? 0 : '3px 8px', background: s === '→' ? 'transparent' : 'rgba(255,255,255,0.05)', borderRadius: 4 }}>{s}</span>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: F.mono }}>
        Identity: {trace.agentId} · Policy: {trace.policy} · Action: {trace.action} · Outcome: {trace.outcome}
      </div>
    </div>
  );
}

function AgentCard({ agent, token, defaultExpanded }) { // IG_DEFAULT_EXPANDED_FIX
  const [expanded, setExpanded] = useState(defaultExpanded || false);
  const [executing, setExecuting] = useState({});
  const [trace, setTrace] = useState(null);
  const API = 'https://api.coreidentitygroup.com';

  async function handleAction(taskType) {
    const key = agent.agentId + taskType;
    setExecuting(p => ({ ...p, [key]: true }));
    try {
      const r = await fetch(`${API}/api/agents/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ agentId: agent.agentId, taskType }),
      });
      const d = await r.json();
      setTrace({ agentId: agent.agentId, policy: d.data?.salResult?.errorCode || 'GOV-001', action: taskType, outcome: d.data?.salResult?.allowed ? 'PERMITTED' : 'BLOCKED' });
    } catch(e) {} finally {
      setExecuting(p => ({ ...p, [key]: false }));
    }
  }

  const score = agent.governanceScore || 0;
  const scoreColor = score >= 80 ? C.green : score >= 60 ? C.gold : C.red;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.white }}>{agent.name}</div>
          <div style={{ fontSize: 10, color: C.slate, marginTop: 2 }}>{agent.category} · {agent.agentId}</div>
        </div>
        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, border: `1px solid ${TIER_COLORS[agent.riskTier] || C.gold}30`, color: TIER_COLORS[agent.riskTier] || C.gold }}>{agent.riskTier || 'TIER_2'}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor, fontFamily: F.mono }}>{score}</span>
        {expanded ? <ChevronUp size={12} color={C.slate} /> : <ChevronDown size={12} color={C.slate} />}
      </div>
      {expanded && (
        <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {['EXECUTE','ANALYZE'].map(task => (
              <button key={task} onClick={() => handleAction(task)} disabled={!!executing[agent.agentId + task]}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'transparent', border: `1px solid ${task === 'EXECUTE' ? C.green : C.blue}30`, borderRadius: 4, color: executing[agent.agentId + task] ? C.slate : (task === 'EXECUTE' ? C.green : C.blue), fontSize: 9, fontFamily: F.mono, cursor: 'pointer' }}>
                {task === 'EXECUTE' ? <Play size={8} /> : <BarChart3 size={8} />}{executing[agent.agentId + task] ? '...' : task}
              </button>
            ))}
          </div>
          <PolicyTrace trace={trace} />
        </div>
      )}
    </div>
  );
}

// ── Financial Authority Panel ──────────────────────────────────
function FinancialAuthorityPanel({ agents }) {
  const withFA = agents.filter(a => a.financial_authority);
  if (!withFA.length) return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontFamily: F.mono, color: C.slate, letterSpacing: '0.1em', marginBottom: 8 }}>FINANCIAL AUTHORITY — TRANSACTION LIMITS</div>
      <div style={{ fontSize: 11, color: C.slate }}>No agents with financial_authority configured in current view.</div>
    </div>
  );
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontFamily: F.mono, color: C.gold, letterSpacing: '0.1em', marginBottom: 12 }}>FINANCIAL AUTHORITY — {withFA.length} AGENTS WITH LIMITS</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {['Agent', 'Max Txn', 'Daily Limit', 'Daily Spend', 'Currencies', 'Txn Types'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9, fontFamily: F.mono, color: C.slate, textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {withFA.map((a, i) => {
            const fa = a.financial_authority;
            return (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}44` }}>
                <td style={{ padding: '8px 10px', color: C.white, fontSize: 11 }}>{a.name}</td>
                <td style={{ padding: '8px 10px', color: C.gold, fontFamily: F.mono }}>${(fa.max_transaction_amount || 0).toLocaleString()}</td>
                <td style={{ padding: '8px 10px', color: C.blue, fontFamily: F.mono }}>${(fa.daily_limit || 0).toLocaleString()}</td>
                <td style={{ padding: '8px 10px', color: a.daily_spent > (fa.daily_limit * 0.8) ? C.red : C.green, fontFamily: F.mono }}>${(a.daily_spent || 0).toLocaleString()}</td>
                <td style={{ padding: '8px 10px', color: C.slate }}>{(fa.allowed_currencies || ['USD']).join(', ')}</td>
                <td style={{ padding: '8px 10px', color: C.slate }}>{(fa.transaction_types || []).slice(0, 2).join(', ')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Inter-Agent Trust Panel ────────────────────────────────────
function InterAgentTrustPanel({ agents }) {
  const withDelegations = agents.filter(a => a.delegation_chain_depth > 0);
  return (
    <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontFamily: F.mono, color: '#818cf8', letterSpacing: '0.1em', marginBottom: 12 }}>INTER-AGENT TRUST — DELEGATION CHAINS</div>
      {!withDelegations.length ? (
        <div style={{ fontSize: 11, color: C.slate }}>No active delegations. Maximum chain depth: 5.</div>
      ) : withDelegations.map((a, i) => {
        const depth = a.delegation_chain_depth || 0;
        const pct   = (depth / 5) * 100;
        const color = depth >= 4 ? C.red : depth >= 3 ? C.gold : '#818cf8';
        return (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: C.white }}>{a.name}</span>
              <span style={{ fontSize: 11, fontFamily: F.mono, color }}>{depth}/5 {depth >= 4 ? '⚠ Approaching limit' : ''}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function IdentityGovernance({ token }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const API = 'https://api.coreidentitygroup.com';

  // FIX08_TOKEN_FALLBACK: use localStorage as fallback; handle array+object responses
  useEffect(() => {
    const resolvedToken = token || localStorage.getItem('ci_token') || localStorage.getItem('token');
    if (!resolvedToken) { setLoading(false); return; }
    fetch(`${API}/api/agents?limit=50`, { headers: { Authorization: `Bearer ${resolvedToken}` } })
      .then(r => r.json())
      .then(d => {
        const items = d.data || (Array.isArray(d) ? d : []);
        setAgents(items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const filtered = agents.filter(a => {
    const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || a.riskTier === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div style={{ padding: '20px', fontFamily: F.body, color: C.white, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontFamily: F.mono, color: C.slate, letterSpacing: '0.15em', marginBottom: 6 }}>AGENTIC EXECUTION GOVERNANCE</div>
        <h1 style={{ fontSize: 20, fontFamily: F.display, letterSpacing: '0.08em', margin: 0, fontWeight: 700 }}>IDENTITY GOVERNANCE</h1>
        <div style={{ fontSize: 10, color: C.slate, marginTop: 4 }}>{agents.length} governed identities · All under AEG enforcement</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents..."
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: C.white, fontSize: 11, fontFamily: F.body, outline: 'none' }} />
        {['all','TIER_1','TIER_2','TIER_3'].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            style={{ padding: '6px 12px', background: filter === t ? 'rgba(255,255,255,0.1)' : 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: filter === t ? C.white : C.slate, fontSize: 10, fontFamily: F.mono, cursor: 'pointer' }}>
            {t === 'all' ? 'ALL' : t}
          </button>
        ))}
      </div>

      {!loading && <FinancialAuthorityPanel agents={filtered} />}
      {!loading && <InterAgentTrustPanel agents={filtered} />}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.slate, fontFamily: F.mono, fontSize: 11 }}>LOADING GOVERNED IDENTITIES...</div>
      ) : (
        filtered.map((a, i) => <AgentCard key={a.agentId} agent={a} token={token} defaultExpanded={i === 0} />)
      )}
    </div>
  );
}
