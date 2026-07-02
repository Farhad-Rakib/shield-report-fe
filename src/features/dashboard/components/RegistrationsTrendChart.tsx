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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">User Registrations</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">New users over the last 6 months</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="registrationsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-gray-500 dark:fill-gray-400" />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-gray-500 dark:fill-gray-400" />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
          <Area type="monotone" dataKey="count" name="New users" stroke="#3b82f6" strokeWidth={2} fill="url(#registrationsGrad)" />
        </AreaChart>
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
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">User Registrations</h3>
      <div className="h-[300px] flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        No registration data available
      </div>
    </div>
  );
}
