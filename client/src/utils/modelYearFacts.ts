import type { ModelYearSummary } from '../types/car.types';
import { bodyStyleLabel } from './bodyStyleLabel';
import { rangeKm } from './efficiency';
import { formatFuelTypeLabel } from './fuelDisplay';

/** "202–301 hp", "255 hp". */
function powerText(power: ModelYearSummary['horsepower']): string | null {
  if (!power) return null;
  return power.min === power.max ? `${power.min} hp` : `${power.min}–${power.max} hp`;
}

/**
 * A model year's figures for its row on the model's page, in the order a
 * shopper reads them: fuel use or range, power, safety, the records, then
 * what the year was offered as. Each is the year's best or its span across
 * versions. No estimated value: most are drawn from the size class, and a
 * row of them read as prices.
 */
export function modelYearFacts(row: ModelYearSummary): string[] {
  const fuels = row.fuelTypes.map(formatFuelTypeLabel).join(', ');
  const bodies = row.bodyStyles.map(bodyStyleLabel).join(', ');
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
    [fuels, bodies].filter(Boolean).join(' '),
    `${row.configurations} ${row.configurations === 1 ? 'configuration' : 'configurations'}`,
  ].filter((fact): fact is string => !!fact);
}

/** "1995–2026", "2026" for one year. */
export function yearSpan(from: number, to: number): string {
  return from === to ? `${from}` : `${from}–${to}`;
}
