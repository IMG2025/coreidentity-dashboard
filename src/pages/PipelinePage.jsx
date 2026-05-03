import React, { useState, useEffect } from 'react';
import { Building2, TrendingUp, CheckCircle, Clock } from 'lucide-react';

const C = {
  surface: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)',
  white: '#f8fafc', slate: '#64748b', blue: '#3b82f6', green: '#22c55e',
  gold: '#d4af37', red: '#ef4444', teal: '#14b8a6',
};
const F = { mono: 'monospace', display: 'monospace', body: 'system-ui' };

const STAGE_COLORS = { new: C.blue, contacted: C.slate, qualified: C.gold, proposal: C.teal, active: C.green, won: C.green, lost: C.red };

export default function PipelinePage({ token }) {
  const [pipeline, setPipeline] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const API = 'https://api.coreidentitygroup.com';

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/api/ciag`, { headers }).then(r => r.json()),
      fetch(`${API}/api/ciag/submissions`, { headers }).then(r => r.json()),
    ]).then(([p, s]) => {
      setPipeline(p.data);
      setSubmissions(s.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  const stages = ['new','contacted','qualified','proposal','active','won','lost'];

  return (
    <div style={{ padding: '20px', fontFamily: F.body, color: C.white, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontFamily: F.mono, color: C.slate, letterSpacing: '0.15em', marginBottom: 6 }}>CIAG ADVISORY GROUP</div>
        <h1 style={{ fontSize: 20, fontFamily: F.display, letterSpacing: '0.08em', margin: 0, fontWeight: 700 }}>PIPELINE</h1>
        <div style={{ fontSize: 10, color: C.slate, marginTop: 4 }}>Advisory engagements · Enterprise accounts · Lifetime value</div>
      </div>

      {/* Stage summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginBottom: 20 }}>
        {stages.map(s => {
          const count = submissions.filter(sub => sub.stage === s).length;
          return (
            <div key={s} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, fontFamily: F.mono, color: STAGE_COLORS[s] || C.slate, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{s}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: STAGE_COLORS[s] || C.white, fontFamily: F.mono }}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Submissions table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontFamily: F.mono, color: C.slate, letterSpacing: '0.08em' }}>ALL SUBMISSIONS</div>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: C.slate, fontFamily: F.mono, fontSize: 11 }}>LOADING PIPELINE...</div>
        ) : submissions.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: C.slate, fontFamily: F.mono, fontSize: 11 }}>NO SUBMISSIONS YET</div>
        ) : submissions.map((s, i) => (
          <div key={s.id || i} style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Building2 size={14} color={C.slate} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.white }}>{s.companyName || s.company}</div>
              <div style={{ fontSize: 10, color: C.slate, marginTop: 2 }}>{s.contactName} · {s.engagementType}</div>
            </div>
            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 3, border: `1px solid ${STAGE_COLORS[s.stage] || C.border}40`, color: STAGE_COLORS[s.stage] || C.slate, fontFamily: F.mono, textTransform: 'uppercase' }}>{s.stage}</span>
            {s.prequalified && <CheckCircle size={12} color={C.green} />}
            <div style={{ fontSize: 10, color: C.gold, fontFamily: F.mono }}>${(s.estimatedValue / 1000).toFixed(0)}K</div>
          </div>
        ))}
      </div>
    </div>
  );
}
