import { useQuery } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { clientOrganizationApi } from '../../../core/api/services/client-organization.api';

interface DashboardFilterBarProps {
  clientOrganizationId: string;
  onClientChange: (value: string) => void;
  from: string;
  onFromChange: (value: string) => void;
  to: string;
  onToChange: (value: string) => void;
  onReset: () => void;
}

export function DashboardFilterBar({
  clientOrganizationId,
  onClientChange,
  from,
  onFromChange,
  to,
  onToChange,
  onReset,
}: DashboardFilterBarProps) {
  const { data: orgData } = useQuery({
    queryKey: ['client-organizations-picker'],
    queryFn: () => clientOrganizationApi.getOrganizations({ pageSize: 100 }),
  });
  const organizations = orgData?.data ?? [];

  return (
    <div className="panel flex items-end gap-3 flex-wrap px-3 py-2.5">
      <div>
        <label className="label">Client</label>
        <select
          value={clientOrganizationId}
          onChange={(e) => onClientChange(e.target.value)}
          className="input w-48"
        >
          <option value="">All Clients</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="input w-40"
        />
      </div>
      <div>
        <label className="label">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="input w-40"
        />
      </div>
      <button
        onClick={onReset}
        className="btn-ghost"
        title="Reset filters"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset
      </button>
    </div>
  );
}
