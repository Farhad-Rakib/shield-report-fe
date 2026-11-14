import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import { toast } from '../../../components/ui/Toast/toast.store';
import { reportApi } from '../../../core/api/services/report.api';
import { ClientReport } from '../../../domain/models/report.model';

// Client portal: the organization's approved security reports (drafts are never shown).
export const PortalReportsPage: React.FC = () => {
  const { data: reports = [], isLoading, error } = useQuery({ queryKey: ['portal-reports'], queryFn: () => reportApi.portalList() });

  const download = async (report: ClientReport, format: 'pdf' | 'docx') => {
    try {
      const blob = await reportApi.portalDownload(report.id, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `security-report-v${report.version}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download the report. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Approved security assessment reports for your organization. These documents are confidential.</p>
      </div>

      {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">Reports could not be loaded.</p>}
      {!isLoading && !error && reports.length === 0 && (
        <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-10 text-center text-gray-500 dark:text-gray-400">
          No reports have been published yet. You'll be notified when one is available.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <div key={report.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 flex items-start gap-4">
            <FileText className="w-8 h-8 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{report.engagementTitle}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Version {report.version}.0{report.approvedAt ? ` · Published ${new Date(report.approvedAt).toLocaleDateString()}` : ''}
              </p>
              <div className="flex gap-2 mt-3">
                {report.pdfAvailable && (
                  <button onClick={() => download(report, 'pdf')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                    <Download className="w-4 h-4" /> PDF
                  </button>
                )}
                {report.wordAvailable && (
                  <button onClick={() => download(report, 'docx')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Download className="w-4 h-4" /> Word
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
