export type ContentType = 'application/json' | 'multipart/form-data' | 'application/x-www-form-urlencoded';

export interface HttpRequestConfig {
  baseUrl?: string;
  contentType?: ContentType;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  // Per-request override of AppConfig.api.timeout (ms), for calls known to be slow.
  timeout?: number;
}

export interface PaginatedRequest {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
