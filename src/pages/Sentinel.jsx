import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Lock, Unlock, CheckCircle,
         Clock, Activity, Eye, Zap } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../App';

const TIER_COLORS = {
  TIER_1: { badge: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-100'  },
  TIER_2: { badge: 'bg-blue-500',   text: 'text-blue-700',   bg: 'bg-blue-100'   },
  TIER_3: { badge: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-100' },
  TIER_4: { badge: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-100'    }
};

const SEVERITY_COLORS = {
  FORENSIC: 'text-purple-700 bg-purple-100',
  HIGH:     'text-red-700 bg-red-100',
  MEDIUM:   'text-orange-700 bg-orange-100',
  LOW:      'text-yellow-700 bg-yellow-100',
  INFO:     'text-blue-700 bg-blue-100'
};

function StatCard({ icon: Icon, label, value, color = 'blue' }) {
  const gradients = {
    blue:   'from-blue-600 to-blue-800',
    green:  'from-green-600 to-green-800',
    orange: 'from-orange-500 to-orange-700',
    red:    'from-red-600 to-red-800'
  };
  return (
    <div className={"bg-gradient-to-br " + (gradients[color] || gradients.blue) + " rounded-2xl p-5 text-white"}>
      <Icon size={22} className="opacity-80 mb-3" />
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs opacity-60 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

export default function SentinelOS() {
  const { user }            = useAuth();
  const { addNotification } = useNotifications();
  const [status, setStatus]       = useState(null);
  const [events, setEvents]       = useState([]);
  const [killSwitches, setKills]  = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [riskTiers, setRiskTiers] = useState({});
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [killInput, setKillInput] = useState({ agentId: '', reason: '' });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, e, k, a, rt] = await Promise.all([
        api.getSentinelStatus(),
        api.getSecurityEvents(30),
        api.getKillSwitches(),
        api.getApprovals(),
        api.getRiskTiers()
      ]);
      setStatus(s); setEvents(e); setKills(k); setApprovals(a); setRiskTiers(rt);
    } catch (err) {
      addNotification('Failed to load Sentinel OS', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleKillSwitch() {
    if (!killInput.agentId) return;
    try {
      await api.activateKillSwitch(killInput.agentId, killInput.reason);
      addNotification('Kill switch activated for Agent ' + killInput.agentId, 'success');
      setKillInput({ agentId: '', reason: '' });
      loadAll();
    } catch (err) {
      addNotification(err.message || 'Kill switch failed', 'error');
    }
  }

  async function handleDeactivate(agentId) {
    try {
      await api.deactivateKillSwitch(agentId);
      addNotification('Kill switch deactivated', 'success');
      loadAll();
    } catch (err) {
      addNotification('Deactivation failed', 'error');
    }
  }

  async function handleApprove(approvalId) {
    try {
      await api.approveRequest(approvalId);
      addNotification('Approval granted', 'success');
      loadAll();
    } catch (err) {
      addNotification('Approval failed', 'error');
    }
  }

  const healthScore = status ? status.governance_health : 100;
  const healthColor = healthScore >= 90 ? 'green' : healthScore >= 70 ? 'blue' : healthScore >= 50 ? 'orange' : 'red';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  const tabs = [
    ['overview', 'Overview'],
    ['events', 'Security Events'],
    ['killswitches', 'Kill Switches'],
    ['approvals', 'Approvals'],
    ['risktiers', 'Risk Tiers']
  ];

  const pendingCount = approvals.filter(function(a) { return a.status === 'PENDING'; }).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-900 to-blue-700 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sentinel OS</h1>
          <p className="text-sm text-gray-500">Governance and Security Operating System</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-sm text-green-600 font-medium">OPERATIONAL</span>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {tabs.map(function(t) {
          const id = t[0], label = t[1];
          return (
            <button key={id} onClick={function() { setActiveTab(id); }}
              className={"px-4 py-2 rounded-lg text-sm font-medium transition-all " +
                (activeTab === id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {label}
              {id === 'approvals' && pendingCount > 0 && (
                <span className="ml-1 bg-orange-500 text-white text-xs rounded-full px-1.5">{pendingCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Shield}        label="Governance Health"   value={healthScore + "%"} color={healthColor} />
            <StatCard icon={Activity}      label="Executions (24h)"    value={status ? status.audit_summary.executions_24h : 0} color="blue" />
            <StatCard icon={AlertTriangle} label="High Severity (24h)" value={status ? status.security_summary.high_severity_24h : 0} color={status && status.security_summary.high_severity_24h > 0 ? 'red' : 'green'} />
            <StatCard icon={Lock}          label="Active Kill Switches" value={status ? status.active_kill_switches : 0} color={status && status.active_kill_switches > 0 ? 'orange' : 'green'} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Eye size={16}/> Security Summary (24h)</h3>
              {[
                ['Total Events',       status ? status.security_summary.total_events_24h : 0],
                ['Policy Violations',  status ? status.security_summary.violations_24h : 0],
                ['Policy Passes',      status ? status.security_summary.policy_enforced_24h : 0],
                ['Kill Switch Blocks', status ? status.security_summary.kill_switch_events : 0]
              ].map(function(row) {
                return (
                  <div key={row[0]} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{row[0]}</span>
                    <span className="font-semibold text-gray-800">{row[1]}</span>
                  </div>
                );
              })}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Zap size={16}/> Audit Summary</h3>
              {[
                ['Total Executions',  status ? status.audit_summary.total_executions : 0],
                ['Success Rate',      (status ? status.audit_summary.success_rate : 100) + "%"],
                ['Pending Approvals', status ? status.pending_approvals : 0]
              ].map(function(row) {
                return (
                  <div key={row[0]} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{row[0]}</span>
                    <span className="font-semibold text-gray-800">{row[1]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between">
            <h3 className="font-semibold text-gray-800">Security Event Log</h3>
            <button onClick={loadAll} className="text-sm text-blue-600">Refresh</button>
          </div>
          {events.length === 0
            ? <div className="p-12 text-center text-gray-400">No security events recorded</div>
            : events.map(function(e) {
                return (
                  <div key={e.eventId} className="px-5 py-3 flex items-start gap-3 border-b border-gray-50 last:border-0">
                    <span className={"text-xs px-2 py-0.5 rounded-full font-medium shrink-0 " + (SEVERITY_COLORS[e.severity] || SEVERITY_COLORS.INFO)}>
                      {e.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">{e.eventType.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-gray-400">{e.agentName || '-'} · {e.taskType || '-'} · {e.tierId || '-'}</div>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{new Date(e.timestamp).toLocaleTimeString()}</span>
                  </div>
                );
              })}
        </div>
      )}

      {activeTab === 'killswitches' && (
        <div className="space-y-4">
          {user && user.role === 'ADMIN' && (
            <div className="bg-white rounded-2xl shadow-sm border border-orange-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Lock size={16} className="text-orange-500"/> Activate Kill Switch
              </h3>
              <div className="flex gap-3">
                <input type="number" placeholder="Agent ID" value={killInput.agentId}
                  onChange={function(e) { setKillInput(function(p) { return Object.assign({}, p, { agentId: e.target.value }); }); }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28" />
                <input type="text" placeholder="Reason" value={killInput.reason}
                  onChange={function(e) { setKillInput(function(p) { return Object.assign({}, p, { reason: e.target.value }); }); }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1" />
                <button onClick={handleKillSwitch} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  Activate
                </button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Active Kill Switches</h3>
            </div>
            {killSwitches.length === 0
              ? (
                <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
                  <CheckCircle size={32} className="text-green-400" />
                  <span>No active kill switches</span>
                </div>
              )
              : killSwitches.map(function(k) {
                  return (
                    <div key={k.killSwitchId} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <Lock size={14} className="text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">Agent {k.agentId}</div>
                        <div className="text-xs text-gray-400">{k.reason}</div>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(k.activatedAt).toLocaleString()}</span>
                      {user && user.role === 'ADMIN' && (
                        <button onClick={function() { handleDeactivate(k.agentId); }}
                          className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1">
                          <Unlock size={14}/> Lift
                        </button>
                      )}
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Approval Queue</h3>
          </div>
          {approvals.length === 0
            ? <div className="p-12 text-center text-gray-400">No approval requests</div>
            : approvals.map(function(a) {
                return (
                  <div key={a.approvalId} className="px-5 py-4 flex items-start gap-4 border-b border-gray-50 last:border-0">
                    <div className={"w-8 h-8 rounded-lg flex items-center justify-center shrink-0 " + (a.status === 'APPROVED' ? 'bg-green-100' : 'bg-orange-100')}>
                      {a.status === 'APPROVED'
                        ? <CheckCircle size={14} className="text-green-600" />
                        : <Clock size={14} className="text-orange-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">Agent {a.agentId} · {a.taskType}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{a.justification}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (a.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>
                        {a.status}
                      </span>
                      {user && user.role === 'ADMIN' && a.status === 'PENDING' && (
                        <button onClick={function() { handleApprove(a.approvalId); }}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg">
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>
      )}

      {activeTab === 'risktiers' && (
        <div className="grid md:grid-cols-2 gap-4">
          {Object.values(riskTiers).map(function(tier) {
            const colors = TIER_COLORS[tier.id] || TIER_COLORS.TIER_2;
            return (
              <div key={tier.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className={"text-xs px-2 py-0.5 rounded-full font-bold text-white " + colors.badge}>{tier.id}</span>
                  <span className="font-semibold text-gray-800">{tier.label}</span>
                </div>
                <p className="text-sm text-gray-500 mb-4">{tier.description}</p>
                {[
                  ['Allowed Roles',     tier.allowed_roles ? tier.allowed_roles.join(', ') : '-'],
                  ['Task Types',        tier.allowed_task_types ? tier.allowed_task_types.join(', ') : '-'],
                  ['Requires Approval', tier.requires_approval ? 'Yes' : 'No'],
                  ['Kill Switch',       tier.kill_switch_eligible ? 'Eligible' : 'No'],
                  ['Max Concurrency',   tier.max_concurrency],
                  ['Audit Level',       tier.audit_level]
                ].map(function(row) {
                  return (
                    <div key={row[0]} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                      <span className="text-gray-500">{row[0]}</span>
                      <span className="font-medium text-gray-700">{row[1]}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
