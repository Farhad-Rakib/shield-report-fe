import { Fragment, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, History, Search } from 'lucide-react';
import { auditLogApi } from '../../../core/api/services/audit-log.api';
import { AuditLogEntry } from '../../../domain/models/audit-log.model';

const ACTIONS = ['Created', 'Updated', 'Deleted', 'LoginSucceeded', 'LoginFailed', 'MfaChallengeIssued', 'MfaSucceeded', 'MfaFailed', 'Downloaded'];

const ACTION_STYLES: Record<string, string> = {
  Created: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Updated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Deleted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  LoginFailed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MfaFailed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Downloaded: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const inputClass =
  'px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

const formatValue = (value: unknown) => (value === null || value === undefined ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value));

// Data changes are stored as {"Prop": {"old": x, "new": y}}; security events as free-form details.
const ChangesView: React.FC<{ changes: string | null }> = ({ changes }) => {
  if (!changes) return <p className="text-sm text-gray-500 dark:text-gray-400">No details recorded.</p>;

  type Diff = { old?: unknown; new?: unknown };
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(changes);
  } catch {
    return <pre className="text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300">{changes}</pre>;
  }

  const isDiff = Object.values(parsed).every((v) => !!v && typeof v === 'object' && ('old' in (v as object) || 'new' in (v as object)));
  if (!isDiff) {
    return <pre className="text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300">{JSON.stringify(parsed, null, 2)}</pre>;
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-gray-500 dark:text-gray-400">
          <th className="py-1 pr-4 font-medium">Field</th>
          <th className="py-1 pr-4 font-medium">Old</th>
          <th className="py-1 font-medium">New</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(parsed as Record<string, Diff>).map(([field, v]) => (
          <tr key={field} className="border-t border-gray-100 dark:border-gray-700 align-top">
            <td className="py-1 pr-4 font-medium text-gray-800 dark:text-gray-200">{field}</td>
            <td className="py-1 pr-4 text-red-700 dark:text-red-400 break-all">{formatValue(v.old)}</td>
            <td className="py-1 text-emerald-700 dark:text-emerald-400 break-all">{formatValue(v.new)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const AuditLogPage: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [entityName, setEntityName] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const pageSize = 50;

  // Debounce the free-text search so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => setPage(1), [search, entityName, action, from, to]);

  const { data: entityNames = [] } = useQuery({ queryKey: ['audit-log-entity-names'], queryFn: () => auditLogApi.entityNames() });

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', page, search, entityName, action, from, to],
    queryFn: () =>
      auditLogApi.search({
        page,
        pageSize,
        search: search || undefined,
        entityName: entityName || undefined,
        action: action || undefined,
        from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
      }),
  });

  const entries: AuditLogEntry[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <History className="w-6 h-6" /> Audit Log
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Every data change (who, when, from where, old → new) plus sign-ins, MFA and file downloads. Secrets are masked.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={`${inputClass} pl-9 w-64`} placeholder="Search user, entity, action, IP…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <select className={inputClass} value={entityName} onChange={(e) => setEntityName(e.target.value)}>
          <option value="">All entities</option>
          {entityNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select className={inputClass} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <label className="text-xs text-gray-500 dark:text-gray-400">
          From
          <input type="date" className={`${inputClass} block`} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400">
          To
          <input type="date" className={`${inputClass} block`} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/40 text-left text-gray-600 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 w-8" />
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">Loading…</td></tr>
            )}
            {error && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-red-600 dark:text-red-400">{(error as Error).message}</td></tr>
            )}
            {!isLoading && !error && entries.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No audit entries match these filters.</td></tr>
            )}
            {entries.map((entry) => (
              <Fragment key={entry.id}>
                <tr
                  onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                  className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
                >
                  <td className="px-4 py-2 text-gray-400">{expanded === entry.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{entry.userEmail ?? (entry.userId ? `user #${entry.userId}` : <span className="italic text-gray-400">system</span>)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ACTION_STYLES[entry.action] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>{entry.action}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{entry.entityName} <span className="text-gray-400">#{entry.entityId}</span></td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{entry.ipAddress ?? '—'}</td>
                </tr>
                {expanded === entry.id && (
                  <tr className="bg-gray-50 dark:bg-gray-900/30">
                    <td />
                    <td colSpan={5} className="px-4 py-3"><ChangesView changes={entry.changes} /></td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>{data ? `${data.total} entries` : ''}</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40">Previous</button>
          <span>Page {data?.page ?? page} of {data?.totalPages || 1}</span>
          <button disabled={!data || page >= data.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
};
