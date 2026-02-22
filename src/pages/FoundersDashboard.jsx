import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Activity, Shield,
         Zap, Target, Award, BarChart2 } from 'lucide-react';
import { api } from '../services/api';

const STATIC = {
  mrr: 12400, arr: 148800, customers: 7, pipeline: 12,
  pilots: 4, agents: 105, domains: 3, repos: 8, uptime: '99.9%'
};

function Card({ icon: Icon, label, value, sub, color }) {
  const c = color || 'blue';
  const g = {
    blue:   'from-blue-600 to-blue-800',
    green:  'from-green-500 to-green-700',
    purple: 'from-purple-600 to-purple-800',
    orange: 'from-orange-500 to-orange-700',
    teal:   'from-teal-500 to-teal-700',
    indigo: 'from-indigo-600 to-indigo-800'
  };
  return (
    <div className={'bg-gradient-to-br ' + (g[c] || g.blue) + ' rounded-2xl p-5 text-white'}>
      <Icon size={20} className='opacity-80 mb-3' />
      <div className='text-3xl font-bold mb-1'>{value}</div>
      <div className='text-xs opacity-70 uppercase tracking-wide'>{label}</div>
      {sub && <div className='text-xs opacity-60 mt-1'>{sub}</div>}
    </div>
  );
}

function Bar({ label, value, max, color }) {
  const c = color || 'blue';
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colors = { blue: 'bg-blue-500', green: 'bg-green-500', orange: 'bg-orange-500', purple: 'bg-purple-500' };
  return (
    <div className='mb-4'>
      <div className='flex justify-between text-sm mb-1'>
        <span className='text-gray-600'>{label}</span>
        <span className='font-semibold text-gray-800'>{value}</span>
      </div>
      <div className='h-2 bg-gray-100 rounded-full overflow-hidden'>
        <div className={(colors[c] || colors.blue) + ' h-full rounded-full transition-all'} style={{ width: pct + '%' }} />
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
    { name: 'Sentinel OS',    status: 'LIVE',        desc: 'Governance and Security OS' },
    { name: 'SmartNation AI', status: 'BUILDING',    desc: 'Registry and Intelligence'  },
    { name: 'Nexus OS',       status: 'BUILDING',    desc: 'Execution OS'               },
    { name: 'AGO Modules',    status: 'LIVE',        desc: '3 domains active'           },
    { name: 'CoreIdentity',   status: 'LIVE',        desc: 'Platform operator'          },
    { name: 'CIAG',           status: 'OPERATIONAL', desc: 'Advisory operator'          },
    { name: 'CHC',            status: 'ACTIVE',      desc: 'Holding company'            },
    { name: 'CI/CD',          status: 'ACTIVE',      desc: 'Auto-deploy on push'        }
  ];

  return (
    <div className='max-w-6xl mx-auto px-4 py-6'>
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-10 h-10 bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-xl flex items-center justify-center'>
          <Award size={20} className='text-white' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Founders Dashboard</h1>
          <p className='text-sm text-gray-500'>Core Holding Corp · IMG2025 · Strategic Command</p>
        </div>
        <div className='ml-auto text-right'>
          <div className='text-xs text-gray-400'>February 2026</div>
          <div className='text-sm font-semibold text-green-600'>On Track</div>
        </div>
      </div>

      <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3'>Revenue and Growth</p>
      <div className='grid grid-cols-2 md:grid-cols-3 gap-4 mb-6'>
        <Card icon={DollarSign} label='Monthly Recurring Revenue' value={'$' + STATIC.mrr.toLocaleString()} color='green' />
        <Card icon={TrendingUp} label='Annual Run Rate' value={'$' + Math.round(STATIC.arr/1000) + 'K'} sub='Target: $500K' color='blue' />
        <Card icon={Users} label='Active Customers' value={STATIC.customers} sub={STATIC.pipeline + ' in pipeline'} color='purple' />
      </div>

      <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3'>Platform Performance</p>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        <Card icon={Zap}      label='Executions (24h)' value={execs}            color='teal'   />
        <Card icon={BarChart2} label='Agents Live'      value={STATIC.agents}    color='indigo' />
        <Card icon={Activity} label='Uptime'            value={STATIC.uptime}    color='green'  />
        <Card icon={Shield}   label='Gov Health'        value={govHealth + '%'}  color={govHealth >= 90 ? 'green' : 'orange'} />
      </div>

      <div className='grid md:grid-cols-2 gap-4 mb-6'>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
          <h3 className='font-semibold text-gray-800 mb-5 flex items-center gap-2'>
            <Target size={16} className='text-blue-500' /> Customer Pipeline
          </h3>
          <Bar label='Enterprise Prospects' value={STATIC.pipeline} max={20} color='blue'   />
          <Bar label='Active Pilots'         value={STATIC.pilots}   max={12} color='green'  />
          <Bar label='Closed (MRR Active)'  value={STATIC.customers} max={20} color='purple' />
          <Bar label='Expansion Targets'    value={3}                max={10} color='orange' />
        </div>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
          <h3 className='font-semibold text-gray-800 mb-5 flex items-center gap-2'>
            <BarChart2 size={16} className='text-blue-500' /> Platform Adoption
          </h3>
          <Bar label='Agents Deployed'       value={STATIC.agents}  max={200} color='blue'   />
          <Bar label='AGO Domains'           value={STATIC.domains}  max={10}  color='green'  />
          <Bar label='Repos Secured'         value={STATIC.repos}    max={15}  color='purple' />
          <Bar label='Compliance Frameworks' value={5}               max={10}  color='orange' />
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
            { s: 'Session 2', l: 'SmartNation AI',   d: 'AgentInstrument registry and per-agent governance scoring' },
            { s: 'Session 3', l: 'Nexus OS',          d: 'Execution OS with telemetry, retry and concurrency control' },
            { s: 'Session 4', l: 'Full Flow Wiring',  d: 'All 4 planes in correct sequence end-to-end verified' }
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