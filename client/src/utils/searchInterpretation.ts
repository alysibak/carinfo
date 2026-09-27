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
  if (interpretation.cheapestFirst) {
    lines.push(
      interpretation.cheapestFrom != null
        ? `Cheapest first by estimated value, model years ${interpretation.cheapestFrom} and newer.`
        : 'Cheapest first by estimated value.',
    );
  }
  return lines;
}
