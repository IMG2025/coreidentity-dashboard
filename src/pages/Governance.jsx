import React, { useState } from 'react';
import { Shield, CheckCircle, AlertTriangle, Eye, X } from 'lucide-react';

export default function Governance() {
  const [violations, setViolations] = useState([
    { id: 1, agent: 'Data Processor', policy: 'Data Retention', severity: 'Medium', description: 'Data retained beyond policy', resolved: false },
    { id: 2, agent: 'Email Bot', policy: 'PII Handling', severity: 'Low', description: 'PII detected in logs', resolved: false }
  ]);
  const [selected, setSelected] = useState(null);

  function resolve(id) {
    setViolations(violations.map(v => v.id === id ? { ...v, resolved: true } : v));
    setSelected(null);
  }

  const active = violations.filter(v => !v.resolved);

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Governance</h1>
        <p className="text-sm text-gray-600">Monitor compliance</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Compliance Score</p>
            <p className="text-5xl font-bold mt-2">98%</p>
            <p className="text-sm text-green-600">Excellent</p>
          </div>
          <CheckCircle className="h-20 w-20 text-green-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Policies</p>
          <p className="text-2xl font-bold">47/47</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Violations</p>
          <p className="text-2xl font-bold text-yellow-600">{active.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Audit Events</p>
          <p className="text-2xl font-bold">12,847</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Failed Checks</p>
          <p className="text-2xl font-bold text-green-600">0</p>
        </div>
      </div>

      {active.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Active Violations</h2>
          <div className="space-y-3">
            {active.map(v => (
              <div key={v.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-3 flex-1">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-1" />
                  <div>
                    <p className="font-medium">{v.agent}</p>
                    <p className="text-sm text-gray-600">Policy: {v.policy}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs ${v.severity === 'High' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {v.severity}
                  </span>
                  <button onClick={() => setSelected(v)} className="p-2 hover:bg-white rounded">
                    <Eye className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Compliance Standards</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {['SOC2', 'HIPAA', 'GDPR', 'ISO 27001'].map(s => (
            <div key={s} className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">{s}</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Violation Details</h2>
              <button onClick={() => setSelected(null)}><X className="h-6 w-6" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Agent</p>
                <p className="mt-1">{selected.agent}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Policy</p>
                <p className="mt-1">{selected.policy}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Description</p>
                <p className="mt-1">{selected.description}</p>
              </div>
              <button onClick={() => resolve(selected.id)} className="w-full bg-green-500 text-white py-3 rounded-lg">
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
