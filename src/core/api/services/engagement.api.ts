import { BaseRepository } from '../base.repository';
import { PaginatedResponse } from '../http.types';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { Engagement, EngagementTask } from '../../../domain/models/engagement.model';
import {
  CreateEngagementRequestDto,
  UpdateEngagementRequestDto,
  AssignEngagementUserRequestDto,
  CreateEngagementTaskRequestDto,
  UpdateEngagementTaskRequestDto,
  UpdateEngagementTaskStatusRequestDto,
} from '../../../domain/dto/engagement.dto';

class EngagementApi extends BaseRepository {
  constructor() {
    super('/engagements');
  }

  async getEngagements(params?: { clientOrganizationId?: number; page?: number; pageSize?: number }): Promise<PaginatedResponse<Engagement>> {
    const res = await this.get<ApiResponse<PaginatedResponse<Engagement>>>('', { params });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async getById(id: number): Promise<Engagement> {
    const res = await this.get<ApiResponse<Engagement>>(`/${id}`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async createEngagement(dto: CreateEngagementRequestDto): Promise<Engagement> {
    const res = await this.post<ApiResponse<Engagement>>('', dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async updateEngagement(id: number, dto: UpdateEngagementRequestDto): Promise<Engagement> {
    const res = await this.patch<ApiResponse<Engagement>>(`/${id}`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async assignUser(id: number, dto: AssignEngagementUserRequestDto): Promise<Engagement> {
    const res = await this.post<ApiResponse<Engagement>>(`/${id}/assignees`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async removeAssignee(id: number, userId: number): Promise<Engagement> {
    const res = await this.delete<ApiResponse<Engagement>>(`/${id}/assignees/${userId}`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async listTasks(id: number): Promise<EngagementTask[]> {
    const res = await this.get<ApiResponse<EngagementTask[]>>(`/${id}/tasks`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async createTask(id: number, dto: CreateEngagementTaskRequestDto): Promise<EngagementTask> {
    const res = await this.post<ApiResponse<EngagementTask>>(`/${id}/tasks`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async updateTask(id: number, taskId: number, dto: UpdateEngagementTaskRequestDto): Promise<EngagementTask> {
    const res = await this.patch<ApiResponse<EngagementTask>>(`/${id}/tasks/${taskId}`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async updateTaskStatus(id: number, taskId: number, dto: UpdateEngagementTaskStatusRequestDto): Promise<EngagementTask> {
    const res = await this.patch<ApiResponse<EngagementTask>>(`/${id}/tasks/${taskId}/status`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}

export const engagementApi = new EngagementApi();
