import { useState } from 'react';
import { C, F } from '../chc-design.js';

const TIERS = [
  {
    name:'Starter', price:4500, agents:25, color:C.blue,
    features:['Up to 25 AI agents','3 regulatory frameworks','CCPA + 2 vertical-specific','Email support (48h SLA)','Governance score dashboard','Monthly compliance report','Basic audit trail (30 days)','API access — 10K calls/mo'],
    notIncluded:['CIAG advisory hours','Custom framework mapping','Dedicated CSM','SLA guarantee','Advanced telemetry']
  },
  {
    name:'Professional', price:12500, agents:100, color:C.gold, recommended:true,
    features:['Up to 100 AI agents','All 13+ frameworks included','HIPAA · GLBA · ABA · CCPA · PCI-DSS…','Dedicated Customer Success Manager','Governance score dashboard','Weekly compliance reports','Full audit trail (1 year)','API access — 100K calls/mo','2 CIAG advisory hours/month','Custom framework mapping','Priority support (4h SLA)','Bidirectional telemetry sync'],
    notIncluded:['Unlimited agents','Custom SLA','Full CIAG retainer']
  },
  {
    name:'Enterprise', price:35000, agents:9999, color:C.purple,
    features:['Unlimited AI agents','All frameworks + custom','Full CIAG advisory retainer','Executive governance reports','Real-time telemetry + alerting','API access — unlimited','Custom SLA (99.9% uptime)','Dedicated implementation team','Quarterly board-level reports','Regulatory response playbooks','Multi-region deployment','Source code escrow available'],
    notIncluded:[]
  }
];

const FAQS = [
  {q:'How quickly can CoreIdentity be deployed?',        a:'Under 60 seconds for standard deployment. Our CI/CD pipeline handles the infrastructure. Most clients are governing their first AI agent within 15 minutes of signing.'},
  {q:'Do you support custom regulatory frameworks?',     a:'Professional and Enterprise tiers include custom framework mapping. We currently support HIPAA, GLBA, FFIEC, CCPA, CPPA, PCI-DSS, ABA Model Rules, State Bar requirements, HITECH, CMS, SOX, Colorado AI Act, and Texas RAIGA.'},
  {q:'What happens when an agent fails a policy check?', a:'Sentinel OS blocks the execution and returns a structured error with the failed policy check. The attempt is logged in the audit trail. Your team is notified based on your alerting configuration.'},
  {q:'Is there a free trial?',                           a:'We offer a 30-day pilot with full platform access. No credit card required. Contact us to schedule onboarding.'},
  {q:'How is governance score calculated?',              a:'Each execution is scored 0–100 based on: policy checks passed (rate limit, permission scope, data access, output validation), framework compliance, and audit trail completeness. The average across all executions produces the client governance score.'},
  {q:'What is CIAG advisory?',                           a:'CIAG (CoreIdentity Advisory Group) is our consulting subsidiary that helps enterprises assess governance gaps, map regulatory frameworks, and build remediation plans. Professional tier includes 2 advisory hours/month. Enterprise tier includes a full retainer.'},
];

export default function PricingPage() {
  const [industry,  setIndustry]  = useState('Healthcare');
  const [agents,    setAgents]    = useState(20);
  const [billing,   setBilling]   = useState('monthly');
  const [openFaq,   setOpenFaq]   = useState(null);

  const PROFILES = {
    'Healthcare':        {perAgent:85000, recommended:'Professional'},
    'Financial Services':{perAgent:45000, recommended:'Enterprise'},
    'Retail':            {perAgent:32000, recommended:'Starter'},
    'Legal':             {perAgent:38000, recommended:'Professional'},
    'Insurance':         {perAgent:55000, recommended:'Professional'},
    'Technology':        {perAgent:28000, recommended:'Starter'},
  };
  const prof = PROFILES[industry] || {perAgent:35000, recommended:'Starter'};
  const exposure = Math.round(agents * prof.perAgent * 0.7);
  const tierMap  = {Starter:4500, Professional:12500, Enterprise:35000};
  const annualDiscount = 0.10;

  return (
    <div style={{background:C.bg,minHeight:'100vh',color:C.white,fontFamily:F.body}}>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'60px 40px'}}>

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:60}}>
          <div style={{color:C.gold,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:12}}>Pricing</div>
          <h1 style={{fontFamily:F.display,fontSize:64,color:C.white,margin:'0 0 16px',letterSpacing:'0.04em'}}>SIMPLE. TRANSPARENT. GOVERNED.</h1>
          <p style={{color:C.slate,fontSize:17,fontWeight:300,maxWidth:560,margin:'0 auto 28px'}}>One platform. Every AI agent in your organization. Every regulatory framework you need.</p>
          <div style={{display:'inline-flex',background:C.surface,border:'1px solid '+C.border,borderRadius:8,overflow:'hidden'}}>
            {['monthly','annual'].map(b => (
              <button key={b} onClick={()=>setBilling(b)} style={{background:billing===b?C.border:'none',border:'none',color:billing===b?C.white:C.slate,padding:'8px 20px',fontSize:13,cursor:'pointer',fontWeight:billing===b?600:400}}>
                {b.charAt(0).toUpperCase()+b.slice(1)} {b==='annual'&&<span style={{color:C.green,fontSize:11}}> (save 10%)</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:60}}>
          {TIERS.map((t,i) => {
            const price   = billing==='annual' ? Math.round(t.price*(1-annualDiscount)) : t.price;
            const rec     = t.recommended;
            return (
              <div key={i} style={{background:rec?C.surface2:C.surface,border:'2px solid '+(rec?t.color:C.border),borderRadius:12,padding:28,position:'relative',display:'flex',flexDirection:'column'}}>
                {rec && <div style={{position:'absolute',top:-13,left:'50%',transform:'translateX(-50%)',background:t.color,color:t.color===C.gold?C.bg:C.white,fontSize:10,fontWeight:700,padding:'4px 14px',borderRadius:20,letterSpacing:'0.1em',whiteSpace:'nowrap'}}>MOST POPULAR</div>}
                <div style={{marginBottom:20}}>
                  <div style={{fontFamily:F.display,fontSize:28,color:t.color,letterSpacing:'0.06em',marginBottom:6}}>{t.name}</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:4}}>
                    <span style={{fontFamily:F.mono,fontSize:36,color:C.white,fontWeight:700}}>${(price/1000).toFixed(1)}K</span>
                    <span style={{color:C.slate,fontSize:13}}>/month</span>
                  </div>
                  {billing==='annual' && <div style={{color:C.green,fontSize:11,marginBottom:4}}>Save ${(t.price-price)*12/1000}K annually</div>}
                  <div style={{color:C.slate,fontSize:12}}>Up to {t.agents===9999?'unlimited':t.agents} agents</div>
                </div>
                <a href="#/onboard" style={{display:'block',textAlign:'center',background:rec?t.color:'none',color:rec?(t.color===C.gold?C.bg:C.white):t.color,textDecoration:'none',padding:'11px',borderRadius:8,fontSize:13,fontWeight:700,border:'1px solid '+(rec?'transparent':t.color+'66'),marginBottom:24,letterSpacing:'0.04em'}}>
                  {i===2?'Contact Sales':'Start 30-Day Trial'}
                </a>
                <div style={{flex:1}}>
                  {t.features.map((f,j) => <div key={j} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:8,fontSize:13}}><span style={{color:C.green,marginTop:1,flexShrink:0}}>✓</span><span style={{color:C.slate}}>{f}</span></div>)}
                  {t.notIncluded.map((f,j) => <div key={j} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:8,fontSize:13}}><span style={{color:C.border,marginTop:1,flexShrink:0}}>✗</span><span style={{color:C.border}}>{f}</span></div>)}
                </div>
              </div>
            );
          })}
        </div>

        {/* ROI Calculator */}
        <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:12,padding:36,marginBottom:60}}>
          <div style={{textAlign:'center',marginBottom:32}}>
            <div style={{color:C.gold,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:10}}>ROI Calculator</div>
            <h2 style={{fontFamily:F.display,fontSize:40,color:C.white,margin:0,letterSpacing:'0.04em'}}>CALCULATE YOUR ROI</h2>
          </div>
          <div style={{display:'flex',gap:32,marginBottom:32,flexWrap:'wrap',justifyContent:'center'}}>
            <div>
              <label style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',display:'block',marginBottom:8}}>Your Industry</label>
              <select value={industry} onChange={e=>setIndustry(e.target.value)} style={{background:C.bg,border:'1px solid '+C.border,color:C.white,borderRadius:8,padding:'12px 16px',fontSize:14,cursor:'pointer',minWidth:200,fontFamily:F.body}}>
                {Object.keys(PROFILES).map(k=><option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',display:'block',marginBottom:8}}>AI Agents: <span style={{color:C.gold,fontFamily:F.mono}}>{agents}</span></label>
              <input type="range" min={1} max={150} value={agents} onChange={e=>setAgents(Number(e.target.value))} style={{width:240,accentColor:C.gold,marginTop:6}}/>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            {[
              {label:'Estimated Annual Exposure',      value:'$'+(exposure/1e6).toFixed(2)+'M', color:C.red,   sub:'Without CoreIdentity'},
              {label:`${prof.recommended} Annual Cost`,value:'$'+(tierMap[prof.recommended]*12/1000).toFixed(0)+'K', color:C.gold, sub:'Full platform coverage'},
              {label:'Annual ROI',                     value:Math.round((exposure-tierMap[prof.recommended]*12)/(tierMap[prof.recommended]*12)*100)+'x', color:C.green, sub:'Exposure mitigated vs cost'},
            ].map((s,i)=>(
              <div key={i} style={{background:C.bg,borderRadius:8,padding:'20px 24px',textAlign:'center',borderTop:'3px solid '+s.color}}>
                <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>{s.label}</div>
                <div style={{fontFamily:F.display,fontSize:44,color:s.color,letterSpacing:'0.04em'}}>{s.value}</div>
                <div style={{color:C.slate,fontSize:12,marginTop:4}}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{marginBottom:60}}>
          <h2 style={{fontFamily:F.display,fontSize:40,color:C.white,margin:'0 0 28px',letterSpacing:'0.04em',textAlign:'center'}}>COMMON QUESTIONS</h2>
          {FAQS.map((faq,i) => (
            <div key={i} style={{border:'1px solid '+C.border,borderRadius:8,marginBottom:8,overflow:'hidden'}}>
              <div onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{padding:'16px 20px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',background:openFaq===i?C.surface:C.bg}}>
                <span style={{color:C.white,fontSize:14,fontWeight:500}}>{faq.q}</span>
                <span style={{color:C.gold,fontSize:18,transition:'transform 0.2s',transform:openFaq===i?'rotate(45deg)':'none'}}>+</span>
              </div>
              {openFaq===i && <div style={{padding:'0 20px 16px',background:C.surface,color:C.slate,fontSize:14,lineHeight:1.7}}>{faq.a}</div>}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{background:`linear-gradient(135deg,${C.gold}11,${C.gold}05)`,border:'1px solid '+C.gold+'44',borderRadius:12,padding:'40px',textAlign:'center'}}>
          <h2 style={{fontFamily:F.display,fontSize:44,color:C.white,margin:'0 0 12px',letterSpacing:'0.04em'}}>START YOUR 30-DAY PILOT</h2>
          <p style={{color:C.slate,fontSize:16,fontWeight:300,marginBottom:28}}>No credit card. Full platform. Every framework. First governed execution in under 60 seconds.</p>
          <div style={{display:'flex',gap:12,justifyContent:'center'}}>
            <a href="#/onboard" style={{background:C.gold,color:C.bg,textDecoration:'none',padding:'14px 32px',borderRadius:8,fontSize:15,fontWeight:700}}>Get Free Assessment</a>
            <a href="mailto:sales@coreholdingcorp.com" style={{background:'none',color:C.gold,textDecoration:'none',padding:'14px 32px',borderRadius:8,fontSize:15,fontWeight:500,border:'1px solid '+C.gold+'44'}}>Talk to Sales</a>
          </div>
        </div>
      </div>
    </div>
  );
}
