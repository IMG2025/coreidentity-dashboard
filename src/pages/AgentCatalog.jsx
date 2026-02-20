import React, { useState, useEffect } from 'react';
import { Search, Filter, Star, Clock, Shield, X, Loader } from 'lucide-react';
import { api } from '../services/api';
import { useNotifications } from '../App';

export default function AgentCatalog() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [deploying, setDeploying] = useState({});
  const [selectedAgent, setSelectedAgent] = useState(null);
  const { addNotification } = useNotifications();

  const categories = ['All', 'Data Analysis', 'Document Processing', 'Communication', 'Research', 'Compliance', 'Integration', 'Marketing', 'Customer Service'];

  useEffect(() => {
    loadAgents();
  }, [selectedCategory, searchTerm]);

  async function loadAgents() {
    setLoading(true);
    try {
      const data = await api.getAgents(selectedCategory, searchTerm);
      setAgents(data);
    } catch (error) {
      addNotification('Failed to load agents', 'error');
    }
    setLoading(false);
  }

  async function handleDeploy(agentId) {
    setDeploying(prev => ({ ...prev, [agentId]: true }));
    try {
      const deployment = await api.deployAgent(agentId);
      addNotification(`🚀 ${deployment.agentName} deploying...`, 'success');
      setTimeout(() => {
        addNotification(`✅ ${deployment.agentName} running!`, 'success');
      }, 3000);
    } catch (error) {
      addNotification('Deployment failed', 'error');
    }
    setDeploying(prev => ({ ...prev, [agentId]: false }));
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Agent Catalog</h1>
        <p className="text-sm lg:text-base text-gray-600 mt-1">{agents.length} AI agents available</p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4 lg:p-6">
        <div className="flex flex-col space-y-3 lg:space-y-0 lg:flex-row lg:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 lg:pl-10 pr-4 py-2 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 lg:px-4 py-2 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            {categories.map(cat => (
              <option key={cat} value={cat.toLowerCase()}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Agent Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {agents.map((agent) => (
              <div key={agent.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4 lg:p-6">
                <div className="flex items-start justify-between mb-3 lg:mb-4">
                  <div className="text-3xl lg:text-4xl">{agent.icon}</div>
                  <div className="flex items-center space-x-1 text-yellow-500">
                    <Star className="h-3 w-3 lg:h-4 lg:w-4 fill-current" />
                    <span className="text-xs lg:text-sm font-medium text-gray-700">{agent.rating.toFixed(1)}</span>
                  </div>
                </div>
                
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{agent.name}</h3>
                <p className="text-xs lg:text-sm text-gray-600 mb-3 lg:mb-4 line-clamp-2">{agent.description}</p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3 lg:mb-4">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 lg:h-4 lg:w-4" />
                    <span className="text-xs">{agent.deployments.toLocaleString()}</span>
                  </div>
                  <span className={`px-2 py-0.5 lg:py-1 rounded text-xs font-medium ${
                    agent.price === 'Premium' ? 'bg-purple-100 text-purple-800' :
                    agent.price === 'Standard' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {agent.price}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1 lg:gap-2 mb-3 lg:mb-4">
                  {agent.compliance.map(badge => (
                    <span key={badge} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      <Shield className="h-2 w-2 lg:h-3 lg:w-3 mr-1" />
                      {badge}
                    </span>
                  ))}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleDeploy(agent.id)}
                    disabled={deploying[agent.id]}
                    className={`flex-1 text-sm lg:text-base font-medium py-2 px-3 lg:px-4 rounded-lg transition-colors ${
                      deploying[agent.id]
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 text-white active:bg-blue-700'
                    }`}>
                    {deploying[agent.id] ? (
                      <span className="flex items-center justify-center">
                        <Loader className="h-3 w-3 lg:h-4 lg:w-4 animate-spin mr-2" />
                        Deploying...
                      </span>
                    ) : (
                      'Deploy'
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedAgent(agent)}
                    className="sm:w-auto px-3 lg:px-4 py-2 text-sm lg:text-base border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          {agents.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">No agents found</p>
            </div>
          )}
        </>
      )}

      {/* Agent Detail Modal - Full screen on mobile */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 lg:p-4 z-50" onClick={() => setSelectedAgent(null)}>
          <div className="bg-white w-full h-full lg:h-auto lg:rounded-lg lg:max-w-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 lg:p-6 flex justify-between items-start">
              <div className="flex items-center space-x-3 lg:space-x-4">
                <div className="text-4xl lg:text-5xl">{selectedAgent.icon}</div>
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900">{selectedAgent.name}</h2>
                  <p className="text-sm lg:text-base text-gray-600">{selectedAgent.category}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="text-gray-400 hover:text-gray-600 p-2">
                <X className="h-5 w-5 lg:h-6 lg:w-6" />
              </button>
            </div>

            <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
              <div>
                <h3 className="text-sm lg:text-base font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-sm lg:text-base text-gray-600">{selectedAgent.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm lg:text-base font-semibold text-gray-900 mb-2">Rating</h3>
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 lg:h-5 lg:w-5 fill-current text-yellow-500" />
                    <span className="text-base lg:text-lg font-medium">{selectedAgent.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm lg:text-base font-semibold text-gray-900 mb-2">Deployments</h3>
                  <p className="text-base lg:text-lg font-medium">{selectedAgent.deployments.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm lg:text-base font-semibold text-gray-900 mb-2">Compliance</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.compliance.map(badge => (
                    <span key={badge} className="px-3 py-1 rounded text-sm font-medium bg-green-100 text-green-800">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm lg:text-base font-semibold text-gray-900 mb-2">Pricing</h3>
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  selectedAgent.price === 'Premium' ? 'bg-purple-100 text-purple-800' :
                  selectedAgent.price === 'Standard' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedAgent.price} Tier
                </span>
              </div>

              <button
                onClick={() => {
                  handleDeploy(selectedAgent.id);
                  setSelectedAgent(null);
                }}
                disabled={deploying[selectedAgent.id]}
                className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-base lg:text-lg">
                Deploy This Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
