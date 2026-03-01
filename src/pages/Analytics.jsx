/* script-37 */
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Activity, Shield, Zap, Clock, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.coreidentity.coreholdingcorp.com';

function StatCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    gray:   'bg-gray-50 text-gray-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-2">
      <div className={'h-9 w-9 rounded-lg flex items-center justify-center ' + (colors[color] || colors.blue)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function Bar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const colors = { blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500', orange: 'bg-orange-400', gray: 'bg-gray-400' };
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-24 truncate shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={'h-2 rounded-full ' + (colors[color] || colors.blue)} style={{ width: pct + '%' }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-6 text-right">{value}</span>
    </div>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      const token = localStorage.getItem('ci_token');
      const res = await fetch(API_URL + '/api/analytics', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      setData(json.data);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <p className="text-red-600 font-medium">Failed to load analytics</p>
      <p className="text-red-400 text-sm mt-1">{error}</p>
      <button onClick={load} className="mt-3 text-sm text-blue-600 underline">Retry</button>
    </div>
  );

  const s   = data?.summary || {};
  const cat = data?.deploymentsByCategory || {};
  const est = data?.executionsByType || {};
  const ess = data?.executionsByStatus || {};
  const tl  = data?.activityTimeline || [];
  const maxCat = Math.max(...Object.values(cat), 1);
  const maxEst = Math.max(...Object.values(est), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Platform performance · Live from DynamoDB</p>
        </div>
        <button onClick={load} className="text-xs text-blue-600 underline mt-1">Refresh</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}    label="AI Agents"         value={s.totalAgents}       sub="In SmartNation registry"  color="blue"   />
        <StatCard icon={Activity} label="Deployments"       value={s.totalDeployments}  sub={s.activeDeployments + ' active'}        color="green"  />
        <StatCard icon={Zap}      label="Executions"        value={s.totalExecutions}   sub={s.successRate + '% success rate'}       color="purple" />
        <StatCard icon={Shield}   label="Governed Agents"   value={s.governedAgents}    sub="CoreIdentity governed"    color="orange" />
      </div>

      {/* Activity timeline */}
      {tl.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Activity — Last 7 Days</h2>
          <div className="flex items-end gap-2 h-24">
            {tl.map((day, i) => {
              const maxVal = Math.max(...tl.map(d => d.deployments + d.executions), 1);
              const total  = day.deployments + day.executions;
              const hPct   = Math.round((total / maxVal) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end" style={{ height: 80 }}>
                    <div className="w-full bg-blue-500 rounded-t" style={{ height: Math.max(hPct * 0.8, total > 0 ? 4 : 0) }} title={total + ' events'} />
                  </div>
                  <span className="text-xs text-gray-400 rotate-0">{day.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2">
            <span className="text-xs text-gray-400 flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded inline-block"/> Events</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Executions by type */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Executions by Type</h2>
          <div className="space-y-3">
            {Object.entries(est).length === 0
              ? <p className="text-gray-400 text-sm text-center py-4">No executions yet</p>
              : Object.entries(est).map(([k, v]) => (
                  <Bar key={k} label={k} value={v} max={maxEst} color="purple" />
                ))
            }
          </div>
        </div>

        {/* Deployments by category */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Deployments by Category</h2>
          <div className="space-y-3">
            {Object.entries(cat).length === 0
              ? <p className="text-gray-400 text-sm text-center py-4">No deployments yet — hit Deploy on any agent</p>
              : Object.entries(cat).map(([k, v]) => (
                  <Bar key={k} label={k} value={v} max={maxCat} color="green" />
                ))
            }
          </div>
        </div>
      </div>

      {/* Recent executions */}
      {data?.recentExecutions?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Executions</h2>
          <div className="space-y-2">
            {data.recentExecutions.map((e, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Zap className="h-4 w-4 text-purple-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Agent {e.agentId} — {e.taskType}</p>
                    <p className="text-xs text-gray-400">{e.startedAt ? new Date(e.startedAt).toLocaleString() : 'Unknown time'}</p>
                  </div>
                </div>
                <span className={'px-2 py-1 rounded-full text-xs font-medium ' + (e.status === 'OK' || e.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent deployments */}
      {data?.recentDeployments?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Deployments</h2>
          <div className="space-y-2">
            {data.recentDeployments.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.agentName || 'Agent ' + d.agentId}</p>
                  <p className="text-xs text-gray-400">{d.category} · {d.deployedAt ? new Date(d.deployedAt).toLocaleString() : ''}</p>
                </div>
                <span className={'px-2 py-1 rounded-full text-xs font-medium ' + (d.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
