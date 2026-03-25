import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [companies, setCompanies] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('consolidated');
  const [tenantData, setTenantData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tok = localStorage.getItem('ci_token') || localStorage.getItem('token') || '';
    fetch('https://api.coreidentitygroup.com/api/tenants', { headers: { 'Authorization': 'Bearer ' + tok } })
      .then(r => r.json())
      .then(r => setCompanies(Array.isArray(r) ? r : (r && r.data ? r.data : [])))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedTenant === 'consolidated') { setTenantData(null); return; }
    setLoading(true);
    api.get('/api/tenants/' + selectedTenant)
      .then(r => setTenantData(r && r.data ? r.data : r))
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