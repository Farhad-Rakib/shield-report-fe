import { ScanTool } from '../models/scan.model';

// engagementId is required — every scan must be scoped to an engagement, or its findings can
// never be pulled into any report (report generation is always scoped to one engagement).
export interface CreateScanRequestDto {
  tools: ScanTool[];
  engagementId: number;
  // Registered custom tools to run after the built-in ones.
  customToolIds?: number[];
}
