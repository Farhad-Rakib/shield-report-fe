import { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { reportApi } from '../../../core/api/services/report.api';
import { useAuthStore } from '../../auth/store/auth.store';

// OnlyOffice's Document Server injects this global once its api.js script loads — no npm
// package for it, the script is served by the Document Server container itself.
declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: (containerId: string, config: Record<string, unknown>) => { destroyEditor: () => void };
    };
  }
}

const EDITOR_CONTAINER_ID = 'report-editor-container';

interface ReportEditorModalProps {
  reportId: number;
  onClose: () => void;
}

function loadOnlyOfficeScript(documentServerUrl: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>('script[data-onlyoffice-api]');
  if (existing && window.DocsAPI) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${documentServerUrl}/web-apps/apps/api/documents/api.js`;
    script.dataset.onlyofficeApi = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load the document editor. Is the Document Server reachable?'));
    document.body.appendChild(script);
  });
}

export const ReportEditorModal: React.FC<ReportEditorModalProps> = ({ reportId, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<{ destroyEditor: () => void } | null>(null);
  const tokenPayload = useAuthStore((s) => s.tokenPayload);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await reportApi.startEditorSession(reportId);
        await loadOnlyOfficeScript(session.documentServerUrl);
        if (cancelled || !window.DocsAPI) return;

        const sourceUrl = `${session.apiHostForContainer}/api/v1/reports/${reportId}/editor-source?accessToken=${session.accessToken}`;
        const callbackUrl = `${session.apiHostForContainer}/api/v1/reports/${reportId}/editor-callback?accessToken=${session.accessToken}`;

        editorRef.current = window.DocsAPI.DocEditor(EDITOR_CONTAINER_ID, {
          document: {
            fileType: 'docx',
            key: session.documentKey,
            title: session.fileName,
            url: sourceUrl,
          },
          editorConfig: {
            mode: 'edit',
            callbackUrl,
            user: {
              id: tokenPayload?.sub || 'user',
              name: tokenPayload?.name || tokenPayload?.email || 'User',
            },
          },
          documentType: 'word',
          width: '100%',
          height: '100%',
        });
        setIsLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err.message || 'Failed to open the document editor');
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      editorRef.current?.destroyEditor();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Editing report draft</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="relative flex-1">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading editor...
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        <div id={EDITOR_CONTAINER_ID} className="w-full h-full" />
      </div>
    </div>
  );
};
