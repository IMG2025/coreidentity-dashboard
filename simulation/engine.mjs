import fetch from 'node-fetch';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { createHash, randomBytes } from 'crypto';

const API     = process.env.API_URL      || 'https://api.coreidentitygroup.com';
const MCP_URL = process.env.MCP_URL      || 'https://chc-mcp-server-lvuq2yqbma-ue.a.run.app';
const MCP_KEY = process.env.MCP_KEY      || 'ci-mcp-0fd7c746897385efff1aac560d0157d9';
const EMAIL   = process.env.SIM_EMAIL    || 'tmorgan@coreidentitygroup.com';
const PASS    = process.env.SIM_PASSWORD || 'CoreIdentity2026!';
const REGION  = process.env.AWS_REGION   || 'us-east-2';

const db = DynamoDBDocument.from(new DynamoDB({ region: REGION }));
let TOKEN = null, TOKEN_TS = 0;
const states = {};

function log(tag, msg) { console.log('[' + new Date().toISOString().slice(11,19) + '] [' + tag.padEnd(8) + '] ' + msg); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getToken() {
  if (TOKEN && Date.now() - TOKEN_TS < 55*60*1000) return TOKEN;
  try {
    const r = await fetch(API + '/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:EMAIL,password:PASS}) });
    const d = await r.json();
    TOKEN = d && d.data && d.data.token ? d.data.token : null;
    TOKEN_TS = Date.now();
    if (TOKEN) log('AUTH','Token refreshed');
    return TOKEN;
  } catch(e) { log('AUTH','Error: ' + e.message); return null; }
}

async function execAPI(agentId, taskType, companyId) {
  const token = await getToken();
  if (!token) return null;
  const t0 = Date.now();
  try {
    const r = await fetch(API + '/api/execute/' + agentId + '/execute', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body: JSON.stringify({taskType, inputs:{companyId,simulated:true,source:'sim-engine-v1'}})
    });
    const d = await r.json();
    return Object.assign({}, d, {latencyMs:Date.now()-t0, via:'api'});
  } catch(e) { return {success:false,error:e.message,latencyMs:Date.now()-t0,via:'api'}; }
}

async function execMCP(agentId, taskType, companyId) {
  const t0 = Date.now();
  try {
    const r = await fetch(MCP_URL + '/mcp', {
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json, text/event-stream','x-api-key':MCP_KEY},
      body: JSON.stringify({jsonrpc:'2.0',id:Date.now(),method:'tools/call',params:{name:'executor_dispatch',arguments:{agent_id:agentId,task_type:taskType,payload:{companyId,source:'sim-mcp-v1'}}}})
    });
    const text = await r.text();
    let success = false;
    if (text.includes('data:')) {
      for (const line of text.split('\n')) {
        if (line.startsWith('data:')) {
          try { const p = JSON.parse(line.slice(5).trim()); if (p.result) { success = true; break; } } catch(_) {}
        }
      }
    }
    return {success, latencyMs:Date.now()-t0, via:'mcp'};
  } catch(e) { return {success:false,error:e.message,latencyMs:Date.now()-t0,via:'mcp'}; }
}

async function record(companyId, agentId, agentName, taskType, result, riskTier) {
  const execId = companyId + '-' + Date.now() + '-' + randomBytes(3).toString('hex');
  const now = new Date().toISOString();
  const state = states[companyId] || {score:60};

  try {
    await db.put({TableName:'tenant-executions',Item:{companyId,executionId:execId,agentId,agentName:agentName||agentId,taskType,success:result.success===true,riskTier:riskTier||'TIER_2',latencyMs:result.latencyMs||0,via:result.via||'api',timestamp:now,proofPackId:createHash('sha256').update(execId).digest('hex').slice(0,16)}});

    if (!result.success) {
      await db.put({TableName:'tenant-events',Item:{companyId,eventId:'EVT-'+randomBytes(4).toString('hex'),type:'violation',agentId,agentName:agentName||agentId,description:'Policy violation during '+taskType+' — governance threshold exceeded',severity:riskTier==='TIER_1'?'high':'medium',timestamp:now,resolved:false,executionId:execId}});
    }

    const delta = result.success ? (Math.random()*0.3+0.05) : -(Math.random()*3.5+1.5);
    state.score = Math.max(25, Math.min(98, state.score + delta));
    states[companyId] = state;

    await db.put({TableName:'tenant-governance',Item:{companyId,timestamp:now,score:parseFloat(state.score.toFixed(2)),delta:parseFloat(delta.toFixed(2)),reason:result.success?'execution_pass':'violation'}});
    await db.update({TableName:'tenant-companies',Key:{clientId:companyId},UpdateExpression:'ADD totalExecutions :e, totalViolations :v SET lastActivityAt=:t, governanceScore=:s',ExpressionAttributeValues:{':e':1,':v':result.success?0:1,':t':now,':s':parseFloat(state.score.toFixed(1))}});
  } catch(e) { log('RECORD','Error: '+e.message); }
}

async function loadCompanies() {
  let items=[], lastKey;
  do {
    const p = {TableName:'tenant-companies'};
    if (lastKey) p.ExclusiveStartKey = lastKey;
    const r = await db.scan(p);
    items = items.concat(r.Items||[]);
    lastKey = r.LastEvaluatedKey;
  } while(lastKey);
  return items.filter(c => c.status === 'active');
}

async function loadAgents(companyId) {
  let items=[], lastKey;
  do {
    const p = {TableName:'tenant-agents',KeyConditionExpression:'companyId = :c',ExpressionAttributeValues:{':c':companyId}};
    if (lastKey) p.ExclusiveStartKey = lastKey;
    const r = await db.query(p);
    items = items.concat(r.Items||[]);
    lastKey = r.LastEvaluatedKey;
  } while(lastKey);
  return items;
}

async function runCompany(company, agents) {
  const {clientId,execIntervalSec=150,governanceScore=60} = company;
  states[clientId] = {score:parseFloat(governanceScore)||60};
  log(clientId,'Started | '+agents.length+' agents | '+execIntervalSec+'s interval');
  const tasks = ['ANALYZE','ANALYZE','ANALYZE','EXECUTE','EXECUTE','ESCALATE'];

  while (true) {
    try {
      const agent = agents[Math.floor(Math.random()*agents.length)];
      if (!agent) { await sleep(5000); continue; }
      const task = tasks[Math.floor(Math.random()*tasks.length)];
      const useMCP = Math.random() < 0.40;
      const result = useMCP ? await execMCP(agent.agentId, task, clientId) : await execAPI(agent.agentId, task, clientId);
      if (result) {
        await record(clientId, agent.agentId, agent.agentName, task, result, agent.riskTier);
        const icon = result.success ? 'OK' : 'FAIL';
        log(clientId.slice(3), icon+' '+task+' '+(useMCP?'MCP':'API')+' '+agent.agentId+' score:'+states[clientId].score.toFixed(1)+' '+result.latencyMs+'ms');
      }
    } catch(e) { log(clientId,'Loop error: '+e.message); }
    const jitter = Math.floor(Math.random()*60)-30;
    await sleep((parseInt(execIntervalSec)+jitter)*1000);
  }
}

async function main() {
  log('STARTUP','CoreIdentity Simulation Engine v1.0');
  await getToken();
  if (!TOKEN) { log('STARTUP','FATAL: Auth failed'); process.exit(1); }
  const companies = await loadCompanies();
  if (!companies.length) { log('STARTUP','No companies found'); process.exit(1); }
  log('STARTUP','Loaded '+companies.length+' companies');
  const loops = companies.map(async co => {
    const agents = await loadAgents(co.clientId);
    log(co.clientId, agents.length+' agents loaded');
    if (!agents.length) return;
    await sleep(Math.random()*30000);
    return runCompany(co, agents);
  });
  await Promise.all(loops);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
