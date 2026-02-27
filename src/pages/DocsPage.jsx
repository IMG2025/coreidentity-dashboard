import { useState, useEffect } from 'react';
import { C, F } from '../chc-design.js';

const ENDPOINTS = [
  {method:'POST', path:'/api/agents/execute',          auth:true,  group:'Execution', desc:'Dispatch a governed agent execution through the Sentinel policy gate.',
   body:'{"clientId":"bank","agentId":"b-01","task":"fraud-detection","payload":{"transactionId":"TXN-001"}}',
   response:'{"success":true,"data":{"executionId":"exec-…","governanceScore":97,"governanceToken":"gov-…","policyChecks":[…],"result":{…},"totalLatencyMs":142,"complianceStatus":"PASSED","auditTrail":true}}'},
  {method:'GET',  path:'/api/agents/execute/executions',auth:true,  group:'Execution', desc:'Retrieve the governed execution audit log.',
   params:[{name:'limit',type:'integer',default:'50',desc:'Max results (max 200)'},{name:'clientId',type:'string',default:'',desc:'Filter by client: bank|health|retail|legal'}],
   response:'{"success":true,"total":248,"count":50,"data":[{…}]}'},
  {method:'GET',  path:'/api/agents/execute/stats',    auth:true,  group:'Execution', desc:'Aggregate governance stats across all clients.',
   response:'{"success":true,"totalExecutions":248,"avgGovernanceScore":94,"byClient":{"bank":{…},"health":{…}}}'},
  {method:'GET',  path:'/api/telemetry/executions',    auth:true,  group:'Telemetry', desc:'Live telemetry execution feed from the in-memory ring buffer.',
   params:[{name:'limit',type:'integer',default:'100',desc:'Max results (max 200)'},{name:'clientId',type:'string',default:'',desc:'Filter by client ID'}]},
  {method:'GET',  path:'/api/telemetry/stats',         auth:true,  group:'Telemetry', desc:'Cross-client governance statistics and sync history.'},
  {method:'POST', path:'/api/telemetry/ingest',        auth:true,  group:'Telemetry', desc:'Ingest telemetry from external sources or GCP services.',
   body:'{"source":"MY_SYSTEM","executions":[{"agentId":"b-01","task":"fraud-detection","governanceScore":95,"executedAt":"2026-02-27T00:00:00Z"}],"syncType":"PUSH"}'},
  {method:'GET',  path:'/api/live-data',               auth:true,  group:'Platform',  desc:'Aggregate live data from all 5 GCP services in a single request. Used by the Founders Dashboard.'},
  {method:'POST', path:'/api/commercial/assess',       auth:false, group:'Commercial',desc:'Generate an instant governance assessment for a prospect.',
   body:'{"industry":"Healthcare","agentCount":18,"currentScore":58,"company":"Acme Hospital","email":"ciso@acme.com"}'},
  {method:'GET',  path:'/api/commercial/pricing',      auth:false, group:'Commercial',desc:'Current pricing tiers and configuration.'},
  {method:'GET',  path:'/api/commercial/report/:client',auth:true, group:'Commercial',desc:'Executive governance report for a client. :client = bank|health|retail|legal'},
];

const GROUPS = ['Execution','Telemetry','Platform','Commercial'];
const METHOD_COLOR = {GET:C.green, POST:C.blue, PUT:C.orange, DELETE:C.red};

export default function DocsPage() {
  const [group,    setGroup]    = useState('Execution');
  const [open,     setOpen]     = useState(null);
  const [endpoints, setEndpoints] = useState(ENDPOINTS);
  const [tryRes,   setTryRes]   = useState({});
  const [trying,   setTrying]   = useState(null);

  useEffect(() => {
    fetch('/api/commercial/docs')
      .then(r => r.json())
      .then(j => {
        if (j.endpoints) {
          // Merge live endpoint count
        }
      }).catch(() => {});
  }, []);

  const tryEndpoint = async (ep) => {
    if (!ep.body) return;
    setTrying(ep.path);
    try {
      let body; try { body = JSON.parse(ep.body); } catch(e) { body = {}; }
      // For POST /api/commercial/assess, always allowed
      const r    = await fetch(ep.path, { method: ep.method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const json = await r.json();
      setTryRes(prev => ({...prev, [ep.path]: JSON.stringify(json, null, 2).slice(0, 800)}));
    } catch(e) {
      setTryRes(prev => ({...prev, [ep.path]: '// Error: ' + e.message}));
    } finally { setTrying(null); }
  };

  const filtered = endpoints.filter(e => e.group === group);

  return (
    <div style={{background:C.bg,minHeight:'100vh',overflowX:'hidden',maxWidth:'100vw',overflowX:'hidden',maxWidth:'100vw',color:C.white,fontFamily:F.body}}>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'60px 40px'}}>
        <div style={{color:C.gold,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:12}}>API Documentation</div>
        <h1 style={{fontFamily:F.display,fontSize:52,color:C.white,margin:'0 0 12px',letterSpacing:'0.04em'}}>COREIDENTITY API</h1>
        <p style={{color:C.slate,fontSize:16,fontWeight:300,marginBottom:12}}>Version 1.0.0 · REST + JSON · Base URL: <span style={{fontFamily:F.mono,color:C.teal}}>/api</span></p>

        {/* Auth note */}
        <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:'16px 20px',marginBottom:36,display:'flex',gap:12,alignItems:'flex-start'}}>
          <div style={{color:C.gold,fontSize:16,flexShrink:0}}>🔑</div>
          <div>
            <div style={{color:C.white,fontSize:13,fontWeight:600,marginBottom:4}}>Authentication</div>
            <div style={{color:C.slate,fontSize:13}}>Protected endpoints require an API key via the <span style={{fontFamily:F.mono,color:C.teal}}>x-api-key</span> request header. Obtain your key from the settings panel after account creation. Endpoints marked <span style={{background:C.green+'22',color:C.green,borderRadius:3,fontSize:11,padding:'1px 6px'}}>PUBLIC</span> do not require authentication.</div>
          </div>
        </div>

        {/* Group tabs */}
        <div style={{display:'flex',gap:4,borderBottom:'1px solid '+C.border,marginBottom:32}}>
          {GROUPS.map(g => (
            <button key={g} onClick={()=>setGroup(g)} style={{background:'none',border:'none',cursor:'pointer',padding:'10px 18px',fontSize:13,fontWeight:500,color:group===g?C.gold:C.slate,borderBottom:'2px solid '+(group===g?C.gold:'transparent'),transition:'color 0.15s'}}>
              {g} <span style={{color:C.border,fontSize:11}}>({endpoints.filter(e=>e.group===g).length})</span>
            </button>
          ))}
        </div>

        {/* Endpoints */}
        {filtered.map((ep,i) => {
          const isOpen = open === ep.path;
          return (
            <div key={i} style={{border:'1px solid '+C.border,borderRadius:8,marginBottom:8,overflow:'hidden'}}>
              <div onClick={()=>setOpen(isOpen?null:ep.path)} style={{padding:'14px 20px',cursor:'pointer',display:'flex',gap:14,alignItems:'center',background:isOpen?C.surface:C.bg}}>
                <span style={{background:METHOD_COLOR[ep.method]+'22',color:METHOD_COLOR[ep.method],border:'1px solid '+METHOD_COLOR[ep.method]+'44',borderRadius:4,fontSize:11,padding:'3px 10px',fontWeight:700,minWidth:44,textAlign:'center'}}>{ep.method}</span>
                <span style={{fontFamily:F.mono,color:C.white,fontSize:13,flex:1}}>{ep.path}</span>
                <span style={{background:ep.auth?C.border:C.green+'22',color:ep.auth?C.slate:C.green,border:'1px solid '+(ep.auth?C.border:C.green+'44'),borderRadius:4,fontSize:10,padding:'2px 8px'}}>{ep.auth?'AUTH REQUIRED':'PUBLIC'}</span>
                <span style={{color:C.border,fontSize:18,transition:'transform 0.2s',transform:isOpen?'rotate(90deg)':'none'}}>›</span>
              </div>
              {isOpen && (
                <div style={{padding:'20px 24px',background:C.surface,borderTop:'1px solid '+C.border}}>
                  <div style={{color:C.slate,fontSize:14,marginBottom:20,lineHeight:1.6}}>{ep.desc}</div>
                  {ep.params && ep.params.length > 0 && (
                    <div style={{marginBottom:20}}>
                      <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:10}}>Query Parameters</div>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                        <thead><tr style={{borderBottom:'1px solid '+C.border}}>{['Param','Type','Default','Description'].map(h=><th key={h} style={{textAlign:'left',padding:'6px 12px',color:C.slate,fontSize:10,textTransform:'uppercase',letterSpacing:'0.08em'}}>{h}</th>)}</tr></thead>
                        <tbody>{ep.params.map((p,j)=><tr key={j} style={{borderBottom:'1px solid '+C.border+'44'}}><td style={{padding:'8px 12px',fontFamily:F.mono,color:C.teal,fontSize:12}}>{p.name}</td><td style={{padding:'8px 12px',color:C.slate,fontSize:12}}>{p.type}</td><td style={{padding:'8px 12px',fontFamily:F.mono,color:C.slate,fontSize:12}}>{p.default||'—'}</td><td style={{padding:'8px 12px',color:C.slate,fontSize:12}}>{p.desc}</td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
                  {ep.body && (
                    <div style={{marginBottom:16}}>
                      <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>Request Body</div>
                      <pre style={{background:C.bg,borderRadius:6,padding:'14px 16px',color:C.teal,fontFamily:F.mono,fontSize:12,overflow:'auto',margin:0}}>{ep.body}</pre>
                    </div>
                  )}
                  {ep.response && (
                    <div style={{marginBottom:16}}>
                      <div style={{color:C.slate,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>Example Response</div>
                      <pre style={{background:C.bg,borderRadius:6,padding:'14px 16px',color:C.green,fontFamily:F.mono,fontSize:11,overflow:'auto',margin:0}}>{ep.response}</pre>
                    </div>
                  )}
                  {(ep.method==='POST' && ep.body && !ep.auth) && (
                    <div>
                      <button onClick={()=>tryEndpoint(ep)} disabled={trying===ep.path} style={{background:trying===ep.path?C.border:C.blue+'22',border:'1px solid '+C.blue+'66',color:trying===ep.path?C.slate:C.blue,borderRadius:6,padding:'8px 18px',fontSize:12,cursor:trying===ep.path?'wait':'pointer',fontWeight:600,marginBottom:12}}>
                        {trying===ep.path?'⏳ Calling…':'▶ Try it Live'}
                      </button>
                      {tryRes[ep.path] && <pre style={{background:C.bg,borderRadius:6,padding:'14px 16px',color:C.green,fontFamily:F.mono,fontSize:11,overflow:'auto',margin:0}}>{tryRes[ep.path]}</pre>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* SDK note */}
        <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:8,padding:24,marginTop:40}}>
          <div style={{color:C.gold,fontFamily:F.display,fontSize:18,letterSpacing:'0.06em',marginBottom:10}}>SDK + LIBRARIES</div>
          <div style={{color:C.slate,fontSize:14,lineHeight:1.7}}>Native Node.js clients available for each GCP service integration. Each client includes <span style={{fontFamily:F.mono,color:C.teal}}>withRetry()</span> wrapper (3 attempts, exponential backoff), 10s timeout, and structured error responses. Contact <a href="mailto:api@coreholdingcorp.com" style={{color:C.gold,textDecoration:'none'}}>api@coreholdingcorp.com</a> for SDK documentation.</div>
        </div>
      </div>
    </div>
  );
}
