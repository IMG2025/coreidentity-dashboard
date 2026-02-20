import React from 'react';
import { User, Bell } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input type="text" className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2" defaultValue="Admin User" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2" defaultValue="admin@company.com" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Bell className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center space-x-3">
            <input type="checkbox" className="rounded border-gray-300" defaultChecked />
            <span className="text-sm text-gray-700">Email notifications for agent status changes</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="checkbox" className="rounded border-gray-300" defaultChecked />
            <span className="text-sm text-gray-700">Policy violation alerts</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="checkbox" className="rounded border-gray-300" />
            <span className="text-sm text-gray-700">Weekly summary reports</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}
