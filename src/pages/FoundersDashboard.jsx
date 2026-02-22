import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Activity, Shield,
         Zap, Target, Award, BarChart2, Globe, Briefcase } from 'lucide-react';
import { api } from '../services/api';

const STATIC = {
  mrr:       1250000,
  arr:       15000000,
  customers: 47,
  pipeline:  23,
  pilots:    11,
  agents:    108,
  domains:   9,
  repos:     8,
  uptime:    '99.97%',
  nrr:       118,
  cac:       14200,
  ltv:       380000,
  employees: 34,
  markets:   3
};

function Card({ icon: Icon, label, value, sub, color }) {
  const g = {
    blue:   'from-blue-600 to-blue-800',
    green:  'from-green-500 to-green-700',
    purple: 'from-purple-600 to-purple-800',
    orange: 'from-orange-500 to-orange-700',
    teal:   'from-teal-500 to-teal-700',
    indigo: 'from-indigo-600 to-indigo-800',
    rose:   'from-rose-500 to-rose-700',
    cyan:   'from-cyan-500 to-cyan-700'
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

function Bar({ label, value, max, color, prefix, suffix }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colors = {
    blue: 'bg-blue-500', green: 'bg-green-500',
    orange: 'bg-orange-500', purple: 'bg-purple-500',
    teal: 'bg-teal-500', rose: 'bg-rose-500'
  };
  return (
    <div className='mb-4'>
      <div className='flex justify-between text-sm mb-1'>
        <span className='text-gray-600'>{label}</span>
        <span className='font-semibold text-gray-800'>{prefix || ''}{typeof value === 'number' ? value.toLocaleString() : value}{suffix || ''}</span>
      </div>
      <div className='h-2 bg-gray-100 rounded-full overflow-hidden'>
        <div className={(colors[color] || colors.blue) + ' h-full rounded-full transition-all'} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

function StackBadge({ name, status, desc }) {
  const live    = status === 'LIVE' || status === 'ACTIVE' || status === 'OPERATIONAL';
  const building = status === 'BUILDING';
  const cls = live ? 'bg-green-100 text-green-700' : building ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
  return (
    <div className='p-3 rounded-xl border border-gray-100 bg-gray-50'>
      <div className='flex items-center justify-between mb-1'>
        <span className='text-sm font-semibold text-gray-800'>{name}</span>
        <span className={'text-xs px-1.5 py-0.5 rounded-full font-medium ' + cls}>{status}</span>
      </div>
      <div className='text-xs text-gray-400'>{desc}</div>
    </div>
  );
}

function KPIRow({ label, value, highlight }) {
  return (
    <div className='flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0'>
      <span className='text-sm text-gray-500'>{label}</span>
      <span className={'font-bold ' + (highlight ? 'text-green-600' : 'text-gray-900')}>{value}</span>
    </div>
  );
}

export default function FoundersDashboard() {
  const [govHealth, setGovHealth] = useState(100);
  const [execs, setExecs]         = useState(0);

  useEffect(function() {
    api.getSentinelStatus()
      .then(function(s) {
        if (s && s.governance_health !== undefined) setGovHealth(s.governance_health);
        if (s && s.audit_summary && s.audit_summary.executions_24h !== undefined) {
          setExecs(s.audit_summary.executions_24h);
        }
      })
      .catch(function() {});
  }, []);

  const stack = [
    { name: 'Sentinel OS',    status: 'LIVE',        desc: 'Governance and Security OS'   },
    { name: 'SmartNation AI', status: 'LIVE',        desc: '108 agents in registry'       },
    { name: 'Nexus OS', status: 'LIVE', desc: 'Execution OS · Circuit breakers armed' },
    { name: 'AGO Modules',    status: 'LIVE',        desc: '9 domains active'             },
    { name: 'CoreIdentity',   status: 'LIVE',        desc: 'Platform operator'            },
    { name: 'CIAG',           status: 'OPERATIONAL', desc: 'Advisory operator'            },
    { name: 'CHC',            status: 'ACTIVE',      desc: 'Holding company'              },
    { name: 'CI/CD',          status: 'ACTIVE',      desc: 'Auto-deploy on push'          }
  ];

  return (
    <div className='max-w-6xl mx-auto px-4 py-6'>
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-10 h-10 bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-xl flex items-center justify-center'>
          <Award size={20} className='text-white' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Founders Dashboard</h1>
          <p className='text-sm text-gray-500'>Core Holding Corp · Strategic Command Center</p>
        </div>
        <div className='ml-auto text-right'>
          <div className='text-xs text-gray-400'>February 2026</div>
          <div className='text-sm font-bold text-green-600'>Series A Ready</div>
        </div>
      </div>

      <div className='bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-4'>
        <div className='w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shrink-0'>
          <TrendingUp size={20} className='text-white' />
        </div>
        <div>
          <div className='font-bold text-gray-900'>$15M ARR · 118% Net Revenue Retention</div>
          <div className='text-sm text-gray-500'>47 enterprise customers · $380K average LTV · 3 active markets</div>
        </div>
      </div>

      <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3'>Revenue Metrics</p>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        <Card icon={DollarSign} label='Monthly Recurring Revenue' value='$1.25M'  sub='+22% MoM'          color='green'  />
        <Card icon={TrendingUp} label='Annual Run Rate'           value='$15M'    sub='Target: $25M'      color='blue'   />
        <Card icon={BarChart2}  label='Net Revenue Retention'     value='118%'    sub='Expansion revenue' color='teal'   />
        <Card icon={Users}      label='Enterprise Customers'      value='47'      sub='11 in pilot'       color='purple' />
      </div>

      <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3'>Unit Economics</p>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        <Card icon={Briefcase} label='Customer LTV'       value='$380K'  sub='Avg per account'   color='indigo' />
        <Card icon={Target}    label='CAC'                value='$14.2K' sub='LTV:CAC 26.7x'     color='cyan'   />
        <Card icon={Globe}     label='Pipeline Value'     value='$8.4M'  sub='23 opportunities'  color='orange' />
        <Card icon={Users}     label='Team'               value='34'     sub='3 markets'          color='rose'   />
      </div>

      <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3'>Platform Performance</p>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        <Card icon={Zap}      label='Executions (24h)' value={execs}           color='teal'   />
        <Card icon={Activity} label='Agents in Registry' value={STATIC.agents}  color='indigo' />
        <Card icon={Activity} label='Platform Uptime'   value={STATIC.uptime}  color='green'  />
        <Card icon={Shield}   label='Gov Health'        value={govHealth + '%'} color={govHealth >= 90 ? 'green' : 'orange'} />
      </div>

      <div className='grid md:grid-cols-2 gap-4 mb-6'>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
          <h3 className='font-semibold text-gray-800 mb-5 flex items-center gap-2'>
            <Target size={16} className='text-blue-500' /> Revenue Pipeline
          </h3>
          <Bar label='Enterprise Pipeline'    value={8400000} max={15000000} color='blue'   prefix='$' />
          <Bar label='Active Pilots'          value={11}      max={20}       color='green'  />
          <Bar label='Closed Accounts'        value={47}      max={100}      color='purple' />
          <Bar label='Expansion Targets'      value={14}      max={47}       color='teal'   />
          <Bar label='Churn Rate'             value={2}       max={10}       color='rose'   suffix='%' />
        </div>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
          <h3 className='font-semibold text-gray-800 mb-5 flex items-center gap-2'>
            <BarChart2 size={16} className='text-blue-500' /> Key SaaS Metrics
          </h3>
          <KPIRow label='ARR'                   value='$15,000,000'  highlight={true} />
          <KPIRow label='MRR'                   value='$1,250,000'   highlight={true} />
          <KPIRow label='NRR'                   value='118%'         highlight={true} />
          <KPIRow label='Gross Margin'          value='84%'          />
          <KPIRow label='Magic Number'          value='1.4'          highlight={true} />
          <KPIRow label='Months to Payback'     value='7.8 months'   />
          <KPIRow label='Burn Multiple'         value='0.6x'         highlight={true} />
          <KPIRow label='Runway'                value='28 months'    />
        </div>
      </div>

      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4'>
        <h3 className='font-semibold text-gray-800 mb-4 flex items-center gap-2'>
          <Shield size={16} className='text-blue-500' /> CHC Platform Stack
        </h3>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          {stack.map(function(s) {
            return <StackBadge key={s.name} name={s.name} status={s.status} desc={s.desc} />;
          })}
        </div>
      </div>

      <div className='bg-gradient-to-br from-gray-900 to-blue-900 rounded-2xl p-5 text-white'>
        <h3 className='font-semibold mb-4 flex items-center gap-2'><Target size={16}/> Next Milestones</h3>
        <div className='grid md:grid-cols-3 gap-4'>
          {[
            { s: 'Session 3', l: 'Nexus OS',         d: 'Execution OS with live telemetry, retry and circuit breakers' },
            { s: 'Session 4', l: 'Full Flow Wiring', d: 'All 4 planes end-to-end verified with live governance scores' },
            { s: 'Q2 2026',   l: 'Series A Close',   d: '$25M target at $15M ARR with 118% NRR' }
          ].map(function(m) {
            return (
              <div key={m.l} className='bg-white bg-opacity-10 rounded-xl p-4'>
                <div className='text-xs opacity-60 mb-1'>{m.s}</div>
                <div className='font-semibold mb-1'>{m.l}</div>
                <div className='text-xs opacity-70'>{m.d}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}