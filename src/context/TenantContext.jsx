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
  useEffect(() => {
    if (selectedTenant === 'consolidated') { setTenantData(null); return; }
    setLoading(true);
    fetch(API + '/api/tenants/' + selectedTenant, {
      headers: { 'Authorization': 'Bearer ' + tok() }
    })
    .then(r => r.json())
    .then(d => setTenantData(d && d.data ? d.data : d))
    .catch(() => setTenantData(null))
    .finally(() => setLoading(false));
  }, [selectedTenant]);

  return (
    <TenantContext.Provider value={{ companies, selectedTenant, setSelectedTenant, tenantData, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() { return useContext(TenantContext); }
