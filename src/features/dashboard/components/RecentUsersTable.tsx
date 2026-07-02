import type { RecentUser } from '../../../domain/models/dashboard.model';

interface RecentUsersTableProps {
  users: RecentUser[];
  loading?: boolean;
}

export function RecentUsersTable({ users, loading }: RecentUsersTableProps) {
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

  if (!users.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No users yet</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Newly registered users will show up here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Users</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Most recently registered users</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              {['Name', 'Email', 'Roles', 'Status', 'Joined'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{user.fullName}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{user.roles.join(', ') || '—'}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${
                    user.isActive
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
