/* script-41 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, Users, Activity, Shield,
  Zap, RefreshCw, AlertTriangle, CheckCircle, Clock
} from 'lucide-react';
import { C, F } from '../chc-design.js';

const API = 'https://api.coreidentitygroup.com';
const token = () => localStorage.getItem('ci_token') || localStorage.getItem('token') || '';

// ── Components ────────────────────────────────────────────────────────────────

function TelemetryCard({ icon: Icon, label, value, sub, accent, mono }) {
  return (
    <div style={{
      background: C.surface,
      border: '1px solid ' + C.border,
      borderTop: '2px solid ' + (accent || C.blue),
      borderRadius: 6,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: C.slate, fontSize: 10, fontFamily: F.mono, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
        <Icon size={14} color={accent || C.blue} />
      </div>
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        fontFamily: mono ? F.mono : F.display,
        color: C.white,
        letterSpacing: mono ? '0.02em' : '0.05em',
        lineHeight: 1,
      }}>
        {value !== undefined && value !== null ? value : '—'}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: C.slate, fontFamily: F.mono }}>{sub}</div>
      )}
    </div>
  );
}

function BarRow({ label, value, max, accent }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        fontSize: 11,
        color: C.slate,
        fontFamily: F.mono,
        width: 120,
        flexShrink: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>{label}</span>
      <div style={{
        flex: 1,
        height: 3,
        background: C.border,
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: pct + '%',
          background: accent || C.blue,
          borderRadius: 2,
          transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      <span style={{
        fontSize: 11,
        fontFamily: F.mono,
        color: C.white,
        width: 32,
        textAlign: 'right',
        flexShrink: 0,
      }}>{value}</span>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{
        color: C.white,
        fontSize: 12,
        fontFamily: F.mono,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        margin: 0,
      }}>{title}</h2>
      {sub && <p style={{ color: C.slate, fontSize: 11, margin: '3px 0 0', fontFamily: F.mono }}>{sub}</p>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Analytics() {
  const [data,     setData]     = useState(null);
  const [tenants,  setTenants]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, tenantsRes] = await Promise.all([
        fetch(API + '/api/analytics', {
          credentials: 'include',
          headers: { Authorization: 'Bearer ' + token() }
        }),
        fetch(API + '/api/tenants', {
          credentials: 'include',
          headers: { Authorization: 'Bearer ' + token() }
        }),
      ]);

      const analyticsJson = await analyticsRes.json();
      const tenantsJson   = await tenantsRes.json();

      // analyticsJson is the raw API response: { success, data: { summary, ... }, latencyMs }
      // api.js in some places unwraps .data, direct fetch does not
      const raw     = analyticsJson?.data || analyticsJson;
      const summary = raw?.summary || {};

      setData({
        totalAgents:        summary.totalAgents        || raw?.totalAgents       || 0,
        activeAgents:       summary.activeDeployments  || raw?.activeAgents      || 0,
        totalDeployments:   summary.totalDeployments   || raw?.totalDeployments  || 0,
        activeDeployments:  summary.activeDeployments  || raw?.activeDeployments || 0,
        totalExecutions:    summary.totalExecutions    || raw?.totalExecutions   || 0,
        successRate:        summary.successRate        || raw?.successRate       || 0,
        avgAgentRating:     summary.avgAgentRating     || raw?.avgAgentRating    || 0,
        governedAgents:     summary.governedAgents     || raw?.governedAgents    || 0,
        deploymentsByStatus:   raw?.deploymentsByStatus   || {},
        deploymentsByCategory: raw?.deploymentsByCategory || {},
        executionsByStatus:    raw?.executionsByStatus    || {},
        executionsByType:      raw?.executionsByType      || {},
        activityTimeline:      raw?.activityTimeline      || [],
        recentDeployments:     raw?.recentDeployments     || [],
        recentExecutions:      raw?.recentExecutions      || [],
      });

      const tData = tenantsJson?.data || tenantsJson || [];
      setTenants(Array.isArray(tData) ? tData : []);
      setLastFetch(new Date().toISOString());
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derived metrics
  const totalTenantExecs   = tenants.reduce((s, c) => s + (parseInt(c.totalExecutions) || 0), 0);
  const totalTenantViolations = tenants.reduce((s, c) => s + (parseInt(c.totalViolations) || 0), 0);
  const avgGovScore        = tenants.length > 0
    ? (tenants.reduce((s, c) => s + (parseFloat(c.governanceScore) || 0), 0) / tenants.length).toFixed(1)
    : '—';

  if (loading) return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: 300,
      gap: 12,
    }}>
      <div style={{
        width: 28,
        height: 28,
        border: '2px solid ' + C.border,
        borderTop: '2px solid ' + C.blue,
        borderRadius: '50%',
        animation: 'cidg-spin 0.8s linear infinite',
      }} />
      <span style={{ color: C.slate, fontSize: 11, fontFamily: F.mono }}>LOADING ANALYTICS</span>
      <style>{'@keyframes cidg-spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );

  if (error) return (
    <div style={{
      background: 'rgba(239,68,68,0.05)',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: 6,
      padding: 24,
      margin: 24,
      textAlign: 'center',
    }}>
      <AlertTriangle size={24} color="#ef4444" style={{ marginBottom: 8 }} />
      <p style={{ color: '#ef4444', fontSize: 13, fontFamily: F.mono }}>{error}</p>
      <button onClick={load} style={{
        marginTop: 12, padding: '6px 16px', background: 'transparent',
        border: '1px solid ' + C.border, borderRadius: 4,
        color: C.slate, fontSize: 11, fontFamily: F.mono, cursor: 'pointer',
      }}>RETRY</button>
    </div>
  );

  const d = data || {};
  const est = d.executionsByType || {};
  const ess = d.executionsByStatus || {};
  const cat = d.deploymentsByCategory || {};
  const maxEst = Math.max(...Object.values(est), 1);
  const maxCat = Math.max(...Object.values(cat), 1);
  const maxEss = Math.max(...Object.values(ess), 1);

  return (
    <div style={{
      padding: '24px 20px',
      fontFamily: F.body,
      color: C.white,
      maxWidth: 1200,
      margin: '0 auto',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontSize: 22,
            fontFamily: F.display,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: C.white,
            margin: 0,
          }}>ANALYTICS</h1>
          <p style={{ color: C.slate, fontSize: 11, fontFamily: F.mono, margin: '4px 0 0', letterSpacing: '0.05em' }}>
            PLATFORM TELEMETRY · LIVE DATA
            {lastFetch && ' · ' + new Date(lastFetch).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={load}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'transparent',
            border: '1px solid ' + C.border,
            borderRadius: 4, padding: '6px 12px',
            color: C.slate, fontSize: 10,
            fontFamily: F.mono, cursor: 'pointer',
            letterSpacing: '0.08em',
          }}
        >
          <RefreshCw size={11} />
          <span>REFRESH</span>
        </button>
      </div>

      {/* Platform stats */}
      <div style={{ marginBottom: 20 }}>
        <SectionHeader title="Platform Overview" sub="Aggregate across all governed infrastructure" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <TelemetryCard icon={Users}    label="AI Agents"       value={(d.totalAgents || 0).toLocaleString()}      accent={C.blue}   sub="SmartNation registry" />
          <TelemetryCard icon={Shield}   label="Governed"        value={(d.governedAgents || 0).toLocaleString()}   accent={C.teal}   sub="Under CoreIdentity" />
          <TelemetryCard icon={Zap}      label="Executions"      value={(d.totalExecutions || 0).toLocaleString()}  accent={C.purple} sub={(d.successRate || 0) + '% success'} mono />
          <TelemetryCard icon={Activity} label="Deployments"     value={(d.totalDeployments || 0).toLocaleString()} accent={C.green}  sub={(d.activeDeployments || 0) + ' active'} mono />
        </div>
      </div>

      {/* Tenant simulation stats */}
      {tenants.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionHeader title="Simulation Engine" sub="Live autonomous execution across 5 governed companies" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <TelemetryCard icon={Users}        label="Active Companies"  value={tenants.length}                              accent={C.gold}   />
            <TelemetryCard icon={Zap}          label="Total Executions"  value={totalTenantExecs.toLocaleString()}            accent={C.blue}   mono />
            <TelemetryCard icon={AlertTriangle} label="Violations"       value={totalTenantViolations.toLocaleString()}       accent="#ef4444"  mono />
            <TelemetryCard icon={TrendingUp}   label="Avg Gov Score"     value={avgGovScore}                                  accent={C.teal}   />
          </div>

          {/* Tenant score table */}
          <div style={{
            marginTop: 12,
            background: C.surface,
            border: '1px solid ' + C.border,
            borderRadius: 6,
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 90px 90px 90px',
              padding: '8px 16px',
              borderBottom: '1px solid ' + C.border,
              background: C.bg2,
            }}>
              {['Company', 'Vertical', 'Score', 'Executions', 'Violations'].map(h => (
                <span key={h} style={{ fontSize: 10, fontFamily: F.mono, color: C.slate, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>
            {tenants.map((t, i) => {
              const score = parseFloat(t.governanceScore) || 0;
              const scoreColor = score >= 70 ? C.green : score >= 50 ? C.gold : '#ef4444';
              return (
                <div key={t.clientId} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 90px 90px 90px',
                  padding: '10px 16px',
                  borderBottom: i < tenants.length - 1 ? '1px solid ' + C.border : 'none',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 12, color: C.white, fontWeight: 500 }}>{t.companyName}</span>
                  <span style={{ fontSize: 10, color: C.slate, fontFamily: F.mono }}>{(t.vertical || '').slice(0, 14)}</span>
                  <span style={{ fontSize: 13, fontFamily: F.mono, color: scoreColor, fontWeight: 700 }}>{score.toFixed(1)}</span>
                  <span style={{ fontSize: 11, fontFamily: F.mono, color: C.white }}>{(parseInt(t.totalExecutions) || 0).toLocaleString()}</span>
                  <span style={{ fontSize: 11, fontFamily: F.mono, color: (parseInt(t.totalViolations) || 0) > 0 ? '#ef4444' : C.slate }}>
                    {(parseInt(t.totalViolations) || 0).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity timeline */}
      {d.activityTimeline && d.activityTimeline.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionHeader title="Activity — Last 7 Days" />
          <div style={{
            background: C.surface,
            border: '1px solid ' + C.border,
            borderRadius: 6,
            padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
              {d.activityTimeline.map((day, i) => {
                const maxV = Math.max(...d.activityTimeline.map(d => (d.deployments || 0) + (d.executions || 0)), 1);
                const total = (day.deployments || 0) + (day.executions || 0);
                const hPct  = total > 0 ? Math.max(Math.round((total / maxV) * 100), 4) : 2;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: '100%',
                      background: C.blue,
                      borderRadius: '2px 2px 0 0',
                      height: hPct * 0.72 + 'px',
                      opacity: 0.85,
                      transition: 'height 0.4s ease',
                    }} title={total + ' events'} />
                    <span style={{ fontSize: 9, fontFamily: F.mono, color: C.slate }}>{(day.date || '').slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Breakdowns grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 20 }}>

        {/* Executions by type */}
        <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 6, padding: '16px 18px' }}>
          <SectionHeader title="Executions by Type" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.keys(est).length === 0
              ? <span style={{ color: C.slate, fontSize: 11, fontFamily: F.mono }}>No execution data</span>
              : Object.entries(est).map(([k, v]) => (
                  <BarRow key={k} label={k} value={v} max={maxEst} accent={C.purple} />
                ))
            }
          </div>
        </div>

        {/* Executions by status */}
        <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 6, padding: '16px 18px' }}>
          <SectionHeader title="Executions by Status" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.keys(ess).length === 0
              ? <span style={{ color: C.slate, fontSize: 11, fontFamily: F.mono }}>No status data</span>
              : Object.entries(ess).map(([k, v]) => {
                  const accent = k === 'OK' || k === 'completed' ? C.green : k === 'FAILED' ? '#ef4444' : C.gold;
                  return <BarRow key={k} label={k} value={v} max={maxEss} accent={accent} />;
                })
            }
          </div>
        </div>

        {/* Deployments by category */}
        {Object.keys(cat).length > 0 && (
          <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 6, padding: '16px 18px' }}>
            <SectionHeader title="Deployments by Category" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(cat).map(([k, v]) => (
                <BarRow key={k} label={k} value={v} max={maxCat} accent={C.teal} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent executions */}
      {d.recentExecutions && d.recentExecutions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionHeader title="Recent Executions" />
          <div style={{
            background: C.surface,
            border: '1px solid ' + C.border,
            borderRadius: 6,
            overflow: 'hidden',
          }}>
            {d.recentExecutions.slice(0, 8).map((e, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: i < 7 ? '1px solid ' + C.border : 'none',
                gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <Zap size={12} color={C.purple} style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontSize: 12, color: C.white, margin: 0,
                      fontFamily: F.mono, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {e.agentId} — {e.taskType}
                    </p>
                    <p style={{ fontSize: 10, color: C.slate, margin: '2px 0 0', fontFamily: F.mono }}>
                      {e.startedAt ? new Date(e.startedAt).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: 3,
                  fontSize: 10,
                  fontFamily: F.mono,
                  letterSpacing: '0.05em',
                  background: (e.status === 'OK' || e.status === 'completed') ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.1)',
                  color: (e.status === 'OK' || e.status === 'completed') ? C.green : C.slate,
                  border: '1px solid ' + ((e.status === 'OK' || e.status === 'completed') ? 'rgba(34,197,94,0.2)' : C.border),
                  flexShrink: 0,
                }}>
                  {e.status || 'PENDING'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
