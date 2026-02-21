import React, { useState, useEffect } from 'react';
import { GitBranch, Play, Pause, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../App';

const STATUS_STYLES = {
  active:   'bg-green-100 text-green-700',
  paused:   'bg-yellow-100 text-yellow-700',
  error:    'bg-red-100 text-red-700',
  draft:    'bg-gray-100 text-gray-700'
};

export default function Workflows() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', trigger: 'manual' });

  useEffect(() => { loadWorkflows(); }, []);

  async function loadWorkflows() {
    try {
      const data = await api.getWorkflows();
      setWorkflows(data);
    } catch (err) {
      addNotification('Failed to load workflows', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.createWorkflow(form);
      addNotification(`✅ Workflow "${form.name}" created`, 'success');
      setForm({ name: '', description: '', trigger: 'manual' });
      setShowCreate(false);
      loadWorkflows();
    } catch (err) {
      addNotification(err.message, 'error');
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-600 mt-1">Automate your AI agent processes</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm">
            <Plus className="h-4 w-4" /> New Workflow
          </button>
        )}
      </div>

      {/* Create Form — ADMIN only */}
      {showCreate && user?.role === 'ADMIN' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Workflow</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
              <select value={form.trigger} onChange={e => setForm({...form, trigger: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="manual">Manual</option>
                <option value="scheduled">Scheduled</option>
                <option value="event">Event-driven</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm">Create</button>
              <button type="button" onClick={() => setShowCreate(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Workflows List */}
      {workflows.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <GitBranch className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No workflows yet.</p>
          {user?.role === 'ADMIN' && <p className="text-sm text-gray-400 mt-1">Create your first workflow above.</p>}
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map(wf => (
            <div key={wf.id} className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <GitBranch className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{wf.name}</h3>
                  <p className="text-sm text-gray-500">{wf.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{wf.trigger} trigger</span>
                  </div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[wf.status] || STATUS_STYLES.draft}`}>
                {wf.status || 'draft'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
