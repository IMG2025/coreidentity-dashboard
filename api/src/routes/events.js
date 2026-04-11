'use strict';
const express  = require('express');
const router   = express.Router();
const Sentinel = require('../sentinel');
const { authenticate } = require('../middleware/auth');
const ACTION_MAP = { TASK_TYPE_POLICY_VIOLATION:'DROP', POLICY_ENFORCED_PASS:'ALLOW', KILL_SWITCH_ACTIVATED:'TERMINATE', APPROVAL_REQUIRED:'ESCALATE', POLICY_VIOLATION:'DROP', ANOMALY_DETECTED:'FLAG' };
const OUTCOME_MAP = { TASK_TYPE_POLICY_VIOLATION:'BLOCKED', POLICY_ENFORCED_PASS:'PERMITTED', KILL_SWITCH_ACTIVATED:'TERMINATED', APPROVAL_REQUIRED:'PENDING_REVIEW', POLICY_VIOLATION:'BLOCKED', ANOMALY_DETECTED:'FLAGGED' };
const POLICY_NAME_MAP = { TASK_TYPE_POLICY_VIOLATION:'Task Authorization Policy', POLICY_ENFORCED_PASS:'Governance Enforcement Policy', KILL_SWITCH_ACTIVATED:'Emergency Termination Policy', APPROVAL_REQUIRED:'Human-in-Loop Escalation Policy', POLICY_VIOLATION:'Identity Boundary Policy', ANOMALY_DETECTED:'Behavioral Anomaly Detection' };
const SEVERITY_RANK = { CRITICAL:4, HIGH:3, MEDIUM:2, LOW:1, INFO:0 };
function generateNarrative(e) {
  const agent=e.agentName||e.agentId||'Unknown agent', task=e.taskType||'unknown task', tier=e.tierId||'TIER_2';
  const t={ TASK_TYPE_POLICY_VIOLATION:agent+' attempted unauthorized '+task+' operation. '+tier+' policy enforcement blocked execution. Identity boundary maintained.', POLICY_ENFORCED_PASS:agent+' '+task+' operation validated against governance policy. Execution authorized within '+tier+' constraints.', KILL_SWITCH_ACTIVATED:'Emergency termination activated for '+agent+'. All active sessions revoked. Audit trail preserved.', APPROVAL_REQUIRED:agent+' '+task+' request requires human review. Escalated to governance queue pending authorization.', ANOMALY_DETECTED:'Behavioral anomaly detected for '+agent+'. Activity pattern deviates from '+tier+' baseline. Flagged for review.' };
  return t[e.eventType]||(ACTION_MAP[e.eventType]||'FLAG')+' enforcement action taken for '+agent+'.';
}
function normalizeEvent(raw) {
  const action=ACTION_MAP[raw.eventType]||'FLAG', outcome=OUTCOME_MAP[raw.eventType]||'FLAGGED', policy=POLICY_NAME_MAP[raw.eventType]||'Governance Policy';
  let meta={};
  try{ meta=typeof raw.metadata==='string'?JSON.parse(raw.metadata):(raw.metadata||{}); }catch(_){}
  return { event_id:raw.eventId||raw.event_id, timestamp:raw.timestamp, source:raw.source||'SENTINEL_OS', type:raw.eventType||'GOVERNANCE_EVENT', identity:{ agent_id:meta.agentId||raw.agentId||'unknown', agent_name:meta.agentName||raw.agentName||'Unknown Agent', user_id:meta.userId||raw.userId||'system', role:meta.role||raw.role||'AGENT', tier:meta.tierId||raw.tierId||'TIER_2' }, action, resource:meta.resource||'governance-engine', policy_id:raw.tierId||'GOV-001', policy_name:policy, outcome, severity:raw.severity||'INFO', trace_id:raw.eventId||raw.event_id, narrative:generateNarrative(Object.assign({},raw,meta)), raw_type:raw.eventType, is_threat:['DROP','TERMINATE','FLAG'].includes(action), is_critical:(SEVERITY_RANK[raw.severity]||0)>=3 };
}
router.get('/recent', authenticate, async (req,res) => { try { const limit=Math.min(parseInt(req.query.limit)||20,100); const raw=await Sentinel.getSecurityEvents(limit,null); res.json({success:true,count:raw.length,data:raw.map(normalizeEvent),fetchedAt:new Date().toISOString()}); } catch(err){ res.status(500).json({error:err.message}); } });
router.get('/threats', authenticate, async (req,res) => { try { const raw=await Sentinel.getSecurityEvents(100,null); const events=raw.map(normalizeEvent).filter(e=>e.is_threat||e.is_critical); res.json({success:true,count:events.length,data:events,fetchedAt:new Date().toISOString()}); } catch(err){ res.status(500).json({error:err.message}); } });
router.get('/summary', authenticate, async (req,res) => { try { const raw=await Sentinel.getSecurityEvents(200,null); const events=raw.map(normalizeEvent); res.json({success:true,data:{total:events.length,blocked:events.filter(e=>e.action==='DROP').length,permitted:events.filter(e=>e.action==='ALLOW').length,critical:events.filter(e=>e.is_critical).length,threats:events.filter(e=>e.is_threat).length,latest:events[0]||null,fetchedAt:new Date().toISOString()}}); } catch(err){ res.status(500).json({error:err.message}); } });
router.get('/stream', authenticate, (req,res) => { res.setHeader('Content-Type','text/event-stream'); res.setHeader('Cache-Control','no-cache'); res.setHeader('Connection','keep-alive'); res.flushHeaders(); let lastEventId=null; async function poll(){ try{ const raw=await Sentinel.getSecurityEvents(5,null); const events=raw.map(normalizeEvent); for(const event of events){ if(event.event_id===lastEventId) break; res.write('data: '+JSON.stringify(event)+'\n\n'); } if(events.length>0) lastEventId=events[0].event_id; }catch(_){} } poll(); const interval=setInterval(poll,5000); req.on('close',()=>{ clearInterval(interval); res.end(); }); });
module.exports = router;
