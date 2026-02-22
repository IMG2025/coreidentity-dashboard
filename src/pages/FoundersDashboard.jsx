import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Activity, Shield,
         Zap, Target, Award, BarChart2 } from 'lucide-react';
import { api } from '../services/api';
import { useNotifications } from '../App';

function MetricCard({ icon: Icon, label, value, change, color, sub }) {
  const c = color || 'blue';
  const gradients = {
    blue:   'from-blue-600 to-blue-800',
    green:  'from-green-500 to-green-700',
    purple: 'from-purple-600 to-purple-800',
    orange: 'from-orange-500 to-orange-700',
    teal:   'from-teal-500 to-teal-700',
    indigo: 'from-indigo-600 to-indigo-800'
  };
  return (
    <div className={'bg-gradient-to-br ' + (gradients[c] || gradients.blue) + ' rounded-2xl p-5 text-white relative overflow-hidden'}>
      <div className='absolute right-4 top-4 opacity-10'><Icon size={48} /></div>
      <Icon size={20} className='opacity-80 mb-3' />
      <div className='text-3xl font-bold mb-1'>{value}</div>
      <div className='text-xs opacity-70 uppercase tracking-wide'>{label}</div>
      {change !== undefined && (
        <div className='mt-2 text-xs opacity-80'>
          <span className={change > 0 ? 'text-green-300' : 'text-red-300'}>
            {change > 0 ? String.fromCharCode(8593) : String.fromCharCode(8595)} {Math.abs(change)}%
          </span>
          <span className='opacity-60 ml-1'>vs last month</span>
        </div>
      )}
      {sub && <div className='mt-1 text-xs opacity-60'>{sub}</div>}
    </div>
  );
}

function ProgressBar({ label, value, max, color }) {
  const c = color || 'blue';
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colors = { blue: 'bg-blue-500', green: 'bg-green-500', orange: 'bg-orange-500', purple: 'bg-purple-500' };
  return (
    <div className='mb-4'>
      <div className='flex justify-between text-sm mb-1'>
        <span className='text-gray-600'>{label}</span>
        <span className='font-semibold text-gray-800'>{value.toLocaleString()}</span>
      </div>
      <div className='h-2 bg-gray-100 rounded-full overflow-hidden'>
        <div className={(colors[c] || colors.blue) + ' h-full rounded-full'} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

function StackItem({ name, status, desc }) {
  const isLive = status === 'LIVE' || status === 'ACTIVE' || status === 'OPERATIONAL';
  const isBuilding = status === 'BUILDING';
  const badgeClass = isLive
    ? 'bg-green-100 text-green-700'
    : isBuilding
      ? 'bg-orange-100 text-orange-700'
      : 'bg-blue-100 text-blue-700';
  return (
    <div className='p-3 rounded-xl border border-gray-100 bg-gray-50'>
      <div className='flex items-center justify-between mb-1'>
        <span className='text-sm font-semibold text-gray-800'>{name}</span>
        <span className={'text-xs px-1.5 py-0.5 rounded-full font-medium ' + badgeClass}>{status}</span>
      </div>
      <div className='text-xs text-gray-400'>{desc}</div>
    </div>
  );
}

export default function FoundersDashboard() {
  const { addNotification } = useNotifications();
  const [sentinelStatus, setSentinelStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(function() {
    api.getSentinelStatus()
      .then(function(s) { setSentinelStatus(s); })
      .catch(function() { addNotification('Failed to load metrics', 'error'); })
      .finally(function() { setLoading(false); });
  }, []);

  const govHealth = sentinelStatus ? sentinelStatus.governance_health : 100;
  const execs24h  = sentinelStatus && sentinelStatus.audit_summary ? sentinelStatus.audit_summary.executions_24h : 0;

  if (loading) return (
    <div className='flex items-center justify-center h-64'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600' />
    </div>
  );

  const stack = [
    { name: 'Sentinel OS',    status: 'LIVE',     desc: 'Governance and Security OS' },
    { name: 'SmartNation AI', status: 'BUILDING', desc: 'Registry and Intelligence' },
    { name: 'Nexus OS',       status: 'BUILDING', desc: 'Execution OS' },
    { name: 'AGO Modules',    status: 'LIVE',     desc: '3 domains active' },
    { name: 'CoreIdentity',   status: 'LIVE',     desc: 'Platform operator' },
    { name: 'CIAG',           status: 'OPERATIONAL', desc: 'Advisory operator' },
    { name: 'CHC',            status: 'ACTIVE',   desc: 'Holding company' },
    { name: 'CI/CD Pipeline', status: 'ACTIVE',   desc: 'Auto-deploy on push' }
  ];

  const milestones = [
    { label: 'SmartNation AI',   desc: 'AgentInstrument registry and per-agent governance scoring', session: 'Session 2' },
    { label: 'Nexus OS',         desc: 'Execution OS with telemetry, retry logic, concurrency control', session: 'Session 3' },
    { label: 'Full Flow Wiring', desc: 'All 4 planes in correct sequence end-to-end verified', session: 'Session 4' }
  ];

  return (
    <div className='max-w-6xl mx-auto px-4 py-6'>
      <div className='mb-6'>
        <div className='flex items-center gap-3 mb-1'>
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
      </div>

      <h2 className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3'>Revenue and Growth</h2>
      <div className='grid grid-cols-2 md:grid-cols-3 gap-4 mb-6'>
        <MetricCard icon={DollarSign} label='Monthly Recurring Revenue' value='$12,400' change={18} color='green' />
        <MetricCard icon={TrendingUp} label='Annual Run Rate' value='$148K' sub='ARR target: $500K' color='blue' />
        <MetricCard icon={Users} label='Active Customers' value={7} change={40} sub='12 in pipeline' color='purple' />
      </div>

      <h2 className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3'>Platform Performance</h2>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        <MetricCard icon={Zap}      label='Executions (24h)' value={execs24h}  color='teal' />
        <MetricCard icon={BarChart2} label='Agents Live'      value={105}       color='indigo' />
        <MetricCard icon={Activity} label='Platform Uptime'   value='99.9%'     color='green' />
        <MetricCard icon={Shield}   label='Governance Health' value={govHealth + '%'} color={govHealth >= 90 ? 'green' : 'orange'} />
      </div>

      <div className='grid md:grid-cols-2 gap-4 mb-6'>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
          <h3 className='font-semibold text-gray-800 mb-5 flex items-center gap-2'>
            <Target size={16} className='text-blue-500' /> Customer Acquisition Pipeline
          </h3>
          <ProgressBar label='Enterprise Prospects'  value={12} max={20} color='blue' />
          <ProgressBar label='Active Pilots'          value={4}  max={12} color='green' />
          <ProgressBar label='Closed (MRR Active)'   value={7}  max={20} color='purple' />
          <ProgressBar label='Expansion Targets'     value={3}  max={10} color='orange' />
        </div>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
          <h3 className='font-semibold text-gray-800 mb-5 flex items-center gap-2'>
            <BarChart2 size={16} className='text-blue-500' /> Platform Adoption
          </h3>
          <ProgressBar label='Agents Deployed'        value={105} max={200} color='blue' />
          <ProgressBar label='AGO Domains Active'     value={3}   max={10}  color='green' />
          <ProgressBar label='Repositories Secured'   value={8}   max={15}  color='purple' />
          <ProgressBar label='Compliance Frameworks'  value={5}   max={10}  color='orange' />
        </div>
      </div>

      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4'>
        <h3 className='font-semibold text-gray-800 mb-4 flex items-center gap-2'>
          <Shield size={16} className='text-blue-500' /> CHC Platform Stack
        </h3>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          {stack.map(function(item) {
            return <StackItem key={item.name} name={item.name} status={item.status} desc={item.desc} />;
          })}
        </div>
      </div>

      <div className='bg-gradient-to-br from-gray-900 to-blue-900 rounded-2xl p-5 text-white'>
        <h3 className='font-semibold mb-4 flex items-center gap-2'><Target size={16}/> Next Milestones</h3>
        <div className='grid md:grid-cols-3 gap-4'>
          {milestones.map(function(m) {
            return (
              <div key={m.label} className='bg-white bg-opacity-10 rounded-xl p-4'>
                <div className='text-xs opacity-60 mb-1'>{m.session}</div>
                <div className='font-semibold mb-1'>{m.label}</div>
                <div className='text-xs opacity-70'>{m.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}