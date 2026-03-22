import React, { useState, useEffect } from 'react';
import { Database, Shield, Activity, Star, Search, Grid } from 'lucide-react';
import { api } from '../services/api';

// ── SmartNation 108-agent product catalog (governed registry) ──
// Note: This is the SN product catalog, separate from internal ECS agents
const SN_DOMAINS = [
  { id:'financial',    label:'Financial Services', count:24 },
  { id:'healthcare',   label:'Healthcare',          count:22 },
  { id:'retail',       label:'Retail & Commerce',   count:18 },
  { id:'legal',        label:'Legal & Compliance',  count:16 },
  { id:'hospitality',  label:'Hospitality',         count:12 },
  { id:'manufacturing',label:'Manufacturing',        count:8  },
  { id:'sovereign',    label:'Sovereign / Gov',      count:8  },
];
const SN_AGENTS = [
  {id:'fin-01',name:'Fraud Detection Agent',category:'Financial Services',fw:'GLBA,PCI-DSS',score:98,status:'Active',exec:14820,riskTier:'TIER_1'},
  {id:'fin-02',name:'AML Monitoring Agent',category:'Financial Services',fw:'BSA/AML,FinCEN',score:99,status:'Active',exec:8930,riskTier:'TIER_1'},
  {id:'fin-03',name:'Credit Scoring Agent',category:'Financial Services',fw:'FCRA,ECOA',score:97,status:'Active',exec:6720,riskTier:'TIER_1'},
  {id:'fin-04',name:'Wire Transfer Agent',category:'Financial Services',fw:'GLBA,OFAC',score:98,status:'Active',exec:4210,riskTier:'TIER_1'},
  {id:'fin-05',name:'Transaction Monitoring',category:'Financial Services',fw:'PCI-DSS,GLBA',score:97,status:'Active',exec:11250,riskTier:'TIER_1'},
  {id:'fin-06',name:'KYC Verification Agent',category:'Financial Services',fw:'BSA/AML,GLBA',score:96,status:'Active',exec:9340,riskTier:'TIER_2'},
  {id:'fin-07',name:'Sanctions Screening AI',category:'Financial Services',fw:'OFAC,FinCEN',score:99,status:'Active',exec:5180,riskTier:'TIER_1'},
  {id:'fin-08',name:'Account Takeover Detector',category:'Financial Services',fw:'GLBA,CCPA',score:95,status:'Active',exec:7620,riskTier:'TIER_2'},
  {id:'fin-09',name:'Loan Origination Agent',category:'Financial Services',fw:'ECOA,HMDA',score:94,status:'Active',exec:3890,riskTier:'TIER_2'},
  {id:'fin-10',name:'Insurance Risk Scorer',category:'Financial Services',fw:'NAIC,GLBA',score:93,status:'Active',exec:2940,riskTier:'TIER_2'},
  {id:'fin-11',name:'Derivatives Compliance AI',category:'Financial Services',fw:'Dodd-Frank,CFTC',score:96,status:'Active',exec:1820,riskTier:'TIER_2'},
  {id:'fin-12',name:'FFIEC Compliance Monitor',category:'Financial Services',fw:'FFIEC,SOX',score:97,status:'Active',exec:4320,riskTier:'TIER_1'},
  {id:'fin-13',name:'Crypto AML Agent',category:'Financial Services',fw:'FinCEN,BSA',score:95,status:'Active',exec:3140,riskTier:'TIER_2'},
  {id:'fin-14',name:'Consumer Lending AI',category:'Financial Services',fw:'TILA,RESPA',score:94,status:'Active',exec:2780,riskTier:'TIER_2'},
  {id:'fin-15',name:'Market Abuse Detector',category:'Financial Services',fw:'SEC,FINRA',score:97,status:'Active',exec:1960,riskTier:'TIER_1'},
  {id:'fin-16',name:'Correspondent Banking AI',category:'Financial Services',fw:'SWIFT,BSA',score:98,status:'Active',exec:870,riskTier:'TIER_1'},
  {id:'fin-17',name:'Investment Suitability Agent',category:'Financial Services',fw:'FINRA,SEC',score:95,status:'Active',exec:2340,riskTier:'TIER_2'},
  {id:'fin-18',name:'Reg-E Dispute Agent',category:'Financial Services',fw:'CFPB,Reg-E',score:93,status:'Active',exec:3560,riskTier:'TIER_2'},
  {id:'fin-19',name:'CCAR Stress Test AI',category:'Financial Services',fw:'Fed Reg,Basel III',score:96,status:'Active',exec:420,riskTier:'TIER_1'},
  {id:'fin-20',name:'Beneficial Owner Tracker',category:'Financial Services',fw:'CDD,BSA',score:97,status:'Active',exec:1780,riskTier:'TIER_1'},
  {id:'fin-21',name:'Trade Finance Agent',category:'Financial Services',fw:'UCC,ISBP',score:94,status:'Active',exec:1240,riskTier:'TIER_2'},
  {id:'fin-22',name:'Overdraft Policy AI',category:'Financial Services',fw:'CFPB,Reg-E',score:92,status:'Active',exec:4890,riskTier:'TIER_3'},
  {id:'fin-23',name:'PCI DSS Monitor',category:'Financial Services',fw:'PCI-DSS v4.0',score:98,status:'Active',exec:6230,riskTier:'TIER_1'},
  {id:'fin-24',name:'SOX Controls Agent',category:'Financial Services',fw:'SOX,PCAOB',score:97,status:'Active',exec:890,riskTier:'TIER_1'},
  {id:'hlt-01',name:'Clinical Decision Support',category:'Healthcare',fw:'HIPAA,CMS',score:95,status:'Active',exec:18930,riskTier:'TIER_1'},
  {id:'hlt-02',name:'Pharmacy Interaction Check',category:'Healthcare',fw:'HIPAA,FDA 21 CFR',score:96,status:'Active',exec:12380,riskTier:'TIER_1'},
  {id:'hlt-03',name:'Sepsis Early Warning',category:'Healthcare',fw:'HIPAA,HITECH',score:96,status:'Active',exec:9870,riskTier:'TIER_1'},
  {id:'hlt-04',name:'Insurance Eligibility AI',category:'Healthcare',fw:'HIPAA,HITECH',score:95,status:'Active',exec:7620,riskTier:'TIER_2'},
  {id:'hlt-05',name:'Patient Risk Stratification',category:'Healthcare',fw:'HIPAA,CMS',score:94,status:'Active',exec:5210,riskTier:'TIER_2'},
  {id:'hlt-06',name:'Prior Auth Agent',category:'Healthcare',fw:'CMS,HIPAA',score:93,status:'Active',exec:8940,riskTier:'TIER_2'},
  {id:'hlt-07',name:'CDI Query Agent',category:'Healthcare',fw:'HIPAA,CMS',score:94,status:'Active',exec:6320,riskTier:'TIER_2'},
  {id:'hlt-08',name:'Lab Result Interpreter',category:'Healthcare',fw:'HIPAA,CAP',score:95,status:'Active',exec:4180,riskTier:'TIER_2'},
  {id:'hlt-09',name:'Readmission Risk Agent',category:'Healthcare',fw:'CMS,HIPAA',score:93,status:'Active',exec:3890,riskTier:'TIER_2'},
  {id:'hlt-10',name:'Drug Utilization Reviewer',category:'Healthcare',fw:'FDA,HIPAA',score:95,status:'Active',exec:2940,riskTier:'TIER_2'},
  {id:'hlt-11',name:'HIPAA Breach Detector',category:'Healthcare',fw:'HIPAA,HITECH',score:98,status:'Active',exec:1820,riskTier:'TIER_1'},
  {id:'hlt-12',name:'Medical Necessity AI',category:'Healthcare',fw:'CMS,AMA',score:92,status:'Active',exec:4320,riskTier:'TIER_3'},
  {id:'hlt-13',name:'Telemedicine Compliance AI',category:'Healthcare',fw:'HIPAA,Ryan Haight',score:94,status:'Active',exec:2780,riskTier:'TIER_2'},
  {id:'hlt-14',name:'Mental Health Risk Agent',category:'Healthcare',fw:'HIPAA,42 CFR Part 2',score:97,status:'Active',exec:1960,riskTier:'TIER_1'},
  {id:'hlt-15',name:'Clinical Trial Monitor',category:'Healthcare',fw:'FDA 21 CFR,ICH',score:96,status:'Active',exec:870,riskTier:'TIER_1'},
  {id:'hlt-16',name:'Advance Directive Agent',category:'Healthcare',fw:'HIPAA,State Law',score:95,status:'Active',exec:2340,riskTier:'TIER_2'},
  {id:'hlt-17',name:'RPM Alert Agent',category:'Healthcare',fw:'FDA,HIPAA',score:94,status:'Active',exec:3560,riskTier:'TIER_2'},
  {id:'hlt-18',name:'Immunization Registry AI',category:'Healthcare',fw:'CDC,HIPAA',score:93,status:'Active',exec:4890,riskTier:'TIER_3'},
  {id:'hlt-19',name:'Formulary Compliance AI',category:'Healthcare',fw:'CMS,FDA',score:95,status:'Active',exec:6230,riskTier:'TIER_2'},
  {id:'hlt-20',name:'Credentialing Agent',category:'Healthcare',fw:'NCQA,HIPAA',score:96,status:'Active',exec:1240,riskTier:'TIER_1'},
  {id:'hlt-21',name:'Home Health Monitor',category:'Healthcare',fw:'CMS,HIPAA',score:92,status:'Active',exec:3140,riskTier:'TIER_3'},
  {id:'hlt-22',name:'SDoH Screening Agent',category:'Healthcare',fw:'CMS,HIPAA',score:93,status:'Active',exec:2780,riskTier:'TIER_3'},
  {id:'ret-01',name:'Transaction Fraud Agent',category:'Retail & Commerce',fw:'PCI-DSS,CCPA',score:94,status:'Active',exec:22140,riskTier:'TIER_1'},
  {id:'ret-02',name:'PCI Compliance Monitor',category:'Retail & Commerce',fw:'PCI-DSS v4.0',score:92,status:'Active',exec:15440,riskTier:'TIER_2'},
  {id:'ret-03',name:'Loyalty Scoring Agent',category:'Retail & Commerce',fw:'CCPA,FTC',score:91,status:'Active',exec:9340,riskTier:'TIER_3'},
  {id:'ret-04',name:'Price Parity Agent',category:'Retail & Commerce',fw:'FTC,Sherman Act',score:90,status:'Active',exec:4180,riskTier:'TIER_3'},
  {id:'ret-05',name:'Return Fraud Detector',category:'Retail & Commerce',fw:'FTC,CCPA',score:93,status:'Active',exec:8930,riskTier:'TIER_2'},
  {id:'ret-06',name:'Product Recall Monitor',category:'Retail & Commerce',fw:'CPSC,FDA',score:95,status:'Active',exec:2340,riskTier:'TIER_2'},
  {id:'ret-07',name:'Advertising Compliance AI',category:'Retail & Commerce',fw:'FTC,NAD',score:91,status:'Active',exec:6720,riskTier:'TIER_3'},
  {id:'ret-08',name:'Age Verification Agent',category:'Retail & Commerce',fw:'COPPA,State Law',score:94,status:'Active',exec:3890,riskTier:'TIER_2'},
  {id:'ret-09',name:'Supply Chain Compliance AI',category:'Retail & Commerce',fw:'CTPAT,FSMA',score:92,status:'Active',exec:1820,riskTier:'TIER_3'},
  {id:'ret-10',name:'Labor Compliance Monitor',category:'Retail & Commerce',fw:'FLSA,OSHA',score:93,status:'Active',exec:2780,riskTier:'TIER_2'},
  {id:'ret-11',name:'Warranty Compliance Agent',category:'Retail & Commerce',fw:'Magnuson-Moss,FTC',score:90,status:'Active',exec:4320,riskTier:'TIER_3'},
  {id:'ret-12',name:'Consumer Protection AI',category:'Retail & Commerce',fw:'UDAP,FTC',score:92,status:'Active',exec:5210,riskTier:'TIER_3'},
  {id:'ret-13',name:'Data Minimization Agent',category:'Retail & Commerce',fw:'CCPA,CPRA',score:94,status:'Active',exec:3140,riskTier:'TIER_2'},
  {id:'ret-14',name:'Cart Abandonment Guard',category:'Retail & Commerce',fw:'CAN-SPAM,CCPA',score:89,status:'Active',exec:7620,riskTier:'TIER_3'},
  {id:'ret-15',name:'Gift Card Compliance AI',category:'Retail & Commerce',fw:'CARD Act,State',score:91,status:'Active',exec:1960,riskTier:'TIER_3'},
  {id:'ret-16',name:'Cross-Border Trade Agent',category:'Retail & Commerce',fw:'CBP,ITAR',score:93,status:'Active',exec:870,riskTier:'TIER_2'},
  {id:'ret-17',name:'ESG Reporting Agent',category:'Retail & Commerce',fw:'GRI,SEC',score:90,status:'Active',exec:1240,riskTier:'TIER_3'},
  {id:'ret-18',name:'Inventory Accuracy AI',category:'Retail & Commerce',fw:'SOX,GAAP',score:92,status:'Active',exec:2940,riskTier:'TIER_3'},
  {id:'leg-01',name:'Conflict Check Agent',category:'Legal & Compliance',fw:'ABA Rule 1.7,CCPA',score:93,status:'Active',exec:18930,riskTier:'TIER_2'},
  {id:'leg-02',name:'eDiscovery Classifier',category:'Legal & Compliance',fw:'FRCP,ABA',score:94,status:'Active',exec:12380,riskTier:'TIER_2'},
  {id:'leg-03',name:'Contract Review Agent',category:'Legal & Compliance',fw:'UCC,ABA',score:93,status:'Active',exec:9870,riskTier:'TIER_2'},
  {id:'leg-04',name:'Privilege Review Agent',category:'Legal & Compliance',fw:'ABA Rule 1.6,FRCP',score:96,status:'Active',exec:7620,riskTier:'TIER_1'},
  {id:'leg-05',name:'Legal Research AI',category:'Legal & Compliance',fw:'ABA,Court Rules',score:91,status:'Active',exec:5210,riskTier:'TIER_3'},
  {id:'leg-06',name:'Billing Compliance Agent',category:'Legal & Compliance',fw:'ABA Rule 1.5',score:92,status:'Active',exec:8940,riskTier:'TIER_3'},
  {id:'leg-07',name:'Deadline Management AI',category:'Legal & Compliance',fw:'FRCP,Local Rules',score:95,status:'Active',exec:6320,riskTier:'TIER_2'},
  {id:'leg-08',name:'Client Intake Agent',category:'Legal & Compliance',fw:'ABA,State Bar',score:90,status:'Active',exec:4180,riskTier:'TIER_3'},
  {id:'leg-09',name:'Court Filing Monitor',category:'Legal & Compliance',fw:'CM/ECF,FRCP',score:94,status:'Active',exec:3890,riskTier:'TIER_2'},
  {id:'leg-10',name:'IP Clearance Agent',category:'Legal & Compliance',fw:'USPTO,TTAB',score:92,status:'Active',exec:2940,riskTier:'TIER_3'},
  {id:'leg-11',name:'Regulatory Filing AI',category:'Legal & Compliance',fw:'SEC,FTC,DOJ',score:95,status:'Active',exec:1820,riskTier:'TIER_2'},
  {id:'leg-12',name:'Settlement Valuation AI',category:'Legal & Compliance',fw:'FRE,ABA',score:91,status:'Active',exec:4320,riskTier:'TIER_3'},
  {id:'leg-13',name:'Expert Witness Screener',category:'Legal & Compliance',fw:'Daubert,FRE 702',score:93,status:'Active',exec:2780,riskTier:'TIER_2'},
  {id:'leg-14',name:'GDPR Compliance Agent',category:'Legal & Compliance',fw:'GDPR,CCPA',score:96,status:'Active',exec:1960,riskTier:'TIER_1'},
  {id:'leg-15',name:'Anti-Corruption Monitor',category:'Legal & Compliance',fw:'FCPA,UK Bribery',score:97,status:'Active',exec:870,riskTier:'TIER_1'},
  {id:'leg-16',name:'Litigation Hold Agent',category:'Legal & Compliance',fw:'FRCP,ABA',score:94,status:'Active',exec:2340,riskTier:'TIER_2'},
  {id:'hos-01',name:'Guest Data Compliance AI',category:'Hospitality',fw:'GDPR,CCPA',score:92,status:'Active',exec:8930,riskTier:'TIER_3'},
  {id:'hos-02',name:'Revenue Management Agent',category:'Hospitality',fw:'FTC,ADA',score:90,status:'Active',exec:6720,riskTier:'TIER_3'},
  {id:'hos-03',name:'Food Safety Monitor',category:'Hospitality',fw:'FDA,FSMA',score:95,status:'Active',exec:4180,riskTier:'TIER_2'},
  {id:'hos-04',name:'ADA Compliance Agent',category:'Hospitality',fw:'ADA,DOT',score:94,status:'Active',exec:3890,riskTier:'TIER_2'},
  {id:'hos-05',name:'Labor Scheduling AI',category:'Hospitality',fw:'FLSA,State',score:91,status:'Active',exec:9340,riskTier:'TIER_3'},
  {id:'hos-06',name:'Liquor License Monitor',category:'Hospitality',fw:'TTB,State ABC',score:93,status:'Active',exec:2940,riskTier:'TIER_2'},
  {id:'hos-07',name:'OTA Parity Agent',category:'Hospitality',fw:'FTC,ARDA',score:89,status:'Active',exec:1820,riskTier:'TIER_3'},
  {id:'hos-08',name:'Fire Safety Compliance AI',category:'Hospitality',fw:'OSHA,NFPA',score:96,status:'Active',exec:4320,riskTier:'TIER_1'},
  {id:'hos-09',name:'Health Code Monitor',category:'Hospitality',fw:'FDA,State DOH',score:95,status:'Active',exec:2780,riskTier:'TIER_2'},
  {id:'hos-10',name:'Tipping Compliance Agent',category:'Hospitality',fw:'FLSA,IRS',score:92,status:'Active',exec:5210,riskTier:'TIER_3'},
  {id:'hos-11',name:'Loyalty Data Guard',category:'Hospitality',fw:'CCPA,GDPR',score:91,status:'Active',exec:3140,riskTier:'TIER_3'},
  {id:'hos-12',name:'STR Compliance AI',category:'Hospitality',fw:'Local Ord,FTC',score:90,status:'Active',exec:1960,riskTier:'TIER_3'},
  {id:'mfg-01',name:'OSHA Safety Monitor',category:'Manufacturing',fw:'OSHA,ANSI',score:97,status:'Active',exec:6230,riskTier:'TIER_1'},
  {id:'mfg-02',name:'EPA Emissions Agent',category:'Manufacturing',fw:'EPA,CAA',score:95,status:'Active',exec:4180,riskTier:'TIER_2'},
  {id:'mfg-03',name:'Product Safety AI',category:'Manufacturing',fw:'CPSC,ISO',score:94,status:'Active',exec:3890,riskTier:'TIER_2'},
  {id:'mfg-04',name:'Supply Chain ESG Agent',category:'Manufacturing',fw:'SEC,GRI',score:91,status:'Active',exec:2940,riskTier:'TIER_3'},
  {id:'mfg-05',name:'Quality Control AI',category:'Manufacturing',fw:'ISO 9001,FDA',score:96,status:'Active',exec:1820,riskTier:'TIER_1'},
  {id:'mfg-06',name:'Export Control Agent',category:'Manufacturing',fw:'EAR,ITAR',score:98,status:'Active',exec:870,riskTier:'TIER_1'},
  {id:'mfg-07',name:'Hazmat Compliance AI',category:'Manufacturing',fw:'DOT,EPA',score:95,status:'Active',exec:2340,riskTier:'TIER_2'},
  {id:'mfg-08',name:'Conflict Minerals Agent',category:'Manufacturing',fw:'Dodd-Frank 1502',score:93,status:'Active',exec:1240,riskTier:'TIER_2'},
  {id:'sov-01',name:'AML National Monitor',category:'Sovereign / Gov',fw:'FATF,FinCEN',score:99,status:'Active',exec:2780,riskTier:'TIER_1'},
  {id:'sov-02',name:'Tax Compliance AI',category:'Sovereign / Gov',fw:'OECD,FATCA',score:97,status:'Active',exec:3140,riskTier:'TIER_1'},
  {id:'sov-03',name:'Border Control Agent',category:'Sovereign / Gov',fw:'DHS,CBP',score:98,status:'Active',exec:1960,riskTier:'TIER_1'},
  {id:'sov-04',name:'Financial Intelligence AI',category:'Sovereign / Gov',fw:'FATF,Egmont',score:99,status:'Active',exec:870,riskTier:'TIER_1'},
  {id:'sov-05',name:'Sanctions Compliance AI',category:'Sovereign / Gov',fw:'OFAC,UN Sanctions',score:99,status:'Active',exec:2340,riskTier:'TIER_1'},
  {id:'sov-06',name:'Procurement Monitor',category:'Sovereign / Gov',fw:'FAR,ITAR',score:95,status:'Active',exec:1240,riskTier:'TIER_2'},
  {id:'sov-07',name:'Digital ID Governance AI',category:'Sovereign / Gov',fw:'NIST,ISO 29115',score:96,status:'Active',exec:4320,riskTier:'TIER_1'},
  {id:'sov-08',name:'National AI Governance',category:'Sovereign / Gov',fw:'EU AI Act,NIST AI RMF',score:97,status:'Active',exec:2780,riskTier:'TIER_1'},
];


const TIER_COLORS = {
  TIER_1: 'bg-green-100 text-green-700 border-green-200',
  TIER_2: 'bg-blue-100 text-blue-700 border-blue-200',
  TIER_3: 'bg-orange-100 text-orange-700 border-orange-200',
  TIER_4: 'bg-red-100 text-red-700 border-red-200'
};

function ScoreRing({ score }) {
  const s = Number(score) || 0;
  const color = s >= 90 ? '#22c55e' : s >= 75 ? '#3b82f6' : '#f97316';
  const r = 20, circ = 2 * Math.PI * r;
  const dash = (s / 100) * circ;
  return (
    <svg width='52' height='52' className='shrink-0'>
      <circle cx='26' cy='26' r={r} fill='none' stroke='#f3f4f6' strokeWidth='4' />
      <circle cx='26' cy='26' r={r} fill='none' stroke={color} strokeWidth='4'
        strokeDasharray={dash + ' ' + (circ - dash)}
        strokeLinecap='round' transform='rotate(-90 26 26)' />
      <text x='26' y='30' textAnchor='middle' fontSize='11' fontWeight='700' fill={color}>{s}</text>
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const g = {
    purple: 'from-purple-600 to-purple-800',
    green:  'from-green-500 to-green-700',
    blue:   'from-blue-600 to-blue-800',
    indigo: 'from-indigo-600 to-indigo-800'
  };
  return (
    <div className={'bg-gradient-to-br ' + (g[color] || g.blue) + ' rounded-2xl p-5 text-white'}>
      <Icon size={20} className='opacity-80 mb-3' />
      <div className='text-3xl font-bold mb-1'>{value}</div>
      <div className='text-xs opacity-70 uppercase tracking-wide'>{label}</div>
    </div>
  );
}

export default function SmartNationAI() {
  // ── Deploy handler ──────────────────────────────────────────────────────
  const [deploying, setDeploying] = React.useState({});
  async function handleSmartNationDeploy(agent) {
    const id = agent.agentId || agent.id;
    setDeploying(p => ({ ...p, [id]: true }));
    try {
      await api.deployAgent(id);
      alert(agent.name + ' deployed successfully');
    } catch(err) {
      alert('Deploy failed: ' + (err.message || 'Unknown error'));
    } finally {
      setDeploying(p => ({ ...p, [id]: false }));
    }
  }

  const [summary, setSummary]   = useState(null);
  const [agents, setAgents]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('all');

  useEffect(function() {
    loadSummary();
    loadAgents();
  }, []);

  function loadSummary() {
    api.getSmartNationSummary()
      .then(function(s) { setSummary(s); })
      .catch(function(e) { console.warn('SmartNation summary unavailable:', e.message); })
      .finally(function() { setLoading(false); });
  }

  function loadAgents() {
    // SmartNation registry is the governed product catalog (10,000 agents)
    setAgents(SN_AGENTS);
  }

  const categories = ['all'].concat(
    agents
      .map(function(a) { return a.category; })
      .filter(function(v, i, arr) { return arr.indexOf(v) === i; })
      .sort()
  );

  const filtered = agents.filter(function(a) {
    const matchCat = category === 'all' || a.category === category;
    const matchQ   = !search || (a.name || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <div className='max-w-6xl mx-auto px-4 py-6'>
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-10 h-10 bg-gradient-to-br from-purple-900 to-purple-700 rounded-xl flex items-center justify-center'>
          <Database size={20} className='text-white' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>SmartNation AI</h1>
          <p className='text-sm text-gray-500'>Registry and Intelligence Plane</p>
        </div>
        <div className='ml-auto flex items-center gap-2'>
          <span className='w-2 h-2 bg-green-400 rounded-full animate-pulse' />
          <span className='text-sm text-green-600 font-medium'>OPERATIONAL</span>
        </div>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        <StatCard icon={Database} label='Total Agents'    value={summary ? summary.totalAgents : agents.length || '--'}    color='purple' />
        <StatCard icon={Activity} label='Active Agents'   value={summary ? summary.activeAgents : '--'}   color='green'  />
        <StatCard icon={Shield}   label='Avg Gov Score'   value={summary ? summary.avgGovernanceScore + '%' : '--'} color='blue' />
        <StatCard icon={Grid}     label='Categories'      value={summary ? Object.keys(summary.byCategory || {}).length : categories.length - 1} color='indigo' />
      </div>

      {summary && summary.byTier && (
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6'>
          <h3 className='font-semibold text-gray-800 mb-4 flex items-center gap-2'>
            <Shield size={16} className='text-blue-500' /> Risk Tier Distribution
          </h3>
          <div className='grid grid-cols-3 md:grid-cols-4 gap-3'>
            {['TIER_1','TIER_2','TIER_3','TIER_4'].map(function(t) {
              const count = summary.byTier[t] || 0;
              const total = summary.totalAgents || 1;
              const pct   = Math.round((count / total) * 100);
              return (
                <div key={t} className='text-center p-3 rounded-xl bg-gray-50'>
                  <div className={'inline-block px-2 py-0.5 rounded-full text-xs font-bold border ' + (TIER_COLORS[t] || '')}>{t}</div>
                  <div className='text-2xl font-bold text-gray-900 mt-2'>{count}</div>
                  <div className='text-xs text-gray-400'>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
        <div className='p-5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap'>
          <h3 className='font-semibold text-gray-800'>
            Agent Registry
            <span className='ml-2 text-xs font-normal text-gray-400'>{filtered.length} agents</span>
          </h3>
          <div className='flex items-center gap-2'>
            <div className='relative'>
              <Search size={14} className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400' />
              <input type='text' placeholder='Search...' value={search}
                onChange={function(e) { setSearch(e.target.value); }}
                className='pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500' />
            </div>
            <select value={category}
              onChange={function(e) { setCategory(e.target.value); }}
              className='border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none'>
              {categories.map(function(c) {
                return <option key={c} value={c}>{c === 'all' ? 'All' : c}</option>;
              })}
            </select>
          </div>
        </div>

        {loading && (
          <div className='flex justify-center py-12'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600' />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className='p-12 text-center text-gray-400'>
            {agents.length === 0 ? 'Loading registry from SmartNation AI...' : 'No agents match your search'}
          </div>
        )}

        <div className='divide-y divide-gray-50'>
          {filtered.slice(0, 50).map(function(agent) {
            const tier = agent.riskTier || 'TIER_2';
            return (
              <div key={agent.agentId || agent.id} className='px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors'>
                <div className='text-2xl w-8 text-center shrink-0'>{agent.icon || '🤖'}</div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <span className='font-semibold text-gray-900 text-sm'>{agent.name}</span>
                    <span className={'text-xs px-1.5 py-0.5 rounded-full border font-medium ' + (TIER_COLORS[tier] || TIER_COLORS.TIER_2)}>
                      {tier}
                    </span>
                    {agent.tier === 'Premium' && (
                      <span className='text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700'>Premium</span>
                    )}
                  </div>
                  <div className='text-xs text-gray-400 mt-0.5'>{agent.category}</div>
                  <div className='flex items-center gap-3 mt-1 flex-wrap'>
                    <span className='flex items-center gap-1 text-xs text-gray-400'>
                      <Star size={10} className='text-yellow-400 fill-yellow-400' />
                      {agent.rating || '4.5'}
                    </span>
                    <span className='text-xs text-gray-400'>{(agent.deployments || 0).toLocaleString()} deployments</span>
                    <button
                      onClick={function() { handleSmartNationDeploy(agent); }}
                      disabled={deploying[agent.agentId || agent.id]}
                      className='px-2 py-0.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 ml-1'
                    >
                      {deploying[agent.agentId || agent.id] ? '...' : '🚀 Deploy'}
                    </button>
                    <span className='text-xs text-gray-400'>{agent.successRate || 95}% success</span>
                    {(agent.compliance || []).slice(0, 2).map(function(c) {
                      return (
                        <span key={c} className='px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-xs'>{c}</span>
                      );
                    })}
                  </div>
                </div>
                <ScoreRing score={agent.governanceScore || 85} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}