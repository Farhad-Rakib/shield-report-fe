import { useEffect, useMemo, useState } from 'react';
import { Severity } from '../../domain/models/vulnerability.model';

// CVSS v3.1 base-score calculator. Implements the official formula from the
// First.org CVSS v3.1 specification — there is no API endpoint for this,
// scoring must be computed client-side as the pentester picks metrics.
type Metric = { key: string; label: string; options: { value: string; label: string; weight: number }[] };

const METRICS: Metric[] = [
  { key: 'AV', label: 'Attack Vector', options: [
    { value: 'N', label: 'Network', weight: 0.85 },
    { value: 'A', label: 'Adjacent', weight: 0.62 },
    { value: 'L', label: 'Local', weight: 0.55 },
    { value: 'P', label: 'Physical', weight: 0.2 },
  ]},
  { key: 'AC', label: 'Attack Complexity', options: [
    { value: 'L', label: 'Low', weight: 0.77 },
    { value: 'H', label: 'High', weight: 0.44 },
  ]},
  { key: 'PR', label: 'Privileges Required', options: [
    { value: 'N', label: 'None', weight: 0.85 },
    { value: 'L', label: 'Low', weight: 0.62 },
    { value: 'H', label: 'High', weight: 0.27 },
  ]},
  { key: 'UI', label: 'User Interaction', options: [
    { value: 'N', label: 'None', weight: 0.85 },
    { value: 'R', label: 'Required', weight: 0.62 },
  ]},
  { key: 'S', label: 'Scope', options: [
    { value: 'U', label: 'Unchanged', weight: 0 },
    { value: 'C', label: 'Changed', weight: 0 },
  ]},
  { key: 'C', label: 'Confidentiality Impact', options: [
    { value: 'H', label: 'High', weight: 0.56 },
    { value: 'L', label: 'Low', weight: 0.22 },
    { value: 'N', label: 'None', weight: 0 },
  ]},
  { key: 'I', label: 'Integrity Impact', options: [
    { value: 'H', label: 'High', weight: 0.56 },
    { value: 'L', label: 'Low', weight: 0.22 },
    { value: 'N', label: 'None', weight: 0 },
  ]},
  { key: 'A', label: 'Availability Impact', options: [
    { value: 'H', label: 'High', weight: 0.56 },
    { value: 'L', label: 'Low', weight: 0.22 },
    { value: 'N', label: 'None', weight: 0 },
  ]},
];

const DEFAULTS: Record<string, string> = { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'N', I: 'N', A: 'N' };

const roundUp = (input: number): number => {
  const intInput = Math.round(input * 100000);
  if (intInput % 10000 === 0) return intInput / 100000;
  return (Math.floor(intInput / 10000) + 1) / 10;
};

const computeScore = (selections: Record<string, string>): number => {
  const weight = (key: string) => METRICS.find((m) => m.key === key)!.options.find((o) => o.value === selections[key])!.weight;
  const scopeChanged = selections.S === 'C';
  const pr = weight('PR') * (scopeChanged ? (selections.PR === 'N' ? 1 : selections.PR === 'L' ? 0.68 / 0.62 : 0.5 / 0.27) : 1);
  const c = weight('C');
  const i = weight('I');
  const a = weight('A');
  const iss = 1 - (1 - c) * (1 - i) * (1 - a);
  const impact = scopeChanged
    ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15)
    : 6.42 * iss;
  const exploitability = 8.22 * weight('AV') * weight('AC') * pr * weight('UI');
  if (impact <= 0) return 0;
  const base = scopeChanged ? 1.08 * (impact + exploitability) : impact + exploitability;
  return roundUp(Math.min(base, 10));
};

export const scoreToSeverity = (score: number): Severity => {
  if (score === 0) return 'Informational';
  if (score < 4) return 'Low';
  if (score < 7) return 'Medium';
  if (score < 9) return 'High';
  return 'Critical';
};

const parseVector = (vector?: string | null): Record<string, string> => {
  if (!vector) return { ...DEFAULTS };
  const parsed = { ...DEFAULTS };
  vector.split('/').forEach((part) => {
    const [key, value] = part.split(':');
    if (key && value && key in DEFAULTS) parsed[key] = value;
  });
  return parsed;
};

interface CvssVectorBuilderProps {
  value?: string | null;
  onChange: (vector: string, score: number, severity: Severity) => void;
}

export const CvssVectorBuilder: React.FC<CvssVectorBuilderProps> = ({ value, onChange }) => {
  const [selections, setSelections] = useState<Record<string, string>>(() => parseVector(value));

  const { vector, score, severity } = useMemo(() => {
    const v = `CVSS:3.1/${METRICS.map((m) => `${m.key}:${selections[m.key]}`).join('/')}`;
    const s = computeScore(selections);
    return { vector: v, score: s, severity: scoreToSeverity(s) };
  }, [selections]);

  useEffect(() => {
    onChange(vector, score, severity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vector]);

  return (
    <div className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {METRICS.map((metric) => (
          <div key={metric.key}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{metric.label}</p>
            <div className="flex flex-wrap gap-2">
              {metric.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelections((prev) => ({ ...prev, [metric.key]: option.value }))}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                    selections[metric.key] === option.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <code className="text-xs text-gray-500 dark:text-gray-400">{vector}</code>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{score.toFixed(1)}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">({severity})</span>
        </div>
      </div>
    </div>
  );
};
