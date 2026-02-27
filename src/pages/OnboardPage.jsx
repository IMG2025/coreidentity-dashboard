import { useState } from 'react';
import { C, F } from '../chc-design.js';

const INDUSTRIES = ['Healthcare','Financial Services','Retail','Legal','Insurance','Technology','Manufacturing','Education','Government','Logistics','Real Estate','Media','Other'];
const CATS = ['Customer Service / Chatbots','Fraud Detection / Risk','Compliance / Regulatory','Clinical / Medical Decision','Document Processing','Data Analytics','Marketing / Personalization','Operations / Scheduling','Other'];
const TIERS = {Starter:{price:4500,agents:25},Professional:{price:12500,agents:100},Enterprise:{price:35000,agents:9999}};

function scoreColor(s) { return s<50?C.red:s<70?C.orange:C.green; }

export default function OnboardPage() {
  const [step, setStep]   = useState(1);
  const [form, setForm]   = useState({company:'',industry:'',agentCount:15,categories:[],currentScore:20,email:'',name:'',title:''});
  const [result, setResult] = useState(null);
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));

  const assess = async () => {
    try {
      const r    = await fetch('/api/commercial/assess',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({industry:form.industry,agentCount:form.agentCount,currentScore:form.currentScore,company:form.company,email:form.email})});
      const json = await r.json();
      if (json.success) setResult(json.assessment);
    } catch(e) {
      // Compute locally as fallback
      const perAgent = form.industry==='Healthcare'?85000:form.industry==='Financial Services'?45000:35000;
      const ungov    = Math.round(form.agentCount*(1-form.currentScore/100));
      const exposure = ungov*perAgent;
      const tier     = form.agentCount>75?'Enterprise':form.agentCount>20?'Professional':'Starter';
      setResult({exposure,ungoverned:ungov,projectedScore:Math.min(96,form.currentScore+28),recommendedTier:tier,monthlyPrice:TIERS[tier].price,roi:Math.round((exposure-TIERS[tier].price*12)/(TIERS[tier].price*12)*100),frameworks:['CCPA','Colorado AI Act']});
    }
    setStep(4);
  };

  const STEPS = ['Company','AI Inventory','Contact','Assessment','Package'];
  const inp  = {width:'100%',background:C.surface,border:'1px solid '+C.border,color:C.white,borderRadius:8,padding:'12px 16px',fontSize:14,boxSizing:'border-box',fontFamily:F.body};
  const lbl  = {color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',display:'block',marginBottom:8};
  const sel  = {...inp,cursor:'pointer'};

  return (
    <div style={{background:C.bg,minHeight:'100vh',color:C.white,fontFamily:F.body}}>
      <div style={{maxWidth:740,margin:'0 auto',padding:'60px 40px'}}>
        <div style={{color:C.gold,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:12}}>Free AI Governance Assessment</div>
        <h1 style={{fontFamily:F.display,fontSize:48,color:C.white,margin:'0 0 40px',letterSpacing:'0.04em'}}>KNOW YOUR AI RISK IN 90 SECONDS.</h1>

        {/* Progress bar */}
        <div style={{display:'flex',gap:4,marginBottom:48}}>
          {STEPS.map((l,i) => (
            <div key={i} style={{flex:1}}>
              <div style={{height:3,background:step>i+1?C.gold:step===i+1?C.gold+'88':C.border,borderRadius:2,marginBottom:8,transition:'background 0.3s'}}/>
              <div style={{fontSize:10,color:step===i+1?C.gold:C.slate,textTransform:'uppercase',letterSpacing:'0.08em'}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step===1 && (
          <div>
            <h2 style={{fontFamily:F.display,fontSize:36,color:C.white,margin:'0 0 24px',letterSpacing:'0.04em'}}>TELL US ABOUT YOUR COMPANY</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div><label style={lbl}>Company Name</label><input style={inp} value={form.company} onChange={e=>upd('company',e.target.value)} placeholder="Acme Corp"/></div>
              <div><label style={lbl}>Industry</label><select style={sel} value={form.industry} onChange={e=>upd('industry',e.target.value)}><option value="">Select…</option>{INDUSTRIES.map(i=><option key={i} value={i}>{i}</option>)}</select></div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step===2 && (
          <div>
            <h2 style={{fontFamily:F.display,fontSize:36,color:C.white,margin:'0 0 24px',letterSpacing:'0.04em'}}>YOUR AI AGENT INVENTORY</h2>
            <div style={{marginBottom:28}}>
              <label style={lbl}>Total AI Agents: <span style={{color:C.gold,fontFamily:F.mono}}>{form.agentCount}</span></label>
              <input type="range" min={1} max={200} value={form.agentCount} onChange={e=>upd('agentCount',Number(e.target.value))} style={{width:'100%',accentColor:C.gold}}/>
              <div style={{display:'flex',justifyContent:'space-between',color:C.slate,fontSize:10,marginTop:4}}><span>1</span><span>50</span><span>100</span><span>200</span></div>
            </div>
            <label style={lbl}>Agent Types (select all that apply)</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {CATS.map(cat => (
                <div key={cat} onClick={()=>upd('categories',form.categories.includes(cat)?form.categories.filter(c=>c!==cat):[...form.categories,cat])}
                  style={{padding:'10px 14px',background:form.categories.includes(cat)?C.gold+'22':C.surface,border:'1px solid '+(form.categories.includes(cat)?C.gold:C.border),borderRadius:6,cursor:'pointer',fontSize:13,color:form.categories.includes(cat)?C.gold:C.slate}}>
                  {cat}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step===3 && (
          <div>
            <h2 style={{fontFamily:F.display,fontSize:36,color:C.white,margin:'0 0 24px',letterSpacing:'0.04em'}}>CURRENT STATE + CONTACT</h2>
            <div style={{marginBottom:28}}>
              <label style={lbl}>Estimated current governance score: <span style={{color:scoreColor(form.currentScore),fontFamily:F.mono}}>{form.currentScore}%</span></label>
              <input type="range" min={0} max={100} value={form.currentScore} onChange={e=>upd('currentScore',Number(e.target.value))} style={{width:'100%',accentColor:C.gold}}/>
              <div style={{display:'flex',gap:8,marginTop:10}}>
                {[[0,'None'],[25,'Basic'],[50,'Partial'],[75,'Mostly'],[100,'Full']].map(([v,l])=>(
                  <div key={v} onClick={()=>upd('currentScore',v)} style={{flex:1,padding:'6px 4px',background:C.surface,border:'1px solid '+(Math.abs(form.currentScore-v)<13?C.gold:C.border),borderRadius:6,cursor:'pointer',fontSize:10,color:C.slate,textAlign:'center'}}>{l}</div>
                ))}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div><label style={lbl}>Full Name</label><input style={inp} value={form.name} onChange={e=>upd('name',e.target.value)} placeholder="Jane Smith"/></div>
              <div><label style={lbl}>Title</label><input style={inp} value={form.title} onChange={e=>upd('title',e.target.value)} placeholder="CISO / Legal / Ops"/></div>
              <div style={{gridColumn:'1/-1'}}><label style={lbl}>Work Email</label><input style={inp} value={form.email} onChange={e=>upd('email',e.target.value)} placeholder="you@company.com"/></div>
            </div>
          </div>
        )}

        {/* Step 4 — Results */}
        {step===4 && result && (
          <div>
            <div style={{color:C.green,fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:10}}>Assessment Complete — {form.company||'Your Company'}</div>
            <h2 style={{fontFamily:F.display,fontSize:44,color:C.white,margin:'0 0 28px',letterSpacing:'0.04em'}}>YOUR GOVERNANCE REPORT</h2>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
              {[
                {label:'Estimated Exposure',   value:'$'+(result.exposure/1e6).toFixed(1)+'M', sub:result.ungoverned+' ungoverned agents', color:C.red  },
                {label:'Current Gov Score',    value:form.currentScore+'%',  sub:'Significant gaps identified',      color:C.orange},
                {label:'Projected Score',      value:result.projectedScore+'%', sub:'Post-CoreIdentity',            color:C.green },
              ].map((s,i)=>(
                <div key={i} style={{background:C.surface,border:'1px solid '+s.color+'44',borderRadius:8,padding:24,borderTop:'3px solid '+s.color}}>
                  <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>{s.label}</div>
                  <div style={{fontFamily:F.display,fontSize:40,color:s.color,letterSpacing:'0.04em'}}>{s.value}</div>
                  <div style={{color:C.slate,fontSize:12,marginTop:4}}>{s.sub}</div>
                </div>
              ))}
            </div>
            {result.frameworks && <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:20,marginBottom:16}}>
              <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:10}}>Required Frameworks for {form.industry}</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{result.frameworks.map(f=><span key={f} style={{background:C.gold+'22',color:C.gold,border:'1px solid '+C.gold+'44',borderRadius:4,fontSize:11,padding:'4px 10px',fontWeight:600}}>{f}</span>)}</div>
            </div>}
            <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:20,marginBottom:24}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><div style={{color:C.slate,fontSize:11,textTransform:'uppercase',marginBottom:4}}>Recommended Package</div><div style={{color:C.gold,fontFamily:F.display,fontSize:24,letterSpacing:'0.04em'}}>{result.recommendedTier}</div><div style={{color:C.slate,fontSize:13}}>${(result.monthlyPrice/1000).toFixed(1)}K/month</div></div>
                <div><div style={{color:C.slate,fontSize:11,textTransform:'uppercase',marginBottom:4}}>Annual ROI</div><div style={{color:C.green,fontFamily:F.display,fontSize:24,letterSpacing:'0.04em'}}>{result.roi}x return</div></div>
              </div>
            </div>
            <button onClick={()=>setStep(5)} style={{width:'100%',background:C.gold,color:C.bg,border:'none',borderRadius:8,padding:16,fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:F.display,letterSpacing:'0.06em'}}>VIEW YOUR PACKAGE →</button>
          </div>
        )}

        {/* Step 5 — Package selection */}
        {step===5 && result && (
          <div>
            <h2 style={{fontFamily:F.display,fontSize:44,color:C.white,margin:'0 0 12px',letterSpacing:'0.04em'}}>YOUR RECOMMENDED PACKAGE</h2>
            <p style={{color:C.slate,fontSize:16,fontWeight:300,marginBottom:32}}>Based on your {form.industry} profile with {form.agentCount} agents.</p>
            {Object.entries(TIERS).map(([key,tier])=>(
              <div key={key} style={{background:key===result.recommendedTier?C.gold+'11':C.surface,border:'2px solid '+(key===result.recommendedTier?C.gold:C.border),borderRadius:12,padding:28,marginBottom:14,position:'relative'}}>
                {key===result.recommendedTier && <div style={{position:'absolute',top:-12,right:20,background:C.gold,color:C.bg,fontSize:10,fontWeight:700,padding:'4px 12px',borderRadius:20,letterSpacing:'0.1em'}}>RECOMMENDED FOR YOU</div>}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:key===result.recommendedTier?16:0}}>
                  <div>
                    <div style={{fontFamily:F.display,fontSize:28,color:key===result.recommendedTier?C.gold:C.white,letterSpacing:'0.06em'}}>{key}</div>
                    <div style={{color:C.slate,fontSize:13}}>Up to {tier.agents===9999?'unlimited':tier.agents} agents</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:F.mono,fontSize:28,color:key===result.recommendedTier?C.gold:C.white,fontWeight:700}}>${(tier.price/1000).toFixed(1)}K</div>
                    <div style={{color:C.slate,fontSize:12}}>per month</div>
                  </div>
                </div>
                {key===result.recommendedTier && <a href="mailto:sales@coreholdingcorp.com" style={{display:'block',textAlign:'center',background:C.gold,color:C.bg,textDecoration:'none',padding:12,borderRadius:8,fontSize:14,fontWeight:700,letterSpacing:'0.04em'}}>Start 30-Day Pilot →</a>}
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        {step<4 && (
          <div style={{display:'flex',justifyContent:'space-between',marginTop:40,paddingTop:24,borderTop:'1px solid '+C.border}}>
            <button onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step===1} style={{background:'none',border:'1px solid '+C.border,color:step===1?C.border:C.slate,borderRadius:8,padding:'12px 24px',fontSize:14,cursor:step===1?'default':'pointer'}}>← Back</button>
            {step===3
              ? <button onClick={assess} style={{background:C.gold,color:C.bg,border:'none',borderRadius:8,padding:'12px 32px',fontSize:14,fontWeight:700,cursor:'pointer'}}>Generate My Assessment →</button>
              : <button onClick={()=>setStep(s=>s+1)} style={{background:C.gold,color:C.bg,border:'none',borderRadius:8,padding:'12px 32px',fontSize:14,fontWeight:700,cursor:'pointer'}}>Continue →</button>
            }
          </div>
        )}
      </div>
    </div>
  );
}
