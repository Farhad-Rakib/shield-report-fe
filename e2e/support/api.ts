import { APIRequestContext, request as playwrightRequest, expect } from '@playwright/test';

// Direct API access for setup, verification and cleanup. Goes to the API's localhost debug port
// (not through the proxy) so it never competes with the browser for the proxy, but it is the
// same API and database.
export const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:5050/api/v1';
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'superadmin@localhost';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'SuperAdmin@123!';

export const runId = () => process.env.E2E_RUN_ID ?? 'local';
/** Name prefix for everything this run creates. */
export const prefix = () => `E2E-${runId()}`;

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export class Api {
  private constructor(private readonly ctx: APIRequestContext) {}

  static async login(): Promise<Api> {
    const anon = await playwrightRequest.newContext();
    const res = await anon.post(`${API_URL}/Auth/login`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
    expect(res.ok(), `API login failed: ${res.status()} ${await res.text()}`).toBeTruthy();
    const token = ((await res.json()) as ApiEnvelope<{ accessToken: string }>).data.accessToken;
    await anon.dispose();
    const ctx = await playwrightRequest.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
    return new Api(ctx);
  }

  async dispose() {
    await this.ctx.dispose();
  }

  private async call<T>(method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, data?: unknown): Promise<T> {
    const res = await this.ctx[method](`${API_URL}${path}`, data === undefined ? {} : { data });
    const text = await res.text();
    if (!res.ok()) throw new Error(`${method.toUpperCase()} ${path} -> ${res.status()}: ${text.slice(0, 500)}`);
    const body = text ? (JSON.parse(text) as ApiEnvelope<T>) : ({ data: undefined } as ApiEnvelope<T>);
    return body.data;
  }

  get<T>(path: string) {
    return this.call<T>('get', path);
  }
  post<T>(path: string, data: unknown = {}) {
    return this.call<T>('post', path, data);
  }
  put<T>(path: string, data: unknown) {
    return this.call<T>('put', path, data);
  }
  patch<T>(path: string, data: unknown) {
    return this.call<T>('patch', path, data);
  }
  delete<T = unknown>(path: string) {
    return this.call<T>('delete', path);
  }
}

// ---- Shapes used by the suite (only the fields it reads) ----

export interface LlmProvider {
  id: number;
  name: string;
  provider: string;
  isActive: boolean;
}

export interface LlmPrompt {
  key: string;
  name: string;
  template: string;
  isCustomized: boolean;
  requiredPlaceholders: string[];
  expectedJsonFields: string[];
}

export interface ScanToolSetting {
  tool: string;
  label: string;
  [key: string]: unknown;
}

export interface CustomTool {
  id: number;
  name: string;
}

export interface ReportTemplate {
  id: number;
  name: string;
  isDefault: boolean;
  customFields: { key: string }[];
}

export interface Paged<T> {
  data: T[];
  total: number;
}

export interface ClientOrg {
  id: number;
  name: string;
  isActive?: boolean;
}

export interface ClientAsset {
  id: number;
  name: string;
  isAuthorizedForScanning: boolean;
}

export interface Engagement {
  id: number;
  title: string;
  clientOrganizationId: number;
}

export interface Report {
  id: number;
  status: string;
  version: number;
}

export interface Vulnerability {
  id: number;
  title: string;
}
