// retailGroupClient — Script 29
const https = require('https');
const { chcRetailGroup: config } = require('../config/integrations');
function httpRequest(url, opts={}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname+u.search,
      method: opts.method||'GET',
      headers: { 'x-api-key': config.apiKey, 'Content-Type':'application/json', 'User-Agent':'CoreIdentity-AGO/1.0' },
      timeout: config.timeout
    }, (res) => {
      let d=''; res.on('data', c=>d+=c);
      res.on('end', ()=>{ try { resolve({status:res.statusCode,ok:res.statusCode<300,data:JSON.parse(d)}); } catch(e){resolve({status:res.statusCode,ok:false,data:{error:d}});} });
    });
    req.on('error', reject); req.on('timeout', ()=>{req.destroy(); reject(new Error('Timeout'));});
    if (opts.body) req.write(JSON.stringify(opts.body)); req.end();
  });
}
async function withRetry(fn) {
  for (let i=0; i<(config.retryAttempts||3); i++) {
    try { const r=await fn(); if(r.ok) return r; } catch(e){ if(i===(config.retryAttempts||3)-1) throw e; }
    await new Promise(r=>setTimeout(r, Math.pow(2,i)*500));
  }
  throw new Error('Max retries exceeded');
}
const client = {
  health:           () => withRetry(()=>httpRequest(config.baseUrl+config.endpoints.health)),
  getCompliance:    () => withRetry(()=>httpRequest(config.baseUrl+config.endpoints.compliance)),
  getAuditLog:      () => withRetry(()=>httpRequest(config.baseUrl+config.endpoints.audit)),
  registerGovernance: (n=23, frameworks) => withRetry(()=>httpRequest(config.baseUrl+config.endpoints.register,{method:'POST',body:{platform:'CoreIdentity',agentCount:n,frameworks}})),
  getStore:     () => withRetry(()=>httpRequest(config.baseUrl+config.endpoints.store)),
  getInventory: () => withRetry(()=>httpRequest(config.baseUrl+config.endpoints.inventory)),
};
module.exports = client;
module.exports.config = config;
