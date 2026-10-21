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
 * A model year's figures for its row on the model's page, in the order a
 * shopper reads them: fuel use or range, power, safety, the records, then
 * what the year was offered as. Each is the year's best or its span across
 * versions. No estimated value: most are drawn from the size class, and a
 * row of them read as prices.
 */
export function modelYearFacts(row: ModelYearSummary): string[] {
  const offered = offeredAs(row);
  return [
    row.combinedMpg ? `from ${(235.215 / row.combinedMpg).toFixed(1)} L/100 km` : null,
    row.rangeMiles ? `up to ${rangeKm(row.rangeMiles)} km range` : null,
    powerText(row.horsepower),
    row.safetyStars ? `NHTSA ${row.safetyStars}/5` : null,
    row.recalls != null
      ? `${row.recalls} ${row.recalls === 1 ? 'recall' : 'recalls'} in Canada`
      : null,
    row.complaints != null
      ? `${row.complaints.toLocaleString('en-CA')} NHTSA ${row.complaints === 1 ? 'complaint' : 'complaints'}`
      : null,
    offered || null,
    `${row.configurations} ${row.configurations === 1 ? 'version' : 'versions'}`,
  ].filter((fact): fact is string => !!fact);
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
    offered: [
      row.fuelTypes.map(formatFuelTypeLabel).join(', '),
      row.bodyStyles.map(bodyStyleLabel).join(', '),
    ]
      .filter(Boolean)
      .join(' '),
    versions: String(row.configurations),
  };
}
