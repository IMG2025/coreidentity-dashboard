import React, { useState } from 'react';
import { Plus, Play, Pause, Trash2, GitBranch } from 'lucide-react';
import { useNotifications } from '../App';

export default function Workflows() {
  const [workflows, setWorkflows] = useState([
    { id: 1, name: 'Invoice Processing', status: 'active', agents: 3, tasksCompleted: 847 },
    { id: 2, name: 'Customer Onboarding', status: 'active', agents: 5, tasksCompleted: 234 },
    { id: 3, name: 'Compliance Reporting', status: 'paused', agents: 2, tasksCompleted: 1205 }
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const { addNotification } = useNotifications();

  function handleCreate() {
    if (!newName) return;
    const wf = { id: Date.now(), name: newName, status: 'active', agents: 1, tasksCompleted: 0 };
    setWorkflows([...workflows, wf]);
    addNotification(`✅ ${newName} created!`, 'success');
    setShowCreate(false);
    setNewName('');
  }

  function toggleStatus(id) {
    setWorkflows(workflows.map(w => {
      if (w.id === id) {
        const newStatus = w.status === 'active' ? 'paused' : 'active';
        addNotification(`${newStatus === 'active' ? '▶️' : '⏸️'} ${w.name}`, 'success');
        return { ...w, status: newStatus };
      }
      return w;
    }));
  }

  function deleteWorkflow(id, name) {
    if (confirm(`Delete "${name}"?`)) {
      setWorkflows(workflows.filter(w => w.id !== id));
      addNotification(`🗑️ ${name} deleted`, 'success');
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Workflows</h1>
          <p className="text-sm text-gray-600">Manage automated processes</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>New Workflow</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold">{workflows.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">{workflows.filter(w => w.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Tasks</p>
          <p className="text-2xl font-bold">{workflows.reduce((s, w) => s + w.tasksCompleted, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Agents</p>
          <p className="text-2xl font-bold">{workflows.reduce((s, w) => s + w.agents, 0)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Workflow</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map(w => (
              <tr key={w.id} className="border-t">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <GitBranch className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">{w.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs ${w.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {w.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => toggleStatus(w.id)} className="text-blue-600 p-1">
                    {w.status === 'active' ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>
                  <button onClick={() => deleteWorkflow(w.id, w.name)} className="text-red-600 p-1">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Create Workflow</h2>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Workflow name"
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />
            <div className="flex space-x-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
