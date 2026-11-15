import { SEVERITY_BADGE_CLASS, SEVERITY_DOT_CLASS, SEVERITY_LABEL, SeverityLevel } from '../../../components/ui/Severity/severity';
import type { SeverityCounts } from '../../../domain/models/findings-report.model';

const LEVELS: { level: SeverityLevel; key: keyof SeverityCounts }[] = [
  { level: 'critical', key: 'critical' },
  { level: 'high', key: 'high' },
  { level: 'medium', key: 'medium' },
  { level: 'low', key: 'low' },
  { level: 'info', key: 'informational' },
];

/** Compact per-severity counts; zero buckets are hidden. */
export function SeverityCountChips({ counts, emptyLabel = 'No findings' }: { counts: SeverityCounts; emptyLabel?: string }) {
  if (counts.total === 0) {
    return <span className="text-xs text-gray-400 dark:text-gray-500">{emptyLabel}</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {LEVELS.filter(({ key }) => counts[key] > 0).map(({ level, key }) => (
        <span key={level} className={SEVERITY_BADGE_CLASS[level]} title={`${SEVERITY_LABEL[level]}: ${counts[key]}`}>
          <span className={`status-dot ${SEVERITY_DOT_CLASS[level]}`} aria-hidden="true" />
          {counts[key]}
        </span>
      ))}
    </span>
  );
}
