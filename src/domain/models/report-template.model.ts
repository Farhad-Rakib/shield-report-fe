export interface ReportTemplate {
  id: number;
  name: string;
  companyDisplayName: string;
  isDefault: boolean;
  hasCustomDocxTemplate: boolean;
  docxTemplateFileName: string | null;
  hasCustomHtmlTemplate: boolean;
  customFields?: ReportTemplateField[] | null;
}

export type ReportTemplateFieldType = 'text' | 'multiline' | 'date' | 'number';

// Admin-defined dynamic field: {{Custom.<key>}} in the template, filled per report.
export interface ReportTemplateField {
  key: string;
  label: string;
  type: ReportTemplateFieldType;
  defaultValue: string | null;
  help: string | null;
  required: boolean;
}

export interface ReportTemplateVariable {
  expression: string;
  description: string;
  group: string;
}

export interface ReportTemplateHtml {
  id: number;
  isCustom: boolean;
  htmlContent: string;
}
