import type { ClassComparison, VehicleSize } from '../types/car.types';
import { litres } from './space';
import { t } from '../i18n';
import { fmtNumber } from '../i18n/format';

const CM_PER_INCH = 2.54;
const LB_PER_KG = 2.20462;

type Span = [number, number];

/** "15 ft 4 in", "6 ft": to the nearest inch. */
export function feetAndInches(cm: number): string {
  const inches = Math.round(cm / CM_PER_INCH);
  const feet = Math.floor(inches / 12);
  const rest = inches % 12;
  if (feet === 0) return t('{inches} in', { inches: rest });
  return rest ? t('{feet} ft {inches} in', { feet, inches: rest }) : t('{feet} ft', { feet });
}

/** "4.59 m", "5.32–5.89 m" across the versions measured. */
export function formatMetres([low, high]: Span): string {
  const m = (cm: number) => (cm / 100).toFixed(2);
  return low === high
    ? t('{m} m', { m: m(low) })
    : t('{low}–{high} m', { low: m(low), high: m(high) });
}

/** "15 ft 1 in", "17 ft 5 in – 19 ft 4 in". */
export function formatFeet([low, high]: Span): string {
  const a = feetAndInches(low);
  const b = feetAndInches(high);
  return a === b ? a : t('{a} – {b}', { a, b });
}

/** "1,502 kg", "1,502–1,580 kg". */
export function formatKg([low, high]: Span): string {
  const kg = (n: number) => fmtNumber(n);
  return low === high
    ? t('{kg} kg', { kg: kg(low) })
    : t('{low}–{high} kg', { low: kg(low), high: kg(high) });
}

/** "3,311 lb", "3,311–3,483 lb". */
export function formatLb([low, high]: Span): string {
  const lb = (kg: number) => fmtNumber(Math.round(kg * LB_PER_KG));
  return low === high
    ? t('{lb} lb', { lb: lb(low) })
    : t('{low}–{high} lb', { low: lb(low), high: lb(high) });
}

function typical(className: string): string {
  const name = `${className.charAt(0).toLowerCase()}${className.slice(1)}`;
  return t('a typical {className}', { className: name });
}

type Measure = 'length' | 'width' | 'height' | 'weight';

const SAME: Record<Measure, (diff: number, median: number) => boolean> = {
  length: (diff) => Math.abs(diff) < 5,
  width: (diff) => Math.abs(diff) < 3,
  height: (diff) => Math.abs(diff) < 3,
  weight: (diff, median) => Math.abs(diff) / median < 0.03,
};

export function sizeVsClass(
  measure: Measure,
  span: Span,
  median: number,
  className: string,
): string {
  const [low, high] = span;
  const who = typical(className);
  const same = SAME[measure];
  if (low !== high && low <= median && median <= high) {
    return t('A typical {className} falls within this range', {
      className: `${className.charAt(0).toLowerCase()}${className.slice(1)}`,
    });
  }
  const nearer = median < low ? low : high;
  const diff = nearer - median;
  if (same(diff, median)) {
    if (measure === 'length') return t('About the same length as {who}', { who });
    if (measure === 'width') return t('About as wide as {who}', { who });
    if (measure === 'height') return t('About as tall as {who}', { who });
    return t('About as heavy as {who}', { who });
  }
  const amount = t('{n} {unit}', {
    n: fmtNumber(Math.abs(Math.round(diff))),
    unit: measure === 'weight' ? 'kg' : 'cm',
  });
  const atLeast = low !== high;
  const more = diff > 0;
  if (measure === 'length') {
    const comparison = more
      ? t('{amount} longer than {who}', { amount, who })
      : t('{amount} shorter than {who}', { amount, who });
    return atLeast ? t('At least {comparison}', { comparison }) : comparison;
  }
  if (measure === 'width') {
    const comparison = more
      ? t('{amount} wider than {who}', { amount, who })
      : t('{amount} narrower than {who}', { amount, who });
    return atLeast ? t('At least {comparison}', { comparison }) : comparison;
  }
  if (measure === 'height') {
    const comparison = more
      ? t('{amount} taller than {who}', { amount, who })
      : t('{amount} lower than {who}', { amount, who });
    return atLeast ? t('At least {comparison}', { comparison }) : comparison;
  }
  const comparison = more
    ? t('{amount} heavier than {who}', { amount, who })
    : t('{amount} lighter than {who}', { amount, who });
  return atLeast ? t('At least {comparison}', { comparison }) : comparison;
}

export function volumeVsClass(
  kind: 'trunk' | 'cargo' | 'passenger',
  stat: NonNullable<ClassComparison['luggage']>,
  className: string,
): string {
  const who = typical(className);
  const close = kind === 'passenger' ? 2 : 1;
  if (Math.abs(stat.car - stat.median) < close) {
    return kind === 'passenger'
      ? t('About as roomy as {who}', { who })
      : kind === 'trunk'
        ? t('About the same as {who}’s trunk', { who })
        : t('About the same as {who}’s cargo space', { who });
  }
  const diff = litres(stat.car) - litres(stat.median);
  const amount = t('{n} L', { n: fmtNumber(Math.abs(diff)) });
  if (kind === 'passenger') {
    return diff > 0
      ? t('{amount} more room than {who}', { amount, who })
      : t('{amount} less room than {who}', { amount, who });
  }
  if (kind === 'trunk') {
    return diff > 0
      ? t('{amount} more than {who}’s trunk', { amount, who })
      : t('{amount} less than {who}’s trunk', { amount, who });
  }
  return diff > 0
    ? t('{amount} more than {who}’s cargo space', { amount, who })
    : t('{amount} less than {who}’s cargo space', { amount, who });
}

export interface FitCheck {
  fits: boolean;
  spareLengthCm: number;
  spareWidthCm: number;
}

export function fitCheck(size: VehicleSize, spaceLengthCm: number, spaceWidthCm: number): FitCheck {
  const spareLengthCm = Math.round(spaceLengthCm - size.lengthCm[1]);
  const spareWidthCm = Math.round(spaceWidthCm - size.widthCm[1]);
  return { fits: spareLengthCm >= 0 && spareWidthCm >= 0, spareLengthCm, spareWidthCm };
}

export function formatGap(cm: number, unit: 'm' | 'ft'): string {
  const abs = Math.abs(cm);
  if (unit === 'ft') return feetAndInches(abs);
  return abs < 100
    ? t('{cm} cm', { cm: Math.round(abs) })
    : t('{m} m', { m: (abs / 100).toFixed(2) });
}
