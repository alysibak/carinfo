import type { ModelYearSummary } from '../types/car.types';
import { bodyStyleLabel } from './bodyStyleLabel';
import { rangeKm } from './efficiency';
import { formatFuelTypeLabel } from './fuelDisplay';

const thousands = (value: number) => `$${Math.round(value / 1000)}k`;

/** "$30k–$31k", "$31k" when every configuration is valued alike. */
function priceText(price: ModelYearSummary['price']): string | null {
  if (!price) return null;
  const low = thousands(price.min);
  const high = thousands(price.max);
  return low === high ? `Est. value ~${low}` : `Est. value ${low}–${high}`;
}

/** "202–301 hp", "255 hp". */
function powerText(power: ModelYearSummary['horsepower']): string | null {
  if (!power) return null;
  return power.min === power.max ? `${power.min} hp` : `${power.min}–${power.max} hp`;
}

/**
 * A model year's figures for its row on the model's page, in the order a
 * shopper reads them: value, fuel use or range, power, safety, then what the
 * year was offered as. Each is the year's best or its span across configurations.
 */
export function modelYearFacts(row: ModelYearSummary): string[] {
  const fuels = row.fuelTypes.map(formatFuelTypeLabel).join(', ');
  const bodies = row.bodyStyles.map(bodyStyleLabel).join(', ');
  return [
    priceText(row.price),
    row.combinedMpg ? `from ${(235.215 / row.combinedMpg).toFixed(1)} L/100 km` : null,
    row.rangeMiles ? `up to ${rangeKm(row.rangeMiles)} km range` : null,
    powerText(row.horsepower),
    row.safetyStars ? `NHTSA ${row.safetyStars}/5` : null,
    [fuels, bodies].filter(Boolean).join(' '),
    `${row.configurations} ${row.configurations === 1 ? 'configuration' : 'configurations'}`,
  ].filter((fact): fact is string => !!fact);
}

/** "1995–2026", "2026" for one year. */
export function yearSpan(from: number, to: number): string {
  return from === to ? `${from}` : `${from}–${to}`;
}
