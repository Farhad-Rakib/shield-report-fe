import { ScanTool } from './scan.model';

// Mirrors ShieldReport.Application.ScanTools option records.
export interface NaabuOptions {
  portPreset: 'top-100' | 'top-1000' | 'full' | 'custom';
  customPorts: string | null;
  rate: number;
  scanType: 'connect' | 'syn';
}

export interface NucleiOptions {
  severities: string[];
  includeTags: string[];
  excludeTags: string[];
  rateLimit: number;
  concurrency: number;
}

// modules = keys of the checked reconnaissance modules (catalogue from GET /scan-tools/reconftw/modules).
export interface ReconftwOptions {
  modules: string[];
  threads: number;
}

export interface ReconftwModule {
  key: string;
  group: string;
  label: string;
  description: string;
  heavy: boolean;
  defaultSelected: boolean;
}

export interface ScanToolSetting {
  tool: ScanTool;
  label: string;
  isEnabled: boolean;
  image: string;
  pidsLimit: number;
  timeoutMinutes: number;
  memoryMb: number;
  cpus: number;
  maxParallel: number;
  naabu: NaabuOptions | null;
  nuclei: NucleiOptions | null;
  reconftw: ReconftwOptions | null;
  updatedAt: string | null;
}

export type UpdateScanToolSetting = Omit<ScanToolSetting, 'tool' | 'label' | 'image' | 'pidsLimit' | 'updatedAt'>;

export interface AvailableScanTool {
  tool: ScanTool;
  label: string;
  customToolId?: number | null;
}

export interface ScanToolTestResult {
  success: boolean;
  image: string;
  output: string;
}

// Global scan limits (GET/PUT /scan-tools/limits). The *UpperBound fields are the server's maxima.
export interface ScanQueueLimits {
  maxConcurrentScansPerClient: number;
  customToolMaxParallel: number;
  maxParallelUpperBound: number;
  maxConcurrentScansPerClientUpperBound: number;
  updatedAt: string | null;
}

export type UpdateScanQueueLimits = Pick<ScanQueueLimits, 'maxConcurrentScansPerClient' | 'customToolMaxParallel'>;
