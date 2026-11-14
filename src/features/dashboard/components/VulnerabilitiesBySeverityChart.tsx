import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { SeverityBreakdownPoint } from '../../../domain/models/dashboard.model';
import { SEVERITY_HEX } from '../../../components/ui/Severity/severity';

interface Props {
  data: SeverityBreakdownPoint[];
  loading?: boolean;
}

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
const SEVERITY_COLORS: Record<string, string> = {
  Critical: SEVERITY_HEX.critical,
  High: SEVERITY_HEX.high,
  Medium: SEVERITY_HEX.medium,
  Low: SEVERITY_HEX.low,
  Informational: SEVERITY_HEX.info,
};

export function VulnerabilitiesBySeverityChart({ data, loading }: Props) {
  if (loading) return <ChartSkeleton />;
  if (data.length === 0) return <EmptyChart />;

  const chartData = SEVERITY_ORDER
    .map((severity) => ({ severity, count: data.find((d) => d.severity === severity)?.count ?? 0 }))
    .filter((d) => d.count > 0);

  return (
    <div className="panel p-4">
      <div className="mb-4">
        <h3 className="panel-title">Open Vulnerabilities by Severity</h3>
        <p className="panel-subtitle">Unresolved findings, current snapshot</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="severity" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: 'var(--chart-grid)', opacity: 0.4 }} contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 6, color: 'var(--tooltip-fg)', fontSize: 12 }}
            labelStyle={{ color: 'var(--tooltip-fg)', fontWeight: 600 }}
            itemStyle={{ color: 'var(--tooltip-fg)' }} />
          <Bar dataKey="count" name="Findings" radius={[3, 3, 0, 0]} maxBarSize={56}>
            {chartData.map((d) => (
              <Cell key={d.severity} fill={SEVERITY_COLORS[d.severity] ?? SEVERITY_HEX.info} />
            ))}
          </Bar>
        </BarChart>
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
      <h3 className="panel-title mb-4">Open Vulnerabilities by Severity</h3>
      <div className="h-[300px] flex items-center justify-center rounded-md border border-dashed border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 text-13">
        No open vulnerabilities in range
      </div>
    </div>
  );
}
