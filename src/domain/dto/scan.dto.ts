import { ScanTool } from '../models/scan.model';

export interface CreateScanRequestDto {
  tools: ScanTool[];
  engagementId?: number | null;
}
