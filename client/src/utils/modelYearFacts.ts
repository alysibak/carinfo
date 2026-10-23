import type { ModelYearSummary } from '../types/car.types';
import { bodyStyleLabel } from './bodyStyleLabel';
import { rangeKm } from './efficiency';
import { formatFuelTypeLabel } from './fuelDisplay';

/** "202–301 hp", "255 hp". */
function powerText(power: ModelYearSummary['horsepower']): string | null {
  if (!power) return null;
  return power.min === power.max ? `${power.min} hp` : `${power.min}–${power.max} hp`;
}

const BODY_ORDER = [
  'sedan',
  'hatchback',
  'coupe',
  'convertible',
  'wagon',
  'suv',
  'minivan',
  'van',
  'truck',
];

/**
 * "Hybrid SUV", or "Gasoline, Hybrid · Sedan, Hatchback" where a year had
 * more than one of either; bodies always in one order, so years line up.
 */
function offeredAs(row: ModelYearSummary): string {
  const fuels = row.fuelTypes.map(formatFuelTypeLabel);
  const bodies = [...row.bodyStyles]
    .sort((a, b) => BODY_ORDER.indexOf(a) - BODY_ORDER.indexOf(b))
    .map(bodyStyleLabel);
  if (fuels.length <= 1 && bodies.length <= 1) return [...fuels, ...bodies].join(' ');
  return [fuels.join(', '), bodies.join(', ')].filter(Boolean).join(' · ');
}

/**
 * A model year's figures in three groups, in the order a shopper reads them:
 * the car (fuel use or range, power), its records (NHTSA stars, recalls in
 * Canada, owners' complaints), then what the year was offered as. Each is the
 * year's best or its span across versions. No estimated value: most are drawn
 * from the size class, and a row of them read as prices.
 */
export function modelYearLines(row: ModelYearSummary): {
  car: string[];
  records: string[];
  offered: string[];
} {
  const present = (facts: Array<string | null>) => facts.filter((fact): fact is string => !!fact);
  return {
    car: present([
      row.combinedMpg ? `from ${(235.215 / row.combinedMpg).toFixed(1)} L/100 km` : null,
      row.rangeMiles ? `up to ${rangeKm(row.rangeMiles)} km range` : null,
      powerText(row.horsepower),
    ]),
    records: present([
      row.safetyStars ? `NHTSA ${row.safetyStars}/5` : null,
      row.recalls != null
        ? `${row.recalls} ${row.recalls === 1 ? 'recall' : 'recalls'} in Canada`
        : null,
      row.complaints != null
        ? `${row.complaints.toLocaleString('en-CA')} ${row.complaints === 1 ? 'complaint' : 'complaints'} to NHTSA`
        : null,
    ]),
    offered: present([
      offeredAs(row) || null,
      `${row.configurations} ${row.configurations === 1 ? 'version' : 'versions'}`,
    ]),
  };
}

/** The same figures as one list, for a line of text. */
export function modelYearFacts(row: ModelYearSummary): string[] {
  const { car, records, offered } = modelYearLines(row);
  return [...car, ...records, ...offered];
}

/** "1995–2026", "2026" for one year. */
export function yearSpan(from: number, to: number): string {
  return from === to ? `${from}` : `${from}–${to}`;
}

/** A model year's figures as the columns of the model page's table, "—" where none is on file. */
export function modelYearCells(row: ModelYearSummary) {
  const none = '—';
  return {
    efficiency: row.combinedMpg
      ? `${(235.215 / row.combinedMpg).toFixed(1)} L/100 km`
      : row.rangeMiles
        ? `${rangeKm(row.rangeMiles)} km range`
        : none,
    power: powerText(row.horsepower) ?? none,
    safety: row.safetyStars ? `${row.safetyStars}/5` : none,
    recalls: row.recalls != null ? row.recalls.toLocaleString('en-CA') : none,
    complaints: row.complaints != null ? row.complaints.toLocaleString('en-CA') : none,
    // "Gasoline, Hybrid · Sedan, Hatchback": it read "Gasoline, Hybrid Sedan, Hatchback".
    offered: offeredAs(row) || none,
    versions: String(row.configurations),
  };
}

/**
 * A generation's label in its parts: "FE · 11th generation (2022 on)" names
 * it "11th generation", its years "2022 on" and its maker's code "FE".
 */
export function generationParts(label: string): { name: string; years?: string; code?: string } {
  const match = /^(.*?)\s*\(([^)]+)\)$/.exec(label);
  const head = match ? match[1] : label;
  const years = match?.[2];
  const [first, second] = head.split(' · ');
  if (second) return { name: second, years, code: first };
  return { name: first, years };
}

/** A folded generation in a line: "6 years · from 6.5 L/100 km · 158–306 hp". */
export function generationSummary(rows: ModelYearSummary[]): string[] {
  const mpg = Math.max(0, ...rows.map((row) => row.combinedMpg ?? 0));
  const range = Math.max(0, ...rows.map((row) => row.rangeMiles ?? 0));
  const powers = rows.flatMap((row) => (row.horsepower ? [row.horsepower] : []));
  const power = powers.length
    ? powerText({
        min: Math.min(...powers.map((p) => p.min)),
        max: Math.max(...powers.map((p) => p.max)),
      })
    : null;
  return [
    `${rows.length} ${rows.length === 1 ? 'year' : 'years'}`,
    mpg ? `from ${(235.215 / mpg).toFixed(1)} L/100 km` : null,
    !mpg && range ? `up to ${rangeKm(range)} km range` : null,
    power,
  ].filter((fact): fact is string => !!fact);
}
