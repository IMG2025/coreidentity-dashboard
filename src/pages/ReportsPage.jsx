import { useState, useEffect } from 'react';
import { C, F } from '../chc-design.js';

const CLIENT_OPTS = [
  { id:'bank',   name:'First National Virtual Bank',     icon:'🏦', color:C.blue   },
  { id:'health', name:'Cascade Regional Health Network', icon:'🏥', color:C.green  },
  { id:'retail', name:'Summit Retail Group',             icon:'🛍️', color:C.orange },
  { id:'legal',  name:'Meridian Legal Partners LLP',     icon:'⚖️', color:C.purple },
];

function ScoreRing({ score, size = 80, color = C.green }) {
  const r   = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      <text x={size/2} y={size/2+5} textAnchor="middle" fill={color} fontSize={size/4.5} fontFamily={F.mono} fontWeight="700" style={{transform:`rotate(90deg) translate(0,-${size}px)`}}>{score}%</text>
    </svg>
  );
}

export default function ReportsPage() {
  const [clientId, setClientId] = useState('health');
  const [report,   setReport]   = useState(null);
  const [loading,  setLoading]  = useState(false);

  const client = CLIENT_OPTS.find(c => c.id === clientId);

  useEffect(() => {
    setLoading(true); setReport(null);
    fetch('/api/commercial/report/' + clientId)
      .then(r => r.json())
      .then(j => { if (j.success) setReport(j.report); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const pill = (label, color) => (
    <span style={{background:color+'22',color,border:'1px solid '+color+'44',borderRadius:4,fontSize:10,padding:'3px 10px',fontWeight:600,textTransform:'uppercase'}}>{label}</span>
  );

  return (
    <div style={{background:C.bg,minHeight:'100vh',overflowX:'hidden',maxWidth:'100vw',color:C.white,fontFamily:F.body}}>
      <div style={{maxWidth:960,margin:'0 auto',padding:'60px 40px'}}>
        <div style={{color:C.gold,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:12}}>Executive Governance Reports</div>
        <h1 style={{fontFamily:F.display,fontSize:52,color:C.white,margin:'0 0 36px',letterSpacing:'0.04em'}}>CLIENT GOVERNANCE REPORTS</h1>

        {/* Client selector */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:40}}>
          {CLIENT_OPTS.map(c => (
            <div key={c.id} onClick={()=>setClientId(c.id)} style={{background:clientId===c.id?c.color+'22':C.surface,border:'2px solid '+(clientId===c.id?c.color:C.border),borderRadius:8,padding:'14px 16px',cursor:'pointer',transition:'all 0.2s'}}>
              <div style={{fontSize:20,marginBottom:4}}>{c.icon}</div>
              <div style={{color:C.white,fontSize:12,fontWeight:600,lineHeight:1.3}}>{c.name}</div>
            </div>
          ))}
        </div>

        {loading && <div style={{textAlign:'center',padding:60,color:C.slate}}>⏳ Generating report…</div>}

        {report && (
          <div>
            {/* Report header */}
            <div style={{background:C.surface,border:'1px solid '+client.color+'44',borderRadius:12,padding:32,marginBottom:24,borderTop:'3px solid '+client.color}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
                <div>
                  <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:6}}>{report.period} · {report.reportId}</div>
                  <div style={{fontFamily:F.display,fontSize:36,color:C.white,letterSpacing:'0.04em',marginBottom:4}}>{report.name}</div>
                  <div style={{color:C.slate,fontSize:13}}>{report.vertical}</div>
                  <div style={{marginTop:12,display:'flex',gap:8}}>
                    {pill(report.complianceStatus, C.green)}
                    {pill(report.auditTrailComplete?'Audit Trail Complete':'Incomplete', report.auditTrailComplete?C.green:C.red)}
                    {pill(report.policyChecksPassed+' Policy Pass', C.teal)}
                  </div>
                </div>
                <ScoreRing score={report.avgGovernanceScore} size={90} color={C.green}/>
              </div>
              <div style={{background:C.bg,borderRadius:8,padding:'16px 20px'}}>
                <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>Executive Summary</div>
                <div style={{color:C.slateLight||C.white,fontSize:14,lineHeight:1.8}}>{report.executiveSummary}</div>
              </div>
            </div>

            {/* Metrics grid */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
              {[
                {l:'Total Executions',    v:(report.totalExecutions||0).toLocaleString(), c:C.gold },
                {l:'Governance Score',    v:report.avgGovernanceScore+'%',               c:C.green},
                {l:'Compliance Before',  v:report.before+'%',                            c:C.red  },
                {l:'Compliance After',   v:report.after+'%',                             c:C.green},
                {l:'Agents Governed',    v:report.agents,                                c:C.teal },
                {l:'Critical Findings',  v:report.criticalFindings,                      c:report.criticalFindings>0?C.red:C.green},
                {l:'Penalty Mitigated',  v:report.penaltyMitigated,                      c:C.gold },
                {l:'Audit Complete',     v:report.auditTrailComplete?'YES':'NO',         c:report.auditTrailComplete?C.green:C.red},
              ].map((s,i) => (
                <div key={i} style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:'16px 18px'}}>
                  <div style={{color:C.slate,fontSize:10,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>{s.l}</div>
                  <div style={{fontFamily:F.mono,fontSize:20,color:s.c,fontWeight:700}}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Frameworks */}
            <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:24,marginBottom:20}}>
              <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:14}}>Active Regulatory Frameworks</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {report.frameworks.map(f => (
                  <div key={f} style={{background:client.color+'22',border:'1px solid '+client.color+'44',borderRadius:6,padding:'8px 14px'}}>
                    <div style={{color:client.color,fontSize:12,fontWeight:600}}>{f}</div>
                    <div style={{color:C.green,fontSize:10,marginTop:2}}>● Active</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Findings */}
            <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:24,marginBottom:24}}>
              <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:14}}>Audit Findings — Q1 2026</div>
              {report.findings.map((f,i) => (
                <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'10px 0',borderBottom:'1px solid '+C.border+'44'}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:f.type==='POSITIVE'?C.green+'22':C.red+'22',border:'1px solid '+(f.type==='POSITIVE'?C.green:C.red),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:10,color:f.type==='POSITIVE'?C.green:C.red}}>{f.type==='POSITIVE'?'✓':'!'}</div>
                  <div>
                    <div style={{color:C.white,fontSize:13,fontWeight:600,marginBottom:2}}>{f.title}</div>
                    <div style={{color:C.slate,fontSize:12}}>{f.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{color:C.slate,fontSize:11,textAlign:'right'}}>Generated: {new Date(report.generatedAt).toLocaleString()} · {report.reportId}</div>
          </div>
        )}
      </div>
    </div>
  );
}
