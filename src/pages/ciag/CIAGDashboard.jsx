/* ciag-dashboard-v1 */
import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi.js';

const STAGE_LABELS = {
  new:          { label: 'New',         color: '#3B82F6', bg: '#EFF6FF' },
  contacted:    { label: 'Contacted',   color: '#8B5CF6', bg: '#F5F3FF' },
  qualified:    { label: 'Qualified',   color: '#F59E0B', bg: '#FFFBEB' },
  proposal:     { label: 'Proposal',    color: '#EC4899', bg: '#FDF2F8' },
  active:       { label: 'Active',      color: '#10B981', bg: '#ECFDF5' },
  closed_won:   { label: 'Won',         color: '#059669', bg: '#D1FAE5' },
  closed_lost:  { label: 'Lost',        color: '#EF4444', bg: '#FEF2F2' },
};

const TIER_COLORS = {
  diagnostic:     '#3B82F6',
  deployment:     '#8B5CF6',
  transformation: '#10B981',
  advisory:       '#F59E0B',
};

function PipelineCard({ stage, count, value }) {
  const s = STAGE_LABELS[stage] || { label: stage, color: '#6B7280', bg: '#F9FAFB' };
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.color}33`, borderRadius: 8, padding: '12px 16px', minWidth: 100 }}>
      <div style={{ fontSize: 11, color: s.color, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{count}</div>
      {value > 0 && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>${(value/1000).toFixed(0)}K est.</div>}
    </div>
  );
}

function SubmissionRow({ sub, onSelect, selected }) {
  const s = STAGE_LABELS[sub.status] || STAGE_LABELS.new;
  return (
    <tr
      onClick={() => onSelect(sub)}
      style={{ cursor: 'pointer', background: selected ? '#EFF6FF' : 'white', transition: 'background 0.1s' }}
    >
      <td style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{sub.company}</div>
        <div style={{ fontSize: 11, color: '#6B7280' }}>{sub.firstName} {sub.lastName}</div>
      </td>
      <td style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB' }}>
        <span style={{ background: `${TIER_COLORS[sub.engagement]}22`, color: TIER_COLORS[sub.engagement], fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
          {sub.engagementLabel || sub.engagement}
        </span>
      </td>
      <td style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB' }}>
        <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
          {s.label}
        </span>
      </td>
      <td style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB', fontSize: 11, color: '#6B7280' }}>
        {sub.prequalified ? '✅ Prequalified' : '—'}
      </td>
      <td style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB', fontSize: 11, color: '#6B7280' }}>
        {sub.scorecardId ? '✅ Scored' : '—'}
      </td>
      <td style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB', fontSize: 11, color: '#9CA3AF' }}>
        {new Date(sub.lastActivity || sub.submittedAt).toLocaleDateString()}
      </td>
    </tr>
  );
}

function SubmissionDetail({ sub, onClose, onRefresh }) {
  const { call } = useApi();
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState('');

  useEffect(() => {
    if (sub?.submissionId) {
      call(`/api/ciag/submissions/${sub.submissionId}`)
        .then(d => d.success && setDetail(d.data));
    }
  }, [sub?.submissionId]);

  const addNote = async () => {
    if (!note.trim()) return;
    setLoading(true);
    await call(`/api/ciag/submissions/${sub.submissionId}/notes`, 'POST', { content: note });
    setNote('');
    const d = await call(`/api/ciag/submissions/${sub.submissionId}`);
    if (d.success) setDetail(d.data);
    setLoading(false);
  };

  const updateStatus = async (status) => {
    setLoading(true);
    await call(`/api/ciag/submissions/${sub.submissionId}/status`, 'PATCH', { status });
    const d = await call(`/api/ciag/submissions/${sub.submissionId}`);
    if (d.success) setDetail(d.data);
    onRefresh();
    setLoading(false);
  };

  const generateScorecard = async () => {
    setLoading(true);
    setAction('scorecard');
    const d = await call(`/api/ciag/submissions/${sub.submissionId}/scorecard`, 'POST', {});
    if (d.success) {
      const updated = await call(`/api/ciag/submissions/${sub.submissionId}`);
      if (updated.success) setDetail(updated.data);
    }
    setAction('');
    setLoading(false);
  };

  const runPrequalify = async () => {
    setLoading(true);
    setAction('prequalify');
    const d = await call(`/api/ciag/submissions/${sub.submissionId}/prequalify`, 'POST', {});
    if (d.success) {
      const updated = await call(`/api/ciag/submissions/${sub.submissionId}`);
      if (updated.success) setDetail(updated.data);
    }
    setAction('');
    setLoading(false);
  };

  const d = detail || sub;

  return (
    <div style={{ position: 'fixed', right: 0, top: 0, width: 480, height: '100vh', background: 'white', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', zIndex: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', background: '#1E3A5F' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{d.company}</div>
            <div style={{ fontSize: 12, color: '#93C5FD', marginTop: 2 }}>{d.firstName} {d.lastName} · {d.email}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#93C5FD', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ background: '#ffffff22', color: 'white', fontSize: 11, padding: '3px 10px', borderRadius: 4 }}>
            {d.engagementLabel || d.engagement}
          </span>
          <span style={{ background: STAGE_LABELS[d.status]?.bg || '#F9FAFB', color: STAGE_LABELS[d.status]?.color || '#374151', fontSize: 11, padding: '3px 10px', borderRadius: 4, fontWeight: 700 }}>
            {STAGE_LABELS[d.status]?.label || d.status}
          </span>
          {d.industry && <span style={{ background: '#ffffff22', color: 'white', fontSize: 11, padding: '3px 10px', borderRadius: 4 }}>{d.industry}</span>}
        </div>
      </div>

      <div style={{ padding: 24, flex: 1 }}>
        {/* Actions */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Actions</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!d.prequalified && (
              <button
                onClick={runPrequalify}
                disabled={loading}
                style={{ fontSize: 12, fontWeight: 600, background: '#3B82F6', color: 'white', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading && action === 'prequalify' ? 0.7 : 1 }}
              >
                {action === 'prequalify' ? 'Running AGO...' : '⚡ Run Pre-Qualification'}
              </button>
            )}
            {!d.scorecardId && (
              <button
                onClick={generateScorecard}
                disabled={loading}
                style={{ fontSize: 12, fontWeight: 600, background: '#8B5CF6', color: 'white', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading && action === 'scorecard' ? 0.7 : 1 }}
              >
                {action === 'scorecard' ? 'Generating...' : '📊 Generate Scorecard'}
              </button>
            )}
          </div>
        </div>

        {/* Stage workflow */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Pipeline Stage</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(STAGE_LABELS).map(([key, s]) => (
              <button
                key={key}
                onClick={() => d.status !== key && updateStatus(key)}
                style={{ fontSize: 11, fontWeight: 600, background: d.status === key ? s.color : s.bg, color: d.status === key ? 'white' : s.color, border: `1px solid ${s.color}44`, borderRadius: 4, padding: '4px 10px', cursor: d.status === key ? 'default' : 'pointer' }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pre-qual result */}
        {d.prequalResult && (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#065F46', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>AGO Pre-Qualification</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><div style={{ fontSize: 10, color: '#6B7280' }}>Score</div><div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{d.prequalResult.qualificationScore || '—'}</div></div>
              <div><div style={{ fontSize: 10, color: '#6B7280' }}>Recommended</div><div style={{ fontSize: 12, fontWeight: 600, color: '#065F46' }}>{d.prequalResult.recommendedTierLabel}</div></div>
            </div>
            {d.prequalResult.riskFlags?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {d.prequalResult.riskFlags.map((f, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#92400E', background: '#FEF3C7', padding: '3px 8px', borderRadius: 4, marginTop: 4 }}>⚠ {f}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scorecard */}
        {d.scorecard && (
          <div style={{ background: '#F5F3FF', border: '1px solid #C4B5FD', borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4C1D95', textTransform: 'uppercase', letterSpacing: 1 }}>Governance Scorecard</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#7C3AED' }}>{d.scorecard.overallScore}<span style={{ fontSize: 12 }}>/100</span></div>
            </div>
            <div style={{ fontSize: 12, color: '#4C1D95', fontWeight: 600, marginBottom: 8 }}>{d.scorecard.certTier} Certification</div>
            {Object.entries(d.scorecard.dimensions || {}).map(([key, dim]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{dim.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 80, height: 6, background: '#E5E7EB', borderRadius: 3 }}>
                    <div style={{ width: `${dim.score}%`, height: 6, background: dim.score >= 70 ? '#10B981' : dim.score >= 50 ? '#F59E0B' : '#EF4444', borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', minWidth: 30 }}>{dim.score}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Engagement Notes</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNote()}
              placeholder="Add engagement note..."
              style={{ flex: 1, fontSize: 12, border: '1px solid #D1D5DB', borderRadius: 6, padding: '7px 10px', outline: 'none' }}
            />
            <button
              onClick={addNote}
              disabled={loading || !note.trim()}
              style={{ fontSize: 12, fontWeight: 600, background: '#1E3A5F', color: 'white', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', opacity: !note.trim() ? 0.5 : 1 }}
            >
              Add
            </button>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {(detail?.notes || []).map(n => (
              <div key={n.noteId} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 12px', marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#111827' }}>{n.content}</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>{n.author} · {new Date(n.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {(!detail?.notes || detail.notes.length === 0) && (
              <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>No notes yet.</div>
            )}
          </div>
        </div>

        {/* Meta */}
        {d.message && (
          <div style={{ background: '#F9FAFB', borderRadius: 6, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Original Message</div>
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{d.message}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CIAGDashboard() {
  const { call } = useApi();
  const [submissions, setSubmissions] = useState([]);
  const [pipeline, setPipeline]       = useState({});
  const [selected, setSelected]       = useState(null);
  const [filter, setFilter]           = useState('all');
  const [loading, setLoading]         = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, p] = await Promise.all([
      call('/api/ciag/submissions'),
      call('/api/ciag/pipeline')
    ]);
    if (s.success) setSubmissions(s.submissions || []);
    if (p.success) setPipeline(p.data?.pipeline || {});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all'
    ? submissions
    : submissions.filter(s => s.status === filter);

  return (
    <div style={{ padding: 24, maxWidth: 1100, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>CIAG Advisory Pipeline</h1>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>CoreIdentity Advisory Group — Engagement Management</div>
      </div>

      {/* Pipeline summary */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {Object.entries(pipeline).map(([stage, data]) => (
          <div key={stage} onClick={() => setFilter(filter === stage ? 'all' : stage)} style={{ cursor: 'pointer' }}>
            <PipelineCard stage={stage} count={data.count} value={data.value} />
          </div>
        ))}
      </div>

      {/* Submissions table */}
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
            {filter === 'all' ? 'All Submissions' : `${STAGE_LABELS[filter]?.label} — ${filtered.length}`}
          </div>
          <button onClick={load} style={{ fontSize: 12, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer' }}>
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['Company', 'Engagement', 'Stage', 'Pre-qual', 'Scorecard', 'Last Activity'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                  {loading ? 'Loading...' : 'No submissions yet.'}
                </td></tr>
              )}
              {filtered.map(sub => (
                <SubmissionRow
                  key={sub.submissionId}
                  sub={sub}
                  selected={selected?.submissionId === sub.submissionId}
                  onSelect={setSelected}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <SubmissionDetail
          sub={selected}
          onClose={() => setSelected(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
}
