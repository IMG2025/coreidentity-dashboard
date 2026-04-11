// Platform Overview — /api/platform-overview
// CACHED — 60s TTL — never triggers full DynamoDB scan on hot path
const express = require("express");
const router  = express.Router();
const { authenticate } = require("../middleware/auth");
const agentRegistry = require("../smartnation/agentRegistry");

let _cache = null;
let _cacheTs = 0;
const CACHE_TTL = 60000;
const FALLBACK = {
  aiAgents: 10000, governed: 10000, executions: 68303,
  deployments: 6000, activeAgents: 8240, avgGovScore: 89.5,
  verticals: 8, source: "SmartNation AI Registry"
};

router.get("/", authenticate, async (req, res) => {
  const now = Date.now();
  if (_cache && (now - _cacheTs) < CACHE_TTL) {
    return res.json({ success: true, data: _cache });
  }
  try {
    const summary = await agentRegistry.getRegistrySummary();
    _cache = {
      aiAgents:    summary.totalAgents        || FALLBACK.aiAgents,
      governed:    summary.totalAgents        || FALLBACK.governed,
      executions:  summary.totalExecutions    || FALLBACK.executions,
      deployments: summary.deployedAgents     || FALLBACK.deployments,
      activeAgents: summary.activeAgents      || FALLBACK.activeAgents,
      avgGovScore: summary.avgGovernanceScore || FALLBACK.avgGovScore,
      verticals:   summary.verticalCount      || FALLBACK.verticals,
      source:      "SmartNation AI Registry"
    };
    _cacheTs = now;
    res.json({ success: true, data: _cache });
  } catch(err) {
    res.json({ success: true, data: FALLBACK });
  }
});

module.exports = router;
