import { ShieldCheck } from 'lucide-react';

interface BrandMarkProps {
  title?: string;
  subtitle?: string;
  compact?: boolean;
  /** `console` = light text for the dark sidebar; `auto` = follows the page theme. */
  tone?: 'console' | 'auto';
}

/** Product lock-up: shield tile + "ShieldReport" + "PentestOps" sub-label. */
export const BrandMark: React.FC<BrandMarkProps> = ({
  title = 'ShieldReport',
  subtitle = 'PentestOps',
  compact = false,
  tone = 'console',
}) => (
  <div className="flex items-center gap-2.5 min-w-0">
    <div className="relative w-8 h-8 shrink-0 rounded-md flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 ring-1 ring-inset ring-white/20 shadow-[0_0_0_1px_rgba(6,182,212,0.25),0_4px_12px_-4px_rgba(6,182,212,0.6)]">
      <ShieldCheck className="w-[18px] h-[18px] text-gray-950" strokeWidth={2.25} />
    </div>
    {!compact && (
      <div className="min-w-0 leading-tight">
        <p
          className={`text-sm font-semibold tracking-tight truncate ${
            tone === 'console' ? 'text-white' : 'text-gray-900 dark:text-white'
          }`}
        >
          {title}
        </p>
        <p
          className={`text-2xs font-mono uppercase tracking-[0.14em] ${
            tone === 'console' ? 'text-brand-400' : 'text-brand-700 dark:text-brand-400'
          }`}
        >
          {subtitle}
        </p>
      </div>
    )}
  </div>
);
