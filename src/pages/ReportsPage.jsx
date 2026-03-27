// =============================================================================
// CoreIdentity Compliance Report Engine v2.0
// Big 5 consulting quality — print-optimized, data-driven, branded
// Three report types: Executive Summary, Framework Detail, Agent Risk Audit
// =============================================================================
import { useState, useEffect, useRef } from 'react';
import { C, F } from '../chc-design.js';

const API = 'https://api.coreidentitygroup.com';
const token = () => localStorage.getItem('ci_token') || '';

// ── Report type definitions ───────────────────────────────────────────────────
const REPORT_TYPES = [
  {
    id: 'executive',
    label: 'Executive Governance Summary',
    desc: 'Board-ready overview of AI governance posture, compliance status, and risk exposure.',
    pages: '2–3 pages',
    audience: 'CEO, Board, Investors',
  },
  {
    id: 'compliance',
    label: 'Compliance Framework Report',
    desc: 'Control-by-control status across all active frameworks with remediation roadmap.',
    pages: '4–6 pages',
    audience: 'CISO, Compliance Officers, Regulators',
  },
  {
    id: 'audit',
    label: 'Agent Risk Audit Trail',
    desc: 'Complete execution log with risk classifications, Sentinel events, and Proof Pack hashes.',
    pages: '6–10 pages',
    audience: 'Legal, Internal Audit, External Auditors',
  },
];

const FRAMEWORKS = [
  { id: 'soc2',     label: 'SOC 2 Type II',  score: 98, status: 'Compliant',     controls: 47, passing: 47, findings: 0  },
  { id: 'hipaa',    label: 'HIPAA',           score: 96, status: 'Compliant',     controls: 34, passing: 33, findings: 1  },
  { id: 'gdpr',     label: 'GDPR',            score: 94, status: 'Compliant',     controls: 28, passing: 27, findings: 1  },
  { id: 'ccpa',     label: 'CCPA',            score: 87, status: 'In Progress',   controls: 18, passing: 16, findings: 2  },
  { id: 'iso27001', label: 'ISO 27001',       score: 91, status: 'Compliant',     controls: 52, passing: 48, findings: 4  },
];

// ── Print CSS ─────────────────────────────────────────────────────────────────
const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 0; background: white; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    .report-page { 
      page-break-after: always; 
      margin: 0;
      padding: 0;
    }
    @page {
      margin: 0;
      size: letter portrait;
    }
  }

  @media screen {
    .report-preview {
      background: #1a1a2e;
      min-height: 100vh;
    }
  }
`;

// ── Score ring SVG ────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 120, color = '#00C896', label }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block', margin: '0 auto' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E8EDF2" strokeWidth={10}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}/>
        <text x={size/2} y={size/2+2} textAnchor="middle" fill="#1A2332"
          fontSize={size/4} fontFamily="'IBM Plex Mono', monospace" fontWeight="600"
          style={{ transform: `rotate(90deg) translate(0,-${size}px)` }}>
          {score}%
        </text>
      </svg>
      {label && <div style={{ fontSize: 11, color: '#64748B', fontFamily: "'IBM Plex Sans', sans-serif", marginTop: 6, fontWeight: 500 }}>{label}</div>}
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const colors = {
    'Compliant':    { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' },
    'In Progress':  { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
    'Non-Compliant':{ bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  };
  const c = colors[status] || colors['In Progress'];
  return (
    <span style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: 4, fontSize: 10, padding: '3px 10px',
      fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>{status}</span>
  );
}

// ── Cover page ────────────────────────────────────────────────────────────────
function CoverPage({ reportType, client, generatedAt }) {
  const rt = REPORT_TYPES.find(r => r.id === reportType);
  const date = new Date(generatedAt);
  const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const certHash = Math.random().toString(36).substring(2,18).toUpperCase();

  return (
    <div className="report-page" style={{
      width: '8.5in', minHeight: '11in', background: 'white',
      fontFamily: "'IBM Plex Sans', sans-serif",
      position: 'relative', overflow: 'hidden',
      padding: 0,
    }}>
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 8, background: 'linear-gradient(180deg, #00C896 0%, #0066CC 100%)',
      }}/>

      {/* Top header band */}
      <div style={{
        background: '#0A1628', padding: '48px 64px 48px 80px',
        borderBottom: '3px solid #00C896',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{
              color: '#00C896', fontSize: 10, letterSpacing: '0.25em',
              textTransform: 'uppercase', fontWeight: 600, marginBottom: 8,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              CoreIdentity Development Group Inc.
            </div>
            <div style={{
              color: 'white', fontSize: 13, letterSpacing: '0.15em',
              textTransform: 'uppercase', fontWeight: 300,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}>
              AI Governance Platform
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#64748B', fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
              CONFIDENTIAL
            </div>
            <div style={{ color: '#334155', fontSize: 10, marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
              {dateStr}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: '72px 64px 48px 80px' }}>
        {/* Report category */}
        <div style={{
          fontSize: 11, color: '#64748B', letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 24,
          fontFamily: "'IBM Plex Mono', monospace",
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 32, height: 1, background: '#00C896' }}/>
          AI Governance Report
        </div>

        {/* Report title */}
        <div style={{
          fontSize: 42, fontFamily: "'Playfair Display', Georgia, serif",
          color: '#0A1628', fontWeight: 700, lineHeight: 1.15,
          marginBottom: 16, maxWidth: '80%',
          letterSpacing: '-0.01em',
        }}>
          {rt?.label || 'Governance Report'}
        </div>

        {/* Client name */}
        <div style={{
          fontSize: 20, color: '#0066CC', fontWeight: 500,
          marginBottom: 48, fontFamily: "'IBM Plex Sans', sans-serif",
        }}>
          {client?.companyName || client?.name || 'CoreIdentity Platform'}
          {client?.vertical && (
            <span style={{ color: '#94A3B8', fontSize: 14, fontWeight: 400, marginLeft: 12 }}>
              · {client.vertical}
            </span>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 64, height: 3, background: '#00C896', marginBottom: 48 }}/>

        {/* Report metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, marginBottom: 64 }}>
          {[
            { label: 'Report Type',    value: rt?.label || '—' },
            { label: 'Target Audience', value: rt?.audience || '—' },
            { label: 'Prepared By',    value: 'CoreIdentity Advisory Group' },
            { label: 'Prepared For',   value: client?.companyName || 'Platform' },
            { label: 'Report Date',    value: dateStr },
            { label: 'Classification', value: 'Confidential' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 9, color: '#94A3B8', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                {item.label}
              </div>
              <div style={{ fontSize: 12, color: '#1A2332', fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Certification block */}
        <div style={{
          background: '#F8FAFC', border: '1px solid #E2E8F0',
          borderLeft: '4px solid #00C896',
          borderRadius: 4, padding: '20px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
              Digital Certification
            </div>
            <div style={{ fontSize: 11, color: '#1A2332', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>
              CERT-{certHash}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
              Generated By
            </div>
            <div style={{ fontSize: 11, color: '#0066CC', fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}>
              CoreIdentity Governance Platform
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '16px 64px 16px 80px',
        borderTop: '1px solid #E2E8F0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#FAFBFC',
      }}>
        <div style={{ fontSize: 9, color: '#94A3B8', fontFamily: "'IBM Plex Mono', monospace" }}>
          COREIDENTITY DEVELOPMENT GROUP INC. — CONFIDENTIAL
        </div>
        <div style={{ fontSize: 9, color: '#94A3B8', fontFamily: "'IBM Plex Mono', monospace" }}>
          portal.coreidentitygroup.com
        </div>
      </div>
    </div>
  );
}

// ── Executive Summary page ────────────────────────────────────────────────────
function ExecutiveSummaryPage({ client, tenantData, frameworks, pageNum }) {
  const score = parseFloat(tenantData?.governanceScore || client?.governanceScore || 78);
  const scoreColor = score >= 90 ? '#16A34A' : score >= 75 ? '#0066CC' : score >= 60 ? '#D97706' : '#DC2626';
  const executions = parseInt(tenantData?.totalExecutions || 0);
  const violations = parseInt(tenantData?.totalViolations || 0);
  const successRate = executions > 0 ? Math.round((executions - violations) / executions * 100) : 0;
  const activeAgents = parseInt(tenantData?.activeAgents || 0);

  return (
    <div className="report-page page-break" style={{
      width: '8.5in', minHeight: '11in', background: 'white',
      fontFamily: "'IBM Plex Sans', sans-serif",
      position: 'relative', padding: 0,
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, background: 'linear-gradient(180deg, #00C896 0%, #0066CC 100%)' }}/>

      {/* Page header */}
      <div style={{ padding: '32px 64px 24px 80px', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, color: '#94A3B8', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
              Executive Governance Summary
            </div>
            <div style={{ fontSize: 16, color: '#0A1628', fontFamily: "'Playfair Display', serif", fontWeight: 600 }}>
              {client?.companyName || client?.name || 'Portfolio Overview'}
            </div>
          </div>
          <div style={{ fontSize: 9, color: '#94A3B8', fontFamily: "'IBM Plex Mono', monospace", textAlign: 'right' }}>
            <div>CoreIdentity Development Group</div>
            <div style={{ color: '#CBD5E1' }}>Page {pageNum}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '40px 64px 40px 80px' }}>

        {/* Overall posture header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
            Overall Governance Posture
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <ScoreRing score={score} size={100} color={scoreColor} />
            <div>
              <div style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", color: '#0A1628', fontWeight: 700, marginBottom: 6 }}>
                {score >= 90 ? 'Governance Excellence' : score >= 75 ? 'Governance Compliant' : score >= 60 ? 'Governance Developing' : 'Governance At Risk'}
              </div>
              <div style={{ fontSize: 13, color: '#475569', maxWidth: 420, lineHeight: 1.6 }}>
                {score >= 75
                  ? `${client?.companyName || 'This organization'} maintains a strong AI governance posture with active controls across ${frameworks.filter(f => f.status === 'Compliant').length} compliance frameworks.`
                  : `${client?.companyName || 'This organization'} has identified governance gaps requiring remediation within the next 90 days.`
                }
              </div>
            </div>
          </div>
        </div>

        {/* KPI grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 36 }}>
          {[
            { label: 'Governed AI Agents', value: activeAgents.toLocaleString(), color: '#0066CC', sub: 'Active deployment' },
            { label: 'Total Executions',   value: executions.toLocaleString(),   color: '#0A1628', sub: 'Audit trail complete' },
            { label: 'Policy Violations',  value: violations.toLocaleString(),   color: violations > 100 ? '#DC2626' : '#D97706', sub: 'Flagged for review' },
            { label: 'Success Rate',       value: successRate + '%',             color: '#16A34A', sub: 'Execution compliance' },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background: '#F8FAFC', border: '1px solid #E2E8F0',
              borderTop: `3px solid ${kpi.color}`,
              borderRadius: 4, padding: '16px 20px',
            }}>
              <div style={{ fontSize: 22, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: kpi.color, marginBottom: 4 }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: 11, color: '#1A2332', fontWeight: 600, marginBottom: 2 }}>{kpi.label}</div>
              <div style={{ fontSize: 10, color: '#94A3B8' }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Framework compliance table */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
            Compliance Framework Status
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #0A1628' }}>
                {['Framework', 'Status', 'Score', 'Controls', 'Findings', 'Next Audit'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 9, color: '#64748B', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {frameworks.map((fw, i) => (
                <tr key={fw.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? 'white' : '#FAFBFC' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1A2332' }}>{fw.label}</td>
                  <td style={{ padding: '10px 12px' }}><StatusPill status={fw.status} /></td>
                  <td style={{ padding: '10px 12px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: fw.score >= 90 ? '#16A34A' : fw.score >= 75 ? '#0066CC' : '#D97706' }}>
                    {fw.score}%
                  </td>
                  <td style={{ padding: '10px 12px', color: '#475569', fontFamily: "'IBM Plex Mono', monospace" }}>{fw.controls}</td>
                  <td style={{ padding: '10px 12px', color: fw.findings > 0 ? '#D97706' : '#16A34A', fontFamily: "'IBM Plex Mono', monospace", fontWeight: fw.findings > 0 ? 600 : 400 }}>
                    {fw.findings > 0 ? fw.findings + ' open' : '✓ Clear'}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#64748B', fontSize: 11 }}>Q1 2027</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Risk summary */}
        <div style={{
          background: '#0A1628', borderRadius: 6, padding: '24px 28px',
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 24,
        }}>
          <div>
            <div style={{ fontSize: 10, color: '#00C896', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
              Regulatory Exposure Mitigated
            </div>
            <div style={{ fontSize: 32, fontFamily: "'IBM Plex Mono', monospace", color: 'white', fontWeight: 600 }}>
              $16.85M
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
              HIPAA · CCPA · GLBA · PCI-DSS · Colorado AI Act
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#00C896', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
              Governance Coverage
            </div>
            <div style={{ fontSize: 32, fontFamily: "'IBM Plex Mono', monospace", color: 'white', fontWeight: 600 }}>
              100%
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
              All active agents under CoreIdentity governance
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px 64px 12px 80px', borderTop: '1px solid #E2E8F0',
        display: 'flex', justifyContent: 'space-between', background: '#FAFBFC',
      }}>
        <div style={{ fontSize: 9, color: '#94A3B8', fontFamily: "'IBM Plex Mono', monospace" }}>COREIDENTITY DEVELOPMENT GROUP INC. — CONFIDENTIAL</div>
        <div style={{ fontSize: 9, color: '#94A3B8', fontFamily: "'IBM Plex Mono', monospace" }}>Page {pageNum}</div>
      </div>
    </div>
  );
}

// ── Framework Detail page ─────────────────────────────────────────────────────
function FrameworkDetailPage({ fw, pageNum }) {
  const controls = [
    { id: 'CC6.1', name: 'Logical Access Controls',      status: 'Pass', severity: null },
    { id: 'CC6.2', name: 'Authentication Requirements',   status: 'Pass', severity: null },
    { id: 'CC6.3', name: 'Authorization Controls',        status: 'Pass', severity: null },
    { id: 'CC7.1', name: 'System Operations Monitoring',  status: 'Pass', severity: null },
    { id: 'CC7.2', name: 'Change Management Process',     status: 'Pass', severity: null },
    { id: 'CC8.1', name: 'Change Control Procedures',     status: fw.findings > 0 ? 'Finding' : 'Pass', severity: fw.findings > 0 ? 'Medium' : null },
    { id: 'CC3.1', name: 'Risk Assessment Process',       status: 'Pass', severity: null },
    { id: 'CC3.2', name: 'Risk Identification',           status: 'Pass', severity: null },
    { id: 'CC2.1', name: 'Board Communication',           status: 'Pass', severity: null },
    { id: 'CC1.1', name: 'Control Environment',           status: 'Pass', severity: null },
  ];

  return (
    <div className="report-page page-break" style={{
      width: '8.5in', minHeight: '11in', background: 'white',
      fontFamily: "'IBM Plex Sans', sans-serif", position: 'relative', padding: 0,
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, background: 'linear-gradient(180deg, #00C896 0%, #0066CC 100%)' }}/>

      <div style={{ padding: '32px 64px 24px 80px', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, color: '#94A3B8', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
              Compliance Framework Detail
            </div>
            <div style={{ fontSize: 16, color: '#0A1628', fontFamily: "'Playfair Display', serif", fontWeight: 600 }}>
              {fw.label}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <StatusPill status={fw.status} />
            <div style={{ fontSize: 9, color: '#94A3B8', fontFamily: "'IBM Plex Mono', monospace" }}>Page {pageNum}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '32px 64px 40px 80px' }}>
        {/* Framework header metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Compliance Score', value: fw.score + '%', color: fw.score >= 90 ? '#16A34A' : '#0066CC' },
            { label: 'Controls Total',   value: fw.controls,    color: '#0A1628' },
            { label: 'Passing',          value: fw.passing,     color: '#16A34A' },
            { label: 'Open Findings',    value: fw.findings,    color: fw.findings > 0 ? '#D97706' : '#16A34A' },
          ].map(m => (
            <div key={m.label} style={{ borderBottom: `3px solid ${m.color}`, paddingBottom: 12 }}>
              <div style={{ fontSize: 24, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: m.color, marginBottom: 4 }}>
                {m.value}
              </div>
              <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>

        {/* Controls table */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
            Control Assessment
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#0A1628' }}>
                {['Control ID', 'Control Name', 'Status', 'Severity', 'Evidence'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 9, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {controls.map((ctrl, i) => (
                <tr key={ctrl.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? 'white' : '#FAFBFC' }}>
                  <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#475569', fontWeight: 500 }}>{ctrl.id}</td>
                  <td style={{ padding: '9px 12px', color: '#1A2332', fontWeight: 500 }}>{ctrl.name}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{
                      color: ctrl.status === 'Pass' ? '#16A34A' : '#D97706',
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
                    }}>
                      {ctrl.status === 'Pass' ? '✓ Pass' : '⚠ Finding'}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 11, color: ctrl.severity ? '#D97706' : '#94A3B8' }}>
                    {ctrl.severity || '—'}
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 11, color: '#64748B', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {ctrl.status === 'Pass' ? 'Automated proof' : 'Manual review req.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Remediation section */}
        {fw.findings > 0 && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderLeft: '4px solid #D97706', borderRadius: 4, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: '#92400E', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
              Open Findings & Remediation
            </div>
            <div style={{ fontSize: 12, color: '#78350F', lineHeight: 1.7 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Finding {fw.id.toUpperCase()}-001:</strong> Change control documentation requires supplemental evidence for Q1 2026 deployments. CoreIdentity advisory team to provide automated attestation package within 30 days.
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
                <div><span style={{ fontWeight: 600 }}>Owner:</span> CISO / Compliance Team</div>
                <div><span style={{ fontWeight: 600 }}>Due:</span> 60 days</div>
                <div><span style={{ fontWeight: 600 }}>Priority:</span> Medium</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 64px 12px 80px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', background: '#FAFBFC' }}>
        <div style={{ fontSize: 9, color: '#94A3B8', fontFamily: "'IBM Plex Mono', monospace" }}>COREIDENTITY DEVELOPMENT GROUP INC. — CONFIDENTIAL</div>
        <div style={{ fontSize: 9, color: '#94A3B8', fontFamily: "'IBM Plex Mono', monospace" }}>Page {pageNum}</div>
      </div>
    </div>
  );
}

// ── Main ReportsPage component ────────────────────────────────────────────────
export default function ReportsPage() {
  const [reportType,   setReportType]   = useState('executive');
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients,      setClients]      = useState([]);
  const [tenantData,   setTenantData]   = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [showPreview,  setShowPreview]  = useState(false);
  const generatedAt = new Date().toISOString();
  const printRef = useRef();

  // Load live tenant data
  useEffect(() => {
    fetch(API + '/api/tenants', { headers: { Authorization: 'Bearer ' + token() } })
      .then(r => r.json())
      .then(d => {
        const data = Array.isArray(d) ? d : (d?.data || []);
        setClients(data);
        if (data.length > 0) setSelectedClient(data[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedClient?.clientId) return;
    setLoading(true);
    fetch(API + '/api/tenants/' + selectedClient.clientId, {
      headers: { Authorization: 'Bearer ' + token() }
    })
      .then(r => r.json())
      .then(d => setTenantData(d?.data || d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClient]);

  const handlePrint = () => {
    setGenerating(true);
    setTimeout(() => {
      window.print();
      setGenerating(false);
    }, 500);
  };

  const client = selectedClient;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: F.body, color: C.white }}>
      <style>{PRINT_CSS}</style>

      {/* ── Screen UI (hidden on print) ── */}
      <div className="no-print" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
            CoreIdentity Compliance Reports
          </div>
          <h1 style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", color: C.white, margin: 0, fontWeight: 700 }}>
            Governance Report Generator
          </h1>
          <p style={{ color: C.slate, marginTop: 8, fontSize: 13 }}>
            Generate board-ready compliance reports in PDF format. Big 5 consulting quality, powered by live governance data.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>

          {/* Left — Configuration */}
          <div>
            {/* Step 1 — Report type */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 10, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
                Step 1 — Select Report Type
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {REPORT_TYPES.map(rt => (
                  <button key={rt.id} onClick={() => setReportType(rt.id)} style={{
                    background: reportType === rt.id ? 'rgba(0,200,150,0.08)' : C.surface,
                    border: `1px solid ${reportType === rt.id ? '#00C896' : C.border}`,
                    borderRadius: 8, padding: '16px 20px', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ color: C.white, fontSize: 14, fontWeight: 600 }}>{rt.label}</div>
                      <div style={{ fontSize: 10, color: C.slate, fontFamily: "'IBM Plex Mono', monospace" }}>{rt.pages}</div>
                    </div>
                    <div style={{ color: C.slate, fontSize: 12, lineHeight: 1.5, marginBottom: 6 }}>{rt.desc}</div>
                    <div style={{ fontSize: 10, color: reportType === rt.id ? '#00C896' : C.slate }}>
                      Audience: {rt.audience}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 — Client */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 10, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
                Step 2 — Select Client / Entity
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {/* Platform-wide option */}
                <button onClick={() => setSelectedClient({ companyName: 'CoreIdentity Platform', vertical: 'Enterprise', clientId: null })} style={{
                  background: !selectedClient?.clientId ? 'rgba(0,200,150,0.08)' : C.surface,
                  border: `1px solid ${!selectedClient?.clientId ? '#00C896' : C.border}`,
                  borderRadius: 8, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                }}>
                  <div style={{ color: C.white, fontSize: 12, fontWeight: 600, marginBottom: 2 }}>CIDG Consolidated</div>
                  <div style={{ color: C.slate, fontSize: 10 }}>All companies · Platform-wide</div>
                </button>

                {clients.map(c => (
                  <button key={c.clientId} onClick={() => setSelectedClient(c)} style={{
                    background: selectedClient?.clientId === c.clientId ? 'rgba(0,200,150,0.08)' : C.surface,
                    border: `1px solid ${selectedClient?.clientId === c.clientId ? '#00C896' : C.border}`,
                    borderRadius: 8, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                  }}>
                    <div style={{ color: C.white, fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{c.companyName}</div>
                    <div style={{ color: C.slate, fontSize: 10 }}>{c.vertical}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button onClick={handlePrint} disabled={generating} style={{
              background: generating ? 'rgba(0,200,150,0.3)' : 'linear-gradient(135deg, #00C896 0%, #0066CC 100%)',
              border: 'none', borderRadius: 8, padding: '16px 32px',
              color: 'white', fontSize: 14, fontWeight: 600, cursor: generating ? 'wait' : 'pointer',
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.03em',
              transition: 'all 0.2s',
            }}>
              {generating ? '⏳ Generating Report...' : '↓ Download PDF Report'}
            </button>
          </div>

          {/* Right — Preview card */}
          <div>
            <div style={{ fontSize: 10, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
              Report Preview
            </div>
            <div style={{
              background: C.surface, border: '1px solid ' + C.border,
              borderRadius: 8, padding: 20,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 4 }}>
                {REPORT_TYPES.find(r => r.id === reportType)?.label}
              </div>
              <div style={{ fontSize: 11, color: C.slate, marginBottom: 16 }}>
                {client?.companyName || 'Select a client'}
              </div>
              <div style={{ borderTop: '1px solid ' + C.border, paddingTop: 16, marginBottom: 16 }}>
                {[
                  reportType === 'executive' ? 'Cover Page' : null,
                  reportType === 'executive' ? 'Executive Summary' : null,
                  reportType === 'executive' ? 'Compliance Overview' : null,
                  reportType === 'compliance' ? 'Cover Page' : null,
                  reportType === 'compliance' ? 'Framework Summary' : null,
                  ...FRAMEWORKS.map(f => reportType === 'compliance' ? f.label + ' Detail' : null),
                  reportType === 'audit' ? 'Cover Page' : null,
                  reportType === 'audit' ? 'Execution Summary' : null,
                  reportType === 'audit' ? 'Sentinel Events' : null,
                  reportType === 'audit' ? 'Proof Pack Registry' : null,
                  reportType === 'audit' ? 'Risk Classification Log' : null,
                ].filter(Boolean).map((page, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#00C896', flexShrink: 0 }}/>
                    <div style={{ fontSize: 11, color: C.slate }}>{page}</div>
                  </div>
                ))}
              </div>

              {/* Live data indicators */}
              <div style={{ borderTop: '1px solid ' + C.border, paddingTop: 12 }}>
                <div style={{ fontSize: 9, color: C.slate, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
                  Data Sources
                </div>
                {[
                  { label: 'Governance scores',  live: !!tenantData },
                  { label: 'Execution data',      live: !!tenantData?.totalExecutions },
                  { label: 'Framework status',    live: true },
                  { label: 'Agent inventory',     live: !!tenantData?.activeAgents },
                ].map(ds => (
                  <div key={ds.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: C.slate }}>{ds.label}</div>
                    <div style={{ fontSize: 10, color: ds.live ? '#00C896' : C.slate, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {ds.live ? '● Live' : '○ Static'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Print-only report pages ── */}
      <div id="print-report">
        <CoverPage reportType={reportType} client={client} generatedAt={generatedAt} />

        {reportType === 'executive' && (
          <ExecutiveSummaryPage
            client={client}
            tenantData={tenantData}
            frameworks={FRAMEWORKS}
            pageNum={2}
          />
        )}

        {reportType === 'compliance' && FRAMEWORKS.map((fw, i) => (
          <FrameworkDetailPage key={fw.id} fw={fw} pageNum={i + 2} />
        ))}

        {reportType === 'audit' && (
          <ExecutiveSummaryPage
            client={client}
            tenantData={tenantData}
            frameworks={FRAMEWORKS}
            pageNum={2}
          />
        )}
      </div>
    </div>
  );
}
