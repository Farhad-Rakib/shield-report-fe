import { BaseRepository } from '../base.repository';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { ReportTemplate } from '../../../domain/models/report-template.model';
import { CreateReportTemplateRequestDto, UpdateReportTemplateRequestDto } from '../../../domain/dto/report.dto';

class ReportTemplateApi extends BaseRepository {
  constructor() {
    super('/ReportTemplates');
  }

  async getAll(): Promise<ReportTemplate[]> {
    const res = await this.get<ApiResponse<ReportTemplate[]>>('');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async create(dto: CreateReportTemplateRequestDto): Promise<ReportTemplate> {
    const res = await this.post<ApiResponse<ReportTemplate>>('', dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async update(id: number, dto: UpdateReportTemplateRequestDto): Promise<ReportTemplate> {
    const res = await this.put<ApiResponse<ReportTemplate>>(`/${id}`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async remove(id: number): Promise<void> {
    const res = await this.delete<ApiResponse<any>>(`/${id}`);
    if (!res.success) throw new Error(res.message);
  }

  async uploadDocxTemplate(id: number, file: File): Promise<ReportTemplate> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await this.post<ApiResponse<ReportTemplate>>(`/${id}/docx-template`, formData, { contentType: 'multipart/form-data' });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async clearDocxTemplate(id: number): Promise<ReportTemplate> {
    const res = await this.delete<ApiResponse<ReportTemplate>>(`/${id}/docx-template`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async setDefault(id: number): Promise<ReportTemplate> {
    const res = await this.post<ApiResponse<ReportTemplate>>(`/${id}/set-default`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}

export const reportTemplateApi = new ReportTemplateApi();
