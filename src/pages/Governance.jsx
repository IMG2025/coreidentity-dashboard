import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Lock, Eye } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const FRAMEWORK_DETAILS = {
  'SOC2': {
    controls: ['CC1 - Control Environment', 'CC2 - Communication', 'CC3 - Risk Assessment',
               'CC4 - Monitoring Activities', 'CC5 - Control Activities', 'CC6 - Logical Access',
               'CC7 - System Operations', 'CC8 - Change Management', 'CC9 - Risk Mitigation'],
    owner: 'Security Team',
    nextAudit: 'Jan 2027',
    certBody: 'AICPA'
  },
  'HIPAA': {
    controls: ['Privacy Rule - PHI Controls', 'Security Rule - Administrative Safeguards',
               'Security Rule - Physical Safeguards', 'Security Rule - Technical Safeguards',
               'Breach Notification Rule'],
    owner: 'Compliance Team',
    nextAudit: 'Jun 2026',
    certBody: 'HHS OCR'
  },
  'GDPR': {
    controls: ['Art 5 - Data Processing Principles', 'Art 13/14 - Transparency',
               'Art 17 - Right to Erasure', 'Art 25 - Privacy by Design',
               'Art 32 - Security of Processing', 'Art 35 - DPIA'],
    owner: 'Privacy Team',
    nextAudit: 'Mar 2026',
    certBody: 'EU DPA'
  },
  'CCPA': {
    controls: ['Right to Know', 'Right to Delete', 'Right to Opt-Out',
               'Non-Discrimination', 'Privacy Notice Requirements'],
    owner: 'Legal Team',
    nextAudit: 'Apr 2026',
    certBody: 'CA AG Office',
    issues: ['Right to Opt-Out flow needs update', 'Privacy Notice missing 2 disclosures']
  },
  'ISO 27001': {
    controls: ['A.5 - Policies', 'A.6 - Organization', 'A.7 - Human Resources',
               'A.8 - Asset Management', 'A.9 - Access Control', 'A.10 - Cryptography',
               'A.11 - Physical Security', 'A.12 - Operations', 'A.13 - Communications',
               'A.14 - System Acquisition', 'A.15 - Supplier Relations', 'A.16 - Incident Mgmt'],
    owner: 'InfoSec Team',
    nextAudit: 'Nov 2026',
    certBody: 'BSI Group'
  }
};

function FrameworkCard({ fw, isAdmin }) {
  const [expanded, setExpanded] = useState(false);
  const details = FRAMEWORK_DETAILS[fw.name] || {};
  const hasIssues = details.issues && details.issues.length > 0;
  return (
    <div className='border border-gray-100 rounded-xl overflow-hidden'>
      <button
        onClick={function() { setExpanded(function(p) { return !p; }); }}
        className='w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left'>
        <div className={'flex-shrink-0 ' + (fw.status === 'compliant' ? 'text-green-500' : 'text-yellow-500')}>
          {fw.status === 'compliant'
            ? <CheckCircle size={22} />
            : <AlertTriangle size={22} />}
        </div>
        <div className='flex-1'>
          <div className='font-semibold text-gray-900'>{fw.name}</div>
          <div className='text-xs text-gray-500'>{fw.description}</div>
        </div>
        <div className='flex items-center gap-3'>
          <span className={'text-lg font-bold ' + (fw.score >= 90 ? 'text-green-600' : fw.score >= 75 ? 'text-yellow-600' : 'text-red-600')}>
            {fw.score}%
          </span>
          {expanded ? <ChevronUp size={16} className='text-gray-400' /> : <ChevronDown size={16} className='text-gray-400' />}
        </div>
      </button>
      {expanded && (
        <div className='border-t border-gray-100 p-4 bg-gray-50'>
          <div className='grid md:grid-cols-3 gap-4 mb-4'>
            <div>
              <div className='text-xs text-gray-400 uppercase tracking-wide mb-1'>Owner</div>
              <div className='text-sm font-medium text-gray-800'>{details.owner || '-'}</div>
            </div>
            <div>
              <div className='text-xs text-gray-400 uppercase tracking-wide mb-1'>Next Audit</div>
              <div className='text-sm font-medium text-gray-800'>{details.nextAudit || '-'}</div>
            </div>
            <div>
              <div className='text-xs text-gray-400 uppercase tracking-wide mb-1'>Certifying Body</div>
              <div className='text-sm font-medium text-gray-800'>{details.certBody || '-'}</div>
            </div>
          </div>
          {hasIssues && (
            <div className='mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
              <div className='text-xs font-semibold text-yellow-700 mb-2 flex items-center gap-1'>
                <AlertTriangle size={12} /> Open Issues
              </div>
              {details.issues.map(function(issue, i) {
                return <div key={i} className='text-xs text-yellow-700'>- {issue}</div>;
              })}
            </div>
          )}
          {isAdmin && details.controls && (
            <div>
              <div className='text-xs text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1'><Lock size={10}/> Control Domains</div>
              <div className='grid grid-cols-1 gap-1'>
                {details.controls.map(function(ctrl, i) {
                  return (
                    <div key={i} className='text-xs text-gray-600 flex items-center gap-2'>
                      <CheckCircle size={10} className='text-green-400 shrink-0' />
                      {ctrl}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {!isAdmin && (
            <div className='flex items-center gap-2 text-xs text-gray-400 mt-2'>
              <Eye size={12} /> Control details visible to ADMIN only
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Governance() {
  const { user } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = user && user.role === 'ADMIN';

  useEffect(function() {
    api.getGovernance()
      .then(function(d) { setData(d); })
      .catch(function(e) { console.error(e); })
      .finally(function() { setLoading(false); });
  }, []);

  if (loading) return (
    <div className='flex items-center justify-center h-64'>
      <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600' />
    </div>
  );

  const scores = data ? data.scores : { overall: 98, dataPrivacy: 96, securityPosture: 94, riskScore: 92 };
  const frameworks = data ? data.frameworks : [];
  const alerts = data ? data.alerts : [];

  return (
    <div className='max-w-4xl mx-auto px-4 py-6'>
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-10 h-10 bg-gradient-to-br from-green-700 to-green-900 rounded-xl flex items-center justify-center'>
          <Shield size={20} className='text-white' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Governance</h1>
          <p className='text-sm text-gray-500'>Compliance oversight and framework management</p>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-4 mb-6'>
        {[
          ['Overall Compliance', scores.overall, 'Across all frameworks'],
          ['Data Privacy', scores.dataPrivacy, 'GDPR + CCPA'],
          ['Security Posture', scores.securityPosture, 'SOC2 controls'],
          ['Risk Score', scores.riskScore, 'Enterprise risk']
        ].map(function(item) {
          return (
            <div key={item[0]} className='bg-green-50 border border-green-100 rounded-2xl p-4'>
              <div className='text-sm text-gray-600 mb-1'>{item[0]}</div>
              <div className='text-3xl font-bold text-green-600'>{item[1]}%</div>
              <div className='text-xs text-gray-400 mt-1'>{item[2]}</div>
            </div>
          );
        })}
      </div>

      {alerts.length > 0 && (
        <div className='mb-6 space-y-2'>
          {alerts.map(function(alert, i) {
            return (
              <div key={i} className='flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl'>
                <AlertTriangle size={16} className='text-yellow-500 shrink-0 mt-0.5' />
                <div>
                  <div className='text-sm font-medium text-yellow-800'>{alert.title}</div>
                  <div className='text-xs text-yellow-600'>{alert.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
        <div className='p-5 border-b border-gray-100'>
          <h2 className='font-semibold text-gray-800'>Compliance Frameworks</h2>
          <p className='text-xs text-gray-400 mt-0.5'>Tap any framework to expand details</p>
        </div>
        <div className='divide-y divide-gray-50'>
          {frameworks.map(function(fw) {
            return <FrameworkCard key={fw.name} fw={fw} isAdmin={isAdmin} />;
          })}
          {frameworks.length === 0 && (
            <div className='p-8 text-center text-gray-400'>No framework data available</div>
          )}
        </div>
      </div>
    </div>
  );
}