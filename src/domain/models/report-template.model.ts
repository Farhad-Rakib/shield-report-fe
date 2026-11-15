import type { TestingType } from './engagement.model';

export interface ReportTemplate {
  id: number;
  name: string;
  companyDisplayName: string;
  isDefault: boolean;
  hasCustomDocxTemplate: boolean;
  docxTemplateFileName: string | null;
  hasCustomHtmlTemplate: boolean;
  customFields?: ReportTemplateField[] | null;
  // White / Gray / Black: one of the built-in SELISE templates (its built-in HTML follows that
  // sample). null = created by an admin (falls back to the engagement's testing type).
  builtInTestingType?: TestingType | null;
}

export const BUILT_IN_TEMPLATE_LABELS: Record<TestingType, string> = {
  White: 'White Box built-in',
  Gray: 'Gray Box built-in',
  Black: 'Black Box built-in',
};

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
