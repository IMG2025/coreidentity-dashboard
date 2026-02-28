/* patch-32-bridge */
/**
 * AGO Bridge Service
 * CoreIdentity → ago-1-core integration layer
 */
const { v4: uuidv4 } = require('uuid');

let intakeAndDispatch;
let registerExecutor;
try {
  const agoCore = require('ago-1-core');
  intakeAndDispatch = agoCore.intakeAndDispatch;
  registerExecutor  = agoCore.registerExecutor;
  console.log('[AGO] ago-1-core loaded');
} catch (err) {
  console.warn('[AGO] ago-1-core not available, using fallback:', err.message);
}

let registryInitialized = false;
function initializeRegistry() {
  if (registryInitialized) return;
  try {
    const { ciagExecutor }   = require('./ciagExecutor');
    const { chcOpsExecutor } = require('./chcOpsExecutor');
    if (registerExecutor) {
      try { registerExecutor(ciagExecutor);   } catch (e) { /* already registered */ }
      try { registerExecutor(chcOpsExecutor); } catch (e) { /* already registered */ }
    }
    registryInitialized = true;
    console.log('[AGO] Executors registered: ciag, chc-ops, hospitality (builtin)');
  } catch (err) {
    console.error('[AGO] Registry init failed:', err.message);
  }
}

const DOMAIN_MAP = {
  'Compliance':          'ciag',
  'Legal':               'ciag',
  'Research':            'ciag',
  'Communication':       'ciag',
  'Data Analysis':       'chc-ops',
  'Document Processing': 'chc-ops',
  'Integration':         'chc-ops',
  'Marketing':           'chc-ops',
  'Customer Service':    'hospitality'
};

const ROLE_TASK_MAP = {
  'ADMIN':    ['EXECUTE', 'ANALYZE', 'ESCALATE'],
  'CUSTOMER': ['ANALYZE']
};

const ROLE_SCOPE_MAP = {
  'ADMIN':    ['ciag:execute','ciag:analyze','ciag:escalate','chc-ops:execute','chc-ops:analyze','hospitality:execute'],
  'CUSTOMER': ['ciag:analyze','chc-ops:analyze','hospitality:analyze']
};

async function executeAgent(agent, user, taskType = 'ANALYZE', inputs = {}) {
  initializeRegistry();

  const domain_id = DOMAIN_MAP[agent.category] || 'ciag';
  const allowed   = ROLE_TASK_MAP[user.role] || ['ANALYZE'];

  if (!allowed.includes(taskType)) {
    throw new Error(`Role ${user.role} cannot perform ${taskType}. Allowed: ${allowed.join(', ')}`);
  }

  const task = {
    task_id:         uuidv4(),
    domain_id,
    task_type:       taskType,
    requested_by:    user.userId,
    authority_token: 'internal',
    scope:           ROLE_SCOPE_MAP[user.role] || [],
    inputs: { agentId: agent.agentId || agent.id, agentName: agent.name, agentCategory: agent.category, ...inputs },
    created_at: new Date().toISOString()
  };

  let result;
  if (intakeAndDispatch) {
    result = intakeAndDispatch(task);
  } else {
    const { ciagExecutor }   = require('./ciagExecutor');
    const { chcOpsExecutor } = require('./chcOpsExecutor');
    const executorMap = { 'ciag': ciagExecutor, 'chc-ops': chcOpsExecutor };
    const executor = executorMap[domain_id];
    result = executor
      ? executor.execute(task)
      : { status: 'NOOP', task_id: task.task_id, domain_id, task_type: taskType, output: { reason: 'NO_EXECUTOR' } };
  }

  return {
    task_id:      task.task_id,
    domain_id,
    task_type:    taskType,
    agent_id:     agent.agentId || agent.id,
    agent_name:   agent.name,
    status:       result.status,
    output:       result.output,
    requested_by: user.userId,
    executed_at:  new Date().toISOString()
  };
}

module.exports = { executeAgent, DOMAIN_MAP, ROLE_TASK_MAP };
