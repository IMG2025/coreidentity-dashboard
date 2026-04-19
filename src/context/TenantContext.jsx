import React, { createContext, useContext, useState, useEffect } from 'react';

const TenantContext = createContext(null);
const API = 'https://api.coreidentitygroup.com';
const tok = () => localStorage.getItem('ci_token') || localStorage.getItem('token') || '';

export function TenantProvider({ children }) {
  const [companies,       setCompanies]       = useState([]);
  const [selectedTenant,  setSelectedTenant]  = useState('consolidated');
  const [tenantData,      setTenantData]      = useState(null);
  const [loading,         setLoading]         = useState(false);

  // Load company list on mount
  useEffect(() => {
    fetch(API + '/api/tenants', {
      headers: { 'Authorization': 'Bearer ' + tok() }
    })
    .then(r => r.json())
    .then(d => setCompanies(Array.isArray(d) ? d : (d && d.data ? d.data : [])))
    .catch(() => setCompanies([]));
  }, []);

  // Load tenant detail when selection changes
  // TENANTCTX_ABORT_FIX: AbortController + 8s timeout prevents back-button hang
  useEffect(() => {
    if (selectedTenant === 'consolidated') { setTenantData(null); return; }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    fetch(API + '/api/tenants/' + selectedTenant, {
      headers: { 'Authorization': 'Bearer ' + tok() },
      signal: ctrl.signal,
    })
    .then(r => r.json())
    .then(d => setTenantData(d && d.data ? d.data : d))
    .catch(() => setTenantData(null))
    .finally(() => { clearTimeout(timer); setLoading(false); });
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [selectedTenant]);

  return (
    <TenantContext.Provider value={{ companies, selectedTenant, setSelectedTenant, tenantData, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() { return useContext(TenantContext); }
