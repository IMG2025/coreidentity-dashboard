const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const db = DynamoDBDocument.from(new DynamoDB({ region: process.env.AWS_REGION || 'us-east-2' }));

async function pagQuery(TableName, KeyConditionExpression, ExpressionAttributeValues, opts) {
  var params = Object.assign({ TableName, KeyConditionExpression, ExpressionAttributeValues }, opts || {});
  var items = [], lastKey;
  do {
    if (lastKey) params.ExclusiveStartKey = lastKey;
    var r = await db.query(params);
    items = items.concat(r.Items || []);
    lastKey = r.LastEvaluatedKey;
  } while (lastKey);
  return items;
}
async function pagScan(TableName) {
  var items = [], lastKey;
  do {
    var p = { TableName }; if (lastKey) p.ExclusiveStartKey = lastKey;
    var r = await db.scan(p); items = items.concat(r.Items || []); lastKey = r.LastEvaluatedKey;
  } while (lastKey);
  return items;
}
router.get('/', authenticate, async function(req, res) {
  try {
    var companies = await pagScan('tenant-companies');
    companies.sort(function(a,b){ return (a.companyName||'').localeCompare(b.companyName||''); });
    res.json({ success: true, data: companies, count: companies.length });
  } catch(e) { res.status(500).json({ error: 'Failed to fetch tenants' }); }
});
router.get('/:id', authenticate, async function(req, res) {
  try {
    var result = await db.get({ TableName: 'tenant-companies', Key: { clientId: req.params.id } });
    var company = result.Item;
    if (company === undefined || company === null) return res.status(404).json({ error: 'Tenant not found' });
    var govHistory = await pagQuery('tenant-governance','companyId = :c',{':c':req.params.id},{ScanIndexForward:false,Limit:30});
    var recentExecs = await pagQuery('tenant-executions','companyId = :c',{':c':req.params.id},{ScanIndexForward:false,Limit:20});
    var events = await pagQuery('tenant-events','companyId = :c',{':c':req.params.id});
    var openEvents = events.filter(function(e){ return e.resolved === false || e.resolved === undefined; });
    var successCount = recentExecs.filter(function(e){ return e.success === true; }).length;
    var successRate = recentExecs.length > 0 ? Math.round(successCount/recentExecs.length*100) : 0;
    res.json({ success: true, data: Object.assign({}, company, { governanceHistory: govHistory.slice(0,30), recentExecutions: recentExecs.slice(0,10), openEvents: openEvents.slice(0,10), successRate: successRate }) });
  } catch(e) { console.error('[Tenants] detail:', e.message); res.status(500).json({ error: 'Failed to fetch tenant detail' }); }
});
router.get('/:id/agents', authenticate, async function(req, res) {
  try {
    var limit = parseInt(req.query.limit||'50'), offset = parseInt(req.query.offset||'0');
    var all = await pagQuery('tenant-agents','companyId = :c',{':c':req.params.id});
    var page = all.slice(offset, offset+limit);
    res.json({ success: true, data: page, count: page.length, total: all.length });
  } catch(e) { res.status(500).json({ error: 'Failed to fetch agents' }); }
});
router.get('/:id/activity', authenticate, async function(req, res) {
  try {
    var limit = parseInt(req.query.limit||'50');
    var execs = await pagQuery('tenant-executions','companyId = :c',{':c':req.params.id},{ScanIndexForward:false,Limit:limit});
    var events = await pagQuery('tenant-events','companyId = :c',{':c':req.params.id});
    var activity = execs.map(function(e){ return Object.assign({},e,{_type:'execution'}); })
      .concat(events.map(function(e){ return Object.assign({},e,{_type:'event'}); }))
      .sort(function(a,b){ return (b.timestamp||'').localeCompare(a.timestamp||''); }).slice(0,limit);
    res.json({ success: true, data: activity, count: activity.length });
  } catch(e) { res.status(500).json({ error: 'Failed to fetch activity' }); }
});
router.get('/:id/governance', authenticate, async function(req, res) {
  try {
    var history = await pagQuery('tenant-governance','companyId = :c',{':c':req.params.id},{ScanIndexForward:false,Limit:120});
    history.reverse();
    res.json({ success: true, data: history, count: history.length });
  } catch(e) { res.status(500).json({ error: 'Failed to fetch governance history' }); }
});
router.post('/:id/remediate/:eventId', authenticate, async function(req, res) {
  try {
    var resolution = (req.body && req.body.resolution) ? req.body.resolution : 'Manual remediation applied';
    var now = new Date().toISOString();
    await db.update({ TableName:'tenant-events', Key:{companyId:req.params.id,eventId:req.params.eventId}, UpdateExpression:'SET resolved=:t, resolvedAt=:ts, resolution=:r', ExpressionAttributeValues:{':t':true,':ts':now,':r':resolution} });
    await db.put({ TableName:'tenant-governance', Item:{companyId:req.params.id,timestamp:now,score:0,delta:2.5,reason:'remediation'} });
    await db.update({ TableName:'tenant-companies', Key:{clientId:req.params.id}, UpdateExpression:'ADD governanceScore :d SET lastActivityAt=:t', ExpressionAttributeValues:{':d':2.5,':t':now} });
    res.json({ success: true, message: 'Violation remediated — governance score updated' });
  } catch(e) { res.status(500).json({ error: 'Remediation failed' }); }
});
module.exports = router;
