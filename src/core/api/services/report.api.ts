import { BaseRepository } from '../base.repository';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { ClientReport, GenerateReportOptions, Report, ReportTemplateOption, ReportDelivery, ReportRecipientOption, UpdateReportSectionsRequest } from '../../../domain/models/report.model';
import { UpdateReportNarrativeRequestDto } from '../../../domain/dto/report.dto';

// filename*=UTF-8''… (RFC 5987) wins over the plain filename="…" ASP.NET also sends.
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

class ReportApi extends BaseRepository {
  constructor() {
    super('');
  }

  // Renders PDF + Word on the server (a few seconds); AI drafting happens afterwards in the background.
  async generate(engagementId: number, options?: Partial<GenerateReportOptions>): Promise<Report> {
    const res = await this.post<ApiResponse<Report>>(`/engagements/${engagementId}/reports`, options ?? {}, { timeout: 120_000 });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  // HTML of what Generate would produce with these options; nothing is saved.
  async previewNew(engagementId: number, options: Omit<GenerateReportOptions, 'draftWithAi'>): Promise<string> {
    const res = await this.post<ApiResponse<string>>(`/engagements/${engagementId}/reports/preview`, options, { timeout: 60_000 });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async templateOptions(): Promise<ReportTemplateOption[]> {
    const res = await this.get<ApiResponse<ReportTemplateOption[]>>('/reports/template-options');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async draftNarrative(id: number): Promise<Report> {
    const res = await this.post<ApiResponse<Report>>(`/reports/${id}/draft-narrative`, {});
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async listForEngagement(engagementId: number): Promise<Report[]> {
    const res = await this.get<ApiResponse<Report[]>>(`/engagements/${engagementId}/reports`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async updateNarrative(id: number, dto: UpdateReportNarrativeRequestDto): Promise<Report> {
    const res = await this.patch<ApiResponse<Report>>(`/reports/${id}/narrative`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async updateSections(id: number, dto: UpdateReportSectionsRequest): Promise<Report> {
    const res = await this.patch<ApiResponse<Report>>(`/reports/${id}/sections`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  // The exact HTML the PDF and Word files were produced from.
  async preview(id: number): Promise<string> {
    const res = await this.get<ApiResponse<string>>(`/reports/${id}/preview`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async recipientOptions(id: number): Promise<ReportRecipientOption[]> {
    const res = await this.get<ApiResponse<ReportRecipientOption[]>>(`/reports/${id}/recipient-options`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async send(id: number, dto: { recipients: string[]; message: string | null; attachWord: boolean }): Promise<ReportDelivery> {
    const res = await this.post<ApiResponse<ReportDelivery>>(`/reports/${id}/send`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async deliveries(id: number): Promise<ReportDelivery[]> {
    const res = await this.get<ApiResponse<ReportDelivery[]>>(`/reports/${id}/deliveries`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  // ---- Client portal ----
  async portalList(): Promise<ClientReport[]> {
    const res = await this.get<ApiResponse<ClientReport[]>>('/portal/reports');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async portalDownload(id: number, format: 'pdf' | 'docx'): Promise<Blob> {
    const response = await this.client.get(`/portal/reports/${id}/download-${format}`, { responseType: 'blob' });
    return response.data;
  }

  async approve(id: number): Promise<Report> {
    const res = await this.post<ApiResponse<Report>>(`/reports/${id}/approve`, {});
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async reject(id: number, reason: string): Promise<Report> {
    const res = await this.post<ApiResponse<Report>>(`/reports/${id}/reject`, { reason });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  // Re-fills the stored .docx draft from the report's current (possibly just-edited) narrative
  // fields — this is what "Save Narrative" triggers, per the edit-in-app-only decision (no
  // upload/download round-trip through Word).
  async regenerate(id: number): Promise<Report> {
    const res = await this.post<ApiResponse<Report>>(`/reports/${id}/regenerate`, {}, { timeout: 120_000 });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async convertToPdf(id: number): Promise<Report> {
    const res = await this.post<ApiResponse<Report>>(`/reports/${id}/convert-to-pdf`, {});
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async deleteReport(id: number): Promise<void> {
    const res = await this.delete<ApiResponse<null>>(`/reports/${id}`);
    if (!res.success) throw new Error(res.message);
  }

  // Bypasses the shared JSON-typed get<T>() — a binary download needs responseType: 'blob',
  // which isn't part of HttpRequestConfig, so this calls the underlying Axios client directly
  // (auth interceptor still applies since it's attached to `client` itself, not to get<T>()).
  // The file name comes from the server's Content-Disposition (a blob alone has none).
  async downloadDraft(id: number): Promise<{ blob: Blob; fileName: string }> {
    const response = await this.client.get(`/reports/${id}/download-docx`, { responseType: 'blob' });
    return { blob: response.data, fileName: fileNameFrom(response.headers['content-disposition'], `report-${id}.docx`) };
  }

  async downloadPdf(id: number): Promise<{ blob: Blob; fileName: string }> {
    const response = await this.client.get(`/reports/${id}/download-pdf`, { responseType: 'blob' });
    return { blob: response.data, fileName: fileNameFrom(response.headers['content-disposition'], `report-${id}.pdf`) };
  }
}

export const reportApi = new ReportApi();
