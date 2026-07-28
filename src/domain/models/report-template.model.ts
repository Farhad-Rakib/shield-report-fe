export interface ReportTemplate {
  id: number;
  name: string;
  companyDisplayName: string;
  isDefault: boolean;
  hasCustomDocxTemplate: boolean;
  docxTemplateFileName: string | null;
}
