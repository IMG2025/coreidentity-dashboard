const VERTICALS = {
  hospitality: {
    id: 'hospitality', name: 'Hospitality', tier: 'A',
    compliance: ['SOC2','PCI-DSS','GDPR'],
    riskTier: 'TIER_2',
    domains: ['Customer Service','Data Analysis','Marketing','Communication','Integration','Document Processing'],
    regulatoryBody: 'FTC',
    dataClassification: 'PII+PAYMENT'
  },
  restaurants: {
    id: 'restaurants', name: 'Restaurants (Multi-Unit/Franchise)', tier: 'A',
    compliance: ['SOC2','PCI-DSS','FDA'],
    riskTier: 'TIER_2',
    domains: ['Customer Service','Data Analysis','Marketing','Integration','Compliance','Document Processing'],
    regulatoryBody: 'FDA+FTC',
    dataClassification: 'PII+PAYMENT'
  },
  healthcare_network: {
    id: 'healthcare_network', name: 'Healthcare Networks (Non-Hospital Multi-Location)', tier: 'A',
    compliance: ['HIPAA','SOC2','GDPR','HITECH'],
    riskTier: 'TIER_1',
    domains: ['Compliance','Data Analysis','Document Processing','Communication','Research','Integration'],
    regulatoryBody: 'HHS+CMS',
    dataClassification: 'PHI+PII'
  },
  retail_chains: {
    id: 'retail_chains', name: 'Retail Chains', tier: 'A',
    compliance: ['SOC2','PCI-DSS','CCPA','GDPR'],
    riskTier: 'TIER_2',
    domains: ['Customer Service','Data Analysis','Marketing','Integration','Document Processing','Communication'],
    regulatoryBody: 'FTC+State AG',
    dataClassification: 'PII+PAYMENT'
  },
  logistics: {
    id: 'logistics', name: 'Logistics & Distribution', tier: 'A',
    compliance: ['SOC2','ISO27001','CTPAT'],
    riskTier: 'TIER_2',
    domains: ['Integration','Data Analysis','Document Processing','Communication','Research','Compliance'],
    regulatoryBody: 'DOT+CBP',
    dataClassification: 'OPERATIONAL+PII'
  },
  financial_services: {
    id: 'financial_services', name: 'Financial Services (Regional/Multi-Branch)', tier: 'A',
    compliance: ['SOC2','PCI-DSS','SOX','GLBA','FFIEC'],
    riskTier: 'TIER_1',
    domains: ['Compliance','Data Analysis','Document Processing','Legal','Research','Communication'],
    regulatoryBody: 'FDIC+OCC+CFPB',
    dataClassification: 'NPI+PII+FINANCIAL'
  },
  franchisor: {
    id: 'franchisor', name: 'Franchisor Platforms', tier: 'A',
    compliance: ['SOC2','FTC-Franchise','PCI-DSS'],
    riskTier: 'TIER_2',
    domains: ['Compliance','Document Processing','Data Analysis','Marketing','Integration','Legal'],
    regulatoryBody: 'FTC',
    dataClassification: 'PII+OPERATIONAL'
  },
  municipal_gov: {
    id: 'municipal_gov', name: 'Municipal Governments (City/County)', tier: 'B',
    compliance: ['SOC2','CJIS','ADA','FOIA'],
    riskTier: 'TIER_1',
    domains: ['Compliance','Document Processing','Data Analysis','Communication','Research','Integration'],
    regulatoryBody: 'State AG+OIG',
    dataClassification: 'CUI+PII'
  },
  state_gov: {
    id: 'state_gov', name: 'State Governments', tier: 'B',
    compliance: ['SOC2','CJIS','FISMA','ADA','FOIA'],
    riskTier: 'TIER_1',
    domains: ['Compliance','Document Processing','Data Analysis','Legal','Research','Communication'],
    regulatoryBody: 'State AG+Federal OIG',
    dataClassification: 'CUI+PII+SBU'
  },
  federal_gov: {
    id: 'federal_gov', name: 'Federal Government Agencies', tier: 'B',
    compliance: ['FISMA','FedRAMP','NIST-800-53','FOIA','Section508'],
    riskTier: 'TIER_1',
    domains: ['Compliance','Document Processing','Data Analysis','Legal','Research','Integration'],
    regulatoryBody: 'OMB+GAO+OIG',
    dataClassification: 'CUI+PII+FOUO'
  },
  school_districts: {
    id: 'school_districts', name: 'Public School Districts', tier: 'B',
    compliance: ['FERPA','COPPA','SOC2','ADA'],
    riskTier: 'TIER_2',
    domains: ['Data Analysis','Compliance','Document Processing','Communication','Research','Integration'],
    regulatoryBody: 'ED+State DOE',
    dataClassification: 'FERPA+PII'
  },
  public_universities: {
    id: 'public_universities', name: 'Public University Systems', tier: 'B',
    compliance: ['FERPA','HIPAA','SOC2','GDPR','NSF'],
    riskTier: 'TIER_1',
    domains: ['Research','Compliance','Data Analysis','Document Processing','Legal','Integration'],
    regulatoryBody: 'ED+NSF+NIH',
    dataClassification: 'FERPA+PHI+CUI'
  },
  public_healthcare: {
    id: 'public_healthcare', name: 'Public Healthcare Systems', tier: 'B',
    compliance: ['HIPAA','HITECH','SOC2','Section1557','42CFR'],
    riskTier: 'TIER_1',
    domains: ['Compliance','Data Analysis','Document Processing','Research','Communication','Integration'],
    regulatoryBody: 'HHS+CMS+State DOH',
    dataClassification: 'PHI+PII+CUI'
  },
  defense: {
    id: 'defense', name: 'Defense & National Security Agencies', tier: 'C',
    compliance: ['CMMC','NIST-800-171','ITAR','FedRAMP-High','DISA-STIG'],
    riskTier: 'TIER_1',
    domains: ['Compliance','Research','Data Analysis','Document Processing','Legal','Integration'],
    regulatoryBody: 'DoD+NSA+CISA',
    dataClassification: 'CUI+CTI+CLASSIFIED'
  },
  public_utilities: {
    id: 'public_utilities', name: 'Public Utilities Authorities', tier: 'B',
    compliance: ['NERC-CIP','SOC2','FISMA','ISO27001'],
    riskTier: 'TIER_1',
    domains: ['Compliance','Data Analysis','Integration','Document Processing','Research','Communication'],
    regulatoryBody: 'FERC+State PUC',
    dataClassification: 'OT+SCADA+CUI'
  },
  sovereign_nations: {
    id: 'sovereign_nations', name: 'Sovereign Nations (National AI Governance)', tier: 'D',
    compliance: ['ISO27001','GDPR','NIST-AI-RMF','National-AI-Policy'],
    riskTier: 'TIER_1',
    domains: ['Compliance','Legal','Research','Data Analysis','Document Processing','Integration'],
    regulatoryBody: 'National-Authority',
    dataClassification: 'SOVEREIGN+CUI+PII'
  },
  sovereign_wealth: {
    id: 'sovereign_wealth', name: 'Sovereign Wealth Funds', tier: 'D',
    compliance: ['SOC2','GIPS','ISO27001','IFRS','FATF'],
    riskTier: 'TIER_1',
    domains: ['Compliance','Data Analysis','Legal','Document Processing','Research','Integration'],
    regulatoryBody: 'IOSCO+National-Authority',
    dataClassification: 'NPI+FINANCIAL+SOVEREIGN'
  },
  central_banks: {
    id: 'central_banks', name: 'Central Banks', tier: 'D',
    compliance: ['BIS','CPMI','FSAP','ISO27001','National-Banking-Law'],
    riskTier: 'TIER_1',
    domains: ['Compliance','Data Analysis','Research','Legal','Document Processing','Communication'],
    regulatoryBody: 'BIS+IMF+National-Authority',
    dataClassification: 'MONETARY+SOVEREIGN+NPI'
  },
  regulatory_bodies: {
    id: 'regulatory_bodies', name: 'National Regulatory Bodies', tier: 'D',
    compliance: ['ISO27001','NIST-800-53','National-Regulatory-Framework'],
    riskTier: 'TIER_1',
    domains: ['Compliance','Legal','Document Processing','Data Analysis','Research','Communication'],
    regulatoryBody: 'Self-Regulating+National-Authority',
    dataClassification: 'CUI+REGULATORY+PII'
  },
  intergovernmental: {
    id: 'intergovernmental', name: 'Intergovernmental Organizations', tier: 'D',
    compliance: ['ISO27001','GDPR','UN-Data-Policy','NIST-AI-RMF'],
    riskTier: 'TIER_1',
    domains: ['Compliance','Legal','Research','Data Analysis','Document Processing','Communication'],
    regulatoryBody: 'UN+EU+Regional-Bodies',
    dataClassification: 'SOVEREIGN+PII+CUI'
  }
};

function getVertical(verticalId) {
  return VERTICALS[verticalId] || null;
}

function getAllVerticals() {
  return Object.values(VERTICALS);
}

function getVerticalsByTier(tier) {
  return Object.values(VERTICALS).filter(function(v) { return v.tier === tier; });
}

module.exports = { VERTICALS, getVertical, getAllVerticals, getVerticalsByTier };
