import type { RecentUser } from '../../../domain/models/dashboard.model';

interface RecentUsersTableProps {
  users: RecentUser[];
  loading?: boolean;
}

export function RecentUsersTable({ users, loading }: RecentUsersTableProps) {
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

  if (!users.length) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No users yet</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Newly registered users will show up here.</p>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="panel-header block">
        <h3 className="panel-title">Recent Users</h3>
        <p className="panel-subtitle">Most recently registered users</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50/80 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <tr>
              {['Name', 'Email', 'Roles', 'Status', 'Joined'].map(h => (
                <th key={h} className="table-th">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-2.5 text-13 font-medium text-gray-900 dark:text-gray-100">{user.fullName}</td>
                <td className="px-4 py-2.5 mono text-gray-600 dark:text-gray-400">{user.email}</td>
                <td className="px-4 py-2.5 text-13 text-gray-600 dark:text-gray-400">{user.roles.join(', ') || '—'}</td>
                <td className="px-4 py-2.5 text-13">
                  <span className={user.isActive ? 'badge-success' : 'badge-neutral'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-13 text-gray-600 dark:text-gray-400">
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
