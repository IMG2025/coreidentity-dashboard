import { useState } from 'react';
import { C, F } from '../chc-design.js';

const DEMO_AGENTS = [
  { id:'b-01', cid:'bank',   name:'Fraud Detection',         task:'fraud-detection',         icon:'🏦' },
  { id:'h-02', cid:'health', name:'Clinical Decision Support',task:'clinical-recommendation', icon:'🏥' },
  { id:'r-03', cid:'retail', name:'Transaction Fraud Detect', task:'transaction-fraud',       icon:'🛍️'},
  { id:'l-06', cid:'legal',  name:'Conflict Check',          task:'conflict-check',          icon:'⚖️' },
  { id:'b-07', cid:'bank',   name:'Transaction Monitoring',  task:'transaction-monitoring',  icon:'🏦' },
  { id:'h-08', cid:'health', name:'Pharmacy Interaction',    task:'drug-interaction',        icon:'🏥' },
];

const STEPS = [
  {id:1,label:'The Crisis',   icon:'⚠️'},
  {id:2,label:'Your Risk',    icon:'📊'},
  {id:3,label:'The Platform', icon:'🛡️'},
  {id:4,label:'Live Fire',    icon:'⚡'},
  {id:5,label:'Get Started',  icon:'🚀'},
];

function Crisis() {
  return (
    <div>
      <h2 style={{fontFamily:F.display,fontSize:52,color:C.white,margin:'0 0 16px',letterSpacing:'0.04em'}}>THE AI GOVERNANCE CRISIS</h2>
      <p style={{color:C.slate,fontSize:16,lineHeight:1.8,marginBottom:36,fontWeight:300}}>Enterprises are deploying AI agents at unprecedented velocity — clinical decisions, credit approvals, fraud detections, privilege reviews — inside systems with <strong style={{color:C.red}}>zero governance</strong>.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:36}}>
        {[
          {stat:'78%',    label:'of enterprises have AI agents with no audit trail',   color:C.red   },
          {stat:'$4.5M',  label:'avg cost of a single HIPAA AI violation in 2025',     color:C.orange},
          {stat:'18',     label:'US states with active AI governance legislation 2026', color:C.gold  },
        ].map((s,i) => (
          <div key={i} style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:24,textAlign:'center'}}>
            <div style={{fontFamily:F.display,fontSize:48,color:s.color,letterSpacing:'0.04em'}}>{s.stat}</div>
            <div style={{color:C.slate,fontSize:13,marginTop:8,lineHeight:1.5}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{background:C.red+'11',border:'1px solid '+C.red+'33',borderRadius:8,padding:'20px 24px'}}>
        <div style={{color:C.red,fontWeight:600,marginBottom:12}}>The Ungoverned AI Profile — What Your Agents Look Like Today</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
          {['No policy gate before execution','No audit trail after execution','No compliance framework applied','No governance score assigned','No rate limiting or circuit breaker','No regulatory reporting capability'].map((f,i) => (
            <div key={i} style={{color:C.slate,fontSize:13}}>✗ {f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Risk() {
  const [industry, setIndustry] = useState('Healthcare');
  const [agents,   setAgents]   = useState(18);
  const PROFILES = {
    'Healthcare':        {perAgent:85000, tier:'Professional', frameworks:['HIPAA','HITECH','CMS']},
    'Financial Services':{perAgent:45000, tier:'Enterprise',   frameworks:['GLBA','FFIEC','SOX','CCPA']},
    'Retail':            {perAgent:32000, tier:'Starter',      frameworks:['CCPA','PCI-DSS','CPPA']},
    'Legal':             {perAgent:38000, tier:'Professional', frameworks:['ABA Rules','State Bar','CCPA']},
    'Insurance':         {perAgent:55000, tier:'Professional', frameworks:['NAIC','CCPA','GLBA']},
  };
  const p = PROFILES[industry];
  const exp = Math.round(agents * p.perAgent * 0.7);
  const monthly = industry==='Healthcare'?12500:industry==='Financial Services'?35000:4500;
  const roi = Math.round((exp - monthly*12)/(monthly*12)*100);
  return (
    <div>
      <h2 style={{fontFamily:F.display,fontSize:52,color:C.white,margin:'0 0 16px',letterSpacing:'0.04em'}}>CALCULATE YOUR EXPOSURE</h2>
      <p style={{color:C.slate,fontSize:16,fontWeight:300,marginBottom:32}}>Your industry. Your agents. Your real regulatory risk.</p>
      <div style={{display:'flex',gap:24,marginBottom:32,flexWrap:'wrap'}}>
        <div>
          <label style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',display:'block',marginBottom:8}}>Industry</label>
          <select value={industry} onChange={e=>setIndustry(e.target.value)} style={{background:C.surface,border:'1px solid '+C.border,color:C.white,borderRadius:8,padding:'12px 16px',fontSize:14,cursor:'pointer',minWidth:220}}>
            {Object.keys(PROFILES).map(k=><option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',display:'block',marginBottom:8}}>AI Agents: <span style={{color:C.gold,fontFamily:F.mono}}>{agents}</span></label>
          <input type="range" min={1} max={100} value={agents} onChange={e=>setAgents(Number(e.target.value))} style={{width:240,accentColor:C.gold,marginTop:6}}/>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
        {[
          {label:'Est. Exposure',      value:'$'+(exp/1e6).toFixed(1)+'M', color:C.red  },
          {label:'Annual Risk',        value:'$'+((exp*1.4)/1e6).toFixed(1)+'M', color:C.orange},
          {label:'CoreIdentity ROI',   value:roi+'x',               color:C.green},
        ].map((s,i) => (
          <div key={i} style={{background:C.surface,border:'1px solid '+s.color+'44',borderRadius:8,padding:24,borderTop:'3px solid '+s.color}}>
            <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>{s.label}</div>
            <div style={{fontFamily:F.display,fontSize:40,color:s.color,letterSpacing:'0.04em'}}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:18}}>
        <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:10}}>Required Frameworks for {industry}</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {p.frameworks.map(f => <span key={f} style={{background:C.gold+'22',color:C.gold,border:'1px solid '+C.gold+'44',borderRadius:4,fontSize:11,padding:'4px 10px',fontWeight:600}}>{f}</span>)}
        </div>
      </div>
    </div>
  );
}

function Platform() {
  return (
    <div>
      <h2 style={{fontFamily:F.display,fontSize:52,color:C.white,margin:'0 0 16px',letterSpacing:'0.04em'}}>HOW COREIDENTITY WORKS</h2>
      <p style={{color:C.slate,fontSize:16,fontWeight:300,marginBottom:36}}>Every agent execution flows through four governance planes — automatically, in real time.</p>
      <div style={{fontFamily:F.mono,fontSize:12,color:C.teal,background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:'16px 20px',marginBottom:28}}>
        <div>POST /api/agents/execute</div>
        <div style={{color:C.slate,marginLeft:16}}>→ Sentinel OS (policy gate)</div>
        <div style={{color:C.slate,marginLeft:32}}>→ Nexus OS (routing + resilience)</div>
        <div style={{color:C.slate,marginLeft:48}}>→ AGO Module (HIPAA / GLBA / ABA / CCPA)</div>
        <div style={{color:C.slate,marginLeft:64}}>→ GCP Agent Execution</div>
        <div style={{color:C.green,marginLeft:80}}>← Governance envelope returned (score + audit)</div>
      </div>
      {[
        {plane:'Sentinel OS',    role:'Policy Gate',      desc:'Rate limit · permission scope · data access validation · output safety checks. Every execution blocked if any check fails.',     color:C.red  },
        {plane:'Nexus OS',       role:'Routing + Resilience', desc:'Intelligent circuit breaker routes to correct GCP client service. Handles retries, timeouts, fallback — zero data loss.', color:C.blue },
        {plane:'AGO Modules',    role:'20 Vertical Handlers', desc:'HIPAA for healthcare, GLBA for finance, ABA for legal, CCPA across all. Purpose-built compliance logic per vertical.',     color:C.teal },
        {plane:'SmartNation AI', role:'Continuous Monitor',desc:'108 governance agents running continuously. Flags ungoverned drift, generates compliance telemetry every 30 seconds.',       color:C.gold },
      ].map((p,i) => (
        <div key={i} style={{display:'flex',gap:16,marginBottom:12,alignItems:'flex-start'}}>
          <div style={{width:36,height:36,background:p.color+'22',border:'1px solid '+p.color+'66',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:p.color,fontWeight:700,fontFamily:F.mono,fontSize:13}}>{i+1}</div>
          <div style={{background:C.surface,border:'1px solid '+p.color+'33',borderRadius:8,padding:'14px 18px',flex:1,borderLeft:'3px solid '+p.color}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{color:p.color,fontFamily:F.display,fontSize:15,letterSpacing:'0.06em'}}>{p.plane}</span>
              <span style={{color:C.slate,fontSize:11,background:C.border,padding:'2px 8px',borderRadius:4}}>{p.role}</span>
            </div>
            <div style={{color:C.slate,fontSize:13,lineHeight:1.6}}>{p.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LiveFire() {
  const [sel,  setSel]  = useState(0);
  const [busy, setBusy] = useState(false);
  const [res,  setRes]  = useState(null);
  const [err,  setErr]  = useState(null);
  const a = DEMO_AGENTS[sel];

  const fire = async () => {
    setBusy(true); setRes(null); setErr(null);
    try {
      const r    = await fetch('/api/agents/execute',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:a.cid,agentId:a.id,task:a.task,payload:{demo:true}})});
      const json = await r.json();
      if (json.success) setRes(json.data); else setErr(json.error||'Failed');
    } catch(e) { setErr(e.message); }
    finally    { setBusy(false); }
  };

  return (
    <div>
      <h2 style={{fontFamily:F.display,fontSize:52,color:C.white,margin:'0 0 16px',letterSpacing:'0.04em'}}>FIRE A LIVE GOVERNED AGENT</h2>
      <p style={{color:C.slate,fontSize:16,fontWeight:300,marginBottom:32}}>Select a real client agent. Dispatch it through CoreIdentity. Watch the governance envelope return in under 500ms.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:24}}>
        {DEMO_AGENTS.map((ag,i) => (
          <div key={i} onClick={()=>{setSel(i);setRes(null);}} style={{background:sel===i?C.gold+'22':C.surface,border:'1px solid '+(sel===i?C.gold:C.border),borderRadius:8,padding:'14px 16px',cursor:'pointer',transition:'all 0.2s'}}>
            <div style={{fontSize:18,marginBottom:4}}>{ag.icon}</div>
            <div style={{color:C.white,fontSize:12,fontWeight:600,marginBottom:2}}>{ag.name}</div>
            <div style={{color:C.slate,fontSize:10}}>{ag.task.replace(/-/g,' ')}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:16,alignItems:'center',marginBottom:24}}>
        <button onClick={fire} disabled={busy} style={{background:busy?C.border:C.gold,color:busy?C.slate:C.bg,border:'none',borderRadius:8,padding:'14px 32px',fontSize:15,fontWeight:700,cursor:busy?'wait':'pointer',letterSpacing:'0.06em',fontFamily:F.display,transition:'all 0.2s'}}>
          {busy?'DISPATCHING…':'▶ FIRE AGENT'}
        </button>
        {!res && !busy && <div style={{color:C.slate,fontSize:12}}>→ Sentinel → AGO → GCP → Governed result</div>}
      </div>
      {res && (
        <div style={{background:C.green+'11',border:'1px solid '+C.green+'44',borderRadius:8,padding:24}}>
          <div style={{color:C.green,fontWeight:700,fontSize:14,marginBottom:16}}>✓ Governed Execution Complete — {a.name}</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
            {[
              {l:'Gov Score',    v:res.governanceScore+'%',            c:C.green},
              {l:'Latency',      v:(res.totalLatencyMs||0)+'ms',       c:C.teal },
              {l:'Policy Checks',v:(res.policyChecks?.length||4)+' passed', c:C.blue},
              {l:'Audit',        v:'RECORDED',                         c:C.gold },
            ].map((s,i) => (
              <div key={i} style={{background:C.surface,borderRadius:6,padding:'12px 14px'}}>
                <div style={{color:C.slate,fontSize:10,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>{s.l}</div>
                <div style={{color:s.c,fontFamily:F.mono,fontSize:16,fontWeight:700}}>{s.v}</div>
              </div>
            ))}
          </div>
          <div style={{color:C.slate,fontSize:11,fontFamily:F.mono}}>ID: {res.executionId?.slice(0,32)} · Token: {res.governanceToken?.slice(0,20)}…</div>
          {res.result && <div style={{marginTop:10,color:C.slate,fontSize:12,fontFamily:F.mono,background:C.surface,padding:'10px 14px',borderRadius:6}}>{JSON.stringify(res.result,null,0).slice(0,200)}</div>}
        </div>
      )}
      {err && <div style={{color:C.red,background:C.red+'11',border:'1px solid '+C.red+'33',borderRadius:8,padding:16}}>⚠ {err}</div>}
    </div>
  );
}

function GetStarted() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [done, setDone] = useState(false);
  if (done) return (
    <div style={{background:C.green+'11',border:'1px solid '+C.green+'33',borderRadius:12,padding:48,maxWidth:500}}>
      <div style={{fontFamily:F.display,fontSize:36,color:C.green,marginBottom:12}}>REQUEST RECEIVED</div>
      <div style={{color:C.slate,fontSize:15,lineHeight:1.7}}>We'll reach out to <strong style={{color:C.white}}>{email}</strong> within 24 hours to schedule onboarding and deploy CoreIdentity on your agents.</div>
    </div>
  );
  const inp = {width:'100%',background:C.surface,border:'1px solid '+C.border,color:C.white,borderRadius:8,padding:'14px 16px',fontSize:14,boxSizing:'border-box',fontFamily:F.body};
  const lbl = {color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',display:'block',marginBottom:8};
  return (
    <div>
      <h2 style={{fontFamily:F.display,fontSize:52,color:C.white,margin:'0 0 16px',letterSpacing:'0.04em'}}>START YOUR 30-DAY PILOT</h2>
      <p style={{color:C.slate,fontSize:16,fontWeight:300,marginBottom:36}}>No credit card. Full CoreIdentity deployment on your agents in under 60 seconds.</p>
      <div style={{maxWidth:480}}>
        <div style={{marginBottom:14}}><label style={lbl}>Company</label><input style={inp} value={company} onChange={e=>setCompany(e.target.value)} placeholder="Acme Corp"/></div>
        <div style={{marginBottom:14}}><label style={lbl}>Work Email</label><input style={inp} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"/></div>
        <button onClick={()=>email&&company&&setDone(true)} style={{width:'100%',background:C.gold,color:C.bg,border:'none',borderRadius:8,padding:'14px',fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:F.display,letterSpacing:'0.06em',marginTop:8}}>REQUEST PILOT ACCESS</button>
        <div style={{color:C.slate,fontSize:12,marginTop:14,textAlign:'center'}}>Or skip straight to <a href="#/onboard" style={{color:C.gold}}>the full assessment →</a></div>
      </div>
    </div>
  );
}

export default function DemoPage() {
  const [step, setStep] = useState(1);
  const CONTENT = {1:Crisis, 2:Risk, 3:Platform, 4:LiveFire, 5:GetStarted};
  const S = CONTENT[step];
  return (
    <div style={{background:C.bg,minHeight:'100vh',color:C.white,fontFamily:F.body}}>
      <div style={{maxWidth:900,margin:'0 auto',padding:'60px 40px'}}>
        <div style={{color:C.gold,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:36}}>CoreIdentity Interactive Demo · Step {step} of {STEPS.length}</div>
        <div style={{display:'flex',gap:8,marginBottom:52}}>
          {STEPS.map(s => (
            <div key={s.id} onClick={()=>setStep(s.id)} style={{flex:1,cursor:'pointer'}}>
              <div style={{height:3,background:step>=s.id?C.gold:C.border,borderRadius:2,marginBottom:10,transition:'background 0.3s'}}/>
              <div style={{fontSize:10,color:step===s.id?C.gold:C.slate,textTransform:'uppercase',letterSpacing:'0.08em'}}>{s.icon} {s.label}</div>
            </div>
          ))}
        </div>
        <S/>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:48,paddingTop:24,borderTop:'1px solid '+C.border}}>
          <button onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step===1} style={{background:'none',border:'1px solid '+C.border,color:step===1?C.border:C.slate,borderRadius:8,padding:'12px 24px',fontSize:14,cursor:step===1?'default':'pointer'}}>← Back</button>
          {step<STEPS.length
            ? <button onClick={()=>setStep(s=>s+1)} style={{background:C.gold,color:C.bg,border:'none',borderRadius:8,padding:'12px 28px',fontSize:14,fontWeight:700,cursor:'pointer'}}>Next: {STEPS[step].label} →</button>
            : <a href="#/onboard" style={{background:C.gold,color:C.bg,textDecoration:'none',borderRadius:8,padding:'12px 28px',fontSize:14,fontWeight:700}}>Full Assessment →</a>
          }
        </div>
      </div>
    </div>
  );
}
