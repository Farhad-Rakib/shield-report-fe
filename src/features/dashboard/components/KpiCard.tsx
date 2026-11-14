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

// `bar` = hairline accent at the top of the card; `icon` = icon tint; `value` = number colour
// (neutral except for the risk colours, so red/amber numbers actually stand out).
const colorMap: Record<KpiColor, { bar: string; icon: string; value: string }> = {
  red:     { bar: 'bg-sev-critical', icon: 'text-red-600 dark:text-red-400',         value: 'text-red-700 dark:text-red-400' },
  amber:   { bar: 'bg-sev-medium',   icon: 'text-amber-600 dark:text-amber-400',     value: 'text-amber-700 dark:text-amber-400' },
  emerald: { bar: 'bg-emerald-500',  icon: 'text-emerald-600 dark:text-emerald-400', value: 'text-gray-900 dark:text-white' },
  blue:    { bar: 'bg-brand-500',    icon: 'text-brand-700 dark:text-brand-400',     value: 'text-gray-900 dark:text-white' },
  purple:  { bar: 'bg-violet-500',   icon: 'text-violet-600 dark:text-violet-400',   value: 'text-gray-900 dark:text-white' },
  indigo:  { bar: 'bg-indigo-500',   icon: 'text-indigo-600 dark:text-indigo-400',   value: 'text-gray-900 dark:text-white' },
  gray:    { bar: 'bg-gray-400',     icon: 'text-gray-500 dark:text-gray-400',       value: 'text-gray-900 dark:text-white' },
};

export function KpiCard({ title, value, icon: Icon, color, href, loading }: KpiCardProps) {
  const navigate = useNavigate();
  const colors = colorMap[color];

  const handleClick = () => {
    if (href) navigate(href);
  };

  if (loading) {
    return (
      <div className="panel p-4 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-24" />
          <div className="h-4 w-4 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
        <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-16" />
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => { if (href && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleClick(); } }}
      role={href ? 'link' : undefined}
      tabIndex={href ? 0 : undefined}
      className={`panel relative overflow-hidden p-4 transition-colors duration-150 ${
        href ? 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50/60 dark:hover:bg-gray-800/40' : ''
      }`}
    >
      <span className={`absolute inset-x-0 top-0 h-0.5 ${colors.bar} opacity-80`} aria-hidden="true" />
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <Icon className={`h-4 w-4 shrink-0 ${colors.icon}`} />
      </div>
      <p className={`text-2xl font-semibold tracking-tight tabular-nums ${colors.value}`}>{value}</p>
    </div>
  );
}
