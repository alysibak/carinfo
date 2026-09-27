import type { SearchInterpretation } from '../types/car.types';

const cad = (value: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);

/**
 * What the search read into its query, as sentences for the results page:
 * trim words it set aside, a price limit, a "cheapest first" order. Without
 * them a search for "honda civic ex" showed every Civic with no word why.
 */
export function describeSearchInterpretation(
  interpretation: SearchInterpretation | undefined,
): string[] {
  if (!interpretation) return [];
  const lines: string[] = [];
  if (interpretation.ignored?.length) {
    lines.push(
      `EPA records no trim levels, so “${interpretation.ignored.join(' ')}” was left out of the search.`,
    );
  }
  const price = interpretation.price;
  if (price?.min != null && price.max != null) {
    lines.push(`Estimated value ${cad(price.min)} to ${cad(price.max)}.`);
  } else if (price?.max != null) {
    lines.push(`Estimated value under ${cad(price.max)}.`);
  } else if (price?.min != null) {
    lines.push(`Estimated value over ${cad(price.min)}.`);
  }
  const order = {
    price: 'Cheapest first by estimated value',
    fuelEconomy: 'Most fuel-efficient first',
    horsepower: 'Most powerful first',
    range: 'Longest EPA range first',
    safety: 'Best NHTSA crash rating first; most cars have none on file',
  } as const;
  if (interpretation.sortedBy) {
    lines.push(
      interpretation.recentFrom != null
        ? `${order[interpretation.sortedBy]}, model years ${interpretation.recentFrom} and newer.`
        : `${order[interpretation.sortedBy]}.`,
    );
  }
  if (interpretation.gasMileage) {
    lines.push('Electric cars are left out: their MPGe does not compare with MPG.');
  }
  if (interpretation.minRangeMiles != null) {
    const km = Math.round(interpretation.minRangeMiles * 1.609);
    lines.push(
      `EPA range of at least ${interpretation.minRangeMiles} miles (${km.toLocaleString('en-CA')} km).`,
    );
  }
  if (interpretation.newestFrom != null) {
    lines.push(`Model years ${interpretation.newestFrom} and newer.`);
  }
  if (interpretation.threeRow) {
    lines.push(
      'Minivans, passenger vans and SUVs sold with a third row, by model: EPA records no seating.',
    );
  }
  if (interpretation.unmeasured?.length) {
    const words = interpretation.unmeasured.map((w) => `“${w}”`).join(' and ');
    lines.push(
      `No data on file measures ${words}, so ${
        interpretation.unmeasured.length > 1 ? 'they were' : 'it was'
      } not used.`,
    );
  }
  if (interpretation.vehicleClass) {
    lines.push(`Showing ${interpretation.vehicleClass}, classed by model.`);
  }
  if (interpretation.compared?.length) {
    lines.push(
      `Showing ${interpretation.compared.map((part) => `“${part}”`).join(' and ')} together.`,
    );
  }
  return lines;
}
