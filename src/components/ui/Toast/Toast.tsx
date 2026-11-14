import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastStore, ToastType } from './toast.store';

const toastStyles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-white dark:bg-gray-900',
    border: 'before:bg-emerald-500',
    icon: <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />,
  },
  error: {
    bg: 'bg-white dark:bg-gray-900',
    border: 'before:bg-red-500',
    icon: <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />,
  },
  warning: {
    bg: 'bg-white dark:bg-gray-900',
    border: 'before:bg-amber-500',
    icon: <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />,
  },
  info: {
    bg: 'bg-white dark:bg-gray-900',
    border: 'before:bg-brand-500',
    icon: <Info className="w-4 h-4 mt-0.5 shrink-0 text-brand-700 dark:text-brand-400" />,
  },
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[80] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm">
      {toasts.map((toast) => {
        const style = toastStyles[toast.type];
        return (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`${style.bg} ${style.border} relative overflow-hidden border border-gray-200 dark:border-gray-800 pl-4 pr-3 py-3 rounded-lg shadow-overlay flex items-start gap-2.5 animate-toast-in before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']`}
          >
            {style.icon}
            <p className="flex-1 text-13 text-gray-800 dark:text-gray-200">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
              className="shrink-0 -mr-1 p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
