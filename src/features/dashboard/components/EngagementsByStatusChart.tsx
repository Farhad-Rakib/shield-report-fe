import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { EngagementStatusPoint } from '../../../domain/models/dashboard.model';

interface Props {
  data: EngagementStatusPoint[];
  loading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  Scheduled: '#64748b',
  InProgress: '#06b6d4',
  InReview: '#d97706',
  Completed: '#10b981',
};

export function EngagementsByStatusChart({ data, loading }: Props) {
  if (loading) return <ChartSkeleton />;
  if (data.length === 0) return <EmptyChart />;

  const chartData = data.map((d) => ({ name: d.status, value: d.count }));

  return (
    <div className="panel p-4">
      <div className="mb-4">
        <h3 className="panel-title">Engagements by Status</h3>
        <p className="panel-subtitle">Engagements created within the selected range</p>
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
            {chartData.map((d) => (
              <Cell key={d.name} fill={STATUS_COLORS[d.name] ?? '#9ca3af'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => [`${v}`, 'Engagements']}
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
      <h3 className="panel-title mb-4">Engagements by Status</h3>
      <div className="h-[300px] flex items-center justify-center rounded-md border border-dashed border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 text-13">
        No engagements in range
      </div>
    </div>
  );
}
