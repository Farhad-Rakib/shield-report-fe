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
    <div className={`rounded-lg border border-blue-500/20 bg-black/40 shadow-2xl overflow-hidden ${className}`}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10 bg-white/5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-gray-400 font-mono">{title}</span>
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
