import { useState, useEffect } from 'react';
import { C, F } from '../chc-design.js';

const VERTICALS = [
  { icon:'🏥', name:'Healthcare',         penalty:'$8.2M',  agents:18, score:58, color:C.green  },
  { icon:'🏦', name:'Financial Services', penalty:'$4.75M', agents:23, score:65, color:C.blue   },
  { icon:'🛍️', name:'Retail',            penalty:'$2.1M',  agents:14, score:71, color:C.orange },
  { icon:'⚖️', name:'Legal',             penalty:'$1.8M',  agents:11, score:74, color:C.purple },
];
const STATS = [
  { v:'66',      l:'Ungoverned Agents',      s:'Live right now',              c:C.red    },
  { v:'$16.85M', l:'Exposure Mitigated',     s:'Across 4 client verticals',   c:C.gold   },
  { v:'18',      l:'Active AI Laws',         s:'US states + federal',         c:C.orange },
  { v:'94%',     l:'Avg Governance Score',   s:'Post-CoreIdentity deployment', c:C.green  },
];
const LAWS = [
  { law:'HIPAA',           max:'$1.9M/yr',   who:'HHS OCR',      sector:'Healthcare' },
  { law:'GLBA',            max:'$100K/day',  who:'FTC / OCC',    sector:'Financial'  },
  { law:'CCPA / CPPA',     max:'Unlimited',  who:'CA CPPA',      sector:'All'        },
  { law:'ABA Rule 1.6',    max:'Disbarment', who:'State Bar',    sector:'Legal'      },
  { law:'PCI-DSS',         max:'$100K/mo',   who:'Card Networks',sector:'Retail'     },
  { law:'Colorado AI Act', max:'TBD',        who:'Colorado AG',  sector:'All'        },
  { law:'Texas RAIGA',     max:'TBD',        who:'Texas AG',     sector:'All'        },
  { law:'EU AI Act',       max:'€30M/7%',   who:'EU AI Office', sector:'Global'     },
];

export default function MarketingPage() {
  const [count, setCount] = useState(412089);
  useEffect(() => {
    const t = setInterval(() => setCount(n => n + Math.floor(Math.random()*8)+2), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{background:C.bg, color:C.white, fontFamily:F.body}}>

      {/* Ticker */}
      <div style={{background:C.gold+'18', borderBottom:'1px solid '+C.gold+'33', padding:'8px 40px', display:'flex', justifyContent:'space-between', fontSize:11}}>
        <span style={{color:C.gold, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:600}}>● LIVE — CoreIdentity Governance Platform</span>
        <div style={{display:'flex', gap:32, color:C.slate}}>
          <span>Governed executions today: <span style={{color:C.gold, fontFamily:F.mono, fontWeight:700}}>{count.toLocaleString()}</span></span>
          <span>5 GCP services: <span style={{color:C.green}}>all healthy</span></span>
          <span>Avg score: <span style={{color:C.green, fontFamily:F.mono}}>94%</span></span>
        </div>
      </div>

      {/* Hero */}
      <section style={{padding:'100px 40px 80px', maxWidth:1200, margin:'0 auto', background:`radial-gradient(ellipse at 65% 0%,${C.gold}08 0%,transparent 55%)`}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:80, alignItems:'center'}}>
          <div>
            <div style={{color:C.gold, fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:20, display:'flex', alignItems:'center', gap:8}}>
              <div style={{width:24, height:1, background:C.gold}}/> AI Governance Infrastructure
            </div>
            <h1 style={{fontFamily:F.display, fontSize:76, lineHeight:0.95, color:C.white, margin:'0 0 28px', letterSpacing:'0.02em'}}>
              YOUR AI<br/>AGENTS<br/><span style={{color:C.red}}>HAVE NO</span><br/>OVERSIGHT.
            </h1>
            <p style={{fontSize:17, color:C.slate, lineHeight:1.8, margin:'0 0 36px', maxWidth:460, fontWeight:300}}>
              66 ungoverned agents making clinical decisions, credit approvals, and legal reviews —
              with <strong style={{color:C.white}}>$16.85M</strong> in regulatory exposure and zero audit trail.
              CoreIdentity changes that.
            </p>
            <div style={{display:'flex', gap:12}}>
              <a href="#/demo" style={{background:C.gold, color:C.bg, textDecoration:'none', padding:'14px 28px', borderRadius:8, fontSize:15, fontWeight:700, letterSpacing:'0.04em', fontFamily:F.body}}>See Live Demo</a>
              <a href="#/onboard" style={{background:'none', color:C.gold, textDecoration:'none', padding:'14px 28px', borderRadius:8, fontSize:15, fontWeight:500, border:'1px solid '+C.gold+'44'}}>Free Assessment →</a>
            </div>
          </div>

          {/* Exposure card */}
          <div style={{background:C.surface, border:'1px solid '+C.border, borderRadius:12, padding:36, position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${C.red},${C.gold})`}}/>
            <div style={{color:C.slate, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:20}}>Unmitigated Regulatory Exposure</div>
            <div style={{fontFamily:F.display, fontSize:60, color:C.red, letterSpacing:'0.04em', lineHeight:1, marginBottom:8}}>$16.85M</div>
            <div style={{color:C.slate, fontSize:13, marginBottom:28}}>Across 4 industries · 66 ungoverned AI agents</div>
            {VERTICALS.map((v,i) => (
              <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderTop:'1px solid '+C.border+'66'}}>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <span style={{fontSize:16}}>{v.icon}</span>
                  <span style={{color:C.white, fontSize:13}}>{v.name}</span>
                  <span style={{color:C.slate, fontSize:11}}>{v.agents} agents</span>
                </div>
                <span style={{color:C.red, fontFamily:F.mono, fontSize:14, fontWeight:700}}>{v.penalty}</span>
              </div>
            ))}
            <div style={{marginTop:20, background:C.green+'11', border:'1px solid '+C.green+'33', borderRadius:6, padding:'10px 16px', display:'flex', justifyContent:'space-between'}}>
              <span style={{color:C.green, fontSize:13, fontWeight:600}}>After CoreIdentity</span>
              <span style={{color:C.green, fontFamily:F.mono, fontWeight:700}}>$0 exposure</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{padding:'0 40px 80px', maxWidth:1200, margin:'0 auto'}}>
        <div style={{display:'flex', gap:16, flexWrap:'wrap'}}>
          {STATS.map((s,i) => (
            <div key={i} style={{flex:1, minWidth:200, background:C.surface, border:'1px solid '+C.border, borderTop:'3px solid '+s.c, borderRadius:8, padding:'24px 28px'}}>
              <div style={{fontFamily:F.display, fontSize:42, color:s.c, letterSpacing:'0.04em', lineHeight:1}}>{s.v}</div>
              <div style={{color:C.white, fontSize:14, fontWeight:600, marginTop:8}}>{s.l}</div>
              <div style={{color:C.slate, fontSize:12, marginTop:4}}>{s.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Laws */}
      <section style={{padding:'80px 40px', borderTop:'1px solid '+C.border, background:C.surface+'44'}}>
        <div style={{maxWidth:1200, margin:'0 auto'}}>
          <div style={{textAlign:'center', marginBottom:52}}>
            <div style={{color:C.gold, fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:12}}>The Regulatory Landscape</div>
            <h2 style={{fontFamily:F.display, fontSize:52, color:C.white, margin:0, letterSpacing:'0.04em'}}>THE STATES ARE COMING.</h2>
            <p style={{color:C.slate, fontSize:16, marginTop:14, fontWeight:300}}>18 active AI governance laws. Federal frameworks tightening. Your ungoverned agents are a liability.</p>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12}}>
            {LAWS.map((r,i) => (
              <div key={i} style={{background:C.surface, border:'1px solid '+C.border, borderRadius:8, padding:'18px 20px'}}>
                <div style={{fontFamily:F.display, fontSize:20, color:C.gold, letterSpacing:'0.06em', marginBottom:6}}>{r.law}</div>
                <div style={{color:C.red, fontFamily:F.mono, fontSize:12, fontWeight:600, marginBottom:6}}>Max: {r.max}</div>
                <div style={{color:C.slate, fontSize:11}}>{r.who} · {r.sector}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform planes */}
      <section style={{padding:'80px 40px', maxWidth:1200, margin:'0 auto'}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:80, alignItems:'start'}}>
          <div>
            <div style={{color:C.gold, fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:16}}>The Platform</div>
            <h2 style={{fontFamily:F.display, fontSize:52, color:C.white, margin:'0 0 24px', letterSpacing:'0.04em', lineHeight:1}}>FOUR PLANES.<br/>ONE GOVERNANCE OS.</h2>
            <p style={{color:C.slate, fontSize:16, lineHeight:1.8, fontWeight:300, marginBottom:32}}>Deployed in under 60 seconds. Every agent execution governed, scored, logged — automatically.</p>
            {[
              {name:'Sentinel OS',    desc:'Policy gate — every execution passes Sentinel before dispatch', color:C.red  },
              {name:'SmartNation AI', desc:'108 governance agents monitoring your AI in real time',        color:C.gold },
              {name:'Nexus OS',       desc:'Circuit breaker + intelligent routing across all agent types', color:C.blue },
              {name:'AGO Modules',    desc:'20 vertical handlers — HIPAA, GLBA, ABA, CCPA and beyond',    color:C.teal },
            ].map((p,i) => (
              <div key={i} style={{display:'flex', gap:16, alignItems:'flex-start', padding:'14px 18px', background:C.surface, borderRadius:8, marginBottom:8, borderLeft:'3px solid '+p.color}}>
                <div style={{color:p.color, fontFamily:F.display, fontSize:14, letterSpacing:'0.06em', whiteSpace:'nowrap', marginTop:1, minWidth:110}}>{p.name}</div>
                <div style={{color:C.slate, fontSize:13, lineHeight:1.6}}>{p.desc}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{color:C.slate, fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:16}}>Client Portfolio — Live</div>
            {VERTICALS.map((v,i) => (
              <div key={i} style={{background:C.surface, border:'1px solid '+v.color+'44', borderRadius:8, padding:'18px 22px', marginBottom:10, borderLeft:'3px solid '+v.color}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12}}>
                  <div>
                    <div style={{fontSize:18, marginBottom:3}}>{v.icon}</div>
                    <div style={{color:C.white, fontSize:14, fontWeight:600}}>{v.name}</div>
                    <div style={{color:C.slate, fontSize:11}}>{v.agents} agents</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{color:C.green, fontSize:11, fontWeight:600, letterSpacing:'0.08em'}}>GOVERNED</div>
                    <div style={{color:C.gold, fontFamily:F.mono, fontSize:16, fontWeight:700}}>{v.penalty}</div>
                    <div style={{color:C.slate, fontSize:10}}>mitigated</div>
                  </div>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <div style={{flex:1, background:C.border, borderRadius:3, height:5, overflow:'hidden'}}>
                    <div style={{width:v.score+'%', height:'100%', background:v.score<70?C.red:v.score<80?C.orange:C.green, borderRadius:3}}/>
                  </div>
                  <span style={{color:v.score<70?C.red:v.score<80?C.orange:C.green, fontFamily:F.mono, fontSize:11, fontWeight:700, minWidth:30}}>{v.score}%</span>
                  <span style={{color:C.slate, fontSize:10}}>→</span>
                  <span style={{color:C.green, fontFamily:F.mono, fontSize:11, fontWeight:700}}>94%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Market */}
      <section style={{padding:'80px 40px', borderTop:'1px solid '+C.border}}>
        <div style={{maxWidth:1200, margin:'0 auto', textAlign:'center'}}>
          <div style={{color:C.gold, fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:14}}>Market Opportunity</div>
          <h2 style={{fontFamily:F.display, fontSize:60, color:C.white, margin:'0 0 20px', letterSpacing:'0.04em'}}>$1 BILLION BY 2030.</h2>
          <p style={{color:C.slate, fontSize:16, fontWeight:300, margin:'0 auto 48px', maxWidth:580}}>20 industry verticals. 18 active state laws. Every enterprise with AI agents needs what we've built.</p>
          <div style={{display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', maxWidth:800, margin:'0 auto'}}>
            {['Healthcare','Financial Services','Legal','Retail','Insurance','Real Estate','Education','Manufacturing','Government','Logistics','Energy','Media','Telecom','HR & Staffing','Hospitality','Pharma','Defense','Non-Profit','Technology','Sovereign Nations'].map((v,i) => (
              <div key={i} style={{padding:'6px 14px', background:C.surface, border:'1px solid '+C.border, borderRadius:20, color:C.slate, fontSize:11}}>{v}</div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:'100px 40px', maxWidth:860, margin:'0 auto', textAlign:'center'}}>
        <h2 style={{fontFamily:F.display, fontSize:64, color:C.white, margin:'0 0 16px', letterSpacing:'0.04em'}}>READY TO GOVERN YOUR AI?</h2>
        <p style={{color:C.slate, fontSize:18, fontWeight:300, marginBottom:40}}>90-second assessment. Instant exposure score. Recommended package.</p>
        <div style={{display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap'}}>
          <a href="#/onboard" style={{background:C.gold, color:C.bg, textDecoration:'none', padding:'16px 40px', borderRadius:8, fontSize:16, fontWeight:700}}>Start Free Assessment</a>
          <a href="#/demo"    style={{background:'none', color:C.gold, textDecoration:'none', padding:'16px 40px', borderRadius:8, fontSize:16, fontWeight:500, border:'1px solid '+C.gold+'44'}}>Watch Live Demo</a>
          <a href="#/investor" style={{background:'none', color:C.slate, textDecoration:'none', padding:'16px 40px', borderRadius:8, fontSize:16, border:'1px solid '+C.border}}>Investor Materials</a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{borderTop:'1px solid '+C.border, padding:'36px 40px'}}>
        <div style={{maxWidth:1200, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{color:C.slate, fontSize:12}}>© 2026 Core Holding Corp · CoreIdentity Platform · CIAG Advisory Group</div>
          <div style={{display:'flex', gap:20}}>
            {[['#/demo','Demo'],['#/pricing','Pricing'],['#/docs','API'],['#/investor','Investors'],['#/dashboard','Dashboard']].map(([h,l]) => (
              <a key={h} href={h} style={{color:C.slate, textDecoration:'none', fontSize:12}}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
