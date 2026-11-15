import { BaseRepository } from '../base.repository';
import type { ApiResponse } from '../../../domain/dto/auth.dto';
import type {
  ExportFindingsReportPdfRequestDto,
  FindingsReportTemplateOptionDto,
  GetFindingsReportRequestDto,
  GetFindingsReportResponseDto,
} from '../../../domain/dto/findings-report.dto';

function fileNameFrom(header: unknown, fallback: string): string {
  if (typeof header !== 'string') return fallback;
  const extended = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (extended) {
    try {
      return decodeURIComponent(extended[1].trim());
    } catch {
      /* fall through */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : fallback;
}

class FindingsReportApi extends BaseRepository {
  constructor() {
    super('/findings-report');
  }

  async getReport(params: GetFindingsReportRequestDto): Promise<GetFindingsReportResponseDto> {
    const res = await this.get<ApiResponse<GetFindingsReportResponseDto>>('', { params: { ...params } });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  /** Findings summary templates (with their dynamic fields) for the PDF export. */
  async templates(): Promise<FindingsReportTemplateOptionDto[]> {
    const res = await this.get<ApiResponse<FindingsReportTemplateOptionDto[]>>('/templates');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  // Binary response, so this bypasses the JSON-typed post<T>(). On failure the error body is a
  // Blob too: read the server's message out of it so callers can show it.
  async exportPdf(dto: ExportFindingsReportPdfRequestDto): Promise<{ blob: Blob; fileName: string }> {
    try {
      const response = await this.client.post('/findings-report/export-pdf', dto, { responseType: 'blob', timeout: 180_000 });
      const fallback = `findings-report-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.pdf`;
      return { blob: response.data, fileName: fileNameFrom(response.headers['content-disposition'], fallback) };
    } catch (err) {
      const data = (err as { response?: { data?: unknown } })?.response?.data;
      if (data instanceof Blob) {
        let message: string | undefined;
        try {
          message = (JSON.parse(await data.text()) as { message?: string }).message;
        } catch {
          /* not JSON */
        }
        if (message) throw new Error(message);
      }
      throw err;
    }
  }
}

export const findingsReportApi = new FindingsReportApi();
