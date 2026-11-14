export type CustomToolOutputFormat = 'lines' | 'nuclei-jsonl' | 'raw';
export type CustomToolSeverity = 'Informational' | 'Low' | 'Medium' | 'High' | 'Critical';

export interface CustomScanTool {
  id: number;
  name: string;
  clientLabel: string;
  description: string | null;
  image: string;
  arguments: string[];
  outputFormat: CustomToolOutputFormat;
  defaultSeverity: CustomToolSeverity;
  timeoutMinutes: number;
  memoryMb: number;
  cpus: number;
  runAsRoot: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export type SaveCustomScanTool = Omit<CustomScanTool, 'id' | 'createdAt' | 'updatedAt'>;
