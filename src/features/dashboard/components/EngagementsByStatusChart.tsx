import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { EngagementStatusPoint } from '../../../domain/models/dashboard.model';

interface Props {
  data: EngagementStatusPoint[];
  loading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  Scheduled: '#9ca3af',
  InProgress: '#3b82f6',
  InReview: '#f59e0b',
  Completed: '#10b981',
};

export function EngagementsByStatusChart({ data, loading }: Props) {
  if (loading) return <ChartSkeleton />;
  if (data.length === 0) return <EmptyChart />;

  const chartData = data.map((d) => ({ name: d.status, value: d.count }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Engagements by Status</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Engagements created within the selected range</p>
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
            dataKey="value"
            label={({ value }) => `${value}`}
            labelLine={false}
          >
            {chartData.map((d) => (
              <Cell key={d.name} fill={STATUS_COLORS[d.name] ?? '#9ca3af'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => [`${v}`, 'Engagements']}
            contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
          <Legend iconType="circle" iconSize={10} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
      <div className="h-[300px] bg-gray-100 dark:bg-gray-700 rounded-lg" />
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Engagements by Status</h3>
      <div className="h-[300px] flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        No engagements in range
      </div>
    </div>
  );
}
