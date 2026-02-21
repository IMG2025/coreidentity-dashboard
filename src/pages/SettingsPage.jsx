import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { User, Shield, Plus, AlertCircle, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await api.createCustomer(form);
      setStatus({ type: 'success', message: `Customer account created for ${form.email}` });
      setForm({ email: '', password: '', firstName: '', lastName: '' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and platform settings</p>
      </div>

      {/* Current User */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Your Account</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Name</span>
            <span className="font-medium">{user?.firstName} {user?.lastName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Role</span>
            <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${user?.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Customer Registration — ADMIN only */}
      {user?.role === 'ADMIN' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Create Customer Account</h2>
          </div>

          {status && (
            <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${status.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {status.type === 'success'
                ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                : <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
              <p className={`text-sm ${status.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{status.message}</p>
            </div>
          )}

          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input name="firstName" value={form.firstName} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input name="lastName" value={form.lastName} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">
              <Plus className="h-4 w-4" />
              {loading ? 'Creating...' : 'Create Customer Account'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
