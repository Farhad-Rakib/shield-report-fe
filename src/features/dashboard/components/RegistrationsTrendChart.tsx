import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { RegistrationTrendPoint } from '../../../domain/models/dashboard.model';

interface Props {
  data: RegistrationTrendPoint[];
  loading?: boolean;
}

export function RegistrationsTrendChart({ data, loading }: Props) {
  if (loading) return <ChartSkeleton />;
  if (data.length === 0) return <EmptyChart />;

  return (
    <div className="panel p-4">
      <div className="mb-4">
        <h3 className="panel-title">User Registrations</h3>
        <p className="panel-subtitle">New users over the last 6 months</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="registrationsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 6, color: 'var(--tooltip-fg)', fontSize: 12 }}
            labelStyle={{ color: 'var(--tooltip-fg)', fontWeight: 600 }}
            itemStyle={{ color: 'var(--tooltip-fg)' }}
          />
          <Area type="monotone" dataKey="count" name="New users" stroke="#06b6d4" strokeWidth={2} fill="url(#registrationsGrad)" />
        </AreaChart>
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
      <h3 className="panel-title mb-4">User Registrations</h3>
      <div className="h-[300px] flex items-center justify-center rounded-md border border-dashed border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 text-13">
        No registration data available
      </div>
    </div>
  );
}
