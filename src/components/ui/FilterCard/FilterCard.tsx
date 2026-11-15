import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, RotateCcw } from 'lucide-react';
import { clientOrganizationApi } from '../../../core/api/services/client-organization.api';
import { clientAssetApi } from '../../../core/api/services/client-asset.api';
import { engagementApi } from '../../../core/api/services/engagement.api';
import { ListFilterQuery } from '../../../domain/dto/list-filter.dto';

/** Values held by a list page's filter card. Empty string = no filter. */
export interface ListFilterValues {
  clientOrganizationId: string;
  clientAssetId: string;
  engagementId: string;
  from: string; // yyyy-MM-dd
  to: string;   // yyyy-MM-dd
}

export const EMPTY_LIST_FILTERS: ListFilterValues = { clientOrganizationId: '', clientAssetId: '', engagementId: '', from: '', to: '' };

/** Query params for the API: only the filters that are set, ids as numbers. */
export type ListFilterParams = ListFilterQuery;

export function toListFilterParams(values: ListFilterValues): ListFilterParams {
  return {
    clientOrganizationId: values.clientOrganizationId ? Number(values.clientOrganizationId) : undefined,
    clientAssetId: values.clientAssetId ? Number(values.clientAssetId) : undefined,
    engagementId: values.engagementId ? Number(values.engagementId) : undefined,
    from: values.from || undefined,
    to: values.to || undefined,
  };
}

/** Filter state for a list page. `params` is stable per value set, so it can go in a query key. */
export function useListFilters(initial: Partial<ListFilterValues> = {}) {
  const [values, setValues] = useState<ListFilterValues>({ ...EMPTY_LIST_FILTERS, ...initial });
  const params = useMemo(() => toListFilterParams(values), [values]);
  const isActive = Boolean(values.clientOrganizationId || values.clientAssetId || values.engagementId || values.from || values.to);
  return { values, setValues, params, isActive, reset: () => setValues(EMPTY_LIST_FILTERS) };
}

interface FilterCardProps {
  values: ListFilterValues;
  onChange: (values: ListFilterValues) => void;
  onReset?: () => void;
  /** Hide the client/asset pickers (e.g. a page already scoped to one client). */
  showClient?: boolean;
  showAsset?: boolean;
  /** Engagement picker beside the asset (off by default): engagements the user can see,
   *  narrowed to the chosen client and asset. */
  showEngagement?: boolean;
  showDateRange?: boolean;
  /** Label for the date range, e.g. "Created" or "Scanned". */
  dateLabel?: string;
  /** Extra page-specific filters rendered after the standard ones. */
  children?: React.ReactNode;
  /** Set when `children` filters are active too, so Reset is enabled for them. */
  extraActive?: boolean;
}

/**
 * Standard filter block for list pages: client, asset (loaded for the chosen client), optionally
 * engagement, and a date range. Changing the client clears the asset and the engagement. Lists are scoped server-side, so the pickers only
 * offer clients the user can see.
 */
export function FilterCard({
  values,
  onChange,
  onReset,
  showClient = true,
  showAsset = true,
  showEngagement = false,
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

  const assetId = values.clientAssetId ? Number(values.clientAssetId) : undefined;
  const { data: engagementData, isFetching: engagementsLoading } = useQuery({
    queryKey: ['engagements-picker', clientId, assetId],
    queryFn: () => engagementApi.getEngagements({ clientOrganizationId: clientId ?? undefined, clientAssetId: assetId, pageSize: 100 }),
    enabled: showEngagement,
  });
  const engagements = engagementData?.data ?? [];

  const set = (patch: Partial<ListFilterValues>) => onChange({ ...values, ...patch });
  const active = extraActive || Boolean(values.clientOrganizationId || values.clientAssetId || values.engagementId || values.from || values.to);

  return (
    <div className="panel px-3 py-2.5">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 self-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mr-1">
          <Filter className="w-3.5 h-3.5" />
          Filters
        </div>
        {showClient && (
          <div>
            <label className="label" htmlFor="filter-client">Client</label>
            <select
              id="filter-client"
              value={values.clientOrganizationId}
              onChange={(e) => set({ clientOrganizationId: e.target.value, clientAssetId: '', engagementId: '' })}
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
            <label className="label" htmlFor="filter-asset">Asset</label>
            <select
              id="filter-asset"
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
        {showEngagement && (
          <div>
            <label className="label" htmlFor="filter-engagement">Engagement</label>
            <select
              id="filter-engagement"
              value={values.engagementId}
              onChange={(e) => set({ engagementId: e.target.value })}
              className="input w-56"
            >
              <option value="">{engagementsLoading && engagements.length === 0 ? 'Loading…' : 'All engagements'}</option>
              {engagements.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {clientId === null ? `${eng.title} (${eng.clientOrganizationName})` : eng.title}
                </option>
              ))}
              {/* Keep a chosen engagement visible even if the narrowed list no longer contains it. */}
              {values.engagementId && !engagements.some((eng) => String(eng.id) === values.engagementId) && (
                <option value={values.engagementId}>Engagement #{values.engagementId}</option>
              )}
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
