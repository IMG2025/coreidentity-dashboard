// DPODashboard.jsx — AGO Autonomous DPO Function
// Phase 3: Three panels — Agent Overview · Open Interventions · Live Event Stream
import { useState, useEffect, useCallback } from 'react';

const API_URL = 'https://api.coreidentitygroup.com';

const C = {
  bg: '#0a0e1a', surface: '#111827', surface2: '#1a2235', border: '#1f2937',
  white: '#f1f5f9', slate: '#94a3b8', gold: '#d4a843', blue: '#3b82f6',
  green: '#22c55e', red: '#ef4444', orange: '#f97316', teal: '#14b8a6',
  purple: '#a855f7',
};

function authHeaders() {
  const token = localStorage.getItem('ci_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

function Pill({ label, color }) {
  return (
    <span style={{
      background: color + '22', color, border: '1px solid ' + color + '44',
      borderRadius: 4, fontSize: 10, padding: '2px 8px', fontWeight: 600,
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

function SecHdr({ title, live, action }) {
  return (
    <div style={{
      borderBottom: '1px solid ' + C.border, paddingBottom: 10, marginBottom: 16,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={{ color: C.slate, fontSize: 11, textTransform: 'uppercase' }}>{title}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {action}
        {live && (
          <span style={{
            background: C.green + '22', color: C.green, border: '1px solid ' + C.green + '44',
            borderRadius: 4, fontSize: 9, padding: '2px 8px', fontWeight: 600,
          }}>● LIVE</span>
        )}
      </div>
    </div>
  );
}

// ── Panel 1: Active Agent Overview ────────────────────────────
function AgentOverviewPanel({ report, loading }) {
  if (loading) return <div style={{ color: C.slate, padding: 20, textAlign: 'center' }}>⏳ Loading report…</div>;
  if (!report)  return <div style={{ color: C.slate, padding: 20, textAlign: 'center' }}>No report data</div>;

  const { summary, activeAgents, complianceGaps } = report;

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Active Agents',    value: summary?.activeAgents || 0,     color: C.teal },
          { label: 'Executions (30d)', value: summary?.totalExecutions || 0,   color: C.blue },
          { label: 'Violations',       value: summary?.policyViolations || 0,  color: C.red },
          { label: 'Compliance Gaps',  value: summary?.complianceGaps || 0,    color: C.orange },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: C.surface, border: '1px solid ' + C.border, borderRadius: 8,
            padding: '14px 20px', flex: 1, minWidth: 120,
          }}>
            <div style={{ color: C.slate, fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
            <div style={{ color, fontSize: 24, fontWeight: 700, fontFamily: 'monospace' }}>{value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Agent table */}
      <SecHdr title={`Data Access Scopes — ${(activeAgents || []).length} agents`} live={true} />
      <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid ' + C.border, borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.surface, borderBottom: '1px solid ' + C.border }}>
              {['Agent ID', 'Executions', 'Data Scopes', 'Last Seen'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: C.slate, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(activeAgents || []).slice(0, 20).map((a, i) => (
              <tr key={i} style={{ borderBottom: '1px solid ' + C.border + '66' }}>
                <td style={{ padding: '8px 12px', color: C.white, fontFamily: 'monospace', fontSize: 11 }}>{a.agentId}</td>
                <td style={{ padding: '8px 12px', color: C.gold, fontFamily: 'monospace' }}>{a.executionCount}</td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(a.scopes || []).slice(0, 3).map(s => <Pill key={s} label={s} color={C.teal} />)}
                    {(a.scopes || []).length > 3 && <span style={{ color: C.slate, fontSize: 10 }}>+{a.scopes.length - 3}</span>}
                  </div>
                </td>
                <td style={{ padding: '8px 12px', color: C.slate, fontSize: 11 }}>
                  {a.lastSeen ? new Date(a.lastSeen).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
            {!(activeAgents || []).length && (
              <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: C.slate }}>No agent execution data in last 30 days</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Compliance gaps */}
      {(complianceGaps || []).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <SecHdr title="Compliance Gaps" />
          {complianceGaps.slice(0, 5).map((g, i) => (
            <div key={i} style={{
              background: C.surface, border: '1px solid ' + C.orange + '33', borderRadius: 6,
              padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ color: C.white, fontSize: 12, fontWeight: 500 }}>{g.gap}</div>
                <div style={{ color: C.slate, fontSize: 11, marginTop: 2 }}>{g.description}</div>
              </div>
              <Pill label={g.severity} color={g.severity === 'HIGH' ? C.red : C.orange} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Panel 2: Open Interventions ───────────────────────────────
function InterventionsPanel({ events, onIntervene }) {
  const [agentId,  setAgentId]  = useState('');
  const [reason,   setReason]   = useState('');
  const [action,   setAction]   = useState('audit');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [err,      setErr]      = useState(null);

  const submit = async () => {
    if (!agentId || !reason) return;
    setLoading(true); setErr(null); setResult(null);
    try {
      const res = await fetch(API_URL + '/api/ago/dpo/intervention', {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ agent_id: agentId, reason, action }),
      });
      const json = await res.json();
      if (json.success) { setResult(json); onIntervene && onIntervene(); setAgentId(''); setReason(''); }
      else setErr(json.error || 'Intervention failed');
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const openInterventions = (events || []).filter(e => e.event_type === 'DPO_INTERVENTION');

  return (
    <div>
      {/* New intervention form */}
      <div style={{ background: C.surface2, border: '1px solid ' + C.orange + '44', borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <SecHdr title="Issue DPO Intervention" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: C.slate, fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>Agent ID</div>
            <input value={agentId} onChange={e => setAgentId(e.target.value)}
              placeholder="agent-id or uuid"
              style={{ background: C.surface, border: '1px solid ' + C.border, color: C.white, borderRadius: 6, padding: '8px 12px', fontSize: 12, width: '100%' }} />
          </div>
          <div>
            <div style={{ color: C.slate, fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>Action</div>
            <select value={action} onChange={e => setAction(e.target.value)}
              style={{ background: C.surface, border: '1px solid ' + C.border, color: C.white, borderRadius: 6, padding: '8px 12px', fontSize: 12, width: '100%' }}>
              <option value="audit">Audit</option>
              <option value="restrict">Restrict</option>
              <option value="suspend">Suspend</option>
            </select>
          </div>
          <button onClick={submit} disabled={loading || !agentId || !reason}
            style={{
              background: loading ? C.border : C.orange + '22', border: '1px solid ' + C.orange,
              color: loading ? C.slate : C.orange, borderRadius: 6, padding: '8px 20px',
              fontSize: 12, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
            }}>
            {loading ? '⏳' : '⚡ Issue'}
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ color: C.slate, fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>Reason / Justification</div>
          <input value={reason} onChange={e => setReason(e.target.value)}
            placeholder="DPO intervention reason (immutable audit record)"
            style={{ background: C.surface, border: '1px solid ' + C.border, color: C.white, borderRadius: 6, padding: '8px 12px', fontSize: 12, width: '100%' }} />
        </div>
        {result && <div style={{ color: C.green, fontSize: 12, marginTop: 8 }}>✓ {result.message}</div>}
        {err    && <div style={{ color: C.red,   fontSize: 12, marginTop: 8 }}>⚠ {err}</div>}
      </div>

      {/* Recent interventions */}
      <SecHdr title={`Recent DPO Interventions (${openInterventions.length})`} live={true} />
      {openInterventions.length === 0 ? (
        <div style={{ color: C.slate, textAlign: 'center', padding: 20 }}>No DPO interventions recorded</div>
      ) : openInterventions.slice(0, 10).map((e, i) => (
        <div key={i} style={{
          background: C.surface, border: '1px solid ' + C.border, borderRadius: 6, padding: '12px 16px', marginBottom: 8,
          borderLeft: '3px solid ' + (e.action === 'suspend' ? C.red : e.action === 'restrict' ? C.orange : C.teal),
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: C.white, fontSize: 12, fontWeight: 500 }}>{e.agentId}</div>
              <div style={{ color: C.slate, fontSize: 11, marginTop: 2 }}>{e.reason}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Pill label={e.action || 'audit'} color={e.action === 'suspend' ? C.red : e.action === 'restrict' ? C.orange : C.teal} />
              <div style={{ color: C.slate, fontSize: 10, marginTop: 4 }}>
                {e.timestamp ? new Date(e.timestamp).toLocaleString() : '—'}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Panel 3: Live Event Stream ────────────────────────────────
function EventStreamPanel({ events, loading }) {
  const fmtAgo = iso => {
    if (!iso) return '—';
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60)   return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    return Math.floor(s / 3600) + 'h ago';
  };

  const eventColor = type => {
    if (type?.includes('FAIL') || type?.includes('DENY'))  return C.red;
    if (type?.includes('WARN') || type?.includes('RESTRICT')) return C.orange;
    if (type?.includes('DPO'))  return C.purple;
    return C.green;
  };

  return (
    <div>
      <SecHdr title={`DPO Event Stream — Last 50 events`} live={true} />
      {loading && <div style={{ color: C.slate, textAlign: 'center', padding: 20 }}>⏳ Loading events…</div>}
      {!loading && events.length === 0 && (
        <div style={{ color: C.slate, textAlign: 'center', padding: 20 }}>No DPO events recorded yet</div>
      )}
      {!loading && events.length > 0 && (
        <div style={{ border: '1px solid ' + C.border, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.surface, borderBottom: '1px solid ' + C.border }}>
                {['Time', 'Event Type', 'Agent', 'Action', 'Actor'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: C.slate, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid ' + C.border + '66', background: i % 2 === 0 ? 'transparent' : C.surface + '66' }}>
                  <td style={{ padding: '8px 12px', color: C.slate, whiteSpace: 'nowrap' }}>{fmtAgo(e.timestamp)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ color: eventColor(e.event_type), fontFamily: 'monospace', fontSize: 11 }}>{e.event_type || '—'}</span>
                  </td>
                  <td style={{ padding: '8px 12px', color: C.white, fontFamily: 'monospace', fontSize: 11 }}>{e.agentId || e.agent_id || '—'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {e.action && <Pill label={e.action} color={e.action === 'suspend' ? C.red : e.action === 'restrict' ? C.orange : C.teal} />}
                  </td>
                  <td style={{ padding: '8px 12px', color: C.slate, fontSize: 11 }}>{e.actor || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main DPODashboard ─────────────────────────────────────────
export default function DPODashboard({ token }) {
  const [panel,   setPanel]   = useState('overview');
  const [report,  setReport]  = useState(null);
  const [events,  setEvents]  = useState([]);
  const [loadRep, setLoadRep] = useState(true);
  const [loadEvt, setLoadEvt] = useState(true);

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(API_URL + '/api/ago/dpo/report', {
        credentials: 'include', headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) setReport(json);
    } catch (_) {}
    finally { setLoadRep(false); }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(API_URL + '/api/ago/dpo/events?limit=50', {
        credentials: 'include', headers: authHeaders(),
      });
      const json = await res.json();
      if (json.data) setEvents(json.data);
    } catch (_) {}
    finally { setLoadEvt(false); }
  }, []);

  useEffect(() => {
    fetchReport();
    fetchEvents();
    const t = setInterval(fetchEvents, 10000);
    return () => clearInterval(t);
  }, [fetchReport, fetchEvents]);

  const PANELS = [
    { id: 'overview',      label: 'Agent Overview' },
    { id: 'interventions', label: 'Interventions' },
    { id: 'stream',        label: '⚡ Live Events' },
  ];

  return (
    <div style={{ background: C.bg, borderRadius: 8, overflow: 'hidden', border: '1px solid ' + C.border }}>
      {/* DPO header */}
      <div style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(168,85,247,0.04))', borderBottom: '1px solid rgba(168,85,247,0.3)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.purple, boxShadow: '0 0 8px ' + C.purple }} />
          <span style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.1em', color: C.purple }}>AGO — AUTONOMOUS DPO FUNCTION</span>
        </div>
        <Pill label="GDPR Art. 37-39 Compliant" color={C.purple} />
      </div>

      {/* Panel tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid ' + C.border, padding: '0 20px' }}>
        {PANELS.map(p => (
          <button key={p.id} onClick={() => setPanel(p.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '12px 16px', fontSize: 12,
            color: panel === p.id ? C.purple : C.slate,
            borderBottom: panel === p.id ? '2px solid ' + C.purple : '2px solid transparent',
          }}>{p.label}</button>
        ))}
      </div>

      {/* Panel content */}
      <div style={{ padding: 20 }}>
        {panel === 'overview'      && <AgentOverviewPanel report={report} loading={loadRep} />}
        {panel === 'interventions' && <InterventionsPanel events={events} onIntervene={() => { fetchEvents(); fetchReport(); }} />}
        {panel === 'stream'        && <EventStreamPanel events={events} loading={loadEvt} />}
      </div>
    </div>
  );
}
