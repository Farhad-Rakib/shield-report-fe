import { Briefcase, Radar, Bug } from 'lucide-react';
import type { RecentActivity } from '../../../domain/models/dashboard.model';

interface RecentActivityTableProps {
  activity: RecentActivity[];
  loading?: boolean;
}

const TYPE_ICON: Record<RecentActivity['type'], React.ComponentType<{ className?: string }>> = {
  Engagement: Briefcase,
  Scan: Radar,
  Vulnerability: Bug,
};

export function RecentActivityTable({ activity, loading }: RecentActivityTableProps) {
  if (loading) {
    return (
      <div className="panel p-4">
        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-40 mb-4 animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 bg-gray-100 dark:bg-gray-800/60 rounded mb-2 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!activity.length) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No activity yet</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Engagements, scans, and findings will show up here.</p>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="panel-header block">
        <h3 className="panel-title">Recent Activity</h3>
        <p className="panel-subtitle">Latest engagements, scans, and findings</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50/80 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <tr>
              {['Type', 'Title', 'Client', 'Status', 'When'].map((h) => (
                <th key={h} className="table-th">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {activity.map((item, idx) => {
              const Icon = TYPE_ICON[item.type];
              return (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-2.5 text-13 text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" /> {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-13 font-medium text-gray-900 dark:text-gray-100">{item.title}</td>
                  <td className="px-4 py-2.5 text-13 text-gray-600 dark:text-gray-400">{item.clientOrganizationName ?? '—'}</td>
                  <td className="px-4 py-2.5 text-13">{item.status ? <span className="badge-neutral">{item.status}</span> : <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-2.5 mono whitespace-nowrap text-gray-500 dark:text-gray-400">{new Date(item.occurredAt).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
