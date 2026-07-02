import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

type KpiColor = 'red' | 'amber' | 'emerald' | 'blue' | 'purple' | 'indigo' | 'gray';

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: KpiColor;
  href?: string;
  loading?: boolean;
}

const colorMap: Record<KpiColor, { bg: string; icon: string; value: string }> = {
  red:     { bg: 'bg-red-50 dark:bg-red-900/20',     icon: 'text-red-600 dark:text-red-400',     value: 'text-red-700 dark:text-red-300' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400', value: 'text-amber-700 dark:text-amber-300' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400', value: 'text-emerald-700 dark:text-emerald-300' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',   icon: 'text-blue-600 dark:text-blue-400',   value: 'text-blue-700 dark:text-blue-300' },
  purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', value: 'text-purple-700 dark:text-purple-300' },
  indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: 'text-indigo-600 dark:text-indigo-400', value: 'text-indigo-700 dark:text-indigo-300' },
  gray:    { bg: 'bg-gray-50 dark:bg-gray-800',      icon: 'text-gray-500 dark:text-gray-400',   value: 'text-gray-700 dark:text-gray-300' },
};

export function KpiCard({ title, value, icon: Icon, color, href, loading }: KpiCardProps) {
  const navigate = useNavigate();
  const colors = colorMap[color];

  const handleClick = () => {
    if (href) navigate(href);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 transition-all duration-150 ${
        href ? 'cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Icon className={`h-5 w-5 ${colors.icon}`} />
        </div>
      </div>
      <p className={`text-3xl font-bold ${colors.value}`}>{value}</p>
    </div>
  );
}
