import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { UsersByRolePoint } from '../../../domain/models/dashboard.model';

interface Props {
  data: UsersByRolePoint[];
  loading?: boolean;
}

const COLORS = [
  '#06b6d4', '#6366f1', '#10b981', '#d97706', '#8b5cf6',
  '#64748b', '#0ea5e9', '#84cc16', '#ec4899', '#ea580c',
];

export function UsersByRoleChart({ data, loading }: Props) {
  if (loading) return <ChartSkeleton />;
  if (data.length === 0) return <EmptyChart />;

  const chartData = data.map(d => ({ name: d.roleName, value: d.userCount }));

  return (
    <div className="panel p-4">
      <div className="mb-4">
        <h3 className="panel-title">Users by Role</h3>
        <p className="panel-subtitle">Distribution of users across roles</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={110}
            paddingAngle={2}
            stroke="none"
            dataKey="value"
            label={({ value }) => `${value}`}
            labelLine={false}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => [`${v}`, 'Users']}
            contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 6, color: 'var(--tooltip-fg)', fontSize: 12 }}
            labelStyle={{ color: 'var(--tooltip-fg)', fontWeight: 600 }}
            itemStyle={{ color: 'var(--tooltip-fg)' }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="panel p-4 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-48 mb-4" />
      <div className="h-[300px] bg-gray-100 dark:bg-gray-800/60 rounded-md" />
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="panel p-4">
      <h3 className="panel-title mb-4">Users by Role</h3>
      <div className="h-[300px] flex items-center justify-center rounded-md border border-dashed border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 text-13">
        No role data available
      </div>
    </div>
  );
}
