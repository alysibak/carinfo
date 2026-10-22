import type { ClassComparison, VehicleSize } from '../types/car.types';
import { litres } from './space';

const CM_PER_INCH = 2.54;
const LB_PER_KG = 2.20462;

type Span = [number, number];

/** "15 ft 4 in", "6 ft": to the nearest inch. */
export function feetAndInches(cm: number): string {
  const inches = Math.round(cm / CM_PER_INCH);
  const feet = Math.floor(inches / 12);
  const rest = inches % 12;
  if (feet === 0) return `${rest} in`;
  return rest ? `${feet} ft ${rest} in` : `${feet} ft`;
}

/** "4.59 m", "5.32–5.89 m" across the versions measured. */
export function formatMetres([low, high]: Span): string {
  const m = (cm: number) => (cm / 100).toFixed(2);
  return low === high ? `${m(low)} m` : `${m(low)}–${m(high)} m`;
}

/** "15 ft 1 in", "17 ft 5 in – 19 ft 4 in". */
export function formatFeet([low, high]: Span): string {
  const a = feetAndInches(low);
  const b = feetAndInches(high);
  return a === b ? a : `${a} – ${b}`;
}

/** "1,502 kg", "1,502–1,580 kg". */
export function formatKg([low, high]: Span): string {
  const kg = (n: number) => n.toLocaleString('en-CA');
  return low === high ? `${kg(low)} kg` : `${kg(low)}–${kg(high)} kg`;
}

/** "3,311 lb", "3,311–3,483 lb". */
export function formatLb([low, high]: Span): string {
  const lb = (kg: number) => Math.round(kg * LB_PER_KG).toLocaleString('en-CA');
  return low === high ? `${lb(low)} lb` : `${lb(low)}–${lb(high)} lb`;
}

/** "a typical compact SUV", from the class's name. */
function typical(className: string): string {
  return `a typical ${className.charAt(0).toLowerCase()}${className.slice(1)}`;
}

type Measure = 'length' | 'width' | 'height' | 'weight';

/**
 * Differences under these are the same for anyone deciding: a few
 * centimetres of length a parking spot never notices, 3% of weight.
 */
const SAME: Record<Measure, (diff: number, median: number) => boolean> = {
  length: (diff) => Math.abs(diff) < 5,
  width: (diff) => Math.abs(diff) < 3,
  height: (diff) => Math.abs(diff) < 3,
  weight: (diff, median) => Math.abs(diff) / median < 0.03,
};

const WORDS: Record<Measure, { same: string; more: string; less: string; unit: string }> = {
  length: { same: 'About the same length as', more: 'longer', less: 'shorter', unit: 'cm' },
  width: { same: 'About as wide as', more: 'wider', less: 'narrower', unit: 'cm' },
  height: { same: 'About as tall as', more: 'taller', less: 'lower', unit: 'cm' },
  weight: { same: 'About as heavy as', more: 'heavier', less: 'lighter', unit: 'kg' },
};

/**
 * The car's measurement against the middle of its class, in words: "18 cm
 * longer than a typical compact SUV". A car whose measured versions span a
 * range is compared by the end nearer the class ("at least 18 cm longer"),
 * or said to take in a typical one when its range does.
 */
export function sizeVsClass(
  measure: Measure,
  span: Span,
  median: number,
  className: string,
): string {
  const [low, high] = span;
  const words = WORDS[measure];
  const who = typical(className);
  const same = SAME[measure];
  if (low !== high && low <= median && median <= high) {
    return `A typical ${who.slice('a typical '.length)} falls within this range`;
  }
  const nearer = median < low ? low : high;
  const diff = nearer - median;
  if (same(diff, median)) return `${words.same} ${who}`;
  const amount = `${Math.abs(Math.round(diff)).toLocaleString('en-CA')} ${words.unit}`;
  const atLeast = low !== high ? 'At least ' : '';
  const text = `${amount} ${diff > 0 ? words.more : words.less} than ${who}`;
  return atLeast ? atLeast + text : text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * EPA's interior volumes against the class's, in litres: "57 L less than a
 * typical midsize car's trunk". The server sets a trunk against trunks and
 * cargo space against cargo space (EPA measures a trunk to its lid, a
 * hatchback's to the roof). EPA lists whole cubic feet, so within one (28 L)
 * of the trunk or cargo space, or two of the cabin, is the same.
 */
export function volumeVsClass(
  kind: 'trunk' | 'cargo' | 'passenger',
  stat: NonNullable<ClassComparison['luggage']>,
  className: string,
): string {
  const who = typical(className);
  const close = kind === 'passenger' ? 2 : 1;
  const of = kind === 'trunk' ? `${who}’s trunk` : kind === 'cargo' ? `${who}’s cargo space` : who;
  if (Math.abs(stat.car - stat.median) < close) {
    return kind === 'passenger' ? `About as roomy as ${who}` : `About the same as ${of}`;
  }
  const diff = litres(stat.car) - litres(stat.median);
  const amount = `${Math.abs(diff).toLocaleString('en-CA')} L`;
  return kind === 'passenger'
    ? `${amount} ${diff > 0 ? 'more' : 'less'} room than ${who}`
    : `${amount} ${diff > 0 ? 'more' : 'less'} than ${of}`;
}

export interface FitCheck {
  fits: boolean;
  /** Centimetres to spare (negative: too long or too wide), for the longest and widest version. */
  spareLengthCm: number;
  spareWidthCm: number;
}

/**
 * Whether the car, its longest and widest version measured, fits a space the
 * shopper measured. Transport Canada's width is the body's: mirrors and open
 * doors need more, which the result leaves to the shopper.
 */
export function fitCheck(size: VehicleSize, spaceLengthCm: number, spaceWidthCm: number): FitCheck {
  const spareLengthCm = Math.round(spaceLengthCm - size.lengthCm[1]);
  const spareWidthCm = Math.round(spaceWidthCm - size.widthCm[1]);
  return { fits: spareLengthCm >= 0 && spareWidthCm >= 0, spareLengthCm, spareWidthCm };
}

/** A gap in the unit the shopper measured in: "1.25 m", "4 ft 1 in". */
export function formatGap(cm: number, unit: 'm' | 'ft'): string {
  const abs = Math.abs(cm);
  if (unit === 'ft') return feetAndInches(abs);
  return abs < 100 ? `${Math.round(abs)} cm` : `${(abs / 100).toFixed(2)} m`;
}
