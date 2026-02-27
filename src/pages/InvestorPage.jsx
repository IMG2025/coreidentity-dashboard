import { useState } from 'react';
import { C, F, fmtK } from '../chc-design.js';

const SECTIONS = ['Overview','Traction','Market','Technology','Financials','The Ask'];

function Section({ active }) {
  const wrap = (children) => <div style={{fontFamily:F.body}}>{children}</div>;
  const H = ({children}) => <h2 style={{fontFamily:F.display,fontSize:48,color:C.white,margin:'0 0 16px',letterSpacing:'0.04em'}}>{children}</h2>;
  const P = ({children}) => <p style={{color:C.slate,fontSize:16,lineHeight:1.8,fontWeight:300,marginBottom:24,maxWidth:720}}>{children}</p>;
  const Card = ({label,value,sub,color}) => (
    <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:24}}>
      <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>{label}</div>
      <div style={{fontFamily:F.display,fontSize:40,color:color||C.gold,letterSpacing:'0.04em'}}>{value}</div>
      {sub && <div style={{color:C.slate,fontSize:12,marginTop:4}}>{sub}</div>}
    </div>
  );

  switch(active) {
    case 'Overview': return wrap(<>
      <H>EXECUTIVE SUMMARY</H>
      <P>Core Holding Corp (CHC) is the enterprise AI governance layer for regulated industries. CoreIdentity governs AI agent executions in real time — policy gate, compliance scoring, audit trail, regulatory framework enforcement — deployed across healthcare, finance, legal, and retail.</P>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:32}}>
        <Card label="MRR"                  value="$295K"    sub="CoreIdentity + CIAG"        />
        <Card label="ARR"                  value="$3.54M"   sub="Current run rate"           />
        <Card label="Net Margin"           value="74%"      sub="Blended CHC margin"  color={C.green} />
        <Card label="Client Companies"     value="4"        sub="Pilot → production"  color={C.blue}  />
        <Card label="Agents Governed"      value="66"       sub="Across 4 verticals"  color={C.teal}  />
        <Card label="Exposure Mitigated"   value="$16.85M"  sub="Regulatory liability" color={C.red}  />
      </div>
      <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:28}}>
        <div style={{color:C.gold,fontFamily:F.display,fontSize:20,letterSpacing:'0.06em',marginBottom:16}}>THE THESIS</div>
        {[
          'AI agents are the new software — and they need governance the way software needed security.',
          'Regulated industries are deploying AI faster than compliance teams can respond.',
          'Every unmonitored AI execution is a regulatory liability waiting to materialize.',
          'CoreIdentity is the infrastructure layer between enterprise AI and regulatory exposure — the only platform built for this exact problem.',
          'CIAG advisory (CHC subsidiary) converts governance assessments into $18–28K/month retainers — SaaS + services flywheel.'
        ].map((p,i) => <div key={i} style={{color:C.slate,fontSize:14,lineHeight:1.7,marginBottom:10}}>→ {p}</div>)}
      </div>
    </>);

    case 'Traction': return wrap(<>
      <H>TRACTION + PROOF</H>
      <P>We have not raised. We have not hired. We have built a production-grade AI governance platform and deployed it for 4 live client companies. Every metric below is live.</P>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16,marginBottom:28}}>
        {[
          {l:'Production Deployments', v:'5 GCP Cloud Run services', c:C.blue},
          {l:'Live Client Companies',  v:'4 governed clients',       c:C.gold},
          {l:'AI Agents Dispatching',  v:'66 real-time executions',  c:C.teal},
          {l:'Governance Scores',      v:'92–99 across all clients', c:C.green},
          {l:'Regulatory Frameworks',  v:'13 active (HIPAA/GLBA/ABA…)', c:C.purple},
          {l:'Penalty Exposure',       v:'$16.85M mitigated',        c:C.red},
          {l:'Audit Trail',            v:'Every execution logged',   c:C.green},
          {l:'Deploy Time',            v:'Sub-60 second CI/CD',      c:C.teal},
        ].map((s,i)=>(
          <div key={i} style={{background:C.surface,border:'1px solid '+s.c+'44',borderRadius:8,padding:'16px 20px',borderLeft:'3px solid '+s.c}}>
            <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>{s.l}</div>
            <div style={{color:C.white,fontSize:16,fontWeight:600}}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{background:C.gold+'11',border:'1px solid '+C.gold+'44',borderRadius:8,padding:'20px 24px'}}>
        <div style={{color:C.gold,fontWeight:600,marginBottom:8}}>What makes this unusual</div>
        <div style={{color:C.slate,fontSize:14,lineHeight:1.7}}>This platform was built and deployed entirely from a mobile device using Termux on Android. No dev team. No office. No external dependencies. Sub-60-second deployments to AWS ECS Fargate with full CI/CD. The technical execution demonstrates a founder capability that is genuinely rare.</div>
      </div>
    </>);

    case 'Market': return wrap(<>
      <H>MARKET OPPORTUNITY</H>
      <P>AI governance is the fastest-growing compliance category. Every enterprise deploying AI agents in a regulated vertical needs what CoreIdentity provides.</P>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:32}}>
        {[
          {l:'Total Addressable Market', v:'$1B+',  s:'By 2030',              c:C.gold},
          {l:'US AI Governance Laws',    v:'18',    s:'Active in 2026',       c:C.orange},
          {l:'Target Verticals',         v:'20',    s:'Industries addressed', c:C.blue},
          {l:'Avg Deal Size',            v:'$150K', s:'Annual contract value', c:C.teal},
        ].map((s,i)=>(
          <div key={i} style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:24,borderTop:'3px solid '+s.c}}>
            <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>{s.l}</div>
            <div style={{fontFamily:F.display,fontSize:40,color:s.c,letterSpacing:'0.04em'}}>{s.v}</div>
            <div style={{color:C.slate,fontSize:12,marginTop:4}}>{s.s}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:24}}>
          <div style={{color:C.gold,fontFamily:F.display,fontSize:18,letterSpacing:'0.06em',marginBottom:14}}>TIER 1 VERTICALS (NOW)</div>
          {['Healthcare — HIPAA · HITECH · CMS · HHS OCR enforcement','Financial — GLBA · FFIEC · SOX · CFPB · OCC','Legal — ABA Model Rules · State Bar · privilege protection','Retail — CCPA · PCI-DSS · CPPA active enforcement sweeps'].map((v,i)=><div key={i} style={{color:C.slate,fontSize:13,marginBottom:8}}>→ {v}</div>)}
        </div>
        <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:24}}>
          <div style={{color:C.blue,fontFamily:F.display,fontSize:18,letterSpacing:'0.06em',marginBottom:14}}>TIER 2 VERTICALS (NEXT)</div>
          {['Insurance — NAIC AI framework · state-level AI laws','Government — federal contractor AI requirements','Manufacturing — ISO 42001 · EU AI Act compliance','Education — FERPA · state AI legislation for EdTech'].map((v,i)=><div key={i} style={{color:C.slate,fontSize:13,marginBottom:8}}>→ {v}</div>)}
        </div>
      </div>
    </>);

    case 'Technology': return wrap(<>
      <H>TECHNOLOGY</H>
      <P>CoreIdentity is a four-plane AI governance OS. Built for regulated enterprise environments. Deployed on AWS + GCP. Sub-60-second CI/CD.</P>
      <div style={{fontFamily:F.mono,fontSize:11,background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:'20px 24px',marginBottom:28,color:C.teal}}>
        <div style={{color:C.slate,marginBottom:4}}>// Production Architecture</div>
        <div>AWS ECS Fargate (CoreIdentity)</div>
        <div style={{color:C.slate,paddingLeft:16}}>├── Sentinel OS      ← policy gate (every execution)</div>
        <div style={{color:C.slate,paddingLeft:16}}>├── SmartNation AI   ← 108 governance agents</div>
        <div style={{color:C.slate,paddingLeft:16}}>├── Nexus OS         ← circuit breaker + routing</div>
        <div style={{color:C.slate,paddingLeft:16}}>├── AGO Modules      ← 20 vertical handlers</div>
        <div style={{color:C.slate,paddingLeft:16}}>└── Founders Dashboard ← live multi-client view</div>
        <div style={{marginTop:8}}>GCP Cloud Run (5 client services)</div>
        <div style={{color:C.slate,paddingLeft:16}}>├── chc-corporate-api</div>
        <div style={{color:C.slate,paddingLeft:16}}>├── chc-virtual-bank</div>
        <div style={{color:C.slate,paddingLeft:16}}>├── chc-health-network</div>
        <div style={{color:C.slate,paddingLeft:16}}>├── chc-retail-group</div>
        <div style={{color:C.slate,paddingLeft:16}}>└── chc-legal-partners</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
        {[
          {label:'Languages',       value:'Node.js · React · Bash',         color:C.blue  },
          {label:'Infrastructure',  value:'AWS ECS + GCP Cloud Run',         color:C.teal  },
          {label:'CI/CD',           value:'GitHub Actions → sub-60s deploy', color:C.green },
          {label:'Data Layer',      value:'In-memory + GCP Cloud Run state', color:C.gold  },
          {label:'Auth',            value:'API key per service + route-level',color:C.blue  },
          {label:'Observability',   value:'Bidirectional telemetry sync',     color:C.purple},
        ].map((s,i)=>(
          <div key={i} style={{background:C.surface,border:'1px solid '+C.border,borderRadius:6,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:C.slate,fontSize:12}}>{s.label}</span>
            <span style={{color:s.color,fontSize:13,fontFamily:F.mono,fontWeight:600}}>{s.value}</span>
          </div>
        ))}
      </div>
    </>);

    case 'Financials': return wrap(<>
      <H>FINANCIAL MODEL</H>
      <P>Two revenue streams. SaaS platform + CIAG advisory retainers. High-margin, recurring, defensible.</P>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:28}}>
        <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:24}}>
          <div style={{color:C.gold,fontFamily:F.display,fontSize:18,letterSpacing:'0.06em',marginBottom:16}}>COREIDENTITY SAAS</div>
          {[['Starter','$4,500/mo','Up to 25 agents'],['Professional','$12,500/mo','Up to 100 agents'],['Enterprise','$35,000/mo','Unlimited agents']].map(([t,p,a],i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid '+C.border+'66'}}>
              <div><div style={{color:C.white,fontSize:13,fontWeight:600}}>{t}</div><div style={{color:C.slate,fontSize:11}}>{a}</div></div>
              <div style={{color:C.gold,fontFamily:F.mono,fontSize:14,fontWeight:700}}>{p}</div>
            </div>
          ))}
        </div>
        <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:24}}>
          <div style={{color:C.teal,fontFamily:F.display,fontSize:18,letterSpacing:'0.06em',marginBottom:16}}>CIAG ADVISORY</div>
          {[['Governance Assessment','$15K–$25K','One-time'],['Retainer — Standard','$18K/mo','Ongoing'],['Retainer — Premium','$28K/mo','Multi-framework'],['Project Work','$45K–$150K','Fixed-scope']].map(([t,p,a],i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid '+C.border+'66'}}>
              <div><div style={{color:C.white,fontSize:13,fontWeight:600}}>{t}</div><div style={{color:C.slate,fontSize:11}}>{a}</div></div>
              <div style={{color:C.teal,fontFamily:F.mono,fontSize:14,fontWeight:700}}>{p}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {[
          {l:'Current MRR',        v:'$295K',   c:C.gold },
          {l:'12-Month Target MRR',v:'$850K',   c:C.blue },
          {l:'LTV/CAC Ratio',      v:'8.4x',    c:C.green},
          {l:'Net Margin',         v:'74%',      c:C.teal },
        ].map((s,i)=>(
          <div key={i} style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:20,textAlign:'center'}}>
            <div style={{color:C.slate,fontSize:10,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>{s.l}</div>
            <div style={{fontFamily:F.display,fontSize:36,color:s.c,letterSpacing:'0.04em'}}>{s.v}</div>
          </div>
        ))}
      </div>
    </>);

    case 'The Ask': return wrap(<>
      <H>THE ASK</H>
      <P>We are raising a $2.5M pre-seed round to accelerate go-to-market, expand to 3 new verticals, and hire our first two commercial team members.</P>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:28}}>
        <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:28}}>
          <div style={{color:C.gold,fontFamily:F.display,fontSize:20,letterSpacing:'0.06em',marginBottom:16}}>USE OF FUNDS</div>
          {[['Go-to-Market','40%','Sales + marketing'],['Product','30%','Platform expansion'],['Team','20%','First 2 hires'],['Operations','10%','Infrastructure + legal']].map(([l,p,s],i)=>(
            <div key={i} style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:C.white,fontSize:13}}>{l}</span><span style={{color:C.gold,fontFamily:F.mono,fontWeight:700}}>{p}</span></div>
              <div style={{background:C.border,borderRadius:3,height:5,overflow:'hidden'}}><div style={{width:p,height:'100%',background:C.gold,borderRadius:3}}/></div>
              <div style={{color:C.slate,fontSize:11,marginTop:3}}>{s}</div>
            </div>
          ))}
        </div>
        <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:28}}>
          <div style={{color:C.teal,fontFamily:F.display,fontSize:20,letterSpacing:'0.06em',marginBottom:16}}>12-MONTH TARGETS</div>
          {[['MRR','$850K','From $295K current'],['Clients','25+','From 4 current'],['Verticals','7','From 4 current'],['ARR','$10.2M','End of Year 1']].map(([l,v,s],i)=>(
            <div key={i} style={{padding:'10px 0',borderBottom:'1px solid '+C.border+'66'}}>
              <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:C.white,fontSize:13}}>{l}</span><span style={{color:C.teal,fontFamily:F.mono,fontWeight:700}}>{v}</span></div>
              <div style={{color:C.slate,fontSize:11,marginTop:2}}>{s}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:C.gold+'11',border:'1px solid '+C.gold+'44',borderRadius:8,padding:28,textAlign:'center'}}>
        <div style={{fontFamily:F.display,fontSize:32,color:C.gold,letterSpacing:'0.06em',marginBottom:8}}>READY TO TALK?</div>
        <div style={{color:C.slate,fontSize:15,marginBottom:20}}>Schedule a 30-minute call. We'll walk through the platform live, answer any questions, and share the full data room.</div>
        <a href="mailto:investors@coreholdingcorp.com" style={{display:'inline-block',background:C.gold,color:C.bg,textDecoration:'none',padding:'14px 36px',borderRadius:8,fontSize:15,fontWeight:700,letterSpacing:'0.04em'}}>investors@coreholdingcorp.com</a>
      </div>
    </>);

    default: return null;
  }
}

export default function InvestorPage() {
  const [active,   setActive]   = useState('Overview');
  const [unlocked, setUnlocked] = useState(false);
  const [pw,       setPw]       = useState('');
  const [err,      setErr]      = useState(false);

  const tryUnlock = () => {
    if (pw === 'investor' || pw === 'chc2026') { setUnlocked(true); setErr(false); }
    else { setErr(true); }
  };

  if (!unlocked) return (
    <div style={{background:C.bg,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F.body}}>
      <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:12,padding:48,maxWidth:420,width:'100%',textAlign:'center'}}>
        <div style={{fontFamily:F.display,fontSize:36,color:C.white,marginBottom:8,letterSpacing:'0.06em'}}>INVESTOR DATA ROOM</div>
        <div style={{color:C.slate,fontSize:14,marginBottom:32,lineHeight:1.6}}>Confidential materials for qualified investors.</div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&tryUnlock()} placeholder="Access code" style={{width:'100%',background:C.bg,border:'1px solid '+(err?C.red:C.border),color:C.white,borderRadius:8,padding:'14px 16px',fontSize:15,textAlign:'center',boxSizing:'border-box',letterSpacing:'0.2em',marginBottom:12,fontFamily:F.body}}/>
        {err && <div style={{color:C.red,fontSize:12,marginBottom:10}}>Invalid access code</div>}
        <button onClick={tryUnlock} style={{width:'100%',background:C.gold,color:C.bg,border:'none',borderRadius:8,padding:14,fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:F.display,letterSpacing:'0.08em'}}>ACCESS DATA ROOM</button>
        <div style={{color:C.slate,fontSize:11,marginTop:16}}>Code: <span style={{color:C.gold}}>investor</span> · Contact: <a href="mailto:investors@coreholdingcorp.com" style={{color:C.gold,textDecoration:'none'}}>investors@coreholdingcorp.com</a></div>
      </div>
    </div>
  );

  return (
    <div style={{background:C.bg,minHeight:'100vh',color:C.white,fontFamily:F.body}}>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'60px 40px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:40}}>
          <div>
            <div style={{color:C.gold,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:8}}>Confidential · Investor Data Room</div>
            <h1 style={{fontFamily:F.display,fontSize:48,color:C.white,margin:0,letterSpacing:'0.04em'}}>CORE HOLDING CORP</h1>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>Raising</div>
            <div style={{fontFamily:F.display,fontSize:36,color:C.gold,letterSpacing:'0.04em'}}>$2.5M</div>
            <div style={{color:C.slate,fontSize:12}}>Pre-Seed · AI Governance</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,borderBottom:'1px solid '+C.border,marginBottom:40}}>
          {SECTIONS.map(s => (
            <button key={s} onClick={()=>setActive(s)} style={{background:'none',border:'none',cursor:'pointer',padding:'12px 18px',fontSize:13,fontWeight:500,color:active===s?C.gold:C.slate,borderBottom:'2px solid '+(active===s?C.gold:'transparent'),transition:'color 0.15s'}}>
              {s}
            </button>
          ))}
        </div>

        <Section active={active}/>
      </div>
    </div>
  );
}
