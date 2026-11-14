import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronsUpDown, Plus } from 'lucide-react';
import { Loader } from '../ui/Loader/Loader';
import { EmptyState } from '../ui/EmptyState/EmptyState';
import { ErrorState } from '../ui/ErrorState/ErrorState';
import { Autocomplete, AutocompleteOption } from '../ui/Autocomplete/Autocomplete';

export interface RowAction<T> {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: (row: T) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  show?: (row: T) => boolean;
}

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  error?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  searchOptions?: AutocompleteOption[];
  sortable?: boolean;
  onSort?: (key: keyof T, order: 'asc' | 'desc') => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  emptyState?: {
    title: string;
    description?: string;
  };
  actions?: {
    add?: {
      label: string;
      onClick: () => void;
    };
  };
  rowActions?: RowAction<T>[];
  onRetry?: () => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading,
  error,
  searchable = true,
  searchPlaceholder = 'Search...',
  onSearch,
  searchOptions,
  sortable = true,
  onSort,
  pagination,
  emptyState,
  actions,
  rowActions,
  onRetry,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | null;
    order: 'asc' | 'desc';
  }>({ key: null, order: 'asc' });

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    onSearch?.(term);
  };

  const handleSort = (key: keyof T) => {
    if (!sortable) return;

    const newOrder =
      sortConfig.key === key && sortConfig.order === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, order: newOrder });
    onSort?.(key, newOrder);
  };

  const getSortIcon = (columnKey: keyof T | string) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />;
    }
    return sortConfig.order === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
    );
  };

  if (error) {
    return <ErrorState message={error} retry={onRetry} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        {searchable && (
          <div className="flex-1 max-w-sm">
            {searchOptions ? (
              <Autocomplete
                options={searchOptions}
                value={searchTerm}
                onChange={(val) => handleSearch(val)}
                placeholder={searchPlaceholder}
                onSearch={(q) => handleSearch(q)}
                clearable
              />
            ) : (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="input pl-8"
                />
              </div>
            )}
          </div>
        )}

        {actions?.add && (
          <button
            onClick={actions.add.onClick}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            {actions.add.label}
          </button>
        )}
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-13">
            <thead className="bg-gray-50/80 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <tr>
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={`table-th whitespace-nowrap ${
                      column.sortable !== false && sortable
                        ? 'cursor-pointer select-none hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800/70'
                        : ''
                    }`}
                    style={{ width: column.width }}
                    onClick={() =>
                      column.sortable !== false && sortable && handleSort(column.key as keyof T)
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      {column.label}
                      {column.sortable !== false && sortable && getSortIcon(column.key)}
                    </div>
                  </th>
                ))}
                {rowActions && rowActions.length > 0 && (
                  <th className="table-th text-right w-px whitespace-nowrap">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length + (rowActions && rowActions.length > 0 ? 1 : 0)}>
                    <Loader />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (rowActions && rowActions.length > 0 ? 1 : 0)}>
                    <EmptyState
                      title={emptyState?.title || 'No data found'}
                      description={emptyState?.description}
                    />
                  </td>
                </tr>
              ) : (
                data.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className="table-td"
                      >
                        {column.render
                          ? column.render(row[column.key as keyof T], row)
                          : String(row[column.key as keyof T] || '')}
                      </td>
                    ))}
                    {rowActions && rowActions.length > 0 && (
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {rowActions
                            .filter((action) => !action.show || action.show(row))
                            .map((action, idx) => {
                              const Icon = action.icon;
                              const variantStyles = {
                                primary: 'text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10',
                                secondary: 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800',
                                danger: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10',
                                success: 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10',
                                warning: 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10',
                              };
                              return (
                                <button
                                  key={idx}
                                  onClick={() => action.onClick(row)}
                                  aria-label={action.label}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    variantStyles[action.variant || 'secondary']
                                  }`}
                                  title={action.label}
                                >
                                  <Icon className="w-4 h-4" />
                                </button>
                              );
                            })}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && data.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 panel">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Rows per page</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
              className="input h-7 w-auto py-0 pl-2 pr-7 text-xs"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              Page <span className="font-medium text-gray-900 dark:text-gray-100">{pagination.currentPage}</span> of {pagination.totalPages} · {pagination.total} total
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="btn-secondary btn-sm"
              >
                Previous
              </button>
              <button
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
