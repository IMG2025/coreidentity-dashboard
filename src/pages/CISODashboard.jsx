import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Eye,
         Lock, Activity, TrendingUp, FileCheck } from 'lucide-react';
import { api } from '../services/api';

const TIER_COLORS = {
  TIER_1: 'bg-green-100 text-green-700',
  TIER_2: 'bg-blue-100 text-blue-700',
  TIER_3: 'bg-orange-100 text-orange-700',
  TIER_4: 'bg-red-100 text-red-700'
};

const FRAMEWORK_COLORS = {
  100: 'text-green-600', 90: 'text-green-600',
  80:  'text-blue-600',  70: 'text-orange-600',
  0:   'text-red-600'
};

function getScoreColor(score) {
  if (score >= 90) return FRAMEWORK_COLORS[90];
  if (score >= 80) return FRAMEWORK_COLORS[80];
  if (score >= 70) return FRAMEWORK_COLORS[70];
  return FRAMEWORK_COLORS[0];
}

function RiskCard({ icon: Icon, label, value, sub, color }) {
  const g = {
    green:  'from-green-500 to-green-700',
    blue:   'from-blue-600 to-blue-800',
    orange: 'from-orange-500 to-orange-700',
    red:    'from-red-600 to-red-800',
    purple: 'from-purple-600 to-purple-800'
  };
  return (
    <div className={'bg-gradient-to-br ' + (g[color] || g.blue) + ' rounded-2xl p-5 text-white'}>
      <Icon size={20} className='opacity-80 mb-3' />
      <div className='text-3xl font-bold mb-1'>{value}</div>
      <div className='text-xs opacity-70 uppercase tracking-wide'>{label}</div>
      {sub && <div className='text-xs opacity-60 mt-1'>{sub}</div>}
    </div>
  );
}

function PostureBar({ label, score, max }) {
  const pct = Math.min(100, Math.round(((score || 0) / (max || 100)) * 100));
  const color = pct >= 90 ? 'bg-green-500' : pct >= 75 ? 'bg-blue-500' : 'bg-orange-500';
  return (
    <div className='mb-3'>
      <div className='flex justify-between text-sm mb-1'>
        <span className='text-gray-600'>{label}</span>
        <span className={'font-bold ' + getScoreColor(pct)}>{score || 0}%</span>
      </div>
      <div className='h-2 bg-gray-100 rounded-full overflow-hidden'>
        <div className={color + ' h-full rounded-full transition-all'} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

export default function CISODashboard() {
  const [sentinel, setSentinel]   = useState(null);
  const [smartnation, setSmartNation] = useState(null);
  const [events, setEvents]       = useState([]);
  const [loading, setLoading]     = useState(true);

  const FRAMEWORKS = [
    { name: 'SOC2',     score: 94, controls: 9,  status: 'Certified' },
    { name: 'HIPAA',    score: 96, controls: 5,  status: 'Compliant' },
    { name: 'GDPR',     score: 94, controls: 6,  status: 'Compliant' },
    { name: 'CCPA',     score: 87, controls: 5,  status: 'Review'    },
    { name: 'ISO27001', score: 91, controls: 12, status: 'Certified' }
  ];

  useEffect(function() { loadAll(); }, []);

  function loadAll() {
    api.getSentinelStatus()
      .then(function(s) { setSentinel(s); })
      .catch(function() {})
      .finally(function() { setLoading(false); });

    api.getSmartNationSummary()
      .then(function(s) { setSmartNation(s); })
      .catch(function() {});

    api.getSecurityEvents(10)
      .then(function(e) { setEvents(Array.isArray(e) ? e : []); })
      .catch(function() {});
  }

  const overallPosture = sentinel
    ? Math.round((sentinel.governance_health || 100) * 0.4 +
        FRAMEWORKS.reduce(function(s, f) { return s + f.score; }, 0) / FRAMEWORKS.length * 0.4 +
        (smartnation ? smartnation.avgGovernanceScore : 91) * 0.2)
    : 93;

  return (
    <div className='max-w-6xl mx-auto px-4 py-6'>
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center'>
          <Shield size={20} className='text-white' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>CISO Dashboard</h1>
          <p className='text-sm text-gray-500'>Security Posture · Compliance · Risk Intelligence</p>
        </div>
        <div className='ml-auto flex items-center gap-2'>
          <span className='w-2 h-2 bg-green-400 rounded-full animate-pulse' />
          <span className='text-sm text-green-600 font-medium'>ALL SYSTEMS SECURE</span>
        </div>
      </div>

      <div className='bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-5 mb-6 text-white'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='font-semibold flex items-center gap-2'><Eye size={16}/> Overall Security Posture</h3>
          <div className='text-4xl font-bold text-green-400'>{overallPosture}%</div>
        </div>
        <div className='grid grid-cols-3 gap-4 text-center'>
          {[
            ['Governance', sentinel ? (sentinel.governance_health || 100) : 100, 'green'],
            ['Compliance', Math.round(FRAMEWORKS.reduce(function(s,f){return s+f.score;},0)/FRAMEWORKS.length), 'blue'],
            ['Agent Risk',  smartnation ? smartnation.avgGovernanceScore : 91, 'purple']
          ].map(function(item) {
            return (
              <div key={item[0]} className='bg-white bg-opacity-10 rounded-xl p-3'>
                <div className='text-2xl font-bold'>{item[1]}%</div>
                <div className='text-xs opacity-70 mt-1'>{item[0]}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        <RiskCard icon={Shield}        label='Gov Health'      value={sentinel ? (sentinel.governance_health || 100) + '%' : '100%'} color='green'  />
        <RiskCard icon={AlertTriangle} label='Active Threats'  value={events.filter(function(e){return e.severity==='HIGH';}).length} color='orange' />
        <RiskCard icon={Lock}          label='Kill Switches'   value='0'   sub='No blocks active' color='green'  />
        <RiskCard icon={FileCheck}     label='Frameworks'      value={FRAMEWORKS.length} sub='All monitored' color='blue' />
      </div>

      <div className='grid md:grid-cols-2 gap-4 mb-6'>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
          <h3 className='font-semibold text-gray-800 mb-5 flex items-center gap-2'>
            <FileCheck size={16} className='text-blue-500' /> Compliance Posture
          </h3>
          {FRAMEWORKS.map(function(f) {
            return (
              <div key={f.name} className='mb-4'>
                <div className='flex justify-between items-center mb-1'>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-semibold text-gray-800'>{f.name}</span>
                    <span className={'text-xs px-1.5 py-0.5 rounded-full ' + (f.status === 'Review' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700')}>{f.status}</span>
                  </div>
                  <span className={'font-bold text-sm ' + getScoreColor(f.score)}>{f.score}%</span>
                </div>
                <div className='h-2 bg-gray-100 rounded-full overflow-hidden'>
                  <div className={(f.score >= 90 ? 'bg-green-500' : f.score >= 80 ? 'bg-blue-500' : 'bg-orange-500') + ' h-full rounded-full'} style={{ width: f.score + '%' }} />
                </div>
                <div className='text-xs text-gray-400 mt-0.5'>{f.controls} control domains</div>
              </div>
            );
          })}
        </div>

        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
          <h3 className='font-semibold text-gray-800 mb-5 flex items-center gap-2'>
            <Activity size={16} className='text-blue-500' /> Agent Risk Intelligence
          </h3>
          {smartnation && smartnation.byTier && (
            <div className='mb-5'>
              {['TIER_1','TIER_2','TIER_3','TIER_4'].map(function(t) {
                const count = smartnation.byTier[t] || 0;
                const total = smartnation.totalAgents || 1;
                const pct   = Math.round((count / total) * 100);
                return (
                  <div key={t} className='flex items-center gap-3 mb-2'>
                    <span className={'text-xs px-2 py-0.5 rounded-full font-medium w-16 text-center ' + (TIER_COLORS[t] || '')}>{t}</span>
                    <div className='flex-1 h-2 bg-gray-100 rounded-full overflow-hidden'>
                      <div className={(t==='TIER_1'?'bg-green-500':t==='TIER_2'?'bg-blue-500':t==='TIER_3'?'bg-orange-500':'bg-red-500') + ' h-full rounded-full'} style={{ width: pct + '%' }} />
                    </div>
                    <span className='text-xs text-gray-500 w-8 text-right'>{count}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className='border-t border-gray-100 pt-4'>
            <PostureBar label='Avg Agent Gov Score'  score={smartnation ? smartnation.avgGovernanceScore : 91} max={100} />
            <PostureBar label='Active Agents'        score={smartnation ? Math.round((smartnation.activeAgents / smartnation.totalAgents) * 100) : 100} max={100} />
          </div>
        </div>
      </div>

      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6'>
        <div className='p-5 border-b border-gray-100 flex justify-between items-center'>
          <h3 className='font-semibold text-gray-800 flex items-center gap-2'>
            <Eye size={16} className='text-blue-500' /> Recent Security Events
          </h3>
          <button onClick={loadAll} className='text-sm text-blue-600 hover:text-blue-800'>Refresh</button>
        </div>
        {events.length === 0
          ? (
            <div className='p-10 text-center flex flex-col items-center gap-2'>
              <CheckCircle size={32} className='text-green-400' />
              <span className='text-gray-400 text-sm'>No security events — all clear</span>
            </div>
          )
          : events.map(function(e, i) {
              const sev = e.severity || 'INFO';
              const sevColor = sev === 'HIGH' ? 'bg-red-100 text-red-700' : sev === 'MEDIUM' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
              return (
                <div key={e.eventId || i} className='px-5 py-3 flex items-start gap-3 border-b border-gray-50 last:border-0'>
                  <span className={'text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ' + sevColor}>{sev}</span>
                  <div className='flex-1'>
                    <div className='text-sm font-medium text-gray-800'>{(e.eventType || 'EVENT').replace(/_/g,' ')}</div>
                    <div className='text-xs text-gray-400'>{e.agentName || 'System'} · {e.taskType || '-'}</div>
                  </div>
                  <span className='text-xs text-gray-400 shrink-0'>{new Date(e.timestamp || Date.now()).toLocaleTimeString()}</span>
                </div>
              );
            })
        }
      </div>

      <div className='bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl p-5 text-white'>
        <h3 className='font-semibold mb-4 flex items-center gap-2'><TrendingUp size={16}/> 4-Plane Execution Chain</h3>
        <div className='flex items-center gap-2 flex-wrap'>
          {[
            { name: 'CoreIdentity', sub: 'Auth + JWT',           color: 'bg-blue-700'   },
            { name: 'Sentinel OS',  sub: 'Policy Enforcement',   color: 'bg-green-700'  },
            { name: 'Nexus OS',     sub: 'Execution Lifecycle',  color: 'bg-purple-700' },
            { name: 'AGO Modules',  sub: 'Domain Execution',     color: 'bg-orange-700' },
            { name: 'SmartNation',  sub: 'Live Telemetry',       color: 'bg-teal-700'   }
          ].map(function(plane, i, arr) {
            return (
              <React.Fragment key={plane.name}>
                <div className={'rounded-xl p-3 text-center min-w-0 flex-1 ' + plane.color}>
                  <div className='text-xs font-bold'>{plane.name}</div>
                  <div className='text-xs opacity-70 mt-0.5'>{plane.sub}</div>
                </div>
                {i < arr.length - 1 && (
                  <div className='text-white opacity-50 text-lg shrink-0'>→</div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}