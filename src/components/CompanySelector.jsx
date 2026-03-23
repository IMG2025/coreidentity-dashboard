import React from 'react';
import { useTenant } from '../context/TenantContext';
import { Building2 } from 'lucide-react';

export default function CompanySelector() {
  const { companies, selectedTenant, setSelectedTenant } = useTenant();
  if (!companies || companies.length === 0) return null;
  return (
    <div className="flex items-center gap-2 px-2">
      <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
      <select
        value={selectedTenant}
        onChange={function(e) { setSelectedTenant(e.target.value); }}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-48"
      >
        <option value="consolidated">All Companies</option>
        {companies.map(function(co) {
          return (
            <option key={co.clientId} value={co.clientId}>
              {co.companyName}
            </option>
          );
        })}
      </select>
    </div>
  );
}