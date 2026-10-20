import type { SafetyAvailability } from '../types/car.types';

/** How NHTSA lists a safety technology, in words: "Standard on some versions". */
export function availabilityLabel(value: SafetyAvailability | undefined): string {
  if (value === 'standard') return 'Standard';
  if (value === 'optional') return 'Optional';
  if (value === 'some') return 'Standard on some versions';
  return 'Not listed';
}

/** "14%": NHTSA's rollover risk to the whole percent. */
export function rolloverRiskText(risk: number): string {
  return `${Math.round(risk * 100)}%`;
}

/** NHTSA's body codes, in words. */
const BODY_CODES: Array<[RegExp, string]> = [
  [/\bPU\/CC\b/i, 'crew cab pickup'],
  [/\bPU\/EC\b/i, 'extended cab pickup'],
  [/\bPU\/RC\b/i, 'regular cab pickup'],
  [/\b([2-5]) DR\b/i, '$1-door'],
  [/\b([35]) HB\b/i, '$1-door hatchback'],
  [/\bSW\b/, 'wagon'],
  [/\bCV\b/, 'cargo van'],
  [/\bPV\b/, 'passenger van'],
  [/\bC(?= (?:AWD|FWD|RWD|4WD|2WD|4x4|4x2)\b)/i, 'convertible'],
  // The newest descriptions' "SUV N/A FWD": no powertrain code to give.
  [/\bN\/A /i, ''],
];

/**
 * "2018 Toyota Tacoma PU/CC 4WD" → "2018 Toyota Tacoma crew cab pickup 4WD":
 * the configuration NHTSA tested, its body codes in words.
 */
export function testedLabel(tested: string): string {
  return BODY_CODES.reduce((text, [code, words]) => text.replace(code, words), tested)
    .replace(/\s+/g, ' ')
    .trim();
}
