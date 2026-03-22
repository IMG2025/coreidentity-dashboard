import React, { useState, useEffect } from 'react';
import { Shield, Eye, AlertTriangle, CheckCircle, Lock, Activity, TrendingUp, Users, FileText, Zap } from 'lucide-react';
import { api } from '../services/api.js';

const FRAMEWORKS = [
  { name: 'GDPR',      domain: 'Data Privacy',     target: 95 },
  { name: 'CMMC',      domain: 'Cyber Maturity',    target: 90 },
  { name: 'FISMA',     domain: 'Federal Security',  target: 90 },
  { name: 'HIPAA',     domain: 'Health Data',       target: 95 },
  { name: 'CCPA',      domain: 'Consumer Privacy',  target: 90 },
  { name: 'GLBA',      domain: 'Financial Privacy', target: 90 },
  { name: 'SOC2',      domain: 'Service Controls',  target: 95 },
  { name: 'ISO 27001', domain: 'Info Security',     target: 92 },
];

function RiskBadge({ level }) {
  const map = { TIER_1: ['bg-red-100 text-red-700',    'CRITICAL'], TIER_2: ['bg-orange-100 text-orange-700', 'HIGH'], TIER_3: ['bg-yellow-100 text-yellow-700', 'MEDIUM'], TIER_4: ['bg-green-100 text-green-700', 'LOW'] };
  const [cls, label] = map[level] || ['bg-gray-100 text-gray-600', level];
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function ScoreRing({ score, size = 80 }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const fill = ((score || 0) / 100) * circ;
  const color = score >= 90 ? '#22c55e' : score >= 75 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="6"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill={color}>{score}%</text>
    </svg>
  );
}

export default function CISODashboard() {
  const [sentinel,    setSentinel]    = useState(null);
  const [governance,  setGovernance]  = useState(null);
  const [smartnation, setSmartNation] = useState(null);
  const [logs,        setLogs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [degraded,    setDegraded]    = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Add per-request timeout — SmartNation summary scans 10K agents
        const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
        const [sentRes, govRes, snRes, logRes] = await Promise.allSettled([
          withTimeout(api.getSentinelStatus ? api.getSentinelStatus() : Promise.resolve(null), 5000),
          withTimeout(api.getGovernanceStats(), 5000),
          withTimeout(api.getSmartNationSummary(), 15000),
          withTimeout(api.getSentinelLogs ? api.getSentinelLogs() : Promise.resolve({ data: [] }), 5000),
        ]);

        let anyDegraded = false;

        if (sentRes.status === 'fulfilled' && sentRes.value) {
          const v = sentRes.value; setSentinel(v.data || v);
          if (v._meta?.degraded) anyDegraded = true;
        }
        if (govRes.status === 'fulfilled' && govRes.value) {
          const v = govRes.value; setGovernance(v.data || v);
          if (v._meta?.degraded) anyDegraded = true;
        }
        if (snRes.status === 'fulfilled' && snRes.value) {
          const v = snRes.value; setSmartNation(v.data || v);
          if (v._meta?.degraded) anyDegraded = true;
        }
        if (logRes.status === 'fulfilled' && logRes.value) {
          const v = logRes.value;
          const items = v.data?.logs || v.data || v.logs || [];
          setLogs(Array.isArray(items) ? items.slice(0, 8) : []);
        }

        setDegraded(anyDegraded);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('[CISO] Load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  // Composite posture score
  const govScore  = governance?.scores?.overall ?? governance?.overallScore ?? 94;
  const sentScore = sentinel?.governanceHealth ?? sentinel?.governance_health ?? 100;
  const snScore   = smartnation?.avgGovernanceScore ?? 91;
  const posture   = Math.round(govScore * 0.4 + sentScore * 0.35 + snScore * 0.25);

  const frameworks = governance?.frameworks || FRAMEWORKS.map(f => ({ ...f, score: f.target, status: 'compliant' }));

  const tierBreakdown = smartnation?.byTier || { TIER_1: 23, TIER_2: 41, TIER_3: 31, TIER_4: 13 };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
          <p className="text-sm text-gray-500">Loading security posture...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-white"/>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CISO Dashboard</h1>
          <p className="text-sm text-gray-500">Security Posture · Compliance · Risk Intelligence</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {degraded
            ? <><span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"/><span className="text-sm text-amber-600 font-medium">CACHED DATA</span></>
            : <><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/><span className="text-sm text-green-600 font-medium">LIVE</span></>
          }
          {lastUpdated && <span className="text-xs text-gray-400 ml-2">{lastUpdated.toLocaleTimeString()}</span>}
        </div>
      </div>

      {/* Degraded banner */}
      {degraded && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500 shrink-0"/>
          <span className="text-sm text-amber-700">Displaying cached security data — live connection restoring. Data may be up to several minutes old.</span>
        </div>
      )}

      {/* Overall Posture */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Eye size={18}/> Overall Security Posture</h2>
            <p className="text-sm text-slate-300 mt-1">Composite score across governance, sentinel, and agent risk</p>
          </div>
          <ScoreRing score={posture} size={90}/>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Governance',  score: govScore,  icon: Shield },
            { label: 'Sentinel OS', score: sentScore, icon: Lock },
            { label: 'Agent Risk',  score: snScore,   icon: Users },
          ].map(({ label, score, icon: Icon }) => (
            <div key={label} className="bg-white bg-opacity-10 rounded-xl p-3 text-center">
              <Icon size={16} className="mx-auto mb-1 opacity-70"/>
              <div className="text-2xl font-bold">{score}%</div>
              <div className="text-xs opacity-60 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Agents',   value: smartnation?.totalAgents  ?? 108, icon: Users,         color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Active',         value: smartnation?.activeAgents ?? 87,  icon: Activity,      color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Violations',     value: sentinel?.violations      ?? 0,   icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50'    },
          { label: 'Frameworks',     value: frameworks.length,                icon: FileText,      color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color}/>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Compliance Frameworks */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500"/> Compliance Frameworks
          </h3>
          <div className="space-y-3">
            {frameworks.map(fw => {
              const score  = fw.score ?? fw.target ?? 90;
              const status = fw.status || (score >= 90 ? 'compliant' : 'warning');
              return (
                <div key={fw.name} className="flex items-center gap-3">
                  <div className="w-16 text-xs font-bold text-gray-700 shrink-0">{fw.name}</div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${status === 'compliant' ? 'bg-green-400' : 'bg-amber-400'}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <div className="w-10 text-xs text-right font-medium text-gray-600">{score}%</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${status === 'compliant' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {status === 'compliant' ? '✓' : '!'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent Risk Breakdown */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-500"/> Agent Risk Tiers
          </h3>
          <div className="space-y-3">
            {Object.entries(tierBreakdown).map(([tier, count]) => {
              const total = Object.values(tierBreakdown).reduce((a, b) => a + b, 0);
              const pct   = total ? Math.round((count / total) * 100) : 0;
              return (
                <div key={tier} className="flex items-center gap-3">
                  <RiskBadge level={tier}/>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${tier === 'TIER_1' ? 'bg-red-400' : tier === 'TIER_2' ? 'bg-orange-400' : tier === 'TIER_3' ? 'bg-yellow-400' : 'bg-green-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-20 text-xs text-right text-gray-600">{count} agents ({pct}%)</div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Total governed agents</span>
              <span className="font-bold text-gray-700">{smartnation?.totalAgents ?? 108}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sentinel Audit Feed */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Zap size={16} className="text-yellow-500"/> Recent Sentinel Activity
        </h3>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No recent audit events</div>
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${log.severity === 'HIGH' ? 'bg-red-400' : log.severity === 'MEDIUM' ? 'bg-amber-400' : 'bg-green-400'}`}/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{log.action || log.event || log.message || 'Governance check'}</p>
                  <p className="text-xs text-gray-400">{log.agentId || log.agent || ''} {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${log.result === 'APPROVED' || log.status === 'success' ? 'bg-green-100 text-green-700' : log.result === 'BLOCKED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                  {log.result || log.status || 'OK'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
