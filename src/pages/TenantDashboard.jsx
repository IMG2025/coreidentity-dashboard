/* script-41 */
import React, { useState, useEffect } from 'react';
import {
  Building2, Shield, Activity, AlertTriangle, CheckCircle,
  TrendingUp, Users, Zap, RefreshCw, ChevronRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useTenant } from '../context/TenantContext';
import { C, F } from '../chc-design.js';

const API = 'https://api.coreidentitygroup.com';
const token = () => localStorage.getItem('ci_token') || localStorage.getItem('token') || '';

const TIER_CONFIG = {
  TIER_1: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
  TIER_2: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
  TIER_3: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
};

function TelemetryCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div style={{
      background: C.surface,
      border: '1px solid ' + C.border,
      borderTop: '2px solid ' + (accent || C.blue),
      borderRadius: 6,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 9, fontFamily: F.mono, color: C.slate, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
        <Icon size={13} color={accent || C.blue} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: F.mono, color: C.white, lineHeight: 1 }}>
        {value !== undefined && value !== null ? value : '—'}
      </div>
      {sub && <div style={{ fontSize: 10, color: C.slate, fontFamily: F.mono, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ScoreGauge({ score }) {
  const color = score >= 70 ? C.green : score >= 50 ? C.gold : '#ef4444';
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="32" fill="none" stroke={C.border} strokeWidth="4" />
          <circle
            cx="40" cy="40" r="32" fill="none"
            stroke={color} strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 32}`}
            strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 18, fontFamily: F.mono, fontWeight: 700, color, lineHeight: 1 }}>
            {typeof score === 'number' ? score.toFixed(1) : score}
          </span>
        </div>
      </div>
      <span style={{ fontSize: 9, fontFamily: F.mono, color: C.slate, letterSpacing: '0.08em' }}>GOV SCORE</span>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.bg2, border: '1px solid ' + C.border,
      borderRadius: 4, padding: '6px 10px',
      fontFamily: F.mono, fontSize: 10,
    }}>
      <div style={{ color: C.white }}>{payload[0]?.value?.toFixed(1)}</div>
      <div style={{ color: C.slate }}>{payload[0]?.payload?.time}</div>
    </div>
  );
}

export default function TenantDashboard() {
  const { companies, selectedTenant, setSelectedTenant, tenantData, loading } = useTenant();
  const [activity,   setActivity]   = useState([]);
  const [govHistory, setGovHistory] = useState([]);
  const [agents,     setAgents]     = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (selectedTenant === 'consolidated' || !selectedTenant) return;
    setDataLoading(true);
    Promise.all([
      fetch(API + '/api/tenants/' + selectedTenant + '/activity?limit=20', {
        headers: { Authorization: 'Bearer ' + token() }
      }).then(r => r.json()),
      fetch(API + '/api/tenants/' + selectedTenant + '/governance', {
        headers: { Authorization: 'Bearer ' + token() }
      }).then(r => r.json()),
      fetch(API + '/api/tenants/' + selectedTenant + '/agents?limit=20', {
        headers: { Authorization: 'Bearer ' + token() }
      }).then(r => r.json()),
    ]).then(([act, gov, agt]) => {
      const actData = Array.isArray(act) ? act : (act?.data || []);
      const govData = Array.isArray(gov) ? gov : (gov?.data || []);
      const agtData = Array.isArray(agt) ? agt : (agt?.data || []);
      setActivity(actData);
      setGovHistory(govData);
      setAgents(agtData);
    }).catch(() => {}).finally(() => setDataLoading(false));
  }, [selectedTenant]);

  // Consolidated portfolio view
  if (selectedTenant === 'consolidated') {
    return (
      <div style={{ padding: '24px 20px', fontFamily: F.body, color: C.white, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontFamily: F.display, letterSpacing: '0.08em', color: C.white, margin: 0, fontWeight: 700 }}>
            COMPANY PORTFOLIO
          </h1>
          <p style={{ color: C.slate, fontSize: 11, fontFamily: F.mono, margin: '4px 0 0', letterSpacing: '0.05em' }}>
            {companies.length} GOVERNED COMPANIES · SELECT TO VIEW DASHBOARD
          </p>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
          <TelemetryCard icon={Building2}  label="Companies"      value={companies.length} accent={C.gold} />
          <TelemetryCard icon={Users}      label="Total Agents"   value={(companies.reduce((s,c) => s + (parseInt(c.agentCount) || 0), 0)).toLocaleString()} accent={C.blue} />
          <TelemetryCard icon={Zap}        label="Total Executions" value={(companies.reduce((s,c) => s + (parseInt(c.totalExecutions) || 0), 0)).toLocaleString()} accent={C.purple} mono />
          <TelemetryCard icon={AlertTriangle} label="Total Violations" value={(companies.reduce((s,c) => s + (parseInt(c.totalViolations) || 0), 0)).toLocaleString()} accent="#ef4444" mono />
        </div>

        {/* Company cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {companies.map(co => {
            const score = parseFloat(co.governanceScore) || 0;
            const scoreColor = score >= 70 ? C.green : score >= 50 ? C.gold : '#ef4444';
            return (
              <div
                key={co.clientId}
                onClick={() => setSelectedTenant(co.clientId)}
                style={{
                  background: C.surface,
                  border: '1px solid ' + C.border,
                  borderRadius: 6,
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold + '40'; e.currentTarget.style.background = C.surface2; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{co.companyName}</div>
                    <div style={{ fontSize: 10, color: C.slate, fontFamily: F.mono, marginTop: 2 }}>{co.vertical}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 18, fontFamily: F.mono, fontWeight: 700, color: scoreColor }}>{score.toFixed(1)}</span>
                    <ChevronRight size={14} color={C.slate} />
                  </div>
                </div>

                {/* Score bar */}
                <div style={{ height: 2, background: C.border, borderRadius: 1, marginBottom: 10 }}>
                  <div style={{
                    height: '100%', width: Math.min(100, score) + '%',
                    background: scoreColor, borderRadius: 1,
                    transition: 'width 0.6s ease',
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, fontFamily: F.mono, color: C.slate }}>
                    {(co.activeAgents || 0).toLocaleString()} agents
                  </span>
                  <span style={{ fontSize: 10, fontFamily: F.mono, color: C.slate }}>
                    {(co.totalExecutions || 0).toLocaleString()} executions
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, flexDirection: 'column' }}>
      <div style={{
        width: 24, height: 24,
        border: '2px solid ' + C.border,
        borderTop: '2px solid ' + C.blue,
        borderRadius: '50%',
        animation: 'cidg-spin 0.7s linear infinite',
      }} />
      <span style={{ color: C.slate, fontSize: 10, fontFamily: F.mono }}>LOADING TENANT DATA</span>
      <style>{'@keyframes cidg-spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );

  if (!tenantData) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <Building2 size={32} color={C.slate} style={{ marginBottom: 12, opacity: 0.3 }} />
      <p style={{ color: C.slate, fontSize: 12, fontFamily: F.mono }}>No tenant data available</p>
    </div>
  );

  const score = parseFloat(tenantData.governanceScore) || 0;
  const scoreColor = score >= 70 ? C.green : score >= 50 ? C.gold : '#ef4444';
  const violations = (tenantData.openEvents || []).filter(e => e.type === 'violation');
  const govChartData = govHistory.slice(-60).map(g => ({
    time: (g.timestamp || '').slice(11, 16),
    score: parseFloat(g.score) || 0,
  }));

  return (
    <div style={{ padding: '24px 20px', fontFamily: F.body, color: C.white, maxWidth: 1200, margin: '0 auto' }}>
      <button onClick={() => setSelectedTenant('consolidated')}
        style={{ display:'flex', alignItems:'center', gap:6, background:'transparent',
          border:'1px solid rgba(148,163,184,0.3)', borderRadius:6, color:'#94a3b8',
          padding:'6px 12px', cursor:'pointer', fontSize:12, fontFamily:'monospace',
          marginBottom:16, letterSpacing:'0.05em' }}>
        ← BACK TO PORTFOLIO
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontFamily: F.display, letterSpacing: '0.08em', color: C.white, margin: 0, fontWeight: 700 }}>
            {(tenantData.companyName || '').toUpperCase()}
          </h1>
          <p style={{ color: C.slate, fontSize: 11, fontFamily: F.mono, margin: '4px 0 0', letterSpacing: '0.05em' }}>
            {tenantData.vertical} · {tenantData.size}
          </p>
        </div>
        <ScoreGauge score={score} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
        <TelemetryCard icon={Users}         label="Active Agents"    value={(tenantData.activeAgents || 0).toLocaleString()} accent={C.blue} />
        <TelemetryCard icon={Zap}           label="Total Executions" value={(tenantData.totalExecutions || 0).toLocaleString()} accent={C.purple} mono />
        <TelemetryCard icon={AlertTriangle} label="Violations"       value={(tenantData.totalViolations || 0).toLocaleString()} accent="#ef4444" mono />
        <TelemetryCard icon={CheckCircle}   label="Success Rate"     value={(tenantData.successRate || 0) + '%'} accent={C.green} />
      </div>

      {/* Governance trend */}
      {govChartData.length > 0 && (
        <div style={{
          background: C.surface, border: '1px solid ' + C.border,
          borderRadius: 6, padding: '16px 18px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUp size={13} color={C.blue} />
            <span style={{ fontSize: 10, fontFamily: F.mono, color: C.slate, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Governance Score — {govChartData.length} datapoints
            </span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={govChartData}>
              <XAxis dataKey="time" tick={{ fontSize: 9, fontFamily: 'monospace', fill: C.slate }} interval={Math.floor(govChartData.length / 6)} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontFamily: 'monospace', fill: C.slate }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={70} stroke={C.green} strokeDasharray="3 3" strokeOpacity={0.3} />
              <ReferenceLine y={50} stroke={C.gold} strokeDasharray="3 3" strokeOpacity={0.3} />
              <Line type="monotone" dataKey="score" stroke={scoreColor} strokeWidth={1.5} dot={false} animationDuration={800} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Activity + Agents grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>

        {/* Activity feed */}
        <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 6, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Activity size={13} color={C.blue} />
            <span style={{ fontSize: 10, fontFamily: F.mono, color: C.slate, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Recent Activity</span>
          </div>
          {dataLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{
                width: 18, height: 18, margin: '0 auto',
                border: '2px solid ' + C.border,
                borderTop: '2px solid ' + C.blue,
                borderRadius: '50%',
                animation: 'cidg-spin 0.7s linear infinite',
              }} />
            </div>
          ) : activity.length === 0 ? (
            <p style={{ color: C.slate, fontSize: 11, fontFamily: F.mono, textAlign: 'center', padding: 20 }}>No activity yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {activity.slice(0, 10).map((item, i) => {
                const isViolation = item._type === 'event' || item.success === false;
                const dotColor = isViolation ? '#ef4444' : C.green;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 0',
                    borderBottom: i < 9 ? '1px solid rgba(31,41,55,0.5)' : 'none',
                  }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: dotColor, flexShrink: 0,
                      boxShadow: isViolation ? '0 0 4px ' + dotColor : 'none',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: C.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.agentName || item.agentId}
                      </div>
                      <div style={{ fontSize: 9, color: C.slate, fontFamily: F.mono }}>
                        {item._type === 'execution' ? (item.taskType + ' · ' + (item.via || 'api').toUpperCase()) : ('VIOLATION · ' + (item.severity || 'medium').toUpperCase())}
                      </div>
                    </div>
                    <span style={{ fontSize: 9, color: C.slate, fontFamily: F.mono, flexShrink: 0 }}>
                      {(item.timestamp || '').slice(11, 16)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Agent pool */}
        <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 6, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Shield size={13} color={C.blue} />
            <span style={{ fontSize: 10, fontFamily: F.mono, color: C.slate, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Agent Pool Sample</span>
          </div>
          {agents.length === 0 ? (
            <p style={{ color: C.slate, fontSize: 11, fontFamily: F.mono, textAlign: 'center', padding: 20 }}>No agents loaded</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {agents.slice(0, 8).map((agent, i) => {
                const tier = agent.riskTier || 'TIER_2';
                const tierCfg = TIER_CONFIG[tier] || TIER_CONFIG.TIER_2;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 0',
                    borderBottom: i < 7 ? '1px solid rgba(31,41,55,0.5)' : 'none',
                  }}>
                    <span style={{
                      fontSize: 9, padding: '2px 5px', borderRadius: 3,
                      background: tierCfg.bg, color: tierCfg.color,
                      border: '1px solid ' + tierCfg.border,
                      fontFamily: F.mono, letterSpacing: '0.04em',
                      flexShrink: 0,
                    }}>{tier}</span>
                    <span style={{
                      flex: 1, fontSize: 11, color: C.white,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{agent.agentName || agent.agentId}</span>
                    <span style={{ fontSize: 10, fontFamily: F.mono, color: C.slate, flexShrink: 0 }}>
                      {agent.governanceScore}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Open violations */}
      {violations.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.04)',
          border: '1px solid rgba(239,68,68,0.15)',
          borderLeft: '3px solid #ef4444',
          borderRadius: 6,
          padding: '14px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={13} color="#ef4444" />
            <span style={{ fontSize: 10, fontFamily: F.mono, color: '#ef4444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Open Violations ({violations.length})
            </span>
          </div>
          {violations.slice(0, 5).map((ev, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 0',
              borderBottom: i < Math.min(4, violations.length - 1) ? '1px solid rgba(239,68,68,0.1)' : 'none',
              fontSize: 11,
            }}>
              <span style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 3,
                background: ev.severity === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                color: ev.severity === 'high' ? '#ef4444' : C.gold,
                border: '1px solid ' + (ev.severity === 'high' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'),
                fontFamily: F.mono, letterSpacing: '0.06em',
                flexShrink: 0,
              }}>{(ev.severity || 'MED').toUpperCase()}</span>
              <span style={{ color: '#fca5a5', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ev.description}
              </span>
              <span style={{ fontSize: 9, color: 'rgba(252,165,165,0.5)', fontFamily: F.mono, flexShrink: 0 }}>
                {(ev.timestamp || '').slice(0, 10)}
              </span>
            </div>
          ))}
        </div>
      )}

      <style>{'@keyframes cidg-spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
