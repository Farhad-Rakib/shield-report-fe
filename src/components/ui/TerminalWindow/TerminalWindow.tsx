interface TerminalWindowProps {
  title: string;
  live?: boolean;
  children: React.ReactNode;
  className?: string;
}

// Shared dark terminal chrome — traffic-light dots + title bar — extracted from the mock
// terminal on the login page's SecurityShowcasePanel so the real scan console shares the same
// projectdiscovery.io-style look instead of two divergent implementations.
export const TerminalWindow: React.FC<TerminalWindowProps> = ({ title, live = false, children, className = '' }) => {
  return (
    <div className={`rounded-lg border border-gray-800 bg-[#07090c] shadow-overlay overflow-hidden ${className}`}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.06] bg-white/[0.03]">
        <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
        <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
        <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
        <span className="ml-2 text-2xs text-gray-400 font-mono tracking-wide">{title}</span>
        {live && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
            </span>
            live
          </span>
        )}
      </div>
      {children}
    </div>
  );
};
