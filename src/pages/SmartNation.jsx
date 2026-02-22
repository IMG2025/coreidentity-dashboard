import React, { useState, useEffect } from 'react';
import { Database, Shield, Activity, TrendingUp, Star,
         BarChart2, Grid, List, Search } from 'lucide-react';
import { api } from '../services/api';
import { useNotifications } from '../App';

const TIER_COLORS = {
  TIER_1: 'bg-green-100 text-green-700 border-green-200',
  TIER_2: 'bg-blue-100 text-blue-700 border-blue-200',
  TIER_3: 'bg-orange-100 text-orange-700 border-orange-200',
  TIER_4: 'bg-red-100 text-red-700 border-red-200'
};

function ScoreRing({ score }) {
  const color = score >= 90 ? '#22c55e' : score >= 75 ? '#3b82f6' : '#f97316';
  const r = 20, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width='52' height='52' className='shrink-0'>
      <circle cx='26' cy='26' r={r} fill='none' stroke='#f3f4f6' strokeWidth='4' />
      <circle cx='26' cy='26' r={r} fill='none' stroke={color} strokeWidth='4'
        strokeDasharray={dash + ' ' + (circ - dash)}
        strokeLinecap='round'
        transform='rotate(-90 26 26)' />
      <text x='26' y='30' textAnchor='middle' fontSize='11' fontWeight='700' fill={color}>{score}</text>
    </svg>
  );
}

export default function SmartNationAI() {
  const { addNotification }   = useNotifications();
  const [summary, setSummary] = useState(null);
  const [agents, setAgents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState('registry');
  const [search, setSearch]   = useState('');
  const [category, setCategory] = useState('all');

  useEffect(function() { loadAll(); }, []);

  async function safeCall(fn, fallback) {
    try { return await fn(); } catch(e) { console.warn(e); return fallback; }
  }

  async function loadAll() {
    setLoading(true);
    const [s, a] = await Promise.all([
      safeCall(function() { return api.getSmartNationSummary(); }, null),
      safeCall(function() { return api.getAgents('all', ''); }, [])
    ]);
    setSummary(s);
    setAgents(Array.isArray(a) ? a : []);
    setLoading(false);
  }

  const filtered = agents.filter(function(a) {
    const matchCat = category === 'all' || a.category === category;
    const matchQ   = !search || a.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  const categories = ['all', ...Array.from(new Set(agents.map(function(a) { return a.category; }))).sort()];

  if (loading) return (
    <div className='flex items-center justify-center h-64'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600' />
    </div>
  );

  return (
    <div className='max-w-6xl mx-auto px-4 py-6'>
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-10 h-10 bg-gradient-to-br from-purple-900 to-purple-700 rounded-xl flex items-center justify-center'>
          <Database size={20} className='text-white' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>SmartNation AI</h1>
          <p className='text-sm text-gray-500'>Registry and Intelligence Plane · Agent Workforce Management</p>
        </div>
        <div className='ml-auto flex items-center gap-2'>
          <span className='w-2 h-2 bg-green-400 rounded-full animate-pulse' />
          <span className='text-sm text-green-600 font-medium'>OPERATIONAL</span>
        </div>
      </div>

      {summary && (
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
          {[
            ['Total Agents',    summary.totalAgents,          Database,  'purple'],
            ['Active Agents',   summary.activeAgents,         Activity,  'green'],
            ['Avg Gov Score',   summary.avgGovernanceScore + '%', Shield, 'blue'],
            ['Categories',      Object.keys(summary.byCategory || {}).length, Grid, 'indigo']
          ].map(function(item) {
            const Icon = item[2], color = item[3];
            const g = { purple: 'from-purple-600 to-purple-800', green: 'from-green-500 to-green-700',
                        blue: 'from-blue-600 to-blue-800', indigo: 'from-indigo-600 to-indigo-800' };
            return (
              <div key={item[0]} className={'bg-gradient-to-br ' + g[color] + ' rounded-2xl p-5 text-white'}>
                <Icon size={20} className='opacity-80 mb-3' />
                <div className='text-3xl font-bold mb-1'>{item[1]}</div>
                <div className='text-xs opacity-70 uppercase tracking-wide'>{item[0]}</div>
              </div>
            );
          })}
        </div>
      )}

      {summary && summary.byTier && (
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6'>
          <h3 className='font-semibold text-gray-800 mb-4 flex items-center gap-2'>
            <Shield size={16} className='text-blue-500' /> Risk Tier Distribution
          </h3>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
            {['TIER_1','TIER_2','TIER_3','TIER_4'].map(function(t) {
              const count = summary.byTier[t] || 0;
              const total = summary.totalAgents || 1;
              const pct   = Math.round((count / total) * 100);
              return (
                <div key={t} className='text-center p-3 rounded-xl bg-gray-50'>
                  <div className={'inline-block px-2 py-0.5 rounded-full text-xs font-bold border ' + (TIER_COLORS[t] || '')}>{t}</div>
                  <div className='text-2xl font-bold text-gray-900 mt-2'>{count}</div>
                  <div className='text-xs text-gray-400'>{pct}% of registry</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
        <div className='p-5 border-b border-gray-100'>
          <div className='flex items-center justify-between gap-3 flex-wrap'>
            <h3 className='font-semibold text-gray-800'>Agent Registry</h3>
            <div className='flex items-center gap-2'>
              <div className='relative'>
                <Search size={14} className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400' />
                <input type='text' placeholder='Search agents...' value={search}
                  onChange={function(e) { setSearch(e.target.value); }}
                  className='pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40' />
              </div>
              <select value={category}
                onChange={function(e) { setCategory(e.target.value); }}
                className='border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'>
                {categories.map(function(c) {
                  return <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>;
                })}
              </select>
              <span className='text-xs text-gray-400'>{filtered.length} agents</span>
            </div>
          </div>
        </div>
        <div className='divide-y divide-gray-50'>
          {filtered.slice(0, 50).map(function(agent) {
            return (
              <div key={agent.agentId} className='px-5 py-4 flex items-center gap-4 hover:bg-gray-50'>
                <div className='text-2xl w-8 text-center shrink-0'>{agent.icon}</div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <span className='font-semibold text-gray-900 text-sm'>{agent.name}</span>
                    <span className={'text-xs px-1.5 py-0.5 rounded-full border font-medium ' + (TIER_COLORS[agent.riskTier] || '')}>
                      {agent.riskTier}
                    </span>
                    {agent.tier === 'Premium' && (
                      <span className='text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700'>Premium</span>
                    )}
                  </div>
                  <div className='text-xs text-gray-400 mt-0.5'>{agent.category}</div>
                  <div className='flex items-center gap-3 mt-1 text-xs text-gray-400'>
                    <span className='flex items-center gap-1'>
                      <Star size={10} className='text-yellow-400 fill-yellow-400' />{agent.rating}
                    </span>
                    <span>{(agent.deployments || 0).toLocaleString()} deployments</span>
                    <span>{agent.successRate || 95}% success</span>
                    {(agent.compliance || []).map(function(c) {
                      return <span key={c} className='px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-xs'>{c}</span>;
                    })}
                  </div>
                </div>
                <ScoreRing score={agent.governanceScore || 85} />
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className='p-12 text-center text-gray-400'>No agents found</div>
          )}
        </div>
      </div>
    </div>
  );
}