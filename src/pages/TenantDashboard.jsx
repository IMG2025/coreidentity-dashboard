import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { api } from '../services/api';
import { Building2, Shield, Activity, AlertTriangle, CheckCircle, TrendingUp, Users, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const TIER_COLORS = { TIER_1:'bg-red-100 text-red-700', TIER_2:'bg-orange-100 text-orange-700', TIER_3:'bg-green-100 text-green-700' };

function StatCard({ icon: Icon, label, value, color }) {
  var colors = { blue:'bg-blue-50 text-blue-600', green:'bg-green-50 text-green-600', red:'bg-red-50 text-red-600', purple:'bg-purple-50 text-purple-600' };
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className={"h-9 w-9 rounded-lg flex items-center justify-center mb-3 " + (colors[color] || colors.blue)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value !== undefined && value !== null ? value : "—"}</div>
      <div className="text-sm font-medium text-gray-600 mt-0.5">{label}</div>
    </div>
  );
}

export default function TenantDashboard() {
  var tenant = useTenant();
  var companies = tenant.companies;
  var selectedTenant = tenant.selectedTenant;
  var tenantData = tenant.tenantData;
  var loading = tenant.loading;
  var setSelectedTenant = tenant.setSelectedTenant;
  var [activity, setActivity] = useState([]);
  var [govHistory, setGovHistory] = useState([]);
  var [agents, setAgents] = useState([]);

  useEffect(function() {
    if (selectedTenant === 'consolidated' || !selectedTenant) return;
    Promise.all([
      api.get('/api/tenants/' + selectedTenant + '/activity?limit=20'),
      api.get('/api/tenants/' + selectedTenant + '/governance'),
      api.get('/api/tenants/' + selectedTenant + '/agents?limit=20'),
    ]).then(function(results) {
      var act = results[0]; var gov = results[1]; var agt = results[2];
      setActivity(Array.isArray(act) ? act : (act && act.data ? act.data : []));
      setGovHistory(Array.isArray(gov) ? gov : (gov && gov.data ? gov.data : []));
      setAgents(Array.isArray(agt) ? agt : (agt && agt.data ? agt.data : []));
    }).catch(function() {});
  }, [selectedTenant]);

  if (selectedTenant === 'consolidated') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Portfolio</h1>
          <p className="text-gray-500 mt-1">Select a company from the dropdown to view their governance dashboard</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map(function(co) {
            var score = parseFloat(co.governanceScore) || 0;
            var scoreColor = score >= 70 ? 'text-green-600' : score >= 55 ? 'text-amber-600' : 'text-red-600';
            return (
              <div key={co.clientId}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
                onClick={function() { setSelectedTenant(co.clientId); }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">{co.companyName}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{co.vertical}</div>
                  </div>
                  <div className={"text-lg font-bold " + scoreColor}>{score.toFixed ? score.toFixed(1) : score}</div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                  <div className="h-1.5 rounded-full bg-blue-500" style={{ width: Math.min(100, score) + '%' }} />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{(co.activeAgents || 0).toLocaleString()} active agents</span>
                  <span>{(co.totalExecutions || 0).toLocaleString()} executions</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!tenantData) return <div className="text-center py-20 text-gray-400"><Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No data available</p></div>;

  var govChartData = govHistory.slice(-48).map(function(g) { return { time: (g.timestamp || '').slice(11,16), score: parseFloat(g.score) || 0 }; });
  var violations = (tenantData.openEvents || []).filter(function(e) { return e.type === 'violation'; });
  var score = parseFloat(tenantData.governanceScore) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tenantData.companyName}</h1>
          <p className="text-gray-500 mt-1">{tenantData.vertical} · {tenantData.size}</p>
        </div>
        <div className="text-right">
          <div className={"text-3xl font-bold " + (score >= 70 ? 'text-green-600' : score >= 55 ? 'text-amber-600' : 'text-red-600')}>
            {score.toFixed ? score.toFixed(1) : score}
          </div>
          <div className="text-xs text-gray-400">Governance Score</div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard icon={Users}         label="Active Agents"    value={(tenantData.activeAgents||0).toLocaleString()} color="blue" />
        <StatCard icon={Zap}           label="Total Executions" value={(tenantData.totalExecutions||0).toLocaleString()} color="purple" />
        <StatCard icon={AlertTriangle} label="Violations"       value={(tenantData.totalViolations||0).toLocaleString()} color="red" />
        <StatCard icon={CheckCircle}   label="Success Rate"     value={(tenantData.successRate||0) + '%'} color="green" />
      </div>

      {govChartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" />Governance Score Trend</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={govChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={7} />
              <YAxis domain={[0,100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={function(v) { return [v.toFixed(1), 'Score']; }} />
              <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-blue-500" />Recent Activity</h3>
          {activity.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">No activity yet</p> : (
            <div className="space-y-2">
              {activity.slice(0,10).map(function(item, i) {
                var isViolation = item._type === 'event' || item.success === false;
                return (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className={"h-2 w-2 rounded-full shrink-0 " + (isViolation ? 'bg-red-400' : 'bg-green-400')} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800 truncate">{item.agentName || item.agentId}</div>
                      <div className="text-xs text-gray-400">{item._type === 'execution' ? (item.taskType + ' via ' + (item.via || 'api').toUpperCase()) : ('Violation: ' + (item.severity || 'medium'))}</div>
                    </div>
                    <div className="text-xs text-gray-400 shrink-0">{(item.timestamp || '').slice(11,16)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Shield className="h-4 w-4 text-blue-500" />Agent Pool Sample</h3>
          {agents.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">No agents loaded</p> : (
            <div className="space-y-2">
              {agents.slice(0,8).map(function(agent, i) {
                return (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <span className={"text-xs px-1.5 py-0.5 rounded font-medium shrink-0 " + (TIER_COLORS[agent.riskTier] || 'bg-gray-100 text-gray-600')}>{agent.riskTier}</span>
                    <div className="flex-1 text-sm text-gray-800 truncate">{agent.agentName || agent.agentId}</div>
                    <div className="text-xs text-gray-400 shrink-0">{agent.governanceScore}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {violations.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-5">
          <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Open Violations ({violations.length})</h3>
          <div className="space-y-2">
            {violations.slice(0,5).map(function(ev, i) {
              return (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (ev.severity === 'high' ? 'bg-red-200 text-red-800' : 'bg-amber-100 text-amber-800')}>{ev.severity}</span>
                  <span className="text-red-700 truncate">{ev.description}</span>
                  <span className="text-red-400 text-xs shrink-0">{(ev.timestamp||'').slice(0,10)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}