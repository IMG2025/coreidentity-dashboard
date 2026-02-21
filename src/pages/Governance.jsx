import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SCORE_COLOR = score =>
  score >= 90 ? 'text-green-600' : score >= 70 ? 'text-yellow-600' : 'text-red-600';

const SCORE_BG = score =>
  score >= 90 ? 'bg-green-100' : score >= 70 ? 'bg-yellow-100' : 'bg-red-100';

export default function Governance() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadGovernance(); }, []);

  async function loadGovernance() {
    try {
      const res = await api.getGovernance();
      setData(res);
    } catch (err) {
      console.error('Failed to load governance data', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">Failed to load governance data.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Governance</h1>
        <p className="text-gray-600 mt-1">Compliance and risk management overview</p>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(data.scores || []).map(item => (
          <div key={item.label} className={`${SCORE_BG(item.score)} rounded-xl p-4`}>
            <p className="text-sm font-medium text-gray-600">{item.label}</p>
            <p className={`text-3xl font-bold mt-1 ${SCORE_COLOR(item.score)}`}>{item.score}%</p>
            <p className="text-xs text-gray-500 mt-1">{item.description}</p>
          </div>
        ))}
      </div>

      {/* Compliance Frameworks */}
      {user?.role === 'ADMIN' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Frameworks</h2>
          <div className="space-y-3">
            {(data.frameworks || []).map(fw => (
              <div key={fw.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {fw.status === 'compliant'
                    ? <CheckCircle className="h-5 w-5 text-green-500" />
                    : fw.status === 'warning'
                    ? <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    : <XCircle className="h-5 w-5 text-red-500" />}
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{fw.name}</p>
                    <p className="text-xs text-gray-500">{fw.description}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-700">{fw.score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h2>
        {(data.alerts || []).length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No active alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(data.alerts || []).map((alert, i) => (
              <div key={i} className={`p-3 rounded-lg border ${alert.severity === 'high' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${alert.severity === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                  <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">{alert.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
