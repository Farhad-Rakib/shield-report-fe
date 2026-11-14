import { useEscapeToClose } from '../../../core/hooks/useEscapeToClose';
import { X, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const variantStyles = {
  danger: 'btn-danger',
  warning: 'btn bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-gray-950 dark:hover:bg-amber-400',
  info: 'btn-primary',
};

const variantIcon = {
  danger: { Icon: ShieldAlert, tone: 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30' },
  warning: { Icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30' },
  info: { Icon: Info, tone: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/30' },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
}) => {
  useEscapeToClose(isOpen, onClose);

  if (!isOpen) return null;

  const { Icon, tone } = variantIcon[variant];

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-[2px] animate-overlay-in"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-overlay max-w-md w-full animate-dialog-in">
        <div className="flex items-start gap-3 p-5">
          <div className={`w-8 h-8 shrink-0 rounded-md ring-1 ring-inset flex items-center justify-center ${tone}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-1.5 text-13 text-gray-600 dark:text-gray-300">{message}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close (Esc)"
            className="btn-icon -mr-1.5 -mt-1 h-7 w-7"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40 rounded-b-lg">
          <button onClick={onClose} className="btn-secondary">
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={variantStyles[variant]}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
