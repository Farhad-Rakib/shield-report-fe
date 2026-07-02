import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { SeverityBreakdownPoint } from '../../../domain/models/dashboard.model';

interface Props {
  data: SeverityBreakdownPoint[];
  loading?: boolean;
}

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#10b981',
  Informational: '#9ca3af',
};

export function VulnerabilitiesBySeverityChart({ data, loading }: Props) {
  if (loading) return <ChartSkeleton />;
  if (data.length === 0) return <EmptyChart />;

  const chartData = SEVERITY_ORDER
    .map((severity) => ({ severity, count: data.find((d) => d.severity === severity)?.count ?? 0 }))
    .filter((d) => d.count > 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Open Vulnerabilities by Severity</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Unresolved findings, current snapshot</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis dataKey="severity" tick={{ fontSize: 12 }} className="fill-gray-500 dark:fill-gray-400" />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-gray-500 dark:fill-gray-400" />
          <Tooltip contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid #e5e7eb', borderRadius: 8 }} />
          <Bar dataKey="count" name="Findings" radius={[4, 4, 0, 0]}>
            {chartData.map((d) => (
              <Cell key={d.severity} fill={SEVERITY_COLORS[d.severity] ?? '#9ca3af'} />
            ))}
          </Bar>
        </BarChart>
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
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Open Vulnerabilities by Severity</h3>
      <div className="h-[300px] flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        No open vulnerabilities in range
      </div>
    </div>
  );
}
