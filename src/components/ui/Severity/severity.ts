/**
 * Shared severity scale for the PentestOps UI.
 * critical = red, high = orange, medium = amber, low = blue, info = slate.
 *
 * - `SEVERITY_BADGE_CLASS`: badge classes (recipes in src/index.css `.sev-*`).
 * - `SEVERITY_HEX`: chart fills / dots (mirrors the `sev-*` colours in tailwind.config.js).
 * - `SeverityPill` (./SeverityPill.tsx): drop-in badge that accepts any casing and the "Informational"/"Info" aliases.
 */

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export const SEVERITY_ORDER: SeverityLevel[] = ['critical', 'high', 'medium', 'low', 'info'];

export const SEVERITY_LABEL: Record<SeverityLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

export const SEVERITY_BADGE_CLASS: Record<SeverityLevel, string> = {
  critical: 'sev-critical',
  high: 'sev-high',
  medium: 'sev-medium',
  low: 'sev-low',
  info: 'sev-info',
};

export const SEVERITY_DOT_CLASS: Record<SeverityLevel, string> = {
  critical: 'bg-sev-critical',
  high: 'bg-sev-high',
  medium: 'bg-sev-medium',
  low: 'bg-sev-low',
  info: 'bg-sev-info',
};

export const SEVERITY_HEX: Record<SeverityLevel, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#2563eb',
  info: '#64748b',
};

/** Normalises API values ("Critical", "INFORMATIONAL", "info", 4, …) to a severity level. */
export function toSeverityLevel(value: string | number | null | undefined): SeverityLevel {
  if (typeof value === 'number') {
    // CVSS-style numeric score
    if (value >= 9) return 'critical';
    if (value >= 7) return 'high';
    if (value >= 4) return 'medium';
    if (value > 0) return 'low';
    return 'info';
  }
  const v = (value ?? '').toString().trim().toLowerCase();
  if (v.startsWith('crit')) return 'critical';
  if (v.startsWith('high')) return 'high';
  if (v.startsWith('med')) return 'medium';
  if (v.startsWith('low')) return 'low';
  return 'info';
}
