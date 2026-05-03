import React, { useState, useEffect, useRef } from 'react';
import { Shield, Activity, Zap, Lock, Cpu, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import DPODashboard from '../components/DPODashboard.jsx';

const C = {
  bg: '#0a0f1e', surface: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)',
  white: '#f8fafc', slate: '#64748b', blue: '#3b82f6', green: '#22c55e',
  gold: '#d4af37', red: '#ef4444', teal: '#14b8a6', indigo: '#6366f1',
};
const F = { mono: 'monospace', display: 'monospace', body: 'system-ui' };

function StatCard({ icon: Icon, label, value, sub, color = C.blue, pulse = false }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: 9, fontFamily: F.mono, color: C.slate, letterSpacing: '0.1em' }}>{label}</span>
        {pulse && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}`, animation: 'cidg-pulse 2s infinite' }} />}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: F.mono }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.slate, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function ThreatPanel({ events }) {
  const threats = events.filter(e => e.action === 'DROP' || e.is_threat);
  const latest = threats[0];
  return (
    <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <AlertTriangle size={14} color={C.red} />
        <span style={{ fontSize: 10, fontFamily: F.mono, color: C.red, letterSpacing: '0.12em' }}>ACTIVE THREAT INTERRUPTION</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: C.slate, fontFamily: F.mono }}>{threats.length} events</span>
      </div>
      {latest ? (
        <div>
          <div style={{ fontSize: 11, color: C.white, fontWeight: 600, marginBottom: 4 }}>{latest.identity?.agent_name || 'Unknown Agent'}</div>
          <div style={{ fontSize: 10, color: C.slate, fontFamily: F.mono, marginBottom: 6 }}>{latest.policy_name} · {latest.outcome}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{latest.narrative}</div>
          <div style={{ marginTop: 8, fontSize: 9, fontFamily: F.mono, color: C.red }}>
            ACTION: {latest.action} · SEVERITY: {latest.severity} · {new Date(latest.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: C.slate, fontFamily: F.mono }}>No active threats detected</div>
      )}
    </div>
  );
}

function EventStream({ events }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 9, fontFamily: F.mono, color: C.slate, letterSpacing: '0.1em', marginBottom: 10 }}>LIVE ENFORCEMENT STREAM</div>
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {events.slice(0, 20).map((e, i) => (
          <div key={e.event_id || i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: `1px solid ${C.border}`, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 9, fontFamily: F.mono, color: e.action === 'DROP' ? C.red : C.green, flexShrink: 0, marginTop: 1 }}>{e.action}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 1.4 }}>{e.narrative}</span>
            <span style={{ fontSize: 8, color: C.slate, fontFamily: F.mono, flexShrink: 0 }}>{new Date(e.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
        {events.length === 0 && <div style={{ fontSize: 10, color: C.slate, fontFamily: F.mono }}>Waiting for enforcement events...</div>}
      </div>
    </div>
  );
}

export default function CommandCenter({ token }) {
  const [activeTab, setActiveTab] = useState('enforcement');
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [sentinelStatus, setSentinelStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const API = 'https://api.coreidentitygroup.com';

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch summary
    fetch(`${API}/api/events/summary`, { headers })
      .then(r => r.json()).then(d => setSummary(d.data)).catch(() => {});

    // Fetch recent events
    fetch(`${API}/api/events/recent?limit=50`, { headers })
      .then(r => r.json()).then(d => { setEvents(d.data || []); setLoading(false); }).catch(() => setLoading(false));

    // Fetch sentinel status
    fetch(`${API}/api/sentinel/status`, { headers })
      .then(r => r.json()).then(d => setSentinelStatus(d.data)).catch(() => {});

    // Poll events every 10s
    const interval = setInterval(() => {
      fetch(`${API}/api/events/recent?limit=50`, { headers })
        .then(r => r.json()).then(d => setEvents(d.data || [])).catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  return (
    <div style={{ padding: '20px', fontFamily: F.body, color: C.white, maxWidth: 1200, margin: '0 auto' }}>
      <style>{'@keyframes cidg-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }'}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontFamily: F.mono, color: C.slate, letterSpacing: '0.15em', marginBottom: 6 }}>AGENTIC EXECUTION GOVERNANCE</div>
        <h1 style={{ fontSize: 20, fontFamily: F.display, letterSpacing: '0.08em', margin: 0, fontWeight: 700 }}>COMMAND CENTER</h1>
        <div style={{ fontSize: 10, color: C.slate, marginTop: 4 }}>
          Simulated Enterprise Environment (Policy-Accurate) · {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        <StatCard icon={Shield} label="SENTINEL OS" value={sentinelStatus?.status || 'OPERATIONAL'} sub="Policy enforcement active" color={C.green} pulse />
        <StatCard icon={Activity} label="ENFORCEMENT EVENTS" value={summary?.total || 0} sub={`${summary?.blocked || 0} blocked`} color={C.blue} />
        <StatCard icon={AlertTriangle} label="THREATS BLOCKED" value={summary?.blocked || 0} sub="SAL enforcement" color={C.red} />
        <StatCard icon={CheckCircle} label="PERMITTED" value={summary?.permitted || 0} sub="Policy compliant" color={C.green} />
        <StatCard icon={Lock} label="PQC STATUS" value="ACTIVE" sub="FIPS 203/204/205" color={C.teal} />
        <StatCard icon={Cpu} label="AIS" value="LIVE" sub="agentidentity.systems" color={C.indigo} pulse />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 16, gap: 0 }}>
        {[
          { id: 'enforcement', label: '⚡ Enforcement Stream' },
          { id: 'dpo',         label: '🛡 Autonomous DPO' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '10px 20px',
            fontSize: 12, fontFamily: F.mono,
            color: activeTab === t.id ? C.indigo : C.slate,
            borderBottom: activeTab === t.id ? '2px solid ' + C.indigo : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'enforcement' && (
        <>
          <ThreatPanel events={events} />
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.slate, fontFamily: F.mono, fontSize: 11 }}>LOADING ENFORCEMENT EVENTS...</div>
          ) : (
            <EventStream events={events} />
          )}
        </>
      )}
      {activeTab === 'dpo' && <DPODashboard token={token} />}
    </div>
  );
}
