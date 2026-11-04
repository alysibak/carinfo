import type { SafetyAvailability } from '../types/car.types';
import { t } from '../i18n';

/** How NHTSA lists a safety technology, in words: "Standard on some versions". */
export function availabilityLabel(value: SafetyAvailability | undefined): string {
  if (value === 'standard') return t('Standard');
  if (value === 'optional') return t('Optional');
  if (value === 'some') return t('Standard on some versions');
  return t('Not listed');
}

/** "14%": NHTSA's rollover risk to the whole percent. */
export function rolloverRiskText(risk: number): string {
  return `${Math.round(risk * 100)}%`;
}

/** NHTSA's body codes, in words. */
const BODY_CODES: Array<[RegExp, string | ((match: string, ...groups: string[]) => string)]> = [
  [/\bPU\/CC\b/i, () => t('crew cab pickup')],
  [/\bPU\/EC\b/i, () => t('extended cab pickup')],
  [/\bPU\/RC\b/i, () => t('regular cab pickup')],
  [/\b([2-5]) DR\b/i, (_m, n) => t('{n}-door', { n })],
  [/\b([35]) HB\b/i, (_m, n) => t('{n}-door hatchback', { n })],
  [/\bSW\b/, () => t('wagon')],
  [/\bCV\b/, () => t('cargo van')],
  [/\bPV\b/, () => t('passenger van')],
  [/\bC(?= (?:AWD|FWD|RWD|4WD|2WD|4x4|4x2)\b)/i, () => t('convertible')],
  // The newest descriptions' "SUV N/A FWD": no powertrain code to give.
  [/\bN\/A /i, ''],
];

/**
 * "2018 Toyota Tacoma PU/CC 4WD" → "2018 Toyota Tacoma crew cab pickup 4WD":
 * the configuration NHTSA tested, its body codes in words.
 */
export function testedLabel(tested: string): string {
  return BODY_CODES.reduce(
    (text, [code, words]) =>
      text.replace(code, typeof words === 'function' ? words : () => words),
    tested,
  )
    .replace(/\s+/g, ' ')
    .trim();
}
