import React from 'react';
import { TrendingUp, Clock, DollarSign, Users } from 'lucide-react';

export default function Analytics() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Analytics</h1>
        <p className="text-sm text-gray-600">Track performance and ROI</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Time Saved</p>
            <Clock className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold">3,220 hrs</p>
          <p className="text-xs text-green-600 mt-1">+18% this month</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Cost Savings</p>
            <DollarSign className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold">$98,450</p>
          <p className="text-xs text-green-600 mt-1">+23% this month</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Active Users</p>
            <Users className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold">87</p>
          <p className="text-xs text-green-600 mt-1">+12 this week</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">ROI</p>
            <TrendingUp className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold">847%</p>
          <p className="text-xs text-green-600 mt-1">Year to date</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
        <h3 className="text-xl font-bold mb-2">Monthly Summary</h3>
        <p className="opacity-90 mb-4">
          Your digital workforce has saved 3,220 hours this month, resulting in $98,450 in cost savings. 
          With an ROI of 847%, your investment in AI automation is paying off significantly.
        </p>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-blue-400">
          <div>
            <p className="text-xs opacity-75">Tasks</p>
            <p className="text-2xl font-bold">12,456</p>
          </div>
          <div>
            <p className="text-xs opacity-75">Success Rate</p>
            <p className="text-2xl font-bold">97.8%</p>
          </div>
          <div>
            <p className="text-xs opacity-75">Avg Response</p>
            <p className="text-2xl font-bold">1.2s</p>
          </div>
        </div>
      </div>
    </div>
  );
}
