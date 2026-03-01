import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, Loader, AlertCircle, ChevronDown, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'https://api.coreidentity.coreholdingcorp.com';

export default function ClientOnboarding() {
  const { token } = useAuth();
  const [tab,     setTab]     = useState('create');
  const [clients, setClients] = useState([]);
  const [options, setOptions] = useState({ plans: {}, virtualCompanies: [] });
  const [form,    setForm]    = useState({
    companyName:'', contactEmail:'', contactFirstName:'',
    contactLastName:'', plan:'', virtualCompany:'', tempPassword:''
  });
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error,  setError]  = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    fetch(`${API}/api/clients/meta/options`, { headers })
      .then(r => r.json()).then(setOptions).catch(() => {});
    loadClients();
  }, []);

  function loadClients() {
    fetch(`${API}/api/clients`, { headers })
      .then(r => r.json())
      .then(d => setClients(d.clients || []))
      .catch(() => {});
  }

  async function createClient(e) {
    e.preventDefault();
    setStatus('loading'); setError(''); setResult(null);
    try {
      const res  = await fetch(`${API}/api/clients`, {
        method: 'POST', headers, body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create client');
      setResult(data); setStatus('success'); loadClients();
    } catch (err) { setError(err.message); setStatus('error'); }
  }

  async function sendToCheckout(clientId, plan, email, companyName) {
    try {
      const res  = await fetch(`${API}/api/billing/checkout`, {
        method: 'POST', headers,
        body: JSON.stringify({ clientId, plan, email, companyName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.open(data.sessionUrl, '_blank');
    } catch (err) { alert('Billing error: ' + err.message); }
  }

  const planList = Object.entries(options.plans || {});

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Client Onboarding</h1>
          <p className="text-gray-400 text-sm">Provision client accounts with scoped access and billing.</p>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-lg">
          {[['create','New Client'],['clients','Active Clients']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'create' && (
          <>
            {status === 'success' && result ? (
              <div className="bg-green-900/20 border border-green-700 rounded-xl p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle size={20} className="text-green-400" />
                  <span className="font-semibold text-green-400">Client Account Created</span>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  {[['Company',result.companyName],['Plan',result.plan],['Email',result.contactEmail],['Password',result.tempPassword],['Client ID',result.clientId]].map(([k,v]) => (
                    <div key={k} className="flex gap-3">
                      <span className="text-gray-500 w-24 shrink-0">{k}</span>
                      <span className="font-mono text-gray-200 break-all">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mb-4">Welcome email sent. Save the temp password - it will not be shown again.</p>
                <div className="flex gap-2">
                  <button onClick={() => sendToCheckout(result.clientId, form.plan, result.contactEmail, result.companyName)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
                    <CreditCard size={14} /> Activate Billing
                  </button>
                  <button onClick={() => { setStatus('idle'); setResult(null); setForm({ companyName:'',contactEmail:'',contactFirstName:'',contactLastName:'',plan:'',virtualCompany:'',tempPassword:'' }); }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
                    Create Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={createClient} className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-mono">Plan *</p>
                  <div className="grid grid-cols-2 gap-2">
                    {planList.map(([key, plan]) => (
                      <button key={key} type="button" onClick={() => set('plan', key)}
                        className={`p-3 rounded-lg border text-left text-sm transition-all ${form.plan === key ? 'bg-blue-900/30 border-blue-600 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'}`}>
                        <div className="font-semibold">{plan.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {plan.agents === -1 ? 'Unlimited' : `${plan.agents} agents`}
                          {plan.price ? ` · $${plan.price.toLocaleString()}/mo` : ' · Custom'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[['contactFirstName','First Name'],['contactLastName','Last Name']].map(([k,label]) => (
                    <div key={k}>
                      <label className="block text-xs text-gray-500 mb-1">{label} *</label>
                      <input value={form[k]} onChange={e => set(k,e.target.value)} required
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-600 focus:outline-none"
                        placeholder={label} />
                    </div>
                  ))}
                </div>

                {[['companyName','Company Name'],['contactEmail','Contact Email']].map(([k,label]) => (
                  <div key={k}>
                    <label className="block text-xs text-gray-500 mb-1">{label} *</label>
                    <input type={k==='contactEmail'?'email':'text'}
                      value={form[k]} onChange={e => set(k,e.target.value)} required
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-600 focus:outline-none"
                      placeholder={label} />
                  </div>
                ))}

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Assign to Virtual Company</label>
                  <div className="relative">
                    <select value={form.virtualCompany} onChange={e => set('virtualCompany',e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white appearance-none focus:border-blue-600 focus:outline-none">
                      <option value="">None (CHC Corporate)</option>
                      {(options.virtualCompanies || []).map(vc => <option key={vc} value={vc}>{vc}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Temp Password (optional - auto-generated if blank)</label>
                  <input value={form.tempPassword} onChange={e => set('tempPassword',e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-600 focus:outline-none"
                    placeholder="Leave blank to auto-generate" />
                </div>

                {status === 'error' && (
                  <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />{error}
                  </div>
                )}

                <button type="submit" disabled={status === 'loading' || !form.plan}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-semibold text-sm transition-colors">
                  {status === 'loading'
                    ? <><Loader size={16} className="animate-spin" /> Creating...</>
                    : <><Plus size={16} /> Create Client Account</>}
                </button>
              </form>
            )}
          </>
        )}

        {tab === 'clients' && (
          <div>
            {clients.length === 0 ? (
              <div className="text-center text-gray-500 py-12 text-sm">No client accounts yet.</div>
            ) : (
              <div className="space-y-3">
                {clients.map(c => (
                  <div key={c.clientId} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-sm">{c.companyName}</div>
                        <div className="text-xs text-gray-500">{c.contactEmail}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.billingStatus === 'active' ? 'bg-green-900/40 text-green-400' : c.billingStatus === 'past_due' ? 'bg-yellow-900/40 text-yellow-400' : 'bg-gray-800 text-gray-500'}`}>
                          {c.billingStatus || 'no billing'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-blue-900/40 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{c.planLabel || c.plan} · {c.agentLimit === -1 ? 'Unlimited' : c.agentLimit} agents</span>
                      {c.virtualCompany && <span className="text-gray-600">{c.virtualCompany}</span>}
                    </div>
                    {!c.stripeSubscriptionId && (
                      <button onClick={() => sendToCheckout(c.clientId, c.plan, c.contactEmail, c.companyName)}
                        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors">
                        <CreditCard size={12} /> Activate Billing
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
