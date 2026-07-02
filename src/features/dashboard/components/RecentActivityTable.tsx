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
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4 animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded mb-2 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!activity.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No activity yet</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Engagements, scans, and findings will show up here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Latest engagements, scans, and findings</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              {['Type', 'Title', 'Client', 'Status', 'When'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {activity.map((item, idx) => {
              const Icon = TYPE_ICON[item.type];
              return (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" /> {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.clientOrganizationName ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.status ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{new Date(item.occurredAt).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
