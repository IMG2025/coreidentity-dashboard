/* script-36-workflows-dynamo */
// Workflows Route — /api/workflows
// DynamoDB backed — table: coreidentity-workflows
const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const router   = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE = 'coreidentity-workflows';
const ddb   = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' }));

// GET /api/workflows
router.get('/', async (req, res) => {
  try {
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    const items  = (result.Items || []).sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));
    res.json({ data: items, total: items.length, timestamp: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message, code: 'DB_ERROR' }); }
});

// POST /api/workflows
router.post('/', async (req, res) => {
  const { name, description, trigger, steps } = req.body;
  if (!name) return res.status(400).json({ error: 'name required', code: 'VALIDATION_ERROR' });

  const workflow = {
    id:          uuidv4(),
    name,
    description: description || '',
    trigger:     trigger     || 'manual',
    steps:       steps       || [],
    status:      'active',
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
    createdBy:   req.user?.userId || 'unknown',
    runCount:    0,
    lastRun:     null
  };

  try {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: workflow }));
    res.status(201).json({ data: workflow, timestamp: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message, code: 'DB_ERROR' }); }
});

// GET /api/workflows/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
    if (!result.Item) return res.status(404).json({ error: 'Workflow not found', code: 'NOT_FOUND' });
    res.json({ data: result.Item, timestamp: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message, code: 'DB_ERROR' }); }
});

// PUT /api/workflows/:id
router.put('/:id', async (req, res) => {
  const { name, description, trigger, steps, status } = req.body;
  try {
    const result = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: req.params.id },
      UpdateExpression: 'SET #n=:n, description=:d, trigger_type=:t, steps=:s, #st=:st, updatedAt=:u',
      ExpressionAttributeNames: { '#n': 'name', '#st': 'status' },
      ExpressionAttributeValues: {
        ':n': name, ':d': description || '', ':t': trigger || 'manual',
        ':s': steps || [], ':st': status || 'active', ':u': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }));
    res.json({ data: result.Attributes, timestamp: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message, code: 'DB_ERROR' }); }
});

// DELETE /api/workflows/:id
router.delete('/:id', async (req, res) => {
  try {
    await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { id: req.params.id } }));
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message, code: 'DB_ERROR' }); }
});

module.exports = router;
