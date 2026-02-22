const base     = require('../baseHandler');
const { getVertical } = require('../verticals');

const VERTICAL_ID = 'defense';

async function execute(agentId, agentName, category, taskType, inputs) {
  const vertical = getVertical(VERTICAL_ID);
  if (!vertical) throw new Error('Vertical not found: ' + VERTICAL_ID);
  let output;
  switch(category) {
    case 'Data Analysis':       output = base.dataAnalysisResult(vertical, inputs);       break;
    case 'Document Processing': output = base.documentProcessingResult(vertical, inputs); break;
    case 'Communication':       output = base.communicationResult(vertical, inputs);       break;
    case 'Research':            output = base.researchResult(vertical, inputs);            break;
    case 'Compliance':          output = base.complianceResult(vertical, inputs);          break;
    case 'Integration':         output = base.integrationResult(vertical, inputs);         break;
    case 'Marketing':           output = base.marketingResult(vertical, inputs);           break;
    case 'Customer Service':    output = base.customerServiceResult(vertical, inputs);     break;
    case 'Legal':               output = base.legalResult(vertical, inputs);               break;
    default: output = { completed: true, message: 'Task executed in ' + VERTICAL_ID + ' context' };
  }
  return base.createResult(vertical, category, taskType, inputs, output);
}

module.exports = { execute, verticalId: VERTICAL_ID };