import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  retry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      <div className="w-11 h-11 rounded-lg ring-1 ring-inset ring-red-200 dark:ring-red-500/30 bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-13 text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
        {message}
      </p>
      {retry && (
        <button
          onClick={retry}
          className="btn-secondary"
        >
          Try Again
        </button>
      )}
    </div>
  );
};
