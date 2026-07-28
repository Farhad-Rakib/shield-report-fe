import { BaseRepository } from '../base.repository';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { Report, ReportEditorSession } from '../../../domain/models/report.model';
import { UpdateReportNarrativeRequestDto } from '../../../domain/dto/report.dto';

class ReportApi extends BaseRepository {
  constructor() {
    super('');
  }

  async generate(engagementId: number): Promise<Report> {
    const res = await this.post<ApiResponse<Report>>(`/engagements/${engagementId}/reports`, {});
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
    const res = await this.post<ApiResponse<Report>>(`/reports/${id}/regenerate`, {});
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async convertToPdf(id: number): Promise<Report> {
    const res = await this.post<ApiResponse<Report>>(`/reports/${id}/convert-to-pdf`, {});
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  // Bypasses the shared JSON-typed get<T>() — a binary download needs responseType: 'blob',
  // which isn't part of HttpRequestConfig, so this calls the underlying Axios client directly
  // (auth interceptor still applies since it's attached to `client` itself, not to get<T>()).
  async downloadDraft(id: number): Promise<Blob> {
    const response = await this.client.get(`/reports/${id}/download-docx`, { responseType: 'blob' });
    return response.data;
  }

  async downloadPdf(id: number): Promise<Blob> {
    const response = await this.client.get(`/reports/${id}/download-pdf`, { responseType: 'blob' });
    return response.data;
  }

  async startEditorSession(id: number): Promise<ReportEditorSession> {
    const res = await this.post<ApiResponse<ReportEditorSession>>(`/reports/${id}/editor-session`, {});
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}

export const reportApi = new ReportApi();
