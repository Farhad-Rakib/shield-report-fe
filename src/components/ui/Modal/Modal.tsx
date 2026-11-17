import { X } from 'lucide-react';
import { useEscapeToClose } from '../../../core/hooks/useEscapeToClose';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  // Near full-screen, for editors (e.g. the report template studio).
  full: 'max-w-[min(96vw,1680px)]',
};

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  // Hook runs before the early return (rules of hooks); it only listens while open.
  useEscapeToClose(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-[2px] animate-overlay-in" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-overlay w-full ${sizeClasses[size]} ${size === 'full' ? 'max-h-[95vh]' : 'max-h-[90vh]'} flex flex-col animate-dialog-in`}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close (Esc)"
            title="Close (Esc)"
            className="btn-icon -mr-1.5 h-7 w-7"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-13">{children}</div>
      </div>
    </div>
  );
};
