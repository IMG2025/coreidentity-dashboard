import React, { useState, useEffect } from 'react';
import { Cpu, Activity, CheckCircle, XCircle, Clock,
         AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { api } from '../services/api';

const STATUS_COLORS = {
  COMPLETED: 'text-green-700 bg-green-100',
  FAILED:    'text-red-700 bg-red-100',
  RUNNING:   'text-blue-700 bg-blue-100',
  QUEUED:    'text-gray-700 bg-gray-100'
};

const CB_COLORS = {
  CLOSED:    'text-green-700 bg-green-100',
  OPEN:      'text-red-700 bg-red-100',
  HALF_OPEN: 'text-orange-700 bg-orange-100'
};

function StatCard({ icon: Icon, label, value, color }) {
  const g = {
    blue:   'from-blue-600 to-blue-800',
    green:  'from-green-500 to-green-700',
    orange: 'from-orange-500 to-orange-700',
    purple: 'from-purple-600 to-purple-800',
    teal:   'from-teal-500 to-teal-700'
  };
  return (
    <div className={'bg-gradient-to-br ' + (g[color] || g.blue) + ' rounded-2xl p-5 text-white'}>
      <Icon size={20} className='opacity-80 mb-3' />
      <div className='text-3xl font-bold mb-1'>{value}</div>
      <div className='text-xs opacity-70 uppercase tracking-wide'>{label}</div>
    </div>
  );
}

export default function NexusOS() {
  const [status, setStatus]         = useState(null);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(function() { loadAll(); }, []);

  function loadAll() {
    setRefreshing(true);
    api.getNexusStatus()
      .then(function(s) { setStatus(s); })
      .catch(function(e) { console.warn('Nexus status:', e.message); })
      .finally(function() { setLoading(false); setRefreshing(false); });

    api.getNexusExecutions(20)
      .then(function(e) { setExecutions(Array.isArray(e) ? e : []); })
      .catch(function(e) { console.warn('Nexus executions:', e.message); });
  }

  const stats = status ? status.execution_stats : null;

  return (
    <div className='max-w-6xl mx-auto px-4 py-6'>
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-10 h-10 bg-gradient-to-br from-blue-900 to-blue-700 rounded-xl flex items-center justify-center'>
          <Cpu size={20} className='text-white' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Nexus OS</h1>
          <p className='text-sm text-gray-500'>Execution Plane · Runtime Lifecycle Management</p>
        </div>
        <div className='ml-auto flex items-center gap-3'>
          <button onClick={loadAll} disabled={refreshing}
            className='p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors'>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <div className='flex items-center gap-2'>
            <span className='w-2 h-2 bg-green-400 rounded-full animate-pulse' />
            <span className='text-sm text-green-600 font-medium'>OPERATIONAL</span>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        <StatCard icon={Activity}      label='Total Executions' value={stats ? stats.total     : '--'} color='blue'   />
        <StatCard icon={CheckCircle}   label='Completed'        value={stats ? stats.completed  : '--'} color='green'  />
        <StatCard icon={XCircle}       label='Failed'           value={stats ? stats.failed     : '--'} color='orange' />
        <StatCard icon={Zap}           label='Success Rate'     value={stats ? stats.successRate + '%' : '--'} color='teal' />
      </div>

      {stats && (
        <div className='grid md:grid-cols-3 gap-4 mb-6'>
          <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
            <h3 className='font-semibold text-gray-800 mb-4 flex items-center gap-2'>
              <Activity size={16} className='text-blue-500' /> Runtime Status
            </h3>
            {[
              ['Running',      stats.running,             'text-blue-600'],
              ['Queued',       stats.queued,              'text-gray-600'],
              ['Avg Duration', stats.avgDuration + 'ms',  'text-purple-600'],
              ['Success Rate', stats.successRate + '%',   'text-green-600']
            ].map(function(row) {
              return (
                <div key={row[0]} className='flex justify-between py-2 border-b border-gray-50 last:border-0'>
                  <span className='text-sm text-gray-500'>{row[0]}</span>
                  <span className={'font-bold ' + row[2]}>{row[1]}</span>
                </div>
              );
            })}
          </div>

          <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
            <h3 className='font-semibold text-gray-800 mb-4 flex items-center gap-2'>
              <AlertTriangle size={16} className='text-orange-500' /> Circuit Breakers
            </h3>
            {stats.circuitBreakers && stats.circuitBreakers.length > 0
              ? stats.circuitBreakers.map(function(cb) {
                  return (
                    <div key={cb.agentId} className='flex items-center justify-between py-2 border-b border-gray-50 last:border-0'>
                      <span className='text-sm text-gray-600'>Agent {cb.agentId}</span>
                      <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (CB_COLORS[cb.state] || '')}>{cb.state}</span>
                    </div>
                  );
                })
              : (
                <div className='flex flex-col items-center justify-center py-6 text-center'>
                  <CheckCircle size={28} className='text-green-400 mb-2' />
                  <span className='text-sm text-gray-400'>All circuits closed</span>
                </div>
              )
            }
          </div>

          <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
            <h3 className='font-semibold text-gray-800 mb-4 flex items-center gap-2'>
              <Zap size={16} className='text-yellow-500' /> Concurrency Limits
            </h3>
            {[['TIER_1','50 concurrent'],['TIER_2','20 concurrent'],['TIER_3','5 concurrent'],['TIER_4','1 concurrent']].map(function(t) {
              return (
                <div key={t[0]} className='flex justify-between py-2 border-b border-gray-50 last:border-0'>
                  <span className='text-sm text-gray-500'>{t[0]}</span>
                  <span className='text-sm font-medium text-gray-700'>{t[1]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
        <div className='p-5 border-b border-gray-100 flex justify-between items-center'>
          <h3 className='font-semibold text-gray-800'>Execution Log</h3>
          <span className='text-xs text-gray-400'>{executions.length} records</span>
        </div>
        {loading && (
          <div className='flex justify-center py-12'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600' />
          </div>
        )}
        {!loading && executions.length === 0 && (
          <div className='p-12 text-center text-gray-400'>
            <Cpu size={32} className='mx-auto mb-3 opacity-30' />
            <div>No executions yet — run an agent to see Nexus in action</div>
          </div>
        )}
        <div className='divide-y divide-gray-50'>
          {executions.map(function(ex) {
            return (
              <div key={ex.executionId} className='px-5 py-3 flex items-center gap-4'>
                <span className={'text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ' + (STATUS_COLORS[ex.status] || STATUS_COLORS.QUEUED)}>
                  {ex.status}
                </span>
                <div className='flex-1 min-w-0'>
                  <div className='text-sm font-medium text-gray-800'>
                    Agent {ex.agentId} · {ex.taskType}
                  </div>
                  <div className='text-xs text-gray-400'>
                    {ex.riskTier} · {ex.telemetry && ex.telemetry.duration ? ex.telemetry.duration + 'ms' : '--'}
                    {ex.retryCount > 0 ? ' · ' + ex.retryCount + ' retries' : ''}
                  </div>
                </div>
                <span className='text-xs text-gray-400 shrink-0'>
                  {new Date(ex.createdAt).toLocaleTimeString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}