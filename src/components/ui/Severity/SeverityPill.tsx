import { SEVERITY_BADGE_CLASS, SEVERITY_DOT_CLASS, SEVERITY_LABEL, toSeverityLevel } from './severity';

interface SeverityPillProps {
  severity: string | number | null | undefined;
  /** Override the visible text (defaults to the normalised label, e.g. "Critical"). */
  label?: string;
  className?: string;
}

export const SeverityPill: React.FC<SeverityPillProps> = ({ severity, label, className = '' }) => {
  const level = toSeverityLevel(severity);
  return (
    <span className={`${SEVERITY_BADGE_CLASS[level]} ${className}`}>
      <span className={`status-dot ${SEVERITY_DOT_CLASS[level]}`} aria-hidden="true" />
      {label ?? SEVERITY_LABEL[level]}
    </span>
  );
};
