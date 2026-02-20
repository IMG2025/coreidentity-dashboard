import React, { useState, useEffect } from 'react';
import { Activity, Users, Zap, TrendingUp, StopCircle } from 'lucide-react';
import { api } from '../services/api';
import { useNotifications } from '../App';

export default function Dashboard() {
  const [deployedAgents, setDeployedAgents] = useState([]);
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadDeployedAgents();
    const interval = setInterval(loadDeployedAgents, 2000);
    return () => clearInterval(interval);
  }, []);

  async function loadDeployedAgents() {
    try {
      const agents = await api.getDeployedAgents();
      setDeployedAgents(agents);
    } catch (error) {
      console.error('Failed to load deployed agents', error);
    }
  }

  async function handleStop(id, name) {
    try {
      await api.stopAgent(id);
      addNotification(`⏸️ ${name} stopped`, 'success');
      loadDeployedAgents();
    } catch (error) {
      addNotification('Failed to stop agent', 'error');
    }
  }

  const stats = [
    { name: 'Active Agents', value: deployedAgents.filter(a => a.status === 'running').length.toString(), change: '+12%', icon: Activity, color: 'bg-blue-500' },
    { name: 'Tasks Done', value: '1,847', change: '+23%', icon: Zap, color: 'bg-green-500' },
    { name: 'Workflows', value: '12', change: '+5%', icon: TrendingUp, color: 'bg-purple-500' },
    { name: 'Compliance', value: '98%', change: '+2%', icon: Users, color: 'bg-orange-500' }
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm lg:text-base text-gray-600 mt-1">Your digital workforce overview</p>
      </div>

      {/* Stats Grid - Stack on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-lg shadow p-4 lg:p-6">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs lg:text-sm font-medium text-gray-600 line-clamp-1">{stat.name}</p>
                  <div className={`${stat.color} p-2 lg:p-3 rounded-lg`}>
                    <Icon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                  </div>
                </div>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs lg:text-sm text-green-600">{stat.change}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deployed Agents */}
      {deployedAgents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 lg:p-6">
          <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3 lg:mb-4">Deployed Agents</h2>
          <div className="space-y-2 lg:space-y-3">
            {deployedAgents.map((agent) => (
              <div key={agent.id} className={`flex items-center justify-between p-3 lg:p-4 rounded-lg border-2 ${
                agent.status === 'running' ? 'border-green-200 bg-green-50' :
                agent.status === 'deploying' ? 'border-blue-200 bg-blue-50' :
                'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center space-x-3 lg:space-x-4 flex-1 min-w-0">
                  <div className="text-2xl lg:text-3xl flex-shrink-0">{agent.agentIcon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm lg:text-base text-gray-900 truncate">{agent.agentName}</p>
                    <p className="text-xs lg:text-sm text-gray-600 truncate">
                      {new Date(agent.deployedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 lg:space-x-3 flex-shrink-0">
                  <span className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    agent.status === 'running' ? 'bg-green-100 text-green-800' :
                    agent.status === 'deploying' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {agent.status}
                  </span>
                  {agent.status === 'running' && (
                    <button
                      onClick={() => handleStop(agent.id, agent.agentName)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded active:bg-red-100 transition-colors"
                      title="Stop agent">
                      <StopCircle className="h-4 w-4 lg:h-5 lg:w-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions - Stack on mobile */}
      <div className="bg-white rounded-lg shadow p-4 lg:p-6">
        <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          <a href="/agents" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-colors cursor-pointer">
            <p className="font-medium text-sm lg:text-base text-gray-900">Deploy New Agent</p>
            <p className="text-xs lg:text-sm text-gray-600 mt-1">Browse catalog</p>
          </a>
          <a href="/workflows" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-colors cursor-pointer">
            <p className="font-medium text-sm lg:text-base text-gray-900">Create Workflow</p>
            <p className="text-xs lg:text-sm text-gray-600 mt-1">Automate processes</p>
          </a>
          <a href="/governance" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-colors cursor-pointer">
            <p className="font-medium text-sm lg:text-base text-gray-900">View Reports</p>
            <p className="text-xs lg:text-sm text-gray-600 mt-1">Compliance & analytics</p>
          </a>
        </div>
      </div>

      {deployedAgents.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 lg:p-6 text-center">
          <p className="text-base lg:text-lg font-medium text-blue-900 mb-2">Ready to get started?</p>
          <p className="text-sm lg:text-base text-blue-700 mb-4">Deploy your first AI agent</p>
          <a href="/agents" className="inline-block bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium py-2 lg:py-3 px-4 lg:px-6 rounded-lg transition-colors text-sm lg:text-base">
            Browse Agents
          </a>
        </div>
      )}
    </div>
  );
}
