import React, { useState } from 'react';
import { CheckCircle, Send, Loader, AlertCircle, ChevronDown } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://api.coreidentity.coreholdingcorp.com';

const ENGAGEMENTS = [
  { value: 'diagnostic',     label: 'Diagnostic Assessment',     duration: '21 days',  range: '$85K-$110K',    desc: 'Inventory AI usage, identify governance exposure, risk classification' },
  { value: 'deployment',     label: 'Governance Deployment',     duration: '90 days',  range: '$125K-$175K',   desc: 'Full Sentinel + Nexus deployment, policy codification, live compliance' },
  { value: 'transformation', label: 'Enterprise Transformation', duration: '180 days', range: '$250K-$500K',   desc: 'End-to-end AI governance transformation with CIAG embedded team' },
  { value: 'advisory',       label: 'Ongoing Advisory',          duration: 'Monthly',  range: '$25K-$100K/mo', desc: 'Retained governance advisory, regulatory monitoring, board reporting' },
];

const INDUSTRIES = ['Financial Services','Healthcare','Legal','Government / Public Sector','Insurance','Energy & Utilities','Technology','Education','Retail & Commerce','Manufacturing','Other'];
const SIZES = ['1-50','51-200','201-1,000','1,001-5,000','5,000+'];

export default function CIAGIntake() {
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', company:'', title:'', engagement:'', companySize:'', industry:'', message:'' });
  const [status,  setStatus]  = useState('idle');
  const [message, setMessage] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setStatus('loading'); setMessage('');
    try {
      const res  = await fetch(API + '/api/ciag/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'portal' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setStatus('success'); setMessage(data.message);
    } catch (err) { setStatus('error'); setMessage(err.message); }
  }

  if (status === 'success') return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-green-900/40 border border-green-700 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={32} className="text-green-400" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Submission Received</h2>
        <p className="text-gray-400 leading-relaxed mb-6">{message}</p>
        <button onClick={() => { setStatus('idle'); setForm({ firstName:'',lastName:'',email:'',company:'',title:'',engagement:'',companySize:'',industry:'',message:'' }); }}
          className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
          Submit Another
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-xs text-yellow-400 font-mono uppercase tracking-widest">CoreIdentity Advisory Group</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Start a CIAG Engagement</h1>
          <p className="text-gray-400 text-sm leading-relaxed">CIAG deploys CoreIdentity governance into your enterprise - from exposure assessment through continuous compliance.</p>
        </div>

        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-mono">Select Engagement Type</p>
          <div className="grid grid-cols-1 gap-2">
            {ENGAGEMENTS.map(eng => (
              <button key={eng.value} type="button" onClick={() => set('engagement', eng.value)}
                className={"p-4 rounded-xl border text-left transition-all " + (form.engagement === eng.value ? 'bg-yellow-900/20 border-yellow-600/60 text-white' : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-600')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-0.5">{eng.label}</div>
                    <div className="text-xs text-gray-500 leading-relaxed">{eng.desc}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold text-yellow-400">{eng.range}</div>
                    <div className="text-xs text-gray-600">{eng.duration}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[['firstName','First Name'],['lastName','Last Name']].map(([k,label]) => (
              <div key={k}>
                <label className="block text-xs text-gray-500 mb-1">{label} *</label>
                <input value={form[k]} onChange={e => set(k, e.target.value)} required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-yellow-600 focus:outline-none"
                  placeholder={label} />
              </div>
            ))}
          </div>
          {[['email','Work Email','email'],['company','Company / Organization','text'],['title','Title / Role','text']].map(([k,label,type]) => (
            <div key={k}>
              <label className="block text-xs text-gray-500 mb-1">{label}{k !== 'title' ? ' *' : ''}</label>
              <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} required={k !== 'title'}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-yellow-600 focus:outline-none"
                placeholder={label} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            {[['industry','Industry',INDUSTRIES],['companySize','Company Size',SIZES]].map(([k,label,opts]) => (
              <div key={k}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <div className="relative">
                  <select value={form[k]} onChange={e => set(k, e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white appearance-none focus:border-yellow-600 focus:outline-none">
                    <option value="">Select...</option>
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tell us about your situation</label>
            <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={4}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-yellow-600 focus:outline-none resize-none"
              placeholder="What AI systems are you governing? What is driving the urgency? What does success look like?" />
          </div>
          {status === 'error' && (
            <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />{message}
            </div>
          )}
          <button type="submit" disabled={status === 'loading' || !form.engagement}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-sm transition-colors">
            {status === 'loading' ? <><Loader size={16} className="animate-spin" /> Submitting...</> : <><Send size={16} /> Submit Engagement Request</>}
          </button>
          <p className="text-xs text-gray-600 text-center">A CIAG advisor will respond within one business day.</p>
        </form>
      </div>
    </div>
  );
}
