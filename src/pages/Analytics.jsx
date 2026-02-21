import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Activity } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Analytics() {
  const { user } = useAuth();
  const [deployed, setDeployed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDeployedAgents()
      .then(data => setDeployed(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const running = deployed.filter(d => d.status === 'running').length;
  const stopped = deployed.filter(d => d.status === 'stopped').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Platform performance and usage metrics</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Deployments', value: running,          icon: Activity,   color: 'bg-blue-500' },
          { label: 'Stopped',            value: stopped,          icon: BarChart3,  color: 'bg-gray-500' },
          { label: 'Total Deployments',  value: deployed.length,  icon: TrendingUp, color: 'bg-green-500' },
          { label: 'Compliance',         value: '98%',            icon: Users,      color: 'bg-purple-500' }
        ].map(metric => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="bg-white rounded-xl shadow-sm p-4">
              <div className={`h-8 w-8 ${metric.color} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-sm text-gray-500 mt-1">{metric.label}</p>
            </div>
          );
        })}
      </div>

      {/* Deployment breakdown — ADMIN sees all, CUSTOMER sees own */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {user?.role === 'ADMIN' ? 'All Deployments' : 'Your Deployments'}
        </h2>
        {deployed.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No deployments yet.</p>
        ) : (
          <div className="space-y-2">
            {deployed.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{d.agentIcon}</span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{d.agentName}</p>
                    <p className="text-xs text-gray-500">{new Date(d.deployedAt).toLocaleString()}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
