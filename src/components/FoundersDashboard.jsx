// FoundersDashboard.jsx
// CHC Corporate Financial Intelligence Center
// Restored by Script 25-G from Script 19 source — DO NOT hand edit
// Tabs: CHC Consolidated | CoreIdentity | CIAG | Client Portfolio

import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

const C = {
  bg:'#0a0e1a', surface:'#111827', border:'#1f2937',
  gold:'#d4a843', goldDim:'#92722d', blue:'#3b82f6',
  teal:'#14b8a6', red:'#ef4444', green:'#22c55e',
  slate:'#94a3b8', white:'#f1f5f9'
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CI_REV  = [78000,82000,88000,92000,98000,105000,112000,118000,122000,128000,135000,142000];
const CI_TGT  = [85000,90000,96000,102000,109000,116000,123000,130000,136000,142000,149000,156000];
const CI_COST = [21000,21500,22000,22500,23000,23500,24000,24500,25000,25500,26000,26500];
const CG_RET  = [48000,52000,54000,60000,66000,70000,72000,72000,78000,82000,85000,88000];
const CG_PROJ = [15000,22000,35000,28000,42000,38000,55000,48000,62000,58000,72000,65000];
const CG_REV  = CG_RET.map((r,i) => r + CG_PROJ[i]);
const CG_TGT  = [70000,78000,90000,92000,115000,112000,130000,125000,145000,145000,162000,158000];
const CG_COST = [38000,39000,40000,41000,42000,43000,44000,45000,46000,47000,48000,49000];
const CHC_REV  = CI_REV.map((r,i) => r + CG_REV[i]);
const CHC_TGT  = CI_TGT.map((t,i) => t + CG_TGT[i]);
const CHC_COST = CI_COST.map((c,i) => c + CG_COST[i]);
const CHC_PROF = CHC_REV.map((r,i) => r - CHC_COST[i]);

const CI_AGENTS = [
  {name:'Governance Policy Engine',  cat:'Core',           exec:14823},
  {name:'Compliance Monitor Alpha',  cat:'Compliance',     exec:9241 },
  {name:'Compliance Monitor Beta',   cat:'Compliance',     exec:8876 },
  {name:'Compliance Monitor Gamma',  cat:'Compliance',     exec:7654 },
  {name:'Sentinel Health Check',     cat:'Security',       exec:22410},
  {name:'Nexus Circuit Breaker',     cat:'Infrastructure', exec:3201 },
  {name:'SmartNation Telemetry',     cat:'Analytics',      exec:18904},
  {name:'API Gateway Agent',         cat:'Infrastructure', exec:31205},
  {name:'Rate Limiter Agent',        cat:'Infrastructure', exec:28941},
  {name:'Audit Trail Agent',         cat:'Compliance',     exec:12033},
  {name:'Alert & Notification',      cat:'Operations',     exec:4521 },
  {name:'Dashboard Analytics',       cat:'Analytics',      exec:8103 },
  {name:'Integration Health',        cat:'Infrastructure', exec:6782 },
  {name:'Security Posture Agent',    cat:'Security',       exec:5432 },
  {name:'SLA Enforcement Agent',     cat:'Operations',     exec:9871 },
];

const CG_AGENTS = [
  {name:'Client Assessment Agent',    cat:'Onboarding', exec:3204},
  {name:'Regulatory Mapping Agent',   cat:'Compliance', exec:2891},
  {name:'Compliance Gap Analyzer',    cat:'Compliance', exec:4102},
  {name:'Executive Report Generator', cat:'Reporting',  exec:1203},
  {name:'Risk Scoring Agent',         cat:'Risk',       exec:5671},
  {name:'Remediation Planner',        cat:'Operations', exec:2341},
  {name:'Client Portal Agent',        cat:'Delivery',   exec:8934},
  {name:'Engagement Tracker',         cat:'Operations', exec:1567},
];

const RETAINERS = [
  {client:'Meridian Wealth Partners LLC',     monthly:22000, started:'Mar 2025', frameworks:'GLBA · CCPA'    },
  {client:'Harbor Point Investment Group',    monthly:18000, started:'May 2025', frameworks:'GLBA · SOX'     },
  {client:'Pacific Crest Financial Services', monthly:28000, started:'Jun 2025', frameworks:'CCPA · PCI-DSS' },
  {client:'Summit Valley Bank',               monthly:20000, started:'Sep 2025', frameworks:'FFIEC · GLBA'   },
];

const PROJECTS = [
  {name:'AI Governance Readiness Assessment', client:'Westlake Regional CU',     value:85000,  pct:68},
  {name:'CCPA + GLBA Compliance Mapping',     client:'Meridian Wealth Partners', value:45000,  pct:82},
  {name:'Texas RAIGA Implementation Plan',    client:'Regional Bank Consortium', value:120000, pct:35},
];

const fmtK  = n => n >= 1000000 ? '$'+(n/1000000).toFixed(2)+'M' : '$'+(n/1000).toFixed(0)+'K';
const last  = arr => arr[arr.length-1];
const delta = (a,b) => ((a-b)/b*100).toFixed(1);

function buildTrend(rev, cost, tgt) {
  return MONTHS.map((m,i) => ({month:m, Revenue:rev[i], Costs:cost[i], Profit:rev[i]-cost[i], Target:tgt[i]}));
}
function buildVariance(rev, tgt) {
  return MONTHS.map((m,i) => ({month:m, Actual:rev[i], Target:tgt[i], Variance:rev[i]-tgt[i]}));
}

function MetricCard({label, value, sub, accent, trend}) {
  const tc = trend === undefined ? C.slate : trend >= 0 ? C.green : C.red;
  return (
    <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:'20px 24px',flex:1,minWidth:140}}>
      <div style={{color:C.slate,fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:8}}>{label}</div>
      <div style={{color:accent||C.gold,fontSize:28,fontWeight:700,fontFamily:'monospace'}}>{value}</div>
      {sub && <div style={{color:tc,fontSize:12,marginTop:6}}>{trend!==undefined&&(trend>=0?'▲ ':'▼ ')}{sub}</div>}
    </div>
  );
}

function SectionHeader({title}) {
  return <div style={{borderBottom:'1px solid '+C.border,paddingBottom:10,marginBottom:16,color:C.slate,fontSize:11,letterSpacing:'0.12em',textTransform:'uppercase'}}>{title}</div>;
}

function Pill({label, color}) {
  return <span style={{background:color+'22',color,border:'1px solid '+color+'44',borderRadius:4,fontSize:10,padding:'2px 8px',letterSpacing:'0.05em',fontWeight:600,textTransform:'uppercase'}}>{label}</span>;
}

function ProgressBar({value, color}) {
  return (
    <div style={{background:C.border,borderRadius:4,height:6,width:'100%',overflow:'hidden'}}>
      <div style={{width:value+'%',height:'100%',background:color||C.gold,borderRadius:4}}/>
    </div>
  );
}

function ChartTip({active, payload, label}) {
  if (!active||!payload?.length) return null;
  return (
    <div style={{background:'#1a2035',border:'1px solid '+C.border,borderRadius:6,padding:'10px 14px'}}>
      <div style={{color:C.slate,fontSize:11,marginBottom:6}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{color:p.color,fontSize:13,fontFamily:'monospace'}}>{p.name}: {fmtK(p.value)}</div>)}
    </div>
  );
}

function ConsolidatedView({viewMode}) {
  const curRev=last(CHC_REV),curCost=last(CHC_COST),curProf=last(CHC_PROF);
  const curMgn=Math.round(curProf/curRev*100);
  return (
    <div>
      <div style={{display:'flex',gap:12,marginBottom:24,flexWrap:'wrap'}}>
        <MetricCard label="Total MRR"  value={fmtK(curRev)}    sub={delta(curRev,CHC_REV[10])+'% MoM'}   trend={parseFloat(delta(curRev,CHC_REV[10]))} />
        <MetricCard label="ARR"        value={fmtK(curRev*12)} sub="Annualized run rate"                  accent={C.blue} />
        <MetricCard label="Net Profit" value={fmtK(curProf)}   sub={delta(curProf,CHC_PROF[10])+'% MoM'} trend={parseFloat(delta(curProf,CHC_PROF[10]))} accent={C.green} />
        <MetricCard label="Net Margin" value={curMgn+'%'}      sub="Blended CHC margin"                  accent={C.teal} />
        <MetricCard label="CHC Agents" value={CI_AGENTS.length+CG_AGENTS.length} sub="All governed (100%)" accent={C.gold} />
      </div>
      {viewMode==='trend' && (
        <>
          <SectionHeader title="12-Month Revenue · Costs · Profit"/>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={buildTrend(CHC_REV,CHC_COST,CHC_TGT)}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.gold} stopOpacity={0.2}/><stop offset="95%" stopColor={C.gold} stopOpacity={0}/></linearGradient>
                <linearGradient id="gProf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.2}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3"/>
              <XAxis dataKey="month" tick={{fill:C.slate,fontSize:11}}/>
              <YAxis tickFormatter={v=>'$'+(v/1000)+'K'} tick={{fill:C.slate,fontSize:11}}/>
              <Tooltip content={<ChartTip/>}/>
              <Legend wrapperStyle={{color:C.slate,fontSize:12}}/>
              <Area type="monotone" dataKey="Revenue" stroke={C.gold}  fill="url(#gRev)"  strokeWidth={2}/>
              <Area type="monotone" dataKey="Profit"  stroke={C.green} fill="url(#gProf)" strokeWidth={2}/>
              <Line type="monotone" dataKey="Costs"   stroke={C.red}   strokeWidth={1.5}  dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}
      {viewMode==='vs-targets' && (
        <>
          <SectionHeader title="Actuals vs Targets — Monthly Variance"/>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={buildVariance(CHC_REV,CHC_TGT)}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3"/>
              <XAxis dataKey="month" tick={{fill:C.slate,fontSize:11}}/>
              <YAxis tickFormatter={v=>'$'+(v/1000)+'K'} tick={{fill:C.slate,fontSize:11}}/>
              <Tooltip content={<ChartTip/>}/>
              <Legend wrapperStyle={{color:C.slate,fontSize:12}}/>
              <Bar dataKey="Target" fill={C.border} radius={[2,2,0,0]}/>
              <Bar dataKey="Actual" fill={C.gold}   radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
      {viewMode==='actuals' && (
        <>
          <SectionHeader title="Subsidiary P&L — Current Month"/>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,minWidth:580}}>
              <thead>
                <tr style={{borderBottom:'1px solid '+C.border}}>
                  {['Entity','Type','Revenue','Costs','Net Profit','Margin','Agents'].map(h=>(
                    <th key={h} style={{textAlign:'left',padding:'8px 12px',color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.08em',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{borderBottom:'1px solid '+C.border}}>
                  <td style={{padding:'12px',color:C.white,fontWeight:600}}>CoreIdentity</td>
                  <td style={{padding:'12px',color:C.slate}}>SaaS Platform</td>
                  <td style={{padding:'12px',color:C.gold,fontFamily:'monospace'}}>{fmtK(last(CI_REV))}</td>
                  <td style={{padding:'12px',color:C.red,fontFamily:'monospace'}}>{fmtK(last(CI_COST))}</td>
                  <td style={{padding:'12px',color:C.green,fontFamily:'monospace'}}>{fmtK(last(CI_REV)-last(CI_COST))}</td>
                  <td style={{padding:'12px',color:C.teal}}>{Math.round((last(CI_REV)-last(CI_COST))/last(CI_REV)*100)}%</td>
                  <td style={{padding:'12px',color:C.white}}>{CI_AGENTS.length}</td>
                </tr>
                <tr style={{borderBottom:'1px solid '+C.border}}>
                  <td style={{padding:'12px',color:C.white,fontWeight:600}}>CIAG</td>
                  <td style={{padding:'12px',color:C.slate}}>Advisory Group</td>
                  <td style={{padding:'12px',color:C.gold,fontFamily:'monospace'}}>{fmtK(last(CG_REV))}</td>
                  <td style={{padding:'12px',color:C.red,fontFamily:'monospace'}}>{fmtK(last(CG_COST))}</td>
                  <td style={{padding:'12px',color:C.green,fontFamily:'monospace'}}>{fmtK(last(CG_REV)-last(CG_COST))}</td>
                  <td style={{padding:'12px',color:C.teal}}>{Math.round((last(CG_REV)-last(CG_COST))/last(CG_REV)*100)}%</td>
                  <td style={{padding:'12px',color:C.white}}>{CG_AGENTS.length}</td>
                </tr>
                <tr style={{background:C.border+'33'}}>
                  <td style={{padding:'12px',color:C.gold,fontWeight:700}}>CHC Consolidated</td>
                  <td style={{padding:'12px',color:C.slate}}>Holding Company</td>
                  <td style={{padding:'12px',color:C.gold,fontFamily:'monospace',fontWeight:700}}>{fmtK(curRev)}</td>
                  <td style={{padding:'12px',color:C.red,fontFamily:'monospace',fontWeight:700}}>{fmtK(curCost)}</td>
                  <td style={{padding:'12px',color:C.green,fontFamily:'monospace',fontWeight:700}}>{fmtK(curProf)}</td>
                  <td style={{padding:'12px',color:C.teal,fontWeight:700}}>{curMgn}%</td>
                  <td style={{padding:'12px',color:C.white,fontWeight:700}}>{CI_AGENTS.length+CG_AGENTS.length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function CoreIdentityView({viewMode}) {
  const curRev=last(CI_REV),curCost=last(CI_COST),curProf=curRev-curCost;
  return (
    <div>
      <div style={{display:'flex',gap:12,marginBottom:24,flexWrap:'wrap'}}>
        <MetricCard label="MRR"        value={fmtK(curRev)}    sub={delta(curRev,CI_REV[10])+'% MoM'} trend={parseFloat(delta(curRev,CI_REV[10]))} />
        <MetricCard label="ARR"        value={fmtK(curRev*12)} sub="Platform run rate" accent={C.blue} />
        <MetricCard label="Net Profit" value={fmtK(curProf)}   sub={Math.round(curProf/curRev*100)+'% margin'} accent={C.green} />
        <MetricCard label="NRR"        value="118%"             sub="Net revenue retention" accent={C.teal} trend={18} />
        <MetricCard label="Customers"  value="8"                sub="Enterprise clients" accent={C.gold} />
        <MetricCard label="Agents"     value={CI_AGENTS.length} sub="100% governed" accent={C.gold} />
      </div>
      {viewMode==='trend' && (
        <>
          <SectionHeader title="CoreIdentity — 12-Month Revenue Trend"/>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={buildTrend(CI_REV,CI_COST,CI_TGT)}>
              <defs><linearGradient id="ciRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.blue} stopOpacity={0.3}/><stop offset="95%" stopColor={C.blue} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3"/>
              <XAxis dataKey="month" tick={{fill:C.slate,fontSize:11}}/>
              <YAxis tickFormatter={v=>'$'+(v/1000)+'K'} tick={{fill:C.slate,fontSize:11}}/>
              <Tooltip content={<ChartTip/>}/>
              <Legend wrapperStyle={{color:C.slate,fontSize:12}}/>
              <Area type="monotone" dataKey="Revenue" stroke={C.blue} fill="url(#ciRev)" strokeWidth={2}/>
              <Line type="monotone" dataKey="Target" stroke={C.slate} strokeWidth={1} strokeDasharray="4 4" dot={false}/>
              <Line type="monotone" dataKey="Costs"  stroke={C.red}  strokeWidth={1.5} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}
      {viewMode==='vs-targets' && (
        <>
          <SectionHeader title="CoreIdentity — Actuals vs Targets"/>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={buildVariance(CI_REV,CI_TGT)}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3"/>
              <XAxis dataKey="month" tick={{fill:C.slate,fontSize:11}}/>
              <YAxis tickFormatter={v=>'$'+(v/1000)+'K'} tick={{fill:C.slate,fontSize:11}}/>
              <Tooltip content={<ChartTip/>}/>
              <Legend wrapperStyle={{color:C.slate,fontSize:12}}/>
              <Bar dataKey="Target" fill={C.border} radius={[2,2,0,0]}/>
              <Bar dataKey="Actual" fill={C.blue}   radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
      <div style={{marginTop:24}}>
        <SectionHeader title={'Platform Agents ('+CI_AGENTS.length+' deployed · '+CI_AGENTS.length+' governed)'}/>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:480}}>
            <thead>
              <tr style={{borderBottom:'1px solid '+C.border}}>
                {['Agent','Category','Status','Executions','Governed'].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'8px 10px',color:C.slate,fontSize:10,textTransform:'uppercase',letterSpacing:'0.08em'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CI_AGENTS.map((a,i)=>(
                <tr key={i} style={{borderBottom:'1px solid '+C.border+'66'}}>
                  <td style={{padding:'10px',color:C.white}}>{a.name}</td>
                  <td style={{padding:'10px',color:C.slate}}>{a.cat}</td>
                  <td style={{padding:'10px'}}><Pill label="Active" color={C.green}/></td>
                  <td style={{padding:'10px',color:C.gold,fontFamily:'monospace'}}>{a.exec.toLocaleString()}</td>
                  <td style={{padding:'10px'}}><Pill label="Yes" color={C.teal}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CIAGView({viewMode}) {
  const curRev=last(CG_REV),curCost=last(CG_COST),curProf=curRev-curCost;
  const pipeline=PROJECTS.reduce((s,p)=>s+p.value,0);
  return (
    <div>
      <div style={{display:'flex',gap:12,marginBottom:24,flexWrap:'wrap'}}>
        <MetricCard label="Total Revenue"    value={fmtK(curRev)}          sub={delta(curRev,CG_REV[10])+'% MoM'} trend={parseFloat(delta(curRev,CG_REV[10]))} />
        <MetricCard label="Retainer MRR"     value={fmtK(last(CG_RET))}    sub="4 active retainers" accent={C.blue} />
        <MetricCard label="Project Revenue"  value={fmtK(last(CG_PROJ))}   sub="3 active projects"  accent={C.teal} />
        <MetricCard label="Net Profit"       value={fmtK(curProf)}          sub={Math.round(curProf/curRev*100)+'% margin'} accent={C.green} />
        <MetricCard label="Project Pipeline" value={fmtK(pipeline)}         sub="Total contracted"   accent={C.gold} />
      </div>
      {viewMode==='trend' && (
        <>
          <SectionHeader title="CIAG — 12-Month Revenue Trend (Retainers + Projects)"/>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={buildTrend(CG_REV,CG_COST,CG_TGT)}>
              <defs><linearGradient id="cgRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.teal} stopOpacity={0.3}/><stop offset="95%" stopColor={C.teal} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3"/>
              <XAxis dataKey="month" tick={{fill:C.slate,fontSize:11}}/>
              <YAxis tickFormatter={v=>'$'+(v/1000)+'K'} tick={{fill:C.slate,fontSize:11}}/>
              <Tooltip content={<ChartTip/>}/>
              <Legend wrapperStyle={{color:C.slate,fontSize:12}}/>
              <Area type="monotone" dataKey="Revenue" stroke={C.teal} fill="url(#cgRev)" strokeWidth={2}/>
              <Line type="monotone" dataKey="Target"  stroke={C.slate} strokeWidth={1} strokeDasharray="4 4" dot={false}/>
              <Line type="monotone" dataKey="Costs"   stroke={C.red}  strokeWidth={1.5} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}
      {viewMode==='vs-targets' && (
        <>
          <SectionHeader title="CIAG — Actuals vs Targets"/>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={buildVariance(CG_REV,CG_TGT)}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3"/>
              <XAxis dataKey="month" tick={{fill:C.slate,fontSize:11}}/>
              <YAxis tickFormatter={v=>'$'+(v/1000)+'K'} tick={{fill:C.slate,fontSize:11}}/>
              <Tooltip content={<ChartTip/>}/>
              <Legend wrapperStyle={{color:C.slate,fontSize:12}}/>
              <Bar dataKey="Target" fill={C.border} radius={[2,2,0,0]}/>
              <Bar dataKey="Actual" fill={C.teal}   radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginTop:24}}>
        <div>
          <SectionHeader title="Active Retainers (4)"/>
          {RETAINERS.map((r,i)=>(
            <div key={i} style={{background:C.surface,border:'1px solid '+C.border,borderRadius:6,padding:'12px 16px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{color:C.white,fontSize:13,fontWeight:500,marginBottom:4}}>{r.client}</div>
                <div style={{color:C.gold,fontFamily:'monospace',fontWeight:600,whiteSpace:'nowrap',marginLeft:8}}>{fmtK(r.monthly)}<span style={{color:C.slate,fontWeight:400}}>/mo</span></div>
              </div>
              <div style={{color:C.slate,fontSize:11}}>{r.frameworks} · Since {r.started}</div>
            </div>
          ))}
        </div>
        <div>
          <SectionHeader title="Active Projects (3)"/>
          {PROJECTS.map((p,i)=>(
            <div key={i} style={{background:C.surface,border:'1px solid '+C.border,borderRadius:6,padding:'12px 16px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                <div style={{color:C.white,fontSize:12,fontWeight:500,maxWidth:'70%'}}>{p.name}</div>
                <div style={{color:C.gold,fontFamily:'monospace',fontWeight:600}}>{fmtK(p.value)}</div>
              </div>
              <div style={{color:C.slate,fontSize:11,marginBottom:8}}>{p.client}</div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <ProgressBar value={p.pct} color={p.pct>70?C.green:p.pct>40?C.gold:C.blue}/>
                <span style={{color:C.slate,fontSize:11,whiteSpace:'nowrap'}}>{p.pct}%</span>
              </div>
            </div>
          ))}
          <div style={{marginTop:16}}>
            <SectionHeader title={'Advisory Agents ('+CG_AGENTS.length+')'}/>
            {CG_AGENTS.map((a,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid '+C.border+'44',fontSize:12}}>
                <span style={{color:C.white}}>{a.name}</span>
                <span style={{color:C.gold,fontFamily:'monospace'}}>{a.exec.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientPortfolioView() {
  return (
    <div>
      <div style={{display:'flex',gap:12,marginBottom:24,flexWrap:'wrap'}}>
        <MetricCard label="Client Accounts"   value="1"      sub="Pilot client onboarded"     accent={C.gold}  />
        <MetricCard label="Agents Governed"   value="23"     sub="100% of client agents"       accent={C.green} />
        <MetricCard label="Penalty Mitigated" value="$4.75M" sub="First National Virtual Bank" accent={C.teal}  trend={100} />
        <MetricCard label="Compliance Lift"   value="+29pts" sub="65% to 94% overall score"    accent={C.blue}  trend={29}  />
      </div>
      <SectionHeader title="Client: First National Virtual Bank"/>
      <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:24,marginBottom:24}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:24,marginBottom:24}}>
          <div>
            <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Client Details</div>
            <div style={{color:C.white,marginBottom:4}}>First National Virtual Bank</div>
            <div style={{color:C.slate,fontSize:12}}>Financial Services</div>
            <div style={{color:C.slate,fontSize:12}}>Total Assets: $95.1M</div>
            <div style={{color:C.slate,fontSize:12}}>Onboarded: Feb 2026</div>
          </div>
          <div>
            <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Compliance Score</div>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
              <span style={{color:C.red,fontFamily:'monospace',fontSize:22,fontWeight:700}}>65%</span>
              <span style={{color:C.slate}}>→</span>
              <span style={{color:C.green,fontFamily:'monospace',fontSize:22,fontWeight:700}}>94%</span>
            </div>
            <ProgressBar value={94} color={C.green}/>
          </div>
          <div>
            <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>AI Agents</div>
            <div style={{color:C.white,fontSize:22,fontWeight:700,fontFamily:'monospace',marginBottom:4}}>23<span style={{color:C.slate,fontSize:13}}>/23 governed</span></div>
            <Pill label="Fully Governed" color={C.green}/>
          </div>
        </div>
        <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Regulatory Frameworks</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {['GLBA','CCPA','FFIEC','SOX','PCI-DSS'].map(f=><Pill key={f} label={f} color={C.blue}/>)}
        </div>
      </div>
      <div style={{background:C.surface,border:'1px solid '+C.goldDim,borderRadius:8,padding:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
        <div>
          <div style={{color:C.gold,fontSize:12,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:6}}>Regulatory Penalty Exposure Mitigated</div>
          <div style={{color:C.white,fontSize:13}}>CCPA violations ($2,500–$7,500 each) · GLBA ($1M/day) · FFIEC regulatory action risk</div>
        </div>
        <div style={{color:C.gold,fontFamily:'monospace',fontSize:36,fontWeight:700,whiteSpace:'nowrap'}}>$4.75M</div>
      </div>
    </div>
  );
}

export default function FoundersDashboard() {
  const [tab,      setTab]      = useState('consolidated');
  const [viewMode, setViewMode] = useState('actuals');

  const TABS  = [
    {id:'consolidated', label:'CHC Consolidated'},
    {id:'coreidentity', label:'CoreIdentity'},
    {id:'ciag',         label:'CIAG'},
    {id:'clients',      label:'Client Portfolio'},
  ];
  const VIEWS = [
    {id:'actuals',    label:'Actuals'},
    {id:'vs-targets', label:'vs Targets'},
    {id:'trend',      label:'12-Month Trend'},
  ];

  const curRev=last(CHC_REV), curProf=last(CHC_PROF);
  const now=new Date().toLocaleString('en-US',{month:'short',year:'numeric'});

  return (
    <div style={{background:C.bg,minHeight:'100vh',color:C.white,fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',overflowX:'hidden'}}>
      <div style={{borderBottom:'1px solid '+C.border,padding:'18px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:10,color:C.slate,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:4}}>Core Holding Corp</div>
          <div style={{fontSize:20,fontWeight:600,color:C.white}}>Founders Dashboard</div>
        </div>
        <div style={{display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{textAlign:'right'}}>
            <div style={{color:C.slate,fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase'}}>CHC Monthly Revenue</div>
            <div style={{color:C.gold,fontFamily:'monospace',fontSize:20,fontWeight:700}}>{fmtK(curRev)}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{color:C.slate,fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase'}}>Net Profit</div>
            <div style={{color:C.green,fontFamily:'monospace',fontSize:20,fontWeight:700}}>{fmtK(curProf)}</div>
          </div>
          <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:6,padding:'6px 14px',color:C.slate,fontSize:12}}>{now}</div>
        </div>
      </div>
      <div style={{borderBottom:'1px solid '+C.border,padding:'0 24px',display:'flex',overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:'none',border:'none',cursor:'pointer',padding:'14px 20px',fontSize:13,fontWeight:500,whiteSpace:'nowrap',color:tab===t.id?C.gold:C.slate,borderBottom:tab===t.id?'2px solid '+C.gold:'2px solid transparent',transition:'color 0.15s'}}>{t.label}</button>
        ))}
      </div>
      <div style={{padding:'16px 24px',display:'flex',justifyContent:'flex-end',borderBottom:'1px solid '+C.border+'55'}}>
        <div style={{display:'flex',background:C.surface,border:'1px solid '+C.border,borderRadius:6,overflow:'hidden'}}>
          {VIEWS.map(v=>(
            <button key={v.id} onClick={()=>setViewMode(v.id)} style={{background:viewMode===v.id?C.border:'none',border:'none',cursor:'pointer',padding:'6px 14px',fontSize:12,color:viewMode===v.id?C.white:C.slate,transition:'all 0.15s',whiteSpace:'nowrap'}}>{v.label}</button>
          ))}
        </div>
      </div>
      <div style={{padding:'28px 24px'}}>
        {tab==='consolidated' && <ConsolidatedView viewMode={viewMode}/>}
        {tab==='coreidentity' && <CoreIdentityView viewMode={viewMode}/>}
        {tab==='ciag'         && <CIAGView         viewMode={viewMode}/>}
        {tab==='clients'      && <ClientPortfolioView/>}
      </div>
    </div>
  );
}
