import React, { useState } from 'react';
import { TrendingUp, DollarSign, Users, Activity, AlertTriangle, CheckCircle, Zap, Building2, Target, Clock } from 'lucide-react';

export default function FoundersDashboard() {
  const [timeRange, setTimeRange] = useState('30d');

  const metrics = {
    mrr: 47850,
    customers: 12,
    activeAgos: 7,
    totalAgents: 105,
    deployedAgents: 89,
    activeWorkflows: 34,
    complianceScore: 98,
    uptime: 99.97
  };

  const agos = [
    { name: 'Sentinel OS', status: 'running', health: 100, customers: 12, revenue: 15000 },
    { name: 'Echo Workflow', status: 'running', health: 98, customers: 10, revenue: 8500 },
    { name: 'Nexus Integration', status: 'running', health: 95, customers: 8, revenue: 6200 },
    { name: 'Atlas Knowledge', status: 'running', health: 100, customers: 6, revenue: 4800 },
    { name: 'Forge Development', status: 'running', health: 92, customers: 5, revenue: 3900 },
    { name: 'Prism Analytics', status: 'running', health: 97, customers: 7, revenue: 5450 },
    { name: 'Vault Security', status: 'running', health: 100, customers: 12, revenue: 18000 },
    { name: 'Horizon ML', status: 'deploying', health: 85, customers: 3, revenue: 2400 },
    { name: 'Pulse Monitoring', status: 'stopped', health: 0, customers: 0, revenue: 0 }
  ];

  const verticals = [
    { name: 'Healthcare', customers: 4, mrr: 18500, agents: 32, compliance: 99, trend: '+12%' },
    { name: 'Retail', customers: 3, mrr: 12200, agents: 28, compliance: 97, trend: '+8%' },
    { name: 'Hospitality', customers: 3, mrr: 9800, agents: 18, compliance: 98, trend: '+5%' },
    { name: 'Financial Services', customers: 2, mrr: 7350, agents: 11, compliance: 100, trend: '+15%' }
  ];

  const pilots = [
    { name: 'Walmart Retail Pilot', status: 'active', progress: 65, daysRemaining: 23, revenue: 0, stage: 'Phase 2' },
    { name: 'Cole Hospitality', status: 'paused', progress: 40, daysRemaining: 0, revenue: 0, stage: 'Phase 1' },
    { name: 'Regional Hospital Chain', status: 'active', progress: 82, daysRemaining: 12, revenue: 8500, stage: 'Phase 3' }
  ];

  const alerts = [
    { type: 'success', message: 'Walmart pilot hit 65% milestone', time: '2 hours ago' },
    { type: 'warning', message: 'Horizon ML deployment taking longer than expected', time: '5 hours ago' },
    { type: 'info', message: 'New customer signed: Regional Credit Union', time: '1 day ago' }
  ];

  return (
    <div className="space-y-4 lg:space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Founders Dashboard</h1>
          <p className="text-sm lg:text-base text-gray-600 mt-1">Executive view of CoreIdentity operations</p>
        </div>
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs lg:text-sm font-medium opacity-90">Monthly Recurring Revenue</p>
            <DollarSign className="h-5 w-5 lg:h-6 lg:w-6" />
          </div>
          <p className="text-2xl lg:text-3xl font-bold">${(metrics.mrr / 1000).toFixed(1)}K</p>
          <p className="text-xs mt-1 opacity-90">+23% vs last month</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs lg:text-sm font-medium opacity-90">Active Customers</p>
            <Users className="h-5 w-5 lg:h-6 lg:w-6" />
          </div>
          <p className="text-2xl lg:text-3xl font-bold">{metrics.customers}</p>
          <p className="text-xs mt-1 opacity-90">+3 this month</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs lg:text-sm font-medium opacity-90">AGOs Running</p>
            <Activity className="h-5 w-5 lg:h-6 lg:w-6" />
          </div>
          <p className="text-2xl lg:text-3xl font-bold">{metrics.activeAgos}/9</p>
          <p className="text-xs mt-1 opacity-90">2 deploying</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs lg:text-sm font-medium opacity-90">Platform Uptime</p>
            <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6" />
          </div>
          <p className="text-2xl lg:text-3xl font-bold">{metrics.uptime}%</p>
          <p className="text-xs mt-1 opacity-90">99.5% SLA target</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 lg:p-6">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-4">AGO Operations</h2>
        <div className="space-y-3">
          {agos.map((ago) => (
            <div key={ago.name} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg gap-3">
              <div className="flex items-center space-x-3 flex-1">
                <div className={\`h-3 w-3 rounded-full \${ago.status === 'running' ? 'bg-green-500' : ago.status === 'deploying' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}\`}></div>
                <div className="flex-1">
                  <p className="text-sm lg:text-base font-medium text-gray-900">{ago.name}</p>
                  <p className="text-xs text-gray-600">{ago.customers} customers • ${ago.revenue.toLocaleString()} MRR</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-xs text-gray-600">Health</p>
                  <p className="text-sm font-medium">{ago.health}%</p>
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div className={\`h-2 rounded-full \${ago.health >= 95 ? 'bg-green-500' : ago.health >= 85 ? 'bg-yellow-500' : 'bg-red-500'}\`} style={{ width: \`\${ago.health}%\` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 lg:p-6">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-4">Vertical Performance</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vertical</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customers</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRR</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Agents</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Compliance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {verticals.map((v) => (
                <tr key={v.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium">{v.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{v.customers}</td>
                  <td className="px-4 py-3 text-sm font-medium">\${v.mrr.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm hidden sm:table-cell">{v.agents}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={\`px-2 py-1 rounded-full text-xs font-medium \${v.compliance >= 99 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}\`}>
                      {v.compliance}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-green-600 font-medium">{v.trend}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 lg:p-6">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-4">Active Pilot Programs</h2>
        <div className="space-y-4">
          {pilots.map((pilot) => (
            <div key={pilot.name} className="border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{pilot.name}</h3>
                  <p className="text-sm text-gray-600">{pilot.stage} • {pilot.status}</p>
                </div>
                <div className="flex items-center space-x-4">
                  {pilot.revenue > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Revenue</p>
                      <p className="text-sm font-medium">\${pilot.revenue.toLocaleString()}</p>
                    </div>
                  )}
                  {pilot.daysRemaining > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Days Left</p>
                      <p className="text-sm font-medium">{pilot.daysRemaining}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{pilot.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={\`h-2 rounded-full \${pilot.status === 'active' ? 'bg-blue-500' : 'bg-gray-400'}\`} style={{ width: \`\${pilot.progress}%\` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 lg:p-6">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              {alert.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />}
              {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />}
              {alert.type === 'info' && <Zap className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className="text-sm text-gray-900">{alert.message}</p>
                <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-3 text-center transition">
            <Target className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">Launch Pilot</p>
          </button>
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-3 text-center transition">
            <Users className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">Add Customer</p>
          </button>
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-3 text-center transition">
            <Activity className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">Deploy AGO</p>
          </button>
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-3 text-center transition">
            <Clock className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">View Reports</p>
          </button>
        </div>
      </div>
    </div>
  );
}
