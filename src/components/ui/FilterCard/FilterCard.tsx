import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, RotateCcw } from 'lucide-react';
import { clientOrganizationApi } from '../../../core/api/services/client-organization.api';
import { clientAssetApi } from '../../../core/api/services/client-asset.api';
import { ListFilterQuery } from '../../../domain/dto/list-filter.dto';

/** Values held by a list page's filter card. Empty string = no filter. */
export interface ListFilterValues {
  clientOrganizationId: string;
  clientAssetId: string;
  from: string; // yyyy-MM-dd
  to: string;   // yyyy-MM-dd
}

export const EMPTY_LIST_FILTERS: ListFilterValues = { clientOrganizationId: '', clientAssetId: '', from: '', to: '' };

/** Query params for the API: only the filters that are set, ids as numbers. */
export type ListFilterParams = ListFilterQuery;

export function toListFilterParams(values: ListFilterValues): ListFilterParams {
  return {
    clientOrganizationId: values.clientOrganizationId ? Number(values.clientOrganizationId) : undefined,
    clientAssetId: values.clientAssetId ? Number(values.clientAssetId) : undefined,
    from: values.from || undefined,
    to: values.to || undefined,
  };
}

/** Filter state for a list page. `params` is stable per value set, so it can go in a query key. */
export function useListFilters(initial: Partial<ListFilterValues> = {}) {
  const [values, setValues] = useState<ListFilterValues>({ ...EMPTY_LIST_FILTERS, ...initial });
  const params = useMemo(() => toListFilterParams(values), [values]);
  const isActive = Boolean(values.clientOrganizationId || values.clientAssetId || values.from || values.to);
  return { values, setValues, params, isActive, reset: () => setValues(EMPTY_LIST_FILTERS) };
}

interface FilterCardProps {
  values: ListFilterValues;
  onChange: (values: ListFilterValues) => void;
  onReset?: () => void;
  /** Hide the client/asset pickers (e.g. a page already scoped to one client). */
  showClient?: boolean;
  showAsset?: boolean;
  showDateRange?: boolean;
  /** Label for the date range, e.g. "Created" or "Scanned". */
  dateLabel?: string;
  /** Extra page-specific filters rendered after the standard ones. */
  children?: React.ReactNode;
  /** Set when `children` filters are active too, so Reset is enabled for them. */
  extraActive?: boolean;
}

/**
 * Standard filter block for list pages: client, asset (loaded for the chosen client) and a date
 * range. Changing the client clears the asset. Lists are scoped server-side, so the pickers only
 * offer clients the user can see.
 */
export function FilterCard({
  values,
  onChange,
  onReset,
  showClient = true,
  showAsset = true,
  showDateRange = true,
  dateLabel = 'Date',
  children,
  extraActive = false,
}: FilterCardProps) {
  const clientId = values.clientOrganizationId ? Number(values.clientOrganizationId) : null;

  const { data: orgData } = useQuery({
    queryKey: ['client-organizations-picker'],
    queryFn: () => clientOrganizationApi.getOrganizations({ pageSize: 100 }),
    enabled: showClient,
  });
  const organizations = orgData?.data ?? [];

  const { data: assetData, isFetching: assetsLoading } = useQuery({
    queryKey: ['client-assets-picker', clientId],
    queryFn: () => clientAssetApi.getAssetsForClient(clientId!, { pageSize: 100 }),
    enabled: showAsset && clientId !== null,
  });
  const assets = assetData?.data ?? [];

  const set = (patch: Partial<ListFilterValues>) => onChange({ ...values, ...patch });
  const active = extraActive || Boolean(values.clientOrganizationId || values.clientAssetId || values.from || values.to);

  return (
    <div className="panel px-3 py-2.5">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 self-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mr-1">
          <Filter className="w-3.5 h-3.5" />
          Filters
        </div>
        {showClient && (
          <div>
            <label className="label">Client</label>
            <select
              value={values.clientOrganizationId}
              onChange={(e) => set({ clientOrganizationId: e.target.value, clientAssetId: '' })}
              className="input w-48"
            >
              <option value="">All clients</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
        )}
        {showAsset && (
          <div>
            <label className="label">Asset</label>
            <select
              value={values.clientAssetId}
              onChange={(e) => set({ clientAssetId: e.target.value })}
              className="input w-52"
              disabled={showClient && clientId === null}
              title={showClient && clientId === null ? 'Choose a client first' : undefined}
            >
              <option value="">
                {showClient && clientId === null ? 'Choose a client first' : assetsLoading ? 'Loading…' : 'All assets'}
              </option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.name} ({asset.identifier})</option>
              ))}
            </select>
          </div>
        )}
        {showDateRange && (
          <>
            <div>
              <label className="label">{dateLabel} from</label>
              <input
                type="date"
                value={values.from}
                max={values.to || undefined}
                onChange={(e) => set({ from: e.target.value })}
                className="input w-40"
              />
            </div>
            <div>
              <label className="label">{dateLabel} to</label>
              <input
                type="date"
                value={values.to}
                min={values.from || undefined}
                onChange={(e) => set({ to: e.target.value })}
                className="input w-40"
              />
            </div>
          </>
        )}
        {children}
        <button
          type="button"
          onClick={() => (onReset ? onReset() : onChange({ ...EMPTY_LIST_FILTERS }))}
          className="btn-ghost"
          disabled={!active}
          title="Clear filters"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
}
