const hospitalityHandler = require('./verticals/hospitality');
const restaurantsHandler = require('./verticals/restaurants');
const healthcare_networkHandler = require('./verticals/healthcare_network');
const retail_chainsHandler = require('./verticals/retail_chains');
const logisticsHandler = require('./verticals/logistics');
const financial_servicesHandler = require('./verticals/financial_services');
const franchisorHandler = require('./verticals/franchisor');
const municipal_govHandler = require('./verticals/municipal_gov');
const state_govHandler = require('./verticals/state_gov');
const federal_govHandler = require('./verticals/federal_gov');
const school_districtsHandler = require('./verticals/school_districts');
const public_universitiesHandler = require('./verticals/public_universities');
const public_healthcareHandler = require('./verticals/public_healthcare');
const defenseHandler = require('./verticals/defense');
const public_utilitiesHandler = require('./verticals/public_utilities');
const sovereign_nationsHandler = require('./verticals/sovereign_nations');
const sovereign_wealthHandler = require('./verticals/sovereign_wealth');
const central_banksHandler = require('./verticals/central_banks');
const regulatory_bodiesHandler = require('./verticals/regulatory_bodies');
const intergovernmentalHandler = require('./verticals/intergovernmental');

const HANDLERS = {
  'hospitality': hospitalityHandler,
  'restaurants': restaurantsHandler,
  'healthcare_network': healthcare_networkHandler,
  'retail_chains': retail_chainsHandler,
  'logistics': logisticsHandler,
  'financial_services': financial_servicesHandler,
  'franchisor': franchisorHandler,
  'municipal_gov': municipal_govHandler,
  'state_gov': state_govHandler,
  'federal_gov': federal_govHandler,
  'school_districts': school_districtsHandler,
  'public_universities': public_universitiesHandler,
  'public_healthcare': public_healthcareHandler,
  'defense': defenseHandler,
  'public_utilities': public_utilitiesHandler,
  'sovereign_nations': sovereign_nationsHandler,
  'sovereign_wealth': sovereign_wealthHandler,
  'central_banks': central_banksHandler,
  'regulatory_bodies': regulatory_bodiesHandler,
  'intergovernmental': intergovernmentalHandler
};

const { getVertical, getAllVerticals } = require('./verticals');

async function route(agentId, agentName, category, taskType, inputs, verticalId) {
  const vid     = verticalId || (inputs && inputs.verticalId) || 'hospitality';
  const handler = HANDLERS[vid];
  if (!handler) throw new Error('No handler for vertical: ' + vid);
  const result = await handler.execute(agentId, agentName, category, taskType, inputs);
  return { agentId: String(agentId), agentName, category, taskType, verticalId: vid, status: 'success', result, timestamp: new Date().toISOString(), executedBy: 'Nexus OS → AGO' };
}

function listVerticals() { return getAllVerticals(); }
function getHandler(id) { return HANDLERS[id] || null; }

module.exports = { route, listVerticals, getHandler };